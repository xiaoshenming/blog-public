'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import { DialogModal } from '@/components/dialog-modal'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

export type LogoItem = { type: 'url'; url: string } | { type: 'file'; file: File; previewUrl: string; hash?: string }

interface LogoUploadDialogProps {
	currentLogo?: string
	onClose: () => void
	onSubmit: (logo: LogoItem) => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；space-y 分摊到三个非末项子块） */
const styles = stylex.create({
	/** 弹窗内容宽度 448 */
	dialogWidth: {
		width: 448
	},
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
		borderRadius: 12,
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
		borderRadius: 12,
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

export default function LogoUploadDialog({ currentLogo, onClose, onSubmit }: LogoUploadDialogProps) {
	const { t } = useI18n()
	const [urlInput, setUrlInput] = useState(currentLogo || '')
	const [previewFile, setPreviewFile] = useState<{ file: File; previewUrl: string } | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (!file.type.startsWith('image/')) {
			toast.error(t('dialogs.selectImageFile'))
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
			toast.error(t('dialogs.uploadImageOrUrlRequired'))
			return
		}

		setPreviewFile(null)
		setUrlInput(currentLogo || '')
		onClose()
	}

	const handleClose = () => {
		if (previewFile) {
			URL.revokeObjectURL(previewFile.previewUrl)
		}
		setPreviewFile(null)
		setUrlInput(currentLogo || '')
		onClose()
	}
	return (
		<DialogModal open onClose={handleClose} style={[card.base, styles.dialogWidth]}>
			<h2 {...stylex.props(styles.title)}>{t('dialogs.chooseLogoTitle')}</h2>
			<form onSubmit={handleSubmit}>
				<div {...stylex.props(styles.uploadSection)}>
					<label {...stylex.props(styles.label)}>{t('dialogs.uploadImageLabel')}</label>
					<input ref={fileInputRef} type='file' accept='image/*' {...stylex.props(styles.fileInput)} onChange={handleFileSelect} />
					<div onClick={() => fileInputRef.current?.click()} {...stylex.props(styles.uploadBox)}>
						{previewFile ? (
							<img src={previewFile.previewUrl} alt='preview' {...stylex.props(styles.previewImage)} />
						) : (
							<div {...stylex.props(styles.uploadHint)}>
								<Plus {...stylex.props(styles.plusIcon)} />
								<p {...stylex.props(styles.hintText)}>{t('dialogs.clickToUploadImage')}</p>
							</div>
						)}
					</div>
				</div>

				<div {...stylex.props(styles.divider)}>
					<div {...stylex.props(styles.dividerLineWrap)}>
						<div {...stylex.props(styles.dividerLine)}></div>
					</div>
					<div {...stylex.props(styles.dividerLabelWrap)}>
						<span {...stylex.props(styles.dividerLabel)}>{t('dialogs.or')}</span>
					</div>
				</div>

				<div {...stylex.props(styles.urlSection)}>
					<label {...stylex.props(styles.label)}>{t('dialogs.imageUrlLabel')}</label>
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
						placeholder='https://example.com/logo.png'
						{...stylex.props(styles.urlInput)}
					/>
				</div>

				<div {...stylex.props(styles.actions)}>
					<button type='submit' {...stylex.props(brandBtn.base, styles.confirmButton)}>
						{t('dialogs.confirm')}
					</button>
					<button type='button' onClick={handleClose} {...stylex.props(styles.cancelButton)}>
						{t('dialogs.cancel')}
					</button>
				</div>
			</form>
		</DialogModal>
	)
}
