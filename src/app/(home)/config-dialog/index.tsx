'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import * as stylex from '@stylexjs/stylex'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore, hasAnyAuth } from '@/hooks/use-auth'
import { useConfigStore } from '../stores/config-store'
import { pushSiteContent } from '../services/push-site-content'
import type { SiteContent, CardStyles } from '../stores/config-store'
import { SiteSettings, type FileItem, type ArtImageUploads, type BackgroundImageUploads, type SocialButtonImageUploads } from './site-settings'
import { ColorConfig } from './color-config'
import { FontConfig } from './font-config'
import { HomeLayout } from './home-layout'
import { applyFont } from '@/lib/font'
import { initiateGitHubOAuth2, clearOAuth2Token, hasOAuth2Auth } from '@/lib/oauth2-github'
import { useI18n } from '@/i18n/context'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'

interface ConfigDialogProps {
	open: boolean
	onClose: () => void
}

type TabType = 'site' | 'color' | 'font' | 'layout'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 配置弹窗内容：限高 90vh、最小高 600、宽 640、内部滚动 */
	dialogBox: {
		maxHeight: '90vh',
		minHeight: 600,
		width: 640,
		overflowY: 'auto'
	},
	/** 隐藏的文件输入 */
	fileInput: {
		display: 'none'
	},
	/** 弹窗头部：底距、两端对齐、允许换行 */
	header: {
		marginBottom: 24,
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		justifyContent: 'space-between',
		rowGap: 12
	},
	/** 页签组 */
	tabs: {
		display: 'flex',
		gap: 4
	},
	/** 页签按钮（选中态由条件样式叠加） */
	tabButton: {
		position: 'relative',
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		whiteSpace: 'nowrap',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	tabActive: {
		color: colors.brand
	},
	tabInactive: {
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				color: colors.primary
			}
		}
	},
	/** 选中页签的下划线 */
	tabIndicator: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		left: 0,
		height: 2,
		backgroundColor: colors.brand
	},
	/** 右上操作按钮组 */
	actions: {
		marginLeft: 'auto',
		display: 'flex',
		gap: 12
	},
	/** 描边按钮（预览/取消） */
	outlineButton: {
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 20,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		whiteSpace: 'nowrap'
	},
	/** 保存按钮：覆盖品牌按钮横向内边距 */
	saveButton: {
		paddingInline: 20,
		whiteSpace: 'nowrap'
	},
	/** 页签内容区最小高度 */
	content: {
		minHeight: 200
	},
	/** OAuth2 区域：上边框与间距 */
	oauthSection: {
		marginTop: 24,
		borderTopWidth: 1,
		borderTopStyle: 'solid',
		borderTopColor: colors.border,
		paddingTop: 16
	},
	oauthRow: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	oauthText: {
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 退出登录按钮（红色系色板无令牌，固化实测值） */
	logoutButton: {
		borderRadius: 8,
		backgroundColor: 'color-mix(in oklab, #fb2c36 10%, transparent)',
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px',
		color: '#fb2c36',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, #fb2c36 20%, transparent)'
			}
		}
	},
	/** GitHub 登录按钮（深灰底色，悬停加深） */
	githubButton: {
		display: 'flex',
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderRadius: 12,
		backgroundColor: '#101828',
		paddingInline: 16,
		paddingBlock: 10,
		fontSize: 14,
		lineHeight: '20px',
		color: colors.white,
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#1e2939'
			}
		}
	},
	/** GitHub 图标尺寸 */
	githubIcon: {
		width: 16,
		height: 16
	}
})

export default function ConfigDialog({ open, onClose }: ConfigDialogProps) {
	const { t } = useI18n()
	const { setPrivateKey, clearAuth } = useAuthStore()
	const isAuth = hasAnyAuth()
	const { siteContent, setSiteContent, cardStyles, setCardStyles, regenerateBubbles } = useConfigStore()
	const [formData, setFormData] = useState<SiteContent>(siteContent)
	const [cardStylesData, setCardStylesData] = useState<CardStyles>(cardStyles)
	const [originalData, setOriginalData] = useState<SiteContent>(siteContent)
	const [originalCardStyles, setOriginalCardStyles] = useState<CardStyles>(cardStyles)
	const [isSaving, setIsSaving] = useState(false)
	const [activeTab, setActiveTab] = useState<TabType>('site')
	const keyInputRef = useRef<HTMLInputElement>(null)
	const [faviconItem, setFaviconItem] = useState<FileItem | null>(null)
	const [avatarItem, setAvatarItem] = useState<FileItem | null>(null)
	const [artImageUploads, setArtImageUploads] = useState<ArtImageUploads>({})
	const [backgroundImageUploads, setBackgroundImageUploads] = useState<BackgroundImageUploads>({})
	const [socialButtonImageUploads, setSocialButtonImageUploads] = useState<SocialButtonImageUploads>({})

	useEffect(() => {
		if (open) {
			const current = { ...siteContent }
			const currentCardStyles = { ...cardStyles }
			setFormData(current)
			setCardStylesData(currentCardStyles)
			setOriginalData(current)
			setOriginalCardStyles(currentCardStyles)
			setFaviconItem(null)
			setAvatarItem(null)
			setArtImageUploads({})
			setBackgroundImageUploads({})
			setSocialButtonImageUploads({})
			setActiveTab('site')
		}
	}, [open, siteContent, cardStyles])

	useEffect(() => {
		return () => {
			// Clean up preview URLs on unmount
			if (faviconItem?.type === 'file') {
				URL.revokeObjectURL(faviconItem.previewUrl)
			}
			if (avatarItem?.type === 'file') {
				URL.revokeObjectURL(avatarItem.previewUrl)
			}
			Object.values(artImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
			Object.values(backgroundImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
			Object.values(socialButtonImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
		}
	}, [faviconItem, avatarItem, artImageUploads, backgroundImageUploads, socialButtonImageUploads])

	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error(t('config.readKeyFileFailed'))
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
			// Calculate removed art images so that we can delete files in repo
			const originalArtImages = originalData.artImages ?? []
			const currentArtImages = formData.artImages ?? []
			const removedArtImages = originalArtImages.filter(orig => !currentArtImages.some(current => current.id === orig.id))

			// Calculate removed background images
			const originalBackgroundImages = originalData.backgroundImages ?? []
			const currentBackgroundImages = formData.backgroundImages ?? []
			const removedBackgroundImages = originalBackgroundImages.filter(orig => !currentBackgroundImages.some(current => current.id === orig.id))

			await pushSiteContent(
				formData,
				cardStylesData,
				faviconItem,
				avatarItem,
				artImageUploads,
				removedArtImages,
				backgroundImageUploads,
				removedBackgroundImages,
				socialButtonImageUploads
			)
			setSiteContent(formData)
			setCardStyles(cardStylesData)
			updateThemeVariables(formData.theme)
			applyFont(formData.font)
			setFaviconItem(null)
			setAvatarItem(null)
			setArtImageUploads({})
			setBackgroundImageUploads({})
			setSocialButtonImageUploads({})
			onClose()
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(t('config.saveFailed', { message: error?.message || t('config.unknownError') }))
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		// Clean up preview URLs
		if (faviconItem?.type === 'file') {
			URL.revokeObjectURL(faviconItem.previewUrl)
		}
		if (avatarItem?.type === 'file') {
			URL.revokeObjectURL(avatarItem.previewUrl)
		}
		Object.values(artImageUploads).forEach(item => {
			if (item.type === 'file') {
				URL.revokeObjectURL(item.previewUrl)
			}
		})
		Object.values(backgroundImageUploads).forEach(item => {
			if (item.type === 'file') {
				URL.revokeObjectURL(item.previewUrl)
			}
		})
		Object.values(socialButtonImageUploads).forEach(item => {
			if (item.type === 'file') {
				URL.revokeObjectURL(item.previewUrl)
			}
		})
		// Restore to the state when dialog was opened
		setSiteContent(originalData)
		setCardStyles(originalCardStyles)
		regenerateBubbles()
		// Restore document title and meta if they were changed by preview
		if (typeof document !== 'undefined') {
			document.title = originalData.meta.title
			const metaDescription = document.querySelector('meta[name="description"]')
			if (metaDescription) {
				metaDescription.setAttribute('content', originalData.meta.description)
			}
		}
		updateThemeVariables(originalData.theme)
		applyFont(originalData.font)
		setFaviconItem(null)
		setAvatarItem(null)
		setArtImageUploads({})
		setBackgroundImageUploads({})
		setSocialButtonImageUploads({})
		onClose()
	}

	const updateThemeVariables = (theme?: SiteContent['theme']) => {
		if (typeof document === 'undefined' || !theme) return

		const { colorBrand, colorBrandSecondary, colorPrimary, colorSecondary, colorBg, colorBorder, colorCard, colorArticle } = theme

		const root = document.documentElement

		if (colorBrand) root.style.setProperty('--color-brand', colorBrand)
		if (colorBrandSecondary) root.style.setProperty('--color-brand-secondary', colorBrandSecondary)
		if (colorPrimary) root.style.setProperty('--color-primary', colorPrimary)
		if (colorSecondary) root.style.setProperty('--color-secondary', colorSecondary)
		if (colorBg) root.style.setProperty('--color-bg', colorBg)
		if (colorBorder) root.style.setProperty('--color-border', colorBorder)
		if (colorCard) root.style.setProperty('--color-card', colorCard)
		if (colorArticle) root.style.setProperty('--color-article', colorArticle)
	}

	const handlePreview = () => {
		console.log('formData', formData)
		setSiteContent(formData)
		setCardStyles(cardStylesData)
		regenerateBubbles()

		// Update document title
		if (typeof document !== 'undefined') {
			document.title = formData.meta.title
			const metaDescription = document.querySelector('meta[name="description"]')
			if (metaDescription) {
				metaDescription.setAttribute('content', formData.meta.description)
			}
		}
		updateThemeVariables(formData.theme)
		applyFont(formData.font)

		onClose()
	}

	const buttonText = isAuth ? t('config.save') : t('config.importKey')

	const tabs: { id: TabType; label: string }[] = [
		{ id: 'site', label: t('config.tabSiteSettings') },
		{ id: 'color', label: t('config.tabColorConfig') },
		{ id: 'font', label: t('config.tabFont') },
		{ id: 'layout', label: t('config.tabHomeLayout') }
	]

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

			<DialogModal open={open} onClose={handleCancel} className='scrollbar-none' style={[card.base, styles.dialogBox]}>
				<div {...stylex.props(styles.header)}>
					<div {...stylex.props(styles.tabs)}>
						{tabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								{...stylex.props(styles.tabButton, activeTab === tab.id ? styles.tabActive : styles.tabInactive)}>
								{tab.label}
								{activeTab === tab.id && <div {...stylex.props(styles.tabIndicator)} />}
							</button>
						))}
					</div>
					<div {...stylex.props(styles.actions)}>
						<button onClick={handlePreview} {...stylex.props(card.hover, styles.outlineButton)}>
							{t('config.preview')}
						</button>
						<button onClick={handleCancel} disabled={isSaving} {...stylex.props(card.hover, styles.outlineButton)}>
							{t('config.cancel')}
						</button>
						<button onClick={handleSaveClick} disabled={isSaving} {...stylex.props(brandBtn.base, card.hover, styles.saveButton)}>
							{isSaving ? t('config.saving') : buttonText}
						</button>
					</div>
				</div>

				<div {...stylex.props(styles.content)}>
					{activeTab === 'site' && (
						<SiteSettings
							formData={formData}
							setFormData={setFormData}
							faviconItem={faviconItem}
							setFaviconItem={setFaviconItem}
							avatarItem={avatarItem}
							setAvatarItem={setAvatarItem}
							artImageUploads={artImageUploads}
							setArtImageUploads={setArtImageUploads}
							backgroundImageUploads={backgroundImageUploads}
							setBackgroundImageUploads={setBackgroundImageUploads}
							socialButtonImageUploads={socialButtonImageUploads}
							setSocialButtonImageUploads={setSocialButtonImageUploads}
						/>
					)}
					{activeTab === 'color' && <ColorConfig formData={formData} setFormData={setFormData} />}
					{activeTab === 'font' && <FontConfig formData={formData} setFormData={setFormData} />}
					{activeTab === 'layout' && <HomeLayout cardStylesData={cardStylesData} setCardStylesData={setCardStylesData} onClose={onClose} />}
				</div>

				{/* OAuth2 登录区域 */}
				<div {...stylex.props(styles.oauthSection)}>
					{hasOAuth2Auth() ? (
						<div {...stylex.props(styles.oauthRow)}>
							<span {...stylex.props(styles.oauthText)}>{t('config.oauth2LoggedIn')}</span>
							<button
								onClick={() => {
									clearAuth()
									clearOAuth2Token()
									toast.success(t('config.oauth2LoggedOut'))
								}}
								{...stylex.props(styles.logoutButton)}>
								{t('config.logout')}
							</button>
						</div>
					) : (
						<button onClick={() => initiateGitHubOAuth2()} {...stylex.props(card.hover, styles.githubButton)}>
							<svg {...stylex.props(styles.githubIcon)} viewBox='0 0 16 16' fill='currentColor'>
								<path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z' />
							</svg>
							{t('config.loginWithGithubOauth2')}
						</button>
					)}
				</div>
			</DialogModal>
		</>
	)
}
