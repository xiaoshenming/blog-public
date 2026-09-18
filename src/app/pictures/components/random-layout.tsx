'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { useCenterInit, useCenterStore } from '@/hooks/use-center'
import { Picture } from '../page'
import siteContent from '@/config/site-content.json'
import { useSize } from '@/hooks/use-size'
import { colors } from '@/styles/tokens.stylex'
import { util } from '@/styles/shared/util.stylex'

interface RandomLayoutProps {
	pictures: Picture[]
	isEditMode?: boolean
	onDeleteSingle?: (pictureId: string, imageIndex: number | 'single') => void
	onDeleteGroup?: (picture: Picture) => void
}

type PositionedItem = {
	x: number
	y: number
	rotation: number
}

type OriginalSize = {
	width: number
	height: number
}

interface FloatingImageProps {
	url: string
	index: number
	groupIndex: number
	position: PositionedItem
	description?: string
	uploadedAt?: string
	pictureId: string
	imageIndex: number | 'single'
	isEditMode?: boolean
	onDeleteSingle?: (pictureId: string, imageIndex: number | 'single') => void
	onDeleteGroup?: () => void
}

type UrlItem = {
	url: string
	groupIndex: number
	description?: string
	uploadedAt?: string
	pictureId: string
	imageIndex: number | 'single'
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 放大态遮罩 */
	zoomOverlay: {
		position: 'fixed',
		inset: 0,
		zIndex: 50,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		backgroundColor: colors.card,
		backdropFilter: 'blur(24px)'
	},
	/** 浮动图片容器（尺寸/位置由 motion 与内联样式接管） */
	floating: {
		pointerEvents: 'auto',
		position: 'absolute',
		transformOrigin: 'center',
		translate: '-50% -50%',
		cursor: 'pointer',
		boxShadow: '0 20px 25px -5px rgb(0 0 0 / 10%), 0 8px 10px -6px rgb(0 0 0 / 10%)',
		transitionProperty: 'scale',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 非编辑且未放大时的悬停放大 */
	floatingHover: {
		'@media (hover: hover)': {
			':hover': {
				scale: '1.05'
			}
		}
	},
	/** 图片本体 */
	image: {
		width: '100%',
		height: '100%',
		objectFit: 'cover',
		userSelect: 'none'
	},
	/** 单图删除按钮（默认隐藏，悬停图片时显现） */
	deleteButton: {
		position: 'absolute',
		top: -8,
		right: -8,
		borderRadius: 9999,
		backgroundColor: '#fb2c36',
		padding: 6,
		/* 显隐由 motion.button 内联 opacity 动画控制（内联优先于类级 opacity，原版即如此） */
		boxShadow: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)',
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				scale: '1.05',
				backgroundColor: '#e40014'
			}
		}
	},
	/** 删除按钮图标 */
	closeIcon: {
		width: 12,
		height: 12,
		color: colors.white
	},
	/** 描述卡（软阴影由共享样式提供） */
	descriptionCard: {
		position: 'fixed',
		minHeight: 150,
		width: 200,
		cursor: 'pointer',
		padding: 24
	},
	/** 描述卡时间 */
	descriptionTime: {
		marginBottom: 8,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 描述卡正文 */
	descriptionText: {
		fontSize: 14,
		lineHeight: '20px'
	}
})

const buildUrlList = (pictures: Picture[]): UrlItem[] => {
	const result: UrlItem[] = []

	for (const [index, picture] of pictures.entries()) {
		if (picture.image) {
			result.push({
				url: picture.image,
				groupIndex: index,
				description: picture.description,
				uploadedAt: picture.uploadedAt,
				pictureId: picture.id,
				imageIndex: 'single'
			})
		}

		if (picture.images && picture.images.length > 0) {
			result.push(
				...picture.images.map((url, imageIndex) => ({
					url,
					groupIndex: index,
					description: picture.description,
					uploadedAt: picture.uploadedAt,
					pictureId: picture.id,
					imageIndex: imageIndex
				}))
			)
		}
	}

	return result
}

let lastZIndex = 10
const TOP_Z_INDEX = 9999

const formatUploadedAt = (uploadedAt?: string) => {
	if (!uploadedAt) return ''
	const date = new Date(uploadedAt)
	if (Number.isNaN(date.getTime())) return uploadedAt

	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')

	return `${year}-${month}-${day} ${hours}:${minutes}`
}

const loadSavedOffset = (url: string): { x: number; y: number } => {
	try {
		const saved = localStorage.getItem(`picture-offset-${url}`)
		if (saved) {
			const parsed = JSON.parse(saved)
			return { x: parsed.x || 0, y: parsed.y || 0 }
		}
	} catch (error) {
		console.error('Failed to load saved offset:', error)
	}
	return { x: 0, y: 0 }
}

const saveOffset = (url: string, offset: { x: number; y: number }) => {
	try {
		localStorage.setItem(`picture-offset-${url}`, JSON.stringify(offset))
	} catch (error) {
		console.error('Failed to save offset:', error)
	}
}

const FloatingImage = ({
	url,
	index,
	groupIndex,
	position,
	description,
	uploadedAt,
	pictureId,
	imageIndex,
	isEditMode,
	onDeleteSingle,
	onDeleteGroup
}: FloatingImageProps) => {
	const { centerX, centerY } = useCenterStore()
	const { maxSM, init } = useSize()
	const bodyRef = useRef(document.body)
	const mouseDownTimeRef = useRef<number | null>(null)
	const [zIndex, setZIndex] = useState(index)
	const [show, setShow] = useState(false)
	const [dragOffset, setDragOffset] = useState(() => loadSavedOffset(url))

	useEffect(() => {
		setTimeout(() => {
			setShow(true)
		}, 200 * index)
	}, [])

	const [originalSize, setOriginalSize] = useState<OriginalSize | null>(null)

	const displaySize = useMemo(() => {
		if (!originalSize) {
			return { width: 200, height: 200 }
		}

		const ratio = originalSize.width / originalSize.height
		const minRatio = 2 / 3
		const maxRatio = 3 / 2
		const clampedRatio = Math.min(Math.max(ratio, minRatio), maxRatio)

		const baseWidth = 200

		return {
			width: baseWidth,
			height: baseWidth / clampedRatio
		}
	}, [originalSize])

	const zoomedSize = useMemo(() => {
		if (!originalSize) {
			return { width: 200, height: 200 }
		}

		if (typeof window === 'undefined') {
			return originalSize
		}

		const padding = 24
		const maxWidth = document.documentElement.clientWidth - padding * 2
		const maxHeight = document.documentElement.clientHeight - padding * 2

		const scale = Math.min(maxWidth / originalSize.width, maxHeight / originalSize.height, 1)

		return {
			width: originalSize.width * scale,
			height: originalSize.height * scale
		}
	}, [originalSize])

	const [isZoomed, setIsZoomed] = useState(false)
	const dragStartOffsetRef = useRef({ x: 0, y: 0 })

	if (!position || !show) return null

	return (
		<>
			{isZoomed && (
				<motion.div
					onClick={() => {
						setIsZoomed(false)
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3 }}
					style={{ zIndex: TOP_Z_INDEX }}
					className={stylex.props(styles.zoomOverlay).className}
				/>
			)}
			<motion.div
				drag={!isZoomed}
				dragConstraints={bodyRef}
				dragMomentum={false}
				onDragStart={() => {
					if (!isZoomed) {
						dragStartOffsetRef.current = { ...dragOffset }
					}
				}}
				onMouseDown={event => {
					lastZIndex = lastZIndex + 1
					setZIndex(lastZIndex)
					mouseDownTimeRef.current = event.timeStamp
				}}
				onMouseUp={event => {
					if (mouseDownTimeRef.current !== null) {
						const duration = event.timeStamp - mouseDownTimeRef.current
						if (duration <= 150) {
							if (!isZoomed) {
								setIsZoomed(true)
							} else if (maxSM) {
								setIsZoomed(false)
							}
						}
					}
					mouseDownTimeRef.current = null
				}}
				onDragEnd={(_, info) => {
					if (!isZoomed) {
						const newOffset = {
							x: dragStartOffsetRef.current.x + info.offset.x,
							y: dragStartOffsetRef.current.y + info.offset.y
						}
						setDragOffset(newOffset)
						saveOffset(url, newOffset)
					}
				}}
				initial={{
					width: displaySize.width,
					height: displaySize.height,
					borderWidth: 8,
					zIndex,
					left: centerX + position.x,
					top: centerY + position.y,
					rotate: position.rotation,
					scale: 0.6,
					opacity: 0,
					x: dragOffset.x,
					y: dragOffset.y
				}}
				animate={
					isZoomed
						? {
								zIndex: TOP_Z_INDEX,
								left: centerX,
								top: centerY,
								rotate: 0,
								scale: 1,
								opacity: 1,
								x: 0,
								y: 0,
								width: zoomedSize.width,
								height: zoomedSize.height,
								borderWidth: maxSM ? 12 : 24
							}
						: {
								zIndex,
								scale: 1,
								opacity: 1,
								left: centerX + position.x,
								top: centerY + position.y,
								rotate: position.rotation,
								x: dragOffset.x,
								y: dragOffset.y,
								width: displaySize.width,
								height: displaySize.height,
								borderWidth: 8
							}
				}
				transition={{ type: 'tween', ease: 'easeOut' }}
				className={stylex.props(styles.floating, !isEditMode && !isZoomed && styles.floatingHover).className}>
				<motion.img
					src={url}
					onLoad={event => {
						const img = event.currentTarget
						setOriginalSize({ width: img.naturalWidth, height: img.naturalHeight })
					}}
					draggable={false}
					className={stylex.props(styles.image).className}
				/>
				{isEditMode && !isZoomed && (
					<motion.button
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						onClick={e => {
							e.stopPropagation()
							onDeleteSingle?.(pictureId, imageIndex)
						}}
						onMouseUp={e => {
							e.stopPropagation()
						}}
						{...stylex.props(styles.deleteButton)}
						style={{ zIndex: 1 }}>
						<svg xmlns='http://www.w3.org/2000/svg' {...stylex.props(styles.closeIcon)} fill='none' viewBox='0 0 24 24' stroke='currentColor'>
							<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
						</svg>
					</motion.button>
				)}
			</motion.div>

			{isZoomed && description && (
				<motion.div
					drag
					dragConstraints={maxSM ? undefined : bodyRef}
					dragMomentum={false}
					className={stylex.props(styles.descriptionCard, util.shadowSoft).className}
					style={{
						backgroundColor: siteContent.backgroundColors[groupIndex % siteContent.backgroundColors.length],
						zIndex: TOP_Z_INDEX + 1,
						right: maxSM ? 12 : centerX / 3,
						top: maxSM ? 12 : centerY
					}}
					initial={{ opacity: 0, scale: 0.4 }}
					animate={{ opacity: 1, scale: 1 }}>
					<div {...stylex.props(styles.descriptionTime)}>{formatUploadedAt(uploadedAt)}</div>
					<div {...stylex.props(styles.descriptionText)}>{description}</div>
				</motion.div>
			)}
		</>
	)
}

// 基于唯一标识生成稳定的位置
// 使用 ref 存储稳定的位置映射
const positionCacheRef = new Map<string, PositionedItem>()
const getStablePosition = (uniqueId: string, width: number, height: number): PositionedItem => {
	// 如果已有缓存，直接返回
	if (positionCacheRef.has(uniqueId)) {
		return positionCacheRef.get(uniqueId)!
	}

	// 使用 uniqueId 的哈希值来生成稳定的索引
	let hash = 0
	for (let i = 0; i < uniqueId.length; i++) {
		const char = uniqueId.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32bit integer
	}
	const stableIndex = Math.abs(hash) % 10000

	const maxRadius = Math.min(width, height) / 2 - 100
	const goldenAngle = Math.PI * (3 - Math.sqrt(5))

	// 使用稳定索引来计算位置，而不是数组索引
	const t = (stableIndex % 1000) / 1000
	const radius = Math.pow(t, 0.8) * maxRadius
	const angle = stableIndex * goldenAngle

	const baseX = radius * Math.cos(angle)
	const baseY = radius * Math.sin(angle)

	// 使用 uniqueId 生成稳定的 jitter，确保每次都是相同的位置
	const jitterSeed = Math.abs(hash) % 1000
	const jitterRadius = 12
	const jitterX = (jitterSeed % (jitterRadius * 2)) - jitterRadius
	const jitterY = ((jitterSeed * 7) % (jitterRadius * 2)) - jitterRadius

	const rotation = ((jitterSeed * 13) % 60) - 30

	const position = {
		x: baseX + jitterX,
		y: baseY + jitterY,
		rotation
	}

	positionCacheRef.set(uniqueId, position)
	return position
}

export const RandomLayout = ({ pictures, isEditMode = false, onDeleteSingle, onDeleteGroup }: RandomLayoutProps) => {
	useCenterInit()
	const { width, height } = useCenterStore()
	const [show, setShow] = useState(false)

	useEffect(() => {
		setTimeout(() => {
			setShow(true)
		}, 1000)
	}, [])

	const urls = useMemo(() => buildUrlList(pictures), [pictures])

	const pictureMap = useMemo(() => {
		const map = new Map<string, Picture>()
		pictures.forEach(picture => {
			map.set(picture.id, picture)
		})
		return map
	}, [pictures])

	if (!urls.length || !width || !height) {
		return null
	}

	if (!show) return null

	lastZIndex = urls.length + 11

	return (
		<>
			{urls.map((item, index) => {
				const picture = pictureMap.get(item.pictureId)
				const uniqueId = item.url
				const position = getStablePosition(uniqueId, width, height)

				return (
					<FloatingImage
						key={uniqueId}
						url={item.url}
						index={index}
						groupIndex={item.groupIndex}
						position={position}
						description={item.description}
						uploadedAt={item.uploadedAt}
						pictureId={item.pictureId}
						imageIndex={item.imageIndex}
						isEditMode={isEditMode}
						onDeleteSingle={onDeleteSingle}
						onDeleteGroup={picture ? () => onDeleteGroup?.(picture) : undefined}
					/>
				)
			})}
		</>
	)
}
