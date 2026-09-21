'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import * as stylex from '@stylexjs/stylex'
import GridView, { type Blogger } from './grid-view'
import CreateDialog from './components/create-dialog'
import { pushBloggers } from './services/push-bloggers'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import type { AvatarItem } from './components/avatar-upload-dialog'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 隐藏的文件选择框 */
	fileInput: {
		display: 'none'
	},
	/** 右上角操作区（小屏隐藏） */
	toolbar: {
		position: 'absolute',
		top: 16,
		right: 24,
		display: 'flex',
		gap: 12,
		'@media (width < 40rem)': {
			display: 'none'
		}
	},
	/** 白底操作按钮（配合 card.hover 提供缩放反馈） */
	ghostButton: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 品牌按钮的横向内边距覆盖 */
	saveButton: {
		paddingInline: 24
	},
	/** 卡片底操作按钮（毛玻璃 + 悬停变亮；颜色过渡覆盖 card.hover 的 transform 过渡，与原状一致） */
	editButton: {
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		backdropFilter: 'blur(8px)',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		}
	}
})

export default function Page() {
	const [bloggers, setBloggers] = useState<Blogger[]>(initialList as Blogger[])
	const [originalBloggers, setOriginalBloggers] = useState<Blogger[]>(initialList as Blogger[])
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [editingBlogger, setEditingBlogger] = useState<Blogger | null>(null)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [avatarItems, setAvatarItems] = useState<Map<string, AvatarItem>>(new Map())
	const keyInputRef = useRef<HTMLInputElement>(null)

	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const { t } = useI18n()
	const hideEditButton = siteContent.hideEditButton ?? false

	const handleUpdate = (updatedBlogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => {
		setBloggers(prev => prev.map(b => (b.url === oldBlogger.url ? updatedBlogger : b)))
		if (avatarItem) {
			setAvatarItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedBlogger.url, avatarItem)
				return newMap
			})
		}
	}

	const handleAdd = () => {
		setEditingBlogger(null)
		setIsCreateDialogOpen(true)
	}

	const handleSaveBlogger = (updatedBlogger: Blogger, avatarItem?: AvatarItem) => {
		if (editingBlogger) {
			setBloggers(bloggers.map(b => (b.url === editingBlogger.url ? updatedBlogger : b)))
		} else {
			setBloggers([...bloggers, updatedBlogger])
		}
		if (avatarItem) {
			setAvatarItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedBlogger.url, avatarItem)
				return newMap
			})
		}
	}

	const handleDelete = (blogger: Blogger) => {
		if (confirm(t('admin.deleteConfirm', { name: blogger.name }))) {
			setBloggers(bloggers.filter(b => b.url !== blogger.url))
		}
	}

	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			// 选择文件后自动保存
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error(t('admin.readKeyFileFailed'))
		}
	}

	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	const handleSave = async () => {
		setIsSaving(true)

		try {
			const updatedBloggers = await pushBloggers({
				bloggers,
				avatarItems
			})

			setBloggers(updatedBloggers)
			setOriginalBloggers(updatedBloggers)
			setAvatarItems(new Map())
			setIsEditMode(false)
			toast.success(t('admin.saveSuccess'))
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(t('admin.saveFailed', { message: error?.message || t('admin.unknownError') }))
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		setBloggers(originalBloggers)
		setAvatarItems(new Map())
		setIsEditMode(false)
	}

	const buttonText = isAuth ? t('admin.save') : t('admin.importKey')

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setIsEditMode(true)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isEditMode])

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				{...stylex.props(styles.fileInput)}
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<GridView bloggers={bloggers} isEditMode={isEditMode} onUpdate={handleUpdate} onDelete={handleDelete} />

			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(styles.toolbar)}>
				{isEditMode ? (
					<>
						<button onClick={handleCancel} disabled={isSaving} {...stylex.props(card.hover, styles.ghostButton)}>
							{t('admin.cancel')}
						</button>
						<button onClick={handleAdd} {...stylex.props(card.hover, styles.ghostButton)}>
							{t('admin.add')}
						</button>
						<button onClick={handleSaveClick} disabled={isSaving} {...stylex.props(card.hover, brandBtn.base, styles.saveButton)}>
							{isSaving ? t('admin.saving') : buttonText}
						</button>
					</>
				) : (
					!hideEditButton && (
						<button onClick={() => setIsEditMode(true)} {...stylex.props(card.hover, styles.editButton)}>
							{t('admin.edit')}
						</button>
					)
				)}
			</motion.div>

			{isCreateDialogOpen && <CreateDialog blogger={editingBlogger} onClose={() => setIsCreateDialogOpen(false)} onSave={handleSaveBlogger} />}
		</>
	)
}
