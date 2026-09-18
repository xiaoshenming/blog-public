'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import { DialogModal } from '@/components/dialog-modal'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'
import type { ImageItem } from '../../projects/components/image-upload-dialog'

interface UploadDialogProps {
	onClose: () => void
	onSubmit: (payload: { images: ImageItem[]; description: string }) => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；纵向间距分摊到非末项子块） */
const styles = stylex.create({
	/** 弹窗宽度：小屏铺满 */
	dialogWidth: {
		width: 448,
		'@media (width < 40rem)': {
			width: '100%'
		}
	},
	/** 标题（同时承担与下一区块的纵向间距） */
	title: {
		marginBottom: 16,
		fontSize: 20,
		lineHeight: '28px',
		fontWeight: 700
	},
	/** 图片选择区（同时承担与下一区块的纵向间距） */
	uploadSection: {
		marginBottom: 16
	},
	/** 字段标签 */
	label: {
		marginBottom: 8,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		color: colors.secondary
	},
	fileInput: {
		display: 'none'
	},
	/** 上传框：虚线描边，悬停浅底 */
	uploadBox: {
		display: 'flex',
		height: 128,
		cursor: 'pointer',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: '#d1d5dc',
		backgroundColor: '#f9fafb',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)'
			}
		}
	},
	/** 上传框内文案容器 */
	uploadHint: {
		textAlign: 'center'
	},
	plusIcon: {
		marginInline: 'auto',
		marginBottom: 4,
		width: 32,
		height: 32,
		color: '#6a7282'
	},
	hintText: {
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 预览区：灰阶渐变底 */
	previewArea: {
		position: 'relative',
		display: 'flex',
		height: 160,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'visible',
		borderRadius: 12,
		backgroundImage: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)'
	},
	/** 预览图卡：白边白底 + 大投影 */
	previewCard: {
		position: 'absolute',
		height: 128,
		width: 176,
		overflow: 'hidden',
		borderRadius: 12,
		borderWidth: 4,
		borderStyle: 'solid',
		borderColor: colors.white,
		backgroundColor: colors.white,
		boxShadow: '0 20px 25px -5px rgb(0 0 0 / 10%), 0 8px 10px -6px rgb(0 0 0 / 10%)',
		transitionProperty: 'transform, translate, scale, rotate',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 预览图卡·左：外移下倾 */
	previewCardLeft: {
		left: -16,
		translate: '0px -8px',
		rotate: '-6deg'
	},
	/** 预览图卡·中：置顶微倾 */
	previewCardMid: {
		zIndex: 20,
		rotate: '1deg'
	},
	/** 预览图卡·右：外移上倾 */
	previewCardRight: {
		right: 0,
		translate: '0px 8px',
		rotate: '6deg'
	},
	previewImage: {
		width: '100%',
		height: '100%',
		objectFit: 'cover'
	},
	/** 数量角标 */
	countBadge: {
		position: 'absolute',
		right: 16,
		bottom: -8,
		borderRadius: 9999,
		backgroundColor: 'rgb(0 0 0 / 70%)',
		paddingInline: 12,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.white,
		boxShadow: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)'
	},
	/** 已选计数行 */
	selectionRow: {
		marginTop: 12,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	/** 继续添加按钮 */
	addMoreButton: {
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: colors.white,
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px',
		color: '#364153',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#f9fafb'
			}
		}
	},
	/** 描述区（同时承担与下一区块的纵向间距） */
	descriptionSection: {
		marginBottom: 16
	},
	/** 描述输入框 */
	descriptionInput: {
		width: '100%',
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: '#f9fafb',
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 操作按钮行 */
	actions: {
		marginTop: 16,
		display: 'flex',
		gap: 12
	},
	/** 取消按钮 */
	cancelButton: {
		flex: '1',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: colors.white,
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#f9fafb'
			}
		}
	},
	/** 品牌按钮的弹性宽度与居中覆盖（横向内边距同品牌按钮默认值） */
	submitButton: {
		flex: '1',
		justifyContent: 'center'
	}
})

export default function UploadDialog({ onClose, onSubmit }: UploadDialogProps) {
	const [description, setDescription] = useState('')
	const [images, setImages] = useState<ImageItem[]>([])
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || [])
		if (files.length === 0) return

		const nextImages: ImageItem[] = []

		for (const file of files) {
			if (!file.type.startsWith('image/')) {
				toast.error('请选择图片文件')
				return
			}

			const previewUrl = URL.createObjectURL(file)
			nextImages.push({
				type: 'file',
				file,
				previewUrl
			})
		}

		setImages(nextImages)
	}

	const handleSubmit = () => {
		if (images.length === 0) {
			toast.error('请至少选择一张图片')
			return
		}

		onSubmit({
			images,
			description
		})

		setImages([])
		setDescription('')
		onClose()
	}

	const handleClose = () => {
		images.forEach(image => {
			if (image.type === 'file') {
				URL.revokeObjectURL(image.previewUrl)
			}
		})
		setImages([])
		setDescription('')
		onClose()
	}

	return (
		<DialogModal open onClose={handleClose} style={[card.base, styles.dialogWidth]}>
			<div>
				<h2 {...stylex.props(styles.title)}>上传图片</h2>

				<div {...stylex.props(styles.uploadSection)}>
					<label {...stylex.props(styles.label)}>选择图片（可多选）</label>
					<input ref={fileInputRef} type='file' accept='image/*' multiple {...stylex.props(styles.fileInput)} onChange={handleFileSelect} />

					{images.length === 0 ? (
						<div
							onClick={() => fileInputRef.current?.click()}
							{...stylex.props(styles.uploadBox)}>
							<div {...stylex.props(styles.uploadHint)}>
								<Plus {...stylex.props(styles.plusIcon)} />
								<p {...stylex.props(styles.hintText)}>点击选择图片</p>
							</div>
						</div>
					) : (
						<>
							<div {...stylex.props(styles.previewArea)}>
								{images.slice(0, 3).map((image, index) =>
									image.type === 'file' ? (
										<div
											key={index}
											{...stylex.props(styles.previewCard, index === 0 ? styles.previewCardLeft : index === 1 ? styles.previewCardMid : styles.previewCardRight)}>
											<img src={image.previewUrl} alt={`preview-${index}`} {...stylex.props(styles.previewImage)} />
										</div>
									) : null
								)}

								{images.length > 3 && (
									<div {...stylex.props(styles.countBadge)}>共 {images.length} 张</div>
								)}
							</div>

							<div {...stylex.props(styles.selectionRow)}>
								<span {...stylex.props(styles.hintText)}>已选择 {images.length} 张图片</span>
								<button
									type='button'
									onClick={() => fileInputRef.current?.click()}
									{...stylex.props(styles.addMoreButton)}>
									继续添加
								</button>
							</div>
						</>
					)}
				</div>

				<div {...stylex.props(styles.descriptionSection)}>
					<label {...stylex.props(styles.label)}>描述（可选，应用于本次所有图片）</label>
					<textarea
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder='这组图片的说明...'
						{...stylex.props(styles.descriptionInput)}
						rows={3}
					/>
				</div>

				<div {...stylex.props(styles.actions)}>
					<button
						type='button'
						onClick={handleClose}
						{...stylex.props(styles.cancelButton)}>
						取消
					</button>
					<button type='button' onClick={handleSubmit} {...stylex.props(brandBtn.base, styles.submitButton)}>
						确认上传
					</button>
				</div>
			</div>
		</DialogModal>
	)
}
