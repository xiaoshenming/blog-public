'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'
import { DialogModal } from '@/components/dialog-modal'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

type ConvertedMeta = {
	url: string
	size: number
}

type SelectedImage = {
	file: File
	preview: string
	width: number
	height: number
	converted?: ConvertedMeta
	converting?: boolean
}

const MAX_NAME_LENGTH = 32

function getFileExtension(name: string) {
	const idx = name.lastIndexOf('.')
	return idx >= 0 ? name.slice(idx) : ''
}

function formatFileName(name: string) {
	if (name.length <= MAX_NAME_LENGTH) return name
	const ext = getFileExtension(name)
	if (!ext) {
		return `${name.slice(0, MAX_NAME_LENGTH - 3)}...`
	}
	const maxBaseLength = Math.max(1, MAX_NAME_LENGTH - ext.length - 3)
	return `${name.slice(0, maxBaseLength)}...${ext}`
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes.toFixed(0)} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function fileToWebp(file: File, quality: number, maxWidth?: number) {
	const bitmap = await createImageBitmap(file)
	const canvas = document.createElement('canvas')

	let width = bitmap.width
	let height = bitmap.height

	if (maxWidth && width > maxWidth) {
		const ratio = maxWidth / width
		width = maxWidth
		height = Math.round(height * ratio)
	}

	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('无法初始化画布')
	ctx.drawImage(bitmap, 0, 0, width, height)
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			result => {
				if (result) resolve(result)
				else reject(new Error('无法生成 WEBP 文件'))
			},
			'image/webp',
			quality
		)
	})
	return blob
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；卡片基底复用共享定义） */
const styles = stylex.create({
	/** 对比弹窗内容宽度：满宽 */
	dialogFullWidth: {
		width: '100%'
	},
	/** 页面容器：顶部留白，小屏收窄 */
	page: {
		position: 'relative',
		paddingInline: 24,
		paddingTop: 128,
		paddingBottom: 48,
		fontSize: 14,
		lineHeight: '20px',
		'@media (width < 40rem)': {
			paddingTop: 112
		}
	},
	/** 内容列：限宽居中 */
	content: {
		marginInline: 'auto',
		display: 'flex',
		maxWidth: 768,
		flexDirection: 'column',
		gap: 24
	},
	/** 页头：居中标题组 */
	header: {
		display: 'flex',
		flexDirection: 'column',
		gap: 8,
		textAlign: 'center'
	},
	/** 小节标签：大写宽字距灰色小字 */
	caption: {
		color: colors.secondary,
		fontSize: 12,
		lineHeight: '16px',
		letterSpacing: '0.2em',
		textTransform: 'uppercase'
	},
	/** 页头主标题 */
	title: {
		fontSize: 24,
		lineHeight: '32px',
		fontWeight: 600
	},
	/** 页头副文案 */
	subtitle: {
		color: colors.secondary
	},
	/** 上传区：卡片基底上改相对定位与纵向排列，悬停出品牌描边与浮白 */
	uploadZone: {
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		textAlign: 'center',
		cursor: 'pointer',
		'@media (hover: hover)': {
			':hover': {
				borderColor: 'color-mix(in oklab, var(--color-brand) 20%, transparent)',
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		}
	},
	/** 上传区·拖拽态 */
	uploadDragging: {
		borderColor: colors.brand,
		backgroundColor: colors.white
	},
	/** 文件输入：隐藏 */
	fileInput: {
		display: 'none'
	},
	/** 上传区图标圈 */
	uploadIcon: {
		display: 'flex',
		width: 80,
		height: 80,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)',
		color: 'color-mix(in oklab, var(--color-brand) 60%, transparent)',
		fontSize: 30,
		lineHeight: '36px'
	},
	/** 上传区主文案 */
	uploadTitle: {
		fontSize: 16,
		lineHeight: '24px',
		fontWeight: 500
	},
	/** 上传区提示 */
	uploadHint: {
		color: colors.secondary,
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 卡片外壳：卡片基底上改相对定位 */
	cardShell: {
		position: 'relative'
	},
	/** 列表头行：两端对齐，底部细分隔线 */
	listHeader: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomStyle: 'solid',
		borderBottomColor: '#e2e8f0',
		paddingBottom: 12,
		color: colors.secondary,
		fontSize: 12,
		lineHeight: '16px',
		letterSpacing: '0.2em',
		textTransform: 'uppercase'
	},
	/** 列表项：横排布局 */
	listItem: {
		display: 'flex',
		alignItems: 'center',
		gap: 16,
		paddingBlock: 12
	},
	/** 列表项·项间分隔线（非末项） */
	listItemDivided: {
		borderBottomWidth: 1,
		borderBottomStyle: 'solid',
		borderBottomColor: '#e2e8f0'
	},
	/** 缩略图外框 */
	thumb: {
		width: 48,
		height: 48,
		overflow: 'hidden',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#e2e8f0',
		backgroundColor: '#f8fafc'
	},
	/** 缩略图铺满 */
	thumbImage: {
		width: '100%',
		height: '100%',
		objectFit: 'cover'
	},
	/** 文件信息列 */
	itemInfo: {
		display: 'flex',
		flex: '1',
		flexDirection: 'column'
	},
	/** 文件名 */
	itemName: {
		fontWeight: 500
	},
	/** 文件尺寸元信息 */
	itemMeta: {
		color: colors.secondary,
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 行内操作按钮组 */
	itemActions: {
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'flex-end',
		gap: 8,
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 转换按钮（次要） */
	convertBtn: {
		borderRadius: 9999,
		paddingInline: 12,
		paddingBlock: 4,
		fontWeight: 500,
		':disabled': {
			cursor: 'not-allowed',
			color: '#cad5e2'
		}
	},
	/** 品牌描边按钮（对比 / 下载） */
	brandOutlineBtn: {
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.brand,
		color: colors.brand,
		borderRadius: 9999,
		paddingInline: 12,
		paddingBlock: 4,
		fontWeight: 600,
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)'
			}
		}
	},
	/** 移除按钮（警示色） */
	removeBtn: {
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#ffcaca',
		paddingInline: 12,
		paddingBlock: 4,
		fontWeight: 500,
		color: '#ff667f',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#fff1f2'
			}
		}
	},
	/** 设置行：横排换行 */
	settingsRow: {
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 16
	},
	/** 设置主体列（纵向分组） */
	settingsMain: {
		display: 'flex',
		flex: '1',
		flexDirection: 'column',
		gap: 16
	},
	/** 质量滑杆行 */
	rangeRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		paddingTop: 8
	},
	/** 滑杆数值 */
	rangeValue: {
		width: 48,
		textAlign: 'right',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 灰色说明文字 */
	mutedText: {
		color: '#62748e',
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 复选行 */
	checkRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 12
	},
	/** 复选组 */
	checkGroup: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	/** 复选框 */
	checkbox: {
		width: 16,
		height: 16,
		borderRadius: 4,
		borderColor: '#cad5e2'
	},
	/** 复选标签：可点击 */
	checkLabel: {
		cursor: 'pointer'
	},
	/** 数字输入框 */
	numberInput: {
		width: 96,
		borderRadius: 4,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#e2e8f0',
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 底部操作按钮组 */
	actionGroup: {
		display: 'flex',
		flexWrap: 'wrap',
		gap: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 次要按钮（描边灰） */
	secondaryBtn: {
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#e2e8f0',
		paddingInline: 16,
		paddingBlock: 8,
		fontWeight: 500,
		':disabled': {
			cursor: 'not-allowed',
			borderColor: '#e2e8f0',
			color: '#cad5e2'
		}
	},
	/** 品牌描边按钮（大号） */
	brandOutlineLgBtn: {
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.brand,
		color: colors.brand,
		paddingInline: 16,
		paddingBlock: 8,
		fontWeight: 600,
		':disabled': {
			cursor: 'not-allowed',
			borderColor: '#e2e8f0',
			color: '#cad5e2'
		}
	},
	/** 对比弹窗：双列网格 */
	compareGrid: {
		display: 'grid',
		width: '100%',
		gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		gap: 16
	},
	/** 对比弹窗·右列 */
	comparePaneEnd: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-end',
		padding: 16
	},
	/** 对比弹窗·左列 */
	comparePaneStart: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
		padding: 16
	},
	/** 对比弹窗·图片标题 */
	compareLabel: {
		color: colors.secondary,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 对比弹窗·图片 */
	compareImage: {
		marginTop: 12,
		maxHeight: '90vh',
		borderRadius: 12,
		backgroundColor: '#f1f5f9'
	},
	/** 颜色过渡（transition-colors） */
	transitionColors: {
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 全属性过渡（transition） */
	transitionAll: {
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	}
})

export default function Page() {
	const { t } = useI18n()
	const [images, setImages] = useState<SelectedImage[]>([])
	const [quality, setQuality] = useState(0.8)
	const [limitMaxWidth, setLimitMaxWidth] = useState(false)
	const [maxWidth, setMaxWidth] = useState(1200)
	const [batchConverting, setBatchConverting] = useState(false)
	const [compareIndex, setCompareIndex] = useState<number | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const hasImages = images.length > 0
	const hasConvertible = images.length > 0
	const hasConverted = images.some(item => !!item.converted)
	const imagesRef = useRef<SelectedImage[]>([])
	const dragCounterRef = useRef(0)

	useEffect(() => {
		imagesRef.current = images
	}, [images])

	const handleFiles = useCallback(async (fileList: FileList | null) => {
		if (!fileList?.length) return
		const files = Array.from(fileList).filter(file => file.type.startsWith('image/'))
		if (!files.length) return

		const nextItems = await Promise.all(
			files.map(async file => {
				const preview = URL.createObjectURL(file)
				const bitmap = await createImageBitmap(file)
				return {
					file,
					preview,
					width: bitmap.width,
					height: bitmap.height
				}
			})
		)

		setImages(prev => {
			const deduped = [...prev]
			nextItems.forEach(item => {
				const exists = deduped.some(existing => {
					return existing.file.name === item.file.name && existing.file.size === item.file.size && existing.file.lastModified === item.file.lastModified
				})

				if (!exists) {
					deduped.push(item)
				} else {
					URL.revokeObjectURL(item.preview)
				}
			})
			return deduped
		})
	}, [])

	const handleDragEnter = useCallback((event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		event.stopPropagation()
		dragCounterRef.current += 1
		setIsDragging(true)
	}, [])

	const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		event.stopPropagation()
	}, [])

	const handleDragLeave = useCallback((event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		event.stopPropagation()
		dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
		if (dragCounterRef.current === 0) {
			setIsDragging(false)
		}
	}, [])

	const handleDrop = useCallback(
		(event: DragEvent<HTMLLabelElement>) => {
			event.preventDefault()
			event.stopPropagation()
			setIsDragging(false)
			dragCounterRef.current = 0
			handleFiles(event.dataTransfer?.files ?? null)
		},
		[handleFiles]
	)

	const totalSize = useMemo(() => {
		const bytes = images.reduce((acc, item) => acc + item.file.size, 0)
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`
	}, [images])

	const handleConvertImage = useCallback(
		async (index: number) => {
			const target = images[index]
			if (!target || target.converting) return
			setImages(prev => prev.map((item, idx) => (idx === index ? { ...item, converting: true } : item)))
			try {
				const blob = await fileToWebp(target.file, quality, limitMaxWidth ? maxWidth : undefined)
				const url = URL.createObjectURL(blob)
				setImages(prev =>
					prev.map((item, idx) => {
						if (idx !== index) return item
						if (item.converted?.url) {
							URL.revokeObjectURL(item.converted.url)
						}
						return {
							...item,
							converting: false,
							converted: {
								url,
								size: blob.size
							}
						}
					})
				)
			} catch (error) {
				console.error(error)
				alert(t('toolbox.convertFailed'))
				setImages(prev => prev.map((item, idx) => (idx === index ? { ...item, converting: false } : item)))
			}
		},
		[images, quality, limitMaxWidth, maxWidth, t]
	)

	const handleDownloadImage = useCallback(
		(index: number) => {
			const target = images[index]
			if (!target?.converted) return
			const link = document.createElement('a')
			const baseName = target.file.name.replace(/\.[^.]+$/, '')
			link.href = target.converted.url
			link.download = `${baseName}.webp`
			document.body.appendChild(link)
			link.click()
			link.remove()
		},
		[images]
	)

	const handleConvertAll = useCallback(async () => {
		if (!hasImages || batchConverting) return
		setBatchConverting(true)
		try {
			for (let i = 0; i < imagesRef.current.length; i += 1) {
				const current = imagesRef.current[i]
				if (!current) continue
				setImages(prev => prev.map((item, idx) => (idx === i ? { ...item, converting: true } : item)))
				const blob = await fileToWebp(current.file, quality, limitMaxWidth ? maxWidth : undefined)
				const url = URL.createObjectURL(blob)
				setImages(prev =>
					prev.map((item, idx) => {
						if (idx !== i) return item
						if (item.converted?.url) {
							URL.revokeObjectURL(item.converted.url)
						}
						return {
							...item,
							converting: false,
							converted: {
								url,
								size: blob.size
							}
						}
					})
				)
			}
		} catch (error) {
			console.error(error)
			alert(t('toolbox.batchConvertFailed'))
		} finally {
			setBatchConverting(false)
		}
	}, [batchConverting, hasImages, quality, limitMaxWidth, maxWidth, t])

	const handleDownloadAll = useCallback(() => {
		if (!hasConverted) return
		images.forEach(item => {
			if (!item.converted) return
			const link = document.createElement('a')
			const baseName = item.file.name.replace(/\.[^.]+$/, '')
			link.href = item.converted.url
			link.download = `${baseName}.webp`
			document.body.appendChild(link)
			link.click()
			link.remove()
		})
	}, [images, hasConverted])

	const handleRemoveImage = useCallback((index: number) => {
		setImages(prev => {
			const next = [...prev]
			const removed = next.splice(index, 1)[0]
			if (removed) {
				URL.revokeObjectURL(removed.preview)
				if (removed.converted?.url) {
					URL.revokeObjectURL(removed.converted.url)
				}
			}
			return next
		})
	}, [])

	const handleCompareImage = useCallback((index: number) => {
		setCompareIndex(index)
	}, [])

	const handleCloseCompare = useCallback(() => {
		setCompareIndex(null)
	}, [])

	useEffect(() => {
		return () => {
			imagesRef.current.forEach(item => {
				URL.revokeObjectURL(item.preview)
				if (item.converted?.url) {
					URL.revokeObjectURL(item.converted.url)
				}
			})
		}
	}, [])

	const uploadZoneSx = stylex.props(card.base, styles.uploadZone, styles.transitionColors, isDragging && styles.uploadDragging)

	return (
		<div {...stylex.props(styles.page)}>
			<div {...stylex.props(styles.content)}>
				<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: INIT_DELAY }} {...stylex.props(styles.header)}>
					<p {...stylex.props(styles.caption)}>Image Toolbox</p>
					<h1 {...stylex.props(styles.title)}>{t('toolbox.pngJpgToWebp')}</h1>
					<p {...stylex.props(styles.subtitle)}>{t('toolbox.convertFlowHint')}</p>
				</motion.div>

				<motion.label
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY + ANIMATION_DELAY }}
					onDragEnter={handleDragEnter}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					{...uploadZoneSx}>
					<input type='file' accept='image/*' multiple {...stylex.props(styles.fileInput)} onChange={event => handleFiles(event.target.files)} />
					<div {...stylex.props(styles.uploadIcon, styles.transitionAll)}>📷</div>
					<div>
						<p {...stylex.props(styles.uploadTitle)}>{t('toolbox.clickOrDragToUpload')}</p>
						<p {...stylex.props(styles.uploadHint)}>{t('toolbox.uploadFormatHint')}</p>
					</div>
				</motion.label>

				{hasImages && (
					<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(card.base, styles.cardShell)}>
						<div {...stylex.props(styles.listHeader)}>
							<span>{t('toolbox.selectedCount', { count: images.length })}</span>
							<span>{totalSize}</span>
						</div>
						<ul>
							{images.map((item, index) => {
								const { file, preview, converted, converting } = item
								return (
									<li key={`${file.name}-${index}`} {...stylex.props(styles.listItem, index < images.length - 1 && styles.listItemDivided)}>
										<div {...stylex.props(styles.thumb)}>
											<img src={preview} alt={file.name} {...stylex.props(styles.thumbImage)} />
										</div>
										<div {...stylex.props(styles.itemInfo)}>
											<p {...stylex.props(styles.itemName)}>{formatFileName(file.name)}</p>
											<p {...stylex.props(styles.itemMeta)}>
												{item.width} × {item.height} · {formatBytes(file.size)}
												{converted ? t('toolbox.convertedSize', { size: formatBytes(converted.size) }) : ''}
											</p>
										</div>
										<div {...stylex.props(styles.itemActions)}>
											<button onClick={() => handleConvertImage(index)} disabled={!!converting} {...stylex.props(styles.convertBtn, styles.transitionAll)}>
												{converting ? t('toolbox.converting') : converted ? t('toolbox.reconvert') : t('toolbox.convert')}
											</button>
											{converted ? (
												<>
													<button onClick={() => handleCompareImage(index)} {...stylex.props(styles.brandOutlineBtn, styles.transitionAll)}>
														{t('toolbox.compare')}
													</button>
													<button onClick={() => handleDownloadImage(index)} {...stylex.props(styles.brandOutlineBtn, styles.transitionAll)}>
														{t('toolbox.download')}
													</button>
												</>
											) : null}
											<button onClick={() => handleRemoveImage(index)} {...stylex.props(styles.removeBtn, styles.transitionAll)}>
												{t('toolbox.remove')}
											</button>
										</div>
									</li>
								)
							})}
						</ul>
					</motion.div>
				)}

				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY + 2 * ANIMATION_DELAY }}
					{...stylex.props(card.base, styles.cardShell)}>
					<div {...stylex.props(styles.settingsRow)}>
						<div {...stylex.props(styles.settingsMain)}>
							<div>
								<p {...stylex.props(styles.caption)}>{t('toolbox.quality')}</p>
								<div {...stylex.props(styles.rangeRow)}>
									<input
										type='range'
										min={0.3}
										max={1}
										step={0.05}
										value={quality}
										onChange={event => setQuality(parseFloat(event.target.value))}
										className='range-track'
									/>
									<span {...stylex.props(styles.rangeValue)}>{Math.round(quality * 100)}%</span>
								</div>
								<p {...stylex.props(styles.mutedText)}>{t('toolbox.qualityCodeHint', { quality: quality.toFixed(2) })}</p>
							</div>
							<div {...stylex.props(styles.checkRow)}>
								<div {...stylex.props(styles.checkGroup)}>
									<input
										type='checkbox'
										id='limit-max-width'
										checked={limitMaxWidth}
										onChange={event => setLimitMaxWidth(event.target.checked)}
										{...stylex.props(styles.checkbox)}
									/>
									<label htmlFor='limit-max-width' {...stylex.props(styles.caption, styles.checkLabel)}>
										{t('toolbox.limitMaxWidth')}
									</label>
								</div>
								{limitMaxWidth && (
									<div {...stylex.props(styles.checkGroup)}>
										<input
											type='number'
											min={100}
											max={10000}
											step={100}
											value={maxWidth}
											onChange={event => setMaxWidth(Math.max(100, parseInt(event.target.value) || 1200))}
											{...stylex.props(styles.numberInput)}
										/>
										<span {...stylex.props(styles.mutedText)}>px</span>
									</div>
								)}
							</div>
						</div>
						<div {...stylex.props(styles.actionGroup)}>
							<button onClick={handleConvertAll} disabled={!hasConvertible || batchConverting} {...stylex.props(styles.secondaryBtn, styles.transitionAll)}>
								{batchConverting ? t('toolbox.convertingAll') : t('toolbox.convertAll')}
							</button>
							<button onClick={handleDownloadAll} disabled={!hasConverted} {...stylex.props(styles.brandOutlineLgBtn, styles.transitionAll)}>
								{t('toolbox.downloadAll')}
							</button>
						</div>
					</div>
				</motion.div>
			</div>

			{compareIndex !== null && images[compareIndex]?.converted && (
				<DialogModal open={true} onClose={handleCloseCompare} style={styles.dialogFullWidth}>
					<div {...stylex.props(styles.compareGrid)} onClick={handleCloseCompare}>
						<div {...stylex.props(styles.comparePaneEnd)}>
							<div>
								<div {...stylex.props(styles.compareLabel)}>{t('toolbox.originalWithSize', { size: formatBytes(images[compareIndex].file.size) })}</div>
								<img src={images[compareIndex].preview} alt='Original' {...stylex.props(styles.compareImage)} />
							</div>
						</div>
						<div {...stylex.props(styles.comparePaneStart)}>
							<div>
								<div {...stylex.props(styles.compareLabel)}>{t('toolbox.webpWithSize', { size: formatBytes(images[compareIndex].converted!.size) })}</div>
								<img src={images[compareIndex].converted!.url} alt='Converted' {...stylex.props(styles.compareImage)} />
							</div>
						</div>
					</div>
				</DialogModal>
			)}
		</div>
	)
}
