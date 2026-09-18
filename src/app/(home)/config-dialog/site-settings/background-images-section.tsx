'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import * as stylex from '@stylexjs/stylex'
import { hashFileSHA256 } from '@/lib/file-utils'
import { hoverGroup } from '@/styles/shared/markers.stylex'
import { colors } from '@/styles/tokens.stylex'
import type { SiteContent } from '../../stores/config-store'
import type { BackgroundImageUploads, FileItem } from './types'

interface BackgroundImagesSectionProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
	backgroundImageUploads: BackgroundImageUploads
	setBackgroundImageUploads: React.Dispatch<React.SetStateAction<BackgroundImageUploads>>
}

/** 原 Tailwind → StyleX 对照（group 悬停显隐改用 marker 祖先选择器；选中态描边与投影合并为单层阴影） */
const styles = stylex.create({
	header: {
		marginBottom: 8,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	label: {
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	clearButton: {
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 12,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		fontWeight: 500,
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		}
	},
	fileInput: {
		display: 'none'
	},
	grid: {
		display: 'grid',
		gap: 12,
		gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
		'@media (width < 40rem)': {
			gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
		}
	},
	itemWrap: {
		position: 'relative'
	},
	/** 缩略图按钮（选中态：2px 品牌描边 + 卡片投影） */
	thumbButton: {
		display: 'block',
		width: '100%',
		overflow: 'hidden',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	thumbActive: {
		boxShadow: '0 0 0 2px var(--color-brand), 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)'
	},
	thumbIdle: {
		'@media (hover: hover)': {
			':hover': {
				borderColor: 'color-mix(in oklab, var(--color-brand) 60%, transparent)'
			}
		}
	},
	thumbImage: {
		height: 96,
		width: '100%',
		objectFit: 'cover'
	},
	badge: {
		pointerEvents: 'none',
		position: 'absolute',
		top: 4,
		left: 4,
		borderRadius: 9999,
		backgroundColor: colors.brand,
		paddingInline: 8,
		paddingBlock: 2,
		fontSize: 10,
		color: colors.white,
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)'
	},
	removeButton: {
		position: 'absolute',
		top: 4,
		right: 4,
		display: {
			default: 'none',
			[stylex.when.ancestor(':hover', hoverGroup)]: 'block'
		},
		borderRadius: 9999,
		backgroundColor: 'rgb(255 255 255 / 90%)',
		paddingInline: 6,
		paddingBlock: 2,
		fontSize: 10,
		color: colors.secondary,
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)'
	},
	addCell: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center'
	},
	addButton: {
		display: 'flex',
		height: 96,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 40%)',
		fontSize: 24,
		lineHeight: '32px',
		color: '#99a1af',
		'@media (hover: hover)': {
			':hover': {
				borderColor: 'color-mix(in oklab, var(--color-brand) 60%, transparent)',
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		}
	},
	urlRow: {
		marginTop: 12,
		display: 'flex',
		gap: 8
	},
	urlInput: {
		flex: '1',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)',
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px'
	},
	cardButton: {
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: colors.card,
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px',
		fontWeight: 500
	}
})

export function BackgroundImagesSection({ formData, setFormData, backgroundImageUploads, setBackgroundImageUploads }: BackgroundImagesSectionProps) {
	const backgroundInputRef = useRef<HTMLInputElement>(null)
	const [backgroundUrlInput, setBackgroundUrlInput] = useState('')

	const handleBackgroundFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		const hash = await hashFileSHA256(file)
		const ext = file.name.split('.').pop() || 'png'
		const id = hash
		const targetPath = `/images/background/${id}.${ext}`
		const previewUrl = URL.createObjectURL(file)

		setBackgroundImageUploads(prev => ({
			...prev,
			[id]: { type: 'file', file, previewUrl, hash }
		}))

		setFormData(prev => {
			const existing = (prev.backgroundImages ?? []) as Array<{ id: string; url: string }>
			const filtered = existing.filter(item => item.id !== id)
			const backgroundImages = [...filtered, { id, url: targetPath }]
			return {
				...prev,
				backgroundImages: backgroundImages as any,
				currentBackgroundImageId: prev.currentBackgroundImageId || id
			}
		})

		setBackgroundUrlInput('')
		if (e.currentTarget) e.currentTarget.value = ''
	}

	const handleBackgroundUrlSubmit = () => {
		if (!backgroundUrlInput.trim()) {
			toast.error('请输入图片 URL')
			return
		}

		const id = `url-${Date.now()}`
		setFormData(prev => {
			const existing = (prev.backgroundImages ?? []) as Array<{ id: string; url: string }>
			const backgroundImages = [...existing, { id, url: backgroundUrlInput.trim() }]
			return {
				...prev,
				backgroundImages: backgroundImages as any,
				currentBackgroundImageId: prev.currentBackgroundImageId || id
			}
		})

		setBackgroundUrlInput('')
	}

	const handleSetCurrentBackgroundImage = (id: string) => {
		setFormData(prev => ({
			...prev,
			currentBackgroundImageId: id
		}))
	}

	const handleClearBackgroundImage = () => {
		setFormData(prev => ({
			...prev,
			currentBackgroundImageId: ''
		}))
	}

	const handleRemoveBackgroundImage = (id: string) => {
		const uploadItem = backgroundImageUploads[id]
		if (uploadItem?.type === 'file') {
			URL.revokeObjectURL(uploadItem.previewUrl)
		}

		setBackgroundImageUploads(prev => {
			const next = { ...prev }
			delete next[id]
			return next
		})

		setFormData(prev => {
			const existing = (prev.backgroundImages ?? []) as Array<{ id: string; url: string }>
			const backgroundImages = existing.filter(item => item.id !== id)
			const isCurrent = prev.currentBackgroundImageId === id
			return {
				...prev,
				backgroundImages: backgroundImages as any,
				currentBackgroundImageId: isCurrent ? backgroundImages[0]?.id || '' : prev.currentBackgroundImageId
			}
		})
	}

	return (
		<div>
			<div {...stylex.props(styles.header)}>
				<label {...stylex.props(styles.label)}>背景图片</label>
				{formData.currentBackgroundImageId && formData.currentBackgroundImageId.trim() && (
					<button
						type='button'
						onClick={handleClearBackgroundImage}
						{...stylex.props(styles.clearButton)}>
						取消设置
					</button>
				)}
			</div>
			<input ref={backgroundInputRef} type='file' accept='image/*' {...stylex.props(styles.fileInput)} onChange={handleBackgroundFileSelect} />

			<div {...stylex.props(styles.grid)}>
				{((formData.backgroundImages ?? []) as Array<{ id: string; url: string }>)
					.filter(item => item.url && item.url.trim() !== '')
					.map(item => {
						const isActive = formData.currentBackgroundImageId === item.id
						const uploadItem = backgroundImageUploads[item.id]
						const src = uploadItem?.type === 'file' ? uploadItem.previewUrl : item.url

						return (
							<div key={item.id} {...stylex.props(styles.itemWrap, hoverGroup)}>
								<button
									type='button'
									onClick={() => handleSetCurrentBackgroundImage(item.id)}
									{...stylex.props(styles.thumbButton, isActive ? styles.thumbActive : styles.thumbIdle)}>
									<img src={src} alt='background preview' {...stylex.props(styles.thumbImage)} />
								</button>
								{isActive && (
									<span {...stylex.props(styles.badge)}>当前使用</span>
								)}
								<button
									type='button'
									onClick={() => handleRemoveBackgroundImage(item.id)}
									{...stylex.props(styles.removeButton)}>
									删除
								</button>
							</div>
						)
					})}
				<div {...stylex.props(styles.addCell)}>
					<button
						type='button'
						onClick={() => backgroundInputRef.current?.click()}
						{...stylex.props(styles.addButton)}>
						+
					</button>
				</div>
			</div>
			<div {...stylex.props(styles.urlRow)}>
				<input
					type='url'
					value={backgroundUrlInput}
					onChange={e => setBackgroundUrlInput(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter') {
							e.preventDefault()
							handleBackgroundUrlSubmit()
						}
					}}
					placeholder='输入图片 URL'
					{...stylex.props(styles.urlInput)}
				/>
				<button type='button' onClick={handleBackgroundUrlSubmit} {...stylex.props(styles.cardButton)}>
					添加 URL
				</button>
			</div>
		</div>
	)
}
