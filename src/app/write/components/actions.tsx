import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useWriteStore } from '../stores/write-store'
import { usePreviewStore } from '../stores/preview-store'
import { usePublish } from '../hooks/use-publish'
import * as stylex from '@stylexjs/stylex'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 隐藏的文件输入 */
	fileInput: {
		display: 'none'
	},
	/** 右上操作条 */
	bar: {
		position: 'absolute',
		top: 16,
		right: 24,
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	/** 编辑模式徽章行 */
	badgeWrap: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	/** 编辑模式徽章 */
	modeBadge: {
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: '#eff6ff',
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: '#1447e6'
	},
	/** 删除按钮：红调外观；颜色过渡覆盖卡片默认的位移过渡（保持原计算值） */
	deleteBtn: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#ffcaca',
		backgroundColor: '#fef2f2',
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: '#e40014',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#ffe2e2'
			}
		}
	},
	/** 次要按钮：取消 / 导入 MD */
	ghostBtn: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: colors.card,
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 预览按钮：加宽内边距 */
	previewBtn: {
		paddingInline: 24
	},
	/** 发布按钮：品牌底色上的加宽内边距 */
	publishBtn: {
		paddingInline: 24
	}
})

export function WriteActions() {
	const { loading, mode, form, loadBlogForEdit, originalSlug, updateForm } = useWriteStore()
	const { openPreview } = usePreviewStore()
	const { isAuth, onChoosePrivateKey, onPublish, onDelete } = usePublish()
	const { t } = useI18n()
	const [saving, setSaving] = useState(false)
	const keyInputRef = useRef<HTMLInputElement>(null)
	const mdInputRef = useRef<HTMLInputElement>(null)
	const router = useRouter()

	const handleImportOrPublish = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			onPublish()
		}
	}

	const handleCancel = () => {
		if (!window.confirm(t('write.discardConfirm'))) {
			return
		}
		if (mode === 'edit' && originalSlug) {
			router.push(`/blog/${originalSlug}`)
		} else {
			router.push('/')
		}
	}

	const buttonText = isAuth ? (mode === 'edit' ? t('write.update') : t('write.publish')) : t('write.importKey')

	const handleDelete = () => {
		if (!isAuth) {
			toast.info(t('write.importKeyFirst'))
			return
		}
		const confirmMsg = form?.title ? t('write.deleteConfirmTitle', { title: form.title }) : t('write.deleteConfirm')
		if (window.confirm(confirmMsg)) {
			onDelete()
		}
	}

	const handleImportMd = () => {
		mdInputRef.current?.click()
	}

	const handleMdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			updateForm({ md: text })
			toast.success(t('write.mdImported'))
		} catch (error) {
			toast.error(t('write.mdImportFailed'))
		} finally {
			if (e.currentTarget) e.currentTarget.value = ''
		}
	}

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				{...stylex.props(styles.fileInput)}
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await onChoosePrivateKey(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>
			<input ref={mdInputRef} type='file' accept='.md' {...stylex.props(styles.fileInput)} onChange={handleMdFileChange} />

			<ul {...stylex.props(styles.bar)}>
				{mode === 'edit' && (
					<>
						<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(styles.badgeWrap)}>
							<div {...stylex.props(styles.modeBadge)}>{t('write.editMode')}</div>
						</motion.div>

						<motion.button
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							{...stylex.props(card.hover, styles.deleteBtn)}
							disabled={loading}
							onClick={handleDelete}>
							{t('write.delete')}
						</motion.button>

						<button onClick={handleCancel} disabled={saving} {...stylex.props(card.hover, styles.ghostBtn)}>
							{t('write.cancel')}
						</button>
					</>
				)}

				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					{...stylex.props(card.hover, styles.ghostBtn)}
					disabled={loading}
					onClick={handleImportMd}>
					{t('write.importMd')}
				</motion.button>
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					{...stylex.props(card.hover, styles.ghostBtn, styles.previewBtn)}
					disabled={loading}
					onClick={openPreview}>
					{t('write.preview')}
				</motion.button>
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					{...stylex.props(card.hover, brandBtn.base, styles.publishBtn)}
					disabled={loading}
					onClick={handleImportOrPublish}>
					{buttonText}
				</motion.button>
			</ul>
		</>
	)
}
