'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import * as stylex from '@stylexjs/stylex'
import { Select } from '@/components/select'
import { hashFileSHA256 } from '@/lib/file-utils'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import type { SiteContent } from '../../stores/config-store'
import type { SocialButtonImageUploads } from './types'

type SocialButtonType =
	| 'github'
	| 'juejin'
	| 'email'
	| 'link'
	| 'x'
	| 'tg'
	| 'wechat'
	| 'facebook'
	| 'tiktok'
	| 'instagram'
	| 'weibo'
	| 'xiaohongshu'
	| 'zhihu'
	| 'bilibili'
	| 'qq'

interface SocialButtonConfig {
	id: string
	type: SocialButtonType
	value: string
	label?: string
	order: number
}

interface SocialButtonsSectionProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
	socialButtonImageUploads: SocialButtonImageUploads
	setSocialButtonImageUploads: React.Dispatch<React.SetStateAction<SocialButtonImageUploads>>
}

/** 原 Tailwind → StyleX 对照（space-y-2 改为弹性列 + 间距 8） */
const styles = stylex.create({
	/** Select 触发器宽度 w-24 = 96px */
	selectW24: {
		width: 96
	},
	label: {
		marginBottom: 8,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	emptyHint: {
		marginBottom: 8,
		fontSize: 12,
		lineHeight: '16px',
		color: '#6a7282'
	},
	list: {
		display: 'flex',
		flexDirection: 'column',
		gap: 8,
		whiteSpace: 'nowrap'
	},
	row: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	fileInput: {
		display: 'none'
	},
	/** 微信/QQ 行内输入与预览区 */
	imageArea: {
		display: 'flex',
		flex: '1',
		alignItems: 'center',
		gap: 8
	},
	relative: {
		position: 'relative'
	},
	previewImage: {
		height: 40,
		width: 40,
		borderRadius: 8,
		objectFit: 'cover'
	},
	/** 半透明次级背景输入框（自适应/固定宽度用变体覆盖） */
	fieldBase: {
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
	fieldFlex: {
		flex: '1'
	},
	fieldWide: {
		width: 128
	},
	fieldNarrow: {
		width: 64,
		paddingInline: 8
	},
	removeImageButton: {
		fontSize: 12,
		lineHeight: '16px',
		color: '#fb2c36',
		'@media (hover: hover)': {
			':hover': {
				color: '#e40014'
			}
		}
	},
	/** 卡片底色描边按钮 */
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
	},
	actions: {
		display: 'flex',
		gap: 4
	},
	moveButton: {
		borderRadius: 4,
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#f3f4f6'
			}
		},
		':disabled': {
			cursor: 'not-allowed',
			color: '#d1d5dc'
		}
	},
	removeButton: {
		borderRadius: 4,
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		color: '#fb2c36',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#fef2f2'
			}
		}
	},
	addButton: {
		display: 'flex',
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: colors.border,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				borderColor: 'color-mix(in oklab, var(--color-brand) 60%, transparent)',
				backgroundColor: colors.card
			}
		}
	}
})

export function SocialButtonsSection({ formData, setFormData, socialButtonImageUploads, setSocialButtonImageUploads }: SocialButtonsSectionProps) {
	const { t } = useI18n()
	const buttons = (formData.socialButtons || []) as SocialButtonConfig[]
	const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

	const handleAddButton = () => {
		const newId = `button-${Date.now()}`
		const newButton = {
			id: newId,
			type: 'link' as const,
			value: '',
			label: '',
			order: buttons.length + 1
		}
		setFormData(prev => ({
			...prev,
			socialButtons: [...(prev.socialButtons || []), newButton]
		}))
	}

	const handleUpdateButton = (id: string, updates: Partial<SocialButtonConfig>) => {
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn => (btn.id === id ? { ...btn, ...updates, label: updates.label ?? btn.label ?? '' } : btn))
		}))
	}

	const handleRemoveButton = (id: string) => {
		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).filter(btn => btn.id !== id)
		}))
	}

	const handleMoveButton = (id: string, direction: 'up' | 'down') => {
		const currentIndex = buttons.findIndex(btn => btn.id === id)
		if (currentIndex === -1) return

		const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
		if (newIndex < 0 || newIndex >= buttons.length) return

		const newButtons = [...buttons]
		;[newButtons[currentIndex], newButtons[newIndex]] = [newButtons[newIndex], newButtons[currentIndex]]

		const updatedButtons = newButtons.map((btn, index) => ({
			...btn,
			order: index + 1,
			label: btn.label ?? ''
		}))

		setFormData(prev => ({
			...prev,
			socialButtons: updatedButtons
		}))
	}

	const handleImageSelect = async (buttonId: string, e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (!file.type.startsWith('image/')) {
			toast.error(t('config.selectImageFile'))
			return
		}

		const hash = await hashFileSHA256(file)
		const ext = file.name.split('.').pop() || 'png'
		const targetPath = `/images/social-buttons/${hash}.${ext}`
		const previewUrl = URL.createObjectURL(file)

		setSocialButtonImageUploads(prev => ({
			...prev,
			[buttonId]: { type: 'file', file, previewUrl, hash }
		}))

		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn => (btn.id === buttonId ? { ...btn, value: targetPath } : btn))
		}))

		if (e.currentTarget) e.currentTarget.value = ''
	}

	const handleRemoveImage = (buttonId: string) => {
		const uploadItem = socialButtonImageUploads[buttonId]
		if (uploadItem?.type === 'file') {
			URL.revokeObjectURL(uploadItem.previewUrl)
		}

		setSocialButtonImageUploads(prev => {
			const next = { ...prev }
			delete next[buttonId]
			return next
		})

		setFormData(prev => ({
			...prev,
			socialButtons: (prev.socialButtons || []).map(btn => (btn.id === buttonId ? { ...btn, value: '' } : btn))
		}))
	}

	const sortedButtons = [...buttons].sort((a, b) => a.order - b.order)

	return (
		<div>
			<label {...stylex.props(styles.label)}>{t('config.socialButtons')}</label>
			{buttons.length === 0 && <p {...stylex.props(styles.emptyHint)}>{t('config.socialEmptyHint')}</p>}
			<div {...stylex.props(styles.list)}>
				{sortedButtons.map((button, index) => (
					<div key={button.id} {...stylex.props(styles.row)}>
						<Select
							value={button.type}
							onChange={value => handleUpdateButton(button.id, { type: value as SocialButtonType })}
							style={styles.selectW24}
							options={[
								{ value: 'github', label: 'Github' },
								{ value: 'juejin', label: t('config.socialJuejin') },
								{ value: 'email', label: t('config.socialEmail') },
								{ value: 'x', label: 'X' },
								{ value: 'tg', label: 'Telegram' },
								{ value: 'wechat', label: t('config.socialWechat') },
								{ value: 'facebook', label: 'Facebook' },
								{ value: 'tiktok', label: 'TikTok' },
								{ value: 'instagram', label: 'Instagram' },
								{ value: 'weibo', label: t('config.socialWeibo') },
								{ value: 'xiaohongshu', label: t('config.socialXiaohongshu') },
								{ value: 'zhihu', label: t('config.socialZhihu') },
								{ value: 'bilibili', label: t('config.socialBilibili') },
								{ value: 'qq', label: 'QQ' },
								{ value: 'link', label: t('config.socialLink') }
							]}
						/>
						{button.type === 'wechat' || button.type === 'qq' ? (
							<div {...stylex.props(styles.imageArea)}>
								<input
									ref={el => {
										imageInputRefs.current[button.id] = el
									}}
									type='file'
									accept='image/*'
									{...stylex.props(styles.fileInput)}
									onChange={e => handleImageSelect(button.id, e)}
								/>
								{socialButtonImageUploads[button.id]?.type === 'file' ? (
									<div {...stylex.props(styles.imageArea, styles.relative)}>
										<img
											src={(socialButtonImageUploads[button.id] as { type: 'file'; file: File; previewUrl: string; hash?: string }).previewUrl}
											alt='preview'
											{...stylex.props(styles.previewImage)}
										/>
										<input
											type='text'
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? t('config.wechatValuePlaceholder') : t('config.qqValuePlaceholder')}
											{...stylex.props(styles.fieldBase, styles.fieldFlex)}
										/>
										<button type='button' onClick={() => handleRemoveImage(button.id)} {...stylex.props(styles.removeImageButton)}>
											{t('config.deleteImage')}
										</button>
									</div>
								) : button.value && button.value.startsWith('/images/social-buttons/') ? (
									<div {...stylex.props(styles.imageArea, styles.relative)}>
										<img src={button.value} alt='preview' {...stylex.props(styles.previewImage)} />
										<input
											type='text'
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? t('config.wechatValuePlaceholder') : t('config.qqValuePlaceholder')}
											{...stylex.props(styles.fieldBase, styles.fieldFlex)}
										/>
									</div>
								) : (
									<>
										<input
											type='text'
											value={button.value}
											onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
											placeholder={button.type === 'wechat' ? t('config.wechatValuePlaceholder') : t('config.qqValuePlaceholder')}
											{...stylex.props(styles.fieldBase, styles.fieldFlex)}
										/>
										<button type='button' onClick={() => imageInputRefs.current[button.id]?.click()} {...stylex.props(styles.cardButton)}>
											{t('config.uploadImage')}
										</button>
									</>
								)}
							</div>
						) : (
							<input
								type={button.type === 'email' ? 'email' : 'url'}
								value={button.value}
								onChange={e => handleUpdateButton(button.id, { value: e.target.value })}
								placeholder={button.type === 'email' ? 'example@email.com' : 'https://example.com'}
								{...stylex.props(styles.fieldBase, styles.fieldFlex)}
							/>
						)}
						{button.type !== 'email' && button.type !== 'wechat' && button.type !== 'qq' && (
							<input
								type='text'
								value={button.label || ''}
								onChange={e => handleUpdateButton(button.id, { label: e.target.value })}
								placeholder={t('config.labelOptional')}
								{...stylex.props(styles.fieldBase, styles.fieldWide)}
							/>
						)}
						<input
							type='number'
							value={button.order}
							onChange={e => {
								const order = parseInt(e.target.value, 10)
								if (!isNaN(order) && order > 0) {
									handleUpdateButton(button.id, { order })
								}
							}}
							min={1}
							placeholder={t('config.order')}
							{...stylex.props(styles.fieldBase, styles.fieldNarrow)}
						/>
						<div {...stylex.props(styles.actions)}>
							<button type='button' onClick={() => handleMoveButton(button.id, 'up')} disabled={index === 0} {...stylex.props(styles.moveButton)}>
								↑
							</button>
							<button
								type='button'
								onClick={() => handleMoveButton(button.id, 'down')}
								disabled={index === sortedButtons.length - 1}
								{...stylex.props(styles.moveButton)}>
								↓
							</button>
							<button type='button' onClick={() => handleRemoveButton(button.id)} {...stylex.props(styles.removeButton)}>
								{t('config.delete')}
							</button>
						</div>
					</div>
				))}
				<button type='button' onClick={handleAddButton} {...stylex.props(styles.addButton)}>
					{t('config.addSocialButton')}
				</button>
			</div>
		</div>
	)
}
