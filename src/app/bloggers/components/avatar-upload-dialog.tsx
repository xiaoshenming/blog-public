'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import { DialogModal } from '@/components/dialog-modal'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'

export type AvatarItem = { type: 'url'; url: string } | { type: 'file'; file: File; previewUrl: string; hash?: string }

interface AvatarUploadDialogProps {
	currentAvatar?: string
	onClose: () => void
	onSubmit: (avatar: AvatarItem) => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；space-y 分摊到三个非末项子块） */
const styles = stylex.create({
	title: {
		marginBottom: 16,
		fontSize: 20,
		lineHeight: '28px',
		fontWeight: 700
	},
	/** 上传区（space-y 首项） */
	uploadSection: {
		marginBottom: 16
	},
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
	/** 上传框（悬停变灰加深） */
	uploadBox: {
		marginInline: 'auto',
		display: 'flex',
		height: 128,
		width: 128,
		cursor: 'pointer',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#e5e7eb'
			}
		}
	},
	previewImage: {
		height: '100%',
		width: '100%',
		borderRadius: 8,
		objectFit: 'cover'
	},
	uploadHint: {
		textAlign: 'center'
	},
	plusIcon: {
		marginInline: 'auto',
		marginBottom: 4,
		width: 32,
		height: 32,
		color: colors.secondary
	},
	hintText: {
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 分隔线区（space-y 次项） */
	divider: {
		position: 'relative',
		marginBottom: 16
	},
	dividerLineWrap: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center'
	},
	dividerLine: {
		width: '100%',
		borderTopWidth: 1,
		borderTopStyle: 'solid',
		borderTopColor: '#d1d5dc'
	},
	dividerLabelWrap: {
		position: 'relative',
		display: 'flex',
		justifyContent: 'center',
		fontSize: 14,
		lineHeight: '20px'
	},
	dividerLabel: {
		borderRadius: 8,
		backgroundColor: colors.white,
		paddingInline: 16,
		paddingBlock: 4,
		color: colors.secondary
	},
	/** URL 区（space-y 末项之前） */
	urlSection: {
		marginBottom: 16
	},
	/** URL 输入框（聚焦时品牌色描边） */
	urlInput: {
		width: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: '#e5e7eb',
		paddingInline: 16,
		paddingBlock: 8,
		':focus': {
			boxShadow: '0 0 0 2px var(--color-brand)',
			outlineStyle: 'none'
		}
	},
	actions: {
		display: 'flex',
		gap: 12,
		paddingTop: 8
	},
	/** 品牌按钮覆盖：弹性宽度 + 居中 + 独立圆角/内边距（同次合并后写覆盖品牌按钮默认值） */
	confirmButton: {
		flex: '1',
		justifyContent: 'center',
		borderRadius: 8,
		paddingInline: 24,
		paddingBlock: 10
	},
	cancelButton: {
		flex: '1',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: colors.white,
		paddingInline: 24,
		paddingBlock: 10,
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#f9fafb'
			}
		}
	}
})

export default function AvatarUploadDialog({ currentAvatar, onClose, onSubmit }: AvatarUploadDialogProps) {
	const [urlInput, setUrlInput] = useState(currentAvatar || '')
	const [previewFile, setPreviewFile] = useState<{ file: File; previewUrl: string } | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		const previewUrl = URL.createObjectURL(file)
		setPreviewFile({ file, previewUrl })
		setUrlInput('')
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (previewFile) {
			onSubmit({
				type: 'file',
				file: previewFile.file,
				previewUrl: previewFile.previewUrl
			})
		} else if (urlInput.trim()) {
			onSubmit({
				type: 'url',
				url: urlInput.trim()
			})
		} else {
			toast.error('请上传图片或输入 URL')
			return
		}

		setPreviewFile(null)
		setUrlInput(currentAvatar || '')
		onClose()
	}

	const handleClose = () => {
		if (previewFile) {
			URL.revokeObjectURL(previewFile.previewUrl)
		}
		setPreviewFile(null)
		setUrlInput(currentAvatar || '')
		onClose()
	}

	return (
		<DialogModal open onClose={handleClose} className='card w-md'>
			<h2 {...stylex.props(styles.title)}>选择头像</h2>

			<form onSubmit={handleSubmit}>
				<div {...stylex.props(styles.uploadSection)}>
					<label {...stylex.props(styles.label)}>上传图片</label>
					<input ref={fileInputRef} type='file' accept='image/*' {...stylex.props(styles.fileInput)} onChange={handleFileSelect} />
					<div
						onClick={() => fileInputRef.current?.click()}
						{...stylex.props(styles.uploadBox)}>
						{previewFile ? (
							<img src={previewFile.previewUrl} alt='preview' {...stylex.props(styles.previewImage)} />
						) : (
							<div {...stylex.props(styles.uploadHint)}>
								<Plus {...stylex.props(styles.plusIcon)} />
								<p {...stylex.props(styles.hintText)}>点击上传图片</p>
							</div>
						)}
					</div>
				</div>

				<div {...stylex.props(styles.divider)}>
					<div {...stylex.props(styles.dividerLineWrap)}>
						<div {...stylex.props(styles.dividerLine)}></div>
					</div>
					<div {...stylex.props(styles.dividerLabelWrap)}>
						<span {...stylex.props(styles.dividerLabel)}>或</span>
					</div>
				</div>

				<div {...stylex.props(styles.urlSection)}>
					<label {...stylex.props(styles.label)}>图片 URL</label>
					<input
						type='url'
						value={urlInput}
						onChange={e => {
							setUrlInput(e.target.value)
							if (previewFile) {
								URL.revokeObjectURL(previewFile.previewUrl)
								setPreviewFile(null)
							}
						}}
						placeholder='https://example.com/avatar.png'
						{...stylex.props(styles.urlInput)}
					/>
				</div>

				<div {...stylex.props(styles.actions)}>
					<button type='submit' {...stylex.props(brandBtn.base, styles.confirmButton)}>
						确认
					</button>
					<button
						type='button'
						onClick={handleClose}
						{...stylex.props(styles.cancelButton)}>
						取消
					</button>
				</div>
			</form>
		</DialogModal>
	)
}
