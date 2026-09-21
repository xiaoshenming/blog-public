'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useMarkdownRender } from '@/hooks/use-markdown-render'
import { pushAbout, type AboutData } from './services/push-about'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import LikeButton from '@/components/like-button'
import GithubSVG from '@/svgs/github.svg'
import initialDataZh from './list.json'
import initialDataEn from './list.en.json'
import * as stylex from '@stylexjs/stylex'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LOCALE } from '@/i18n/config'

/** 本页样式（数值取自 Tailwind v4 编译产物；卡片系复用共享定义） */
const styles = stylex.create({
	/** 隐藏的密钥文件输入框 */
	fileInput: {
		display: 'none'
	},
	/** 页面主容器（小屏去内边距） */
	page: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		paddingInline: 24,
		paddingTop: 128,
		paddingBottom: 48,
		'@media (width < 40rem)': {
			paddingInline: 0
		}
	},
	/** 内容列 */
	wrapper: {
		width: '100%',
		maxWidth: 800
	},
	/** 区块纵向间隔（24） */
	stackLg: {
		display: 'flex',
		flexDirection: 'column',
		gap: 24
	},
	/** 输入组纵向间隔（16） */
	stackSm: {
		display: 'flex',
		flexDirection: 'column',
		gap: 16
	},
	/** 文本居中 */
	center: {
		textAlign: 'center'
	},
	/** 页面大标题 */
	title: {
		marginBottom: 16,
		fontSize: 36,
		lineHeight: '40px',
		fontWeight: 700
	},
	/** 描述文字 */
	lead: {
		color: colors.secondary,
		fontSize: 18,
		lineHeight: '28px'
	},
	/** 状态提示（居中灰字） */
	loading: {
		color: colors.secondary,
		textAlign: 'center'
	},
	/** 卡片相对定位（内边距与卡片基底同为 24，无需覆盖） */
	cardRel: {
		position: 'relative'
	},
	/** 标题输入框 */
	titleInput: {
		width: '100%',
		paddingInline: 16,
		paddingBlock: 12,
		textAlign: 'center',
		fontSize: 24,
		lineHeight: '32px',
		fontWeight: 700
	},
	/** 描述输入框 */
	descInput: {
		width: '100%',
		paddingInline: 16,
		paddingBlock: 12,
		textAlign: 'center',
		fontSize: 18,
		lineHeight: '28px'
	},
	/** Markdown 编辑区 */
	editor: {
		minHeight: 400,
		width: '100%',
		resize: 'none',
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 页首标题块 */
	headerBlock: {
		marginBottom: 48,
		textAlign: 'center'
	},
	/** 底部链接行 */
	linkRow: {
		marginTop: 32,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 24
	},
	/** 圆形 GitHub 链接 */
	githubBtn: {
		backgroundColor: colors.card,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 53,
		height: 53,
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border
	},
	/** 右上角工具条（小屏隐藏） */
	toolbar: {
		position: 'fixed',
		top: 16,
		right: 24,
		zIndex: 10,
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
	/** 编辑按钮附加：毛玻璃 + 颜色过渡，悬停提亮 */
	toolbarEdit: {
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
	}
})

export default function Page() {
	const { locale, t } = useI18n()
	const [data, setData] = useState<AboutData>(initialDataZh as AboutData)
	const [originalData, setOriginalData] = useState<AboutData>(initialDataZh as AboutData)
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isPreviewMode, setIsPreviewMode] = useState(false)
	const keyInputRef = useRef<HTMLInputElement>(null)

	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false

	// 浏览态按当前语言展示（英文缺失字段回落中文）；编辑态始终编辑中文源文件，保存不会波及英文版
	const enData = initialDataEn as Partial<AboutData> | undefined
	const displayData: AboutData = !isEditMode && locale !== DEFAULT_LOCALE && enData ? { ...data, ...enData } : data
	const { content, loading } = useMarkdownRender(displayData.content)

	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
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

	const handleEnterEditMode = () => {
		setIsEditMode(true)
		setIsPreviewMode(false)
	}

	const handleSave = async () => {
		setIsSaving(true)

		try {
			await pushAbout(data)

			setOriginalData(data)
			setIsEditMode(false)
			setIsPreviewMode(false)
			toast.success(t('admin.saveSuccess'))
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(t('admin.saveFailed', { message: error?.message || t('admin.unknownError') }))
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		setData(originalData)
		setIsEditMode(false)
		setIsPreviewMode(false)
	}

	const buttonText = isAuth ? t('admin.save') : t('admin.importKey')

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setIsEditMode(true)
				setIsPreviewMode(false)
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
				className={stylex.props(styles.fileInput).className}
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div className={stylex.props(styles.page).className}>
				<div className={stylex.props(styles.wrapper).className}>
					{isEditMode ? (
						isPreviewMode ? (
							<div className={stylex.props(styles.stackLg).className}>
								<div className={stylex.props(styles.center).className}>
									<h1 className={stylex.props(styles.title).className}>{data.title || t('admin.titlePreview')}</h1>
									<p className={stylex.props(styles.lead).className}>{data.description || t('admin.descriptionPreview')}</p>
								</div>

								{loading ? (
									<div className={stylex.props(styles.loading).className}>{t('admin.previewRendering')}</div>
								) : (
									<div className={stylex.props(card.base, styles.cardRel).className}>
										<div className='prose prose-sm max-w-none'>{content}</div>
									</div>
								)}
							</div>
						) : (
							<div className={stylex.props(styles.stackLg).className}>
								<div className={stylex.props(styles.stackSm).className}>
									<input
										type='text'
										placeholder={t('admin.titlePlaceholder')}
										className={stylex.props(styles.titleInput).className}
										value={data.title}
										onChange={e => setData({ ...data, title: e.target.value })}
									/>
									<input
										type='text'
										placeholder={t('admin.descriptionPlaceholder')}
										className={stylex.props(styles.descInput).className}
										value={data.description}
										onChange={e => setData({ ...data, description: e.target.value })}
									/>
								</div>

								<div className={stylex.props(card.base, styles.cardRel).className}>
									<textarea
										placeholder={t('admin.markdownPlaceholder')}
										className={stylex.props(styles.editor).className}
										value={data.content}
										onChange={e => setData({ ...data, content: e.target.value })}
									/>
								</div>
							</div>
						)
					) : (
						<>
							<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={stylex.props(styles.headerBlock).className}>
								<h1 className={stylex.props(styles.title).className}>{displayData.title}</h1>
								<p className={stylex.props(styles.lead).className}>{displayData.description}</p>
							</motion.div>

							{loading ? (
								<div className={stylex.props(styles.loading).className}>{t('about.loading')}</div>
							) : (
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									className={stylex.props(card.base, styles.cardRel).className}>
									<div className='prose prose-sm max-w-none'>{content}</div>
								</motion.div>
							)}
						</>
					)}

					<div className={stylex.props(styles.linkRow).className}>
						<motion.a
							href='https://github.com/YYsuni/2025-blog-public'
							target='_blank'
							rel='noreferrer'
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0 }}
							className={stylex.props(styles.githubBtn).className}>
							<GithubSVG />
						</motion.a>

						<LikeButton slug='open-source' delay={0} />
					</div>
				</div>
			</div>

			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className={stylex.props(styles.toolbar).className}>
				{isEditMode ? (
					<>
						<button onClick={handleCancel} disabled={isSaving} className={stylex.props(card.hover, styles.toolbarBtn).className}>
							{t('admin.cancel')}
						</button>
						<button onClick={() => setIsPreviewMode(prev => !prev)} disabled={isSaving} className={stylex.props(card.hover, styles.toolbarBtn).className}>
							{isPreviewMode ? t('admin.continueEditing') : t('admin.preview')}
						</button>
						<button onClick={handleSaveClick} disabled={isSaving} className={stylex.props(card.hover, brandBtn.base, styles.saveBtn).className}>
							{isSaving ? t('admin.saving') : buttonText}
						</button>
					</>
				) : (
					!hideEditButton && (
						<button onClick={handleEnterEditMode} className={stylex.props(card.hover, styles.toolbarBtn, styles.toolbarEdit).className}>
							{t('admin.edit')}
						</button>
					)
				)}
			</motion.div>
		</>
	)
}
