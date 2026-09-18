'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { toast } from 'sonner'
import GridView from './grid-view'
import CreateDialog from './components/create-dialog'
import { pushShares } from './services/push-shares'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import type { Share } from './components/share-card'
import type { LogoItem } from './components/logo-upload-dialog'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'

/** 样式：右上角编辑工具栏（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 隐藏的原生文件选择框 */
	hiddenInput: {
		display: 'none'
	},
	/** 工具栏容器：绝对定位 + 横向排列，窄屏隐藏 */
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
	/** 白底半透明描边按钮 */
	ghostBtn: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, #fff 60%, transparent)',
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 编辑按钮：卡片底色 + 毛玻璃 + 背景色过渡（后写覆盖 card.hover 的过渡属性，与原类行为一致） */
	editBtn: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: colors.card,
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		backdropFilter: 'blur(8px)',
		transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, #fff 80%, transparent)'
			}
		}
	},
	/** 保存按钮：覆盖品牌按钮的横向内边距 */
	saveBtn: {
		paddingInline: 24
	}
})

export default function Page() {
	const [shares, setShares] = useState<Share[]>(initialList as Share[])
	const [originalShares, setOriginalShares] = useState<Share[]>(initialList as Share[])
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [editingShare, setEditingShare] = useState<Share | null>(null)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [logoItems, setLogoItems] = useState<Map<string, LogoItem>>(new Map())
	const keyInputRef = useRef<HTMLInputElement>(null)

	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false

	const handleUpdate = (updatedShare: Share, oldShare: Share, logoItem?: LogoItem) => {
		setShares(prev => prev.map(s => (s.url === oldShare.url ? updatedShare : s)))
		if (logoItem) {
			setLogoItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedShare.url, logoItem)
				return newMap
			})
		}
	}

	const handleAdd = () => {
		setEditingShare(null)
		setIsCreateDialogOpen(true)
	}

	const handleSaveShare = (updatedShare: Share, logoItem?: LogoItem) => {
		if (editingShare) {
			setShares(shares.map(s => (s.url === editingShare.url ? updatedShare : s)))
		} else {
			setShares([...shares, updatedShare])
		}
		if (logoItem) {
			setLogoItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedShare.url, logoItem)
				return newMap
			})
		}
	}

	const handleDelete = (share: Share) => {
		if (confirm(`确定要删除 ${share.name} 吗？`)) {
			setShares(shares.filter(s => s.url !== share.url))
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
			toast.error('读取密钥文件失败')
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
			const updatedShares = await pushShares({
				shares,
				logoItems
			})

			setShares(updatedShares)
			setOriginalShares(updatedShares)
			setLogoItems(new Map())
			setIsEditMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		setShares(originalShares)
		setLogoItems(new Map())
		setIsEditMode(false)
	}

	const buttonText = isAuth ? '保存' : '导入密钥'

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
				{...stylex.props(styles.hiddenInput)}
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<GridView shares={shares} isEditMode={isEditMode} onUpdate={handleUpdate} onDelete={handleDelete} />

			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(styles.toolbar)}>
				{isEditMode ? (
					<>
						<button
							onClick={handleCancel}
							disabled={isSaving}
							{...stylex.props(card.hover, styles.ghostBtn)}>
							取消
						</button>
						<button
							onClick={handleAdd}
							{...stylex.props(card.hover, styles.ghostBtn)}>
							添加
						</button>
						<button onClick={handleSaveClick} disabled={isSaving} {...stylex.props(card.hover, brandBtn.base, styles.saveBtn)}>
							{isSaving ? '保存中...' : buttonText}
						</button>
					</>
				) : (
					!hideEditButton && (
						<button
							onClick={() => setIsEditMode(true)}
							{...stylex.props(card.hover, styles.editBtn)}>
							编辑
						</button>
					)
				)}
			</motion.div>

			{isCreateDialogOpen && <CreateDialog share={editingShare} onClose={() => setIsCreateDialogOpen(false)} onSave={handleSaveShare} />}
		</>
	)
}
