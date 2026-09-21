'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import initialListEn from './list.en.json'
import { pushSnippets } from './services/push-snippets'
import * as stylex from '@stylexjs/stylex'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { util } from '@/styles/shared/util.stylex'
import { colors } from '@/styles/tokens.stylex'

const getRandomSnippet = (list: string[]) => (list.length === 0 ? '' : list[Math.floor(Math.random() * list.length)])

/** 本页样式（数值取自 Tailwind v4 编译产物；品牌按钮复用共享定义） */
const styles = stylex.create({
	/** 管理弹窗内容宽度：宽屏 520、小屏满宽 */
	dialogWidth: {
		width: 520,
		'@media (width < 40rem)': {
			width: '100%'
		}
	},
	/** 隐藏的密钥文件输入框 */
	fileInput: {
		display: 'none'
	},
	/** 页面主容器 */
	page: {
		display: 'flex',
		minHeight: '70vh',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		paddingInline: 24,
		paddingBlock: 96
	},
	/** 随机句展示区 */
	quoteBox: {
		width: '100%',
		maxWidth: 768,
		textAlign: 'center'
	},
	quote: {
		fontSize: 24,
		lineHeight: 1.625,
		fontWeight: 600
	},
	/** 右上角工具条（小屏隐藏） */
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
	/** 工具条按钮：白底描边胶囊 */
	toolbarBtn: {
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
	/** 编辑按钮：卡片底色 + 毛玻璃与悬停提亮 */
	toolbarEdit: {
		backgroundColor: colors.card,
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
	},
	/** 保存按钮：加宽内边距 */
	saveBtn: {
		paddingInline: 24
	},
	/** 管理弹窗内容：各区块间隔 16 */
	dialogBody: {
		display: 'flex',
		flexDirection: 'column',
		gap: 16
	},
	/** 新增行 */
	addRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 12
	},
	/** 新增输入框 */
	draftInput: {
		flex: '1',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#e5e7eb',
		backgroundColor: '#f9fafb',
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 新增按钮：收窄图标间隔 */
	addBtn: {
		gap: 4
	},
	/** 草稿列表：限高滚动 + 条目间隔 8 */
	draftList: {
		maxHeight: 320,
		overflowY: 'auto',
		paddingRight: 4,
		display: 'flex',
		flexDirection: 'column',
		gap: 8
	},
	/** 空状态提示 */
	empty: {
		color: colors.secondary,
		paddingBlock: 24,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 草稿条目（原 group 无联动子元素，惰性字符串已删） */
	draftItem: {
		display: 'flex',
		alignItems: 'flex-start',
		gap: 12,
		borderRadius: 8,
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	draftText: {
		flex: '1',
		lineHeight: 1.625,
		color: '#1e2939'
	},
	/** 删除按钮：悬停转红 */
	removeBtn: {
		color: '#99a1af',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				color: '#fb2c36'
			}
		}
	},
	/** 弹窗底部操作行 */
	dialogFooter: {
		marginTop: 16,
		display: 'flex',
		gap: 12
	},
	/** 取消按钮 */
	cancelBtn: {
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
	/** 底部保存：充满剩余宽度并居中 */
	saveFooterBtn: {
		flex: '1',
		justifyContent: 'center'
	}
})

export default function Page() {
	const [snippets, setSnippets] = useState<string[]>(initialList as string[])
	const [originalSnippets, setOriginalSnippets] = useState<string[]>(initialList as string[])
	const [currentSnippet, setCurrentSnippet] = useState<string>(getRandomSnippet(initialList as string[]))
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isManageOpen, setIsManageOpen] = useState(false)
	const [draftSnippets, setDraftSnippets] = useState<string[]>([])
	const [newSnippet, setNewSnippet] = useState('')
	const keyInputRef = useRef<HTMLInputElement>(null)

	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const { locale, t } = useI18n()
	const hideEditButton = siteContent.hideEditButton ?? false

	/** 英文随机句只在挂载时抽取一次，避免每次渲染变化 */
	const enSnippet = useMemo(() => getRandomSnippet(initialListEn as string[]), [])

	/** 访客态英文展示英文句子；编辑态固定中文（中文为管理端数据源） */
	const displaySnippet = !isEditMode && locale !== DEFAULT_LOCALE ? enSnippet || currentSnippet : currentSnippet

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

	const handleSave = async () => {
		setIsSaving(true)
		try {
			await pushSnippets({ snippets })
			setOriginalSnippets(snippets)
			setIsEditMode(false)
			toast.success(t('dialogs.saveSuccess'))
		} catch (error: any) {
			console.error('Failed to save snippets:', error)
			toast.error(t('dialogs.saveFailed', { message: error?.message || t('dialogs.unknownError') }))
		} finally {
			setIsSaving(false)
		}
	}

	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			void handleSave()
		}
	}

	const handleCancel = () => {
		setSnippets(originalSnippets)
		setIsEditMode(false)
	}

	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			await setPrivateKey(text)
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error(t('dialogs.readKeyFileFailed'))
		}
	}

	const openManageDialog = () => {
		setDraftSnippets(snippets)
		setNewSnippet('')
		setIsManageOpen(true)
	}

	const handleAddDraft = () => {
		const value = newSnippet.trim()
		if (!value) {
			toast.error(t('dialogs.enterSentence'))
			return
		}
		setDraftSnippets(prev => [...prev, value])
		setNewSnippet('')
	}

	const handleRemoveDraft = (index: number) => {
		setDraftSnippets(prev => prev.filter((_, i) => i !== index))
	}

	const applyManageChanges = () => {
		const cleaned = draftSnippets.map(item => item.trim()).filter(Boolean)
		if (cleaned.length === 0) {
			toast.error(t('dialogs.addAtLeastOneSentence'))
			return
		}
		setSnippets(cleaned)
		setIsManageOpen(false)
		toast.success(t('dialogs.listUpdated'))
	}

	const cancelManageChanges = () => {
		setIsManageOpen(false)
		setDraftSnippets([])
		setNewSnippet('')
	}

	const buttonText = isAuth ? t('dialogs.save') : t('dialogs.importKey')

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className={stylex.props(styles.fileInput).className}
				onChange={async e => {
					const file = e.target.files?.[0]
					if (file) await handleChoosePrivateKey(file)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div className={stylex.props(styles.page).className}>
				<div className={stylex.props(styles.quoteBox).className}>
					<p className={stylex.props(styles.quote).className}>{displaySnippet || t('collections.noSnippet')}</p>
				</div>
			</div>

			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className={stylex.props(styles.toolbar).className}>
				{isEditMode ? (
					<>
						<button onClick={handleCancel} disabled={isSaving} className={stylex.props(card.hover, styles.toolbarBtn).className}>
							{t('dialogs.cancel')}
						</button>
						<button onClick={openManageDialog} className={stylex.props(card.hover, styles.toolbarBtn).className}>
							{t('dialogs.manage')}
						</button>
						<button onClick={handleSaveClick} disabled={isSaving} className={stylex.props(card.hover, brandBtn.base, styles.saveBtn).className}>
							{isSaving ? t('dialogs.saving') : buttonText}
						</button>
					</>
				) : (
					!hideEditButton && (
						<button onClick={() => setIsEditMode(true)} className={stylex.props(card.hover, styles.toolbarBtn, styles.toolbarEdit).className}>
							{t('dialogs.edit')}
						</button>
					)
				)}
			</motion.div>

			<DialogModal open={isManageOpen} onClose={cancelManageChanges} style={[card.base, styles.dialogWidth]}>
				<div className={stylex.props(styles.dialogBody).className}>
					<div className={stylex.props(styles.addRow).className}>
						<input
							type='text'
							value={newSnippet}
							onChange={e => setNewSnippet(e.target.value)}
							placeholder={t('dialogs.addItem')}
							className={stylex.props(styles.draftInput).className}
						/>
						<button onClick={handleAddDraft} className={stylex.props(brandBtn.base, styles.addBtn).className}>
							<Plus {...stylex.props(util.iconSm)} />
							{t('dialogs.addItem')}
						</button>
					</div>

					<div className={stylex.props(styles.draftList).className}>
						{draftSnippets.length === 0 && <p className={stylex.props(styles.empty).className}>{t('dialogs.emptyContent')}</p>}
						{draftSnippets.map((item, index) => (
							<div key={`${item}-${index}`} {...stylex.props(styles.draftItem)}>
								<p className={stylex.props(styles.draftText).className}>{item}</p>
								<button onClick={() => handleRemoveDraft(index)} className={stylex.props(styles.removeBtn).className}>
									<X {...stylex.props(util.iconSm)} />
								</button>
							</div>
						))}
					</div>

					<div className={stylex.props(styles.dialogFooter).className}>
						<button onClick={cancelManageChanges} className={stylex.props(styles.cancelBtn).className}>
							{t('dialogs.cancel')}
						</button>
						<button onClick={applyManageChanges} className={stylex.props(brandBtn.base, styles.saveFooterBtn).className}>
							{t('dialogs.save')}
						</button>
					</div>
				</div>
			</DialogModal>
		</>
	)
}
