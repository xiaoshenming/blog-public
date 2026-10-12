import '@/styles/globals.css'
import '@/styles/stylex-atoms.css'

import type { Metadata } from 'next'
import Layout from '@/layout'
import Head from '@/layout/head'
import siteContent from '@/config/site-content.json'
import { getFontOption } from '@/config/fonts'
import { getSkinPreset } from '@/skins'
import { buildPreferenceBootstrap, resolveBackgroundUrl } from '@/lib/skin'
import { Averia_Gruesa_Libre } from 'next/font/google'
import { I18nProvider } from '@/i18n/context'
import { SkinProvider } from '@/skin/context'

const averiaFont = Averia_Gruesa_Libre({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-averia-next' })

const {
	meta: { title, description },
	theme,
	font: fontId,
	skin: skinId,
	backgroundImages,
	currentBackgroundImageId
} = siteContent

const font = getFontOption(fontId)
const skin = getSkinPreset(skinId)

/** SSR 阶段没有访客覆盖，背景按站长设置解析；访客覆盖由 Head 里的引导脚本在首次绘制前落地 */
const backgroundUrl = resolveBackgroundUrl(null, skin.id, currentBackgroundImageId, backgroundImages ?? [])

export const metadata: Metadata = {
	title,
	description,
	openGraph: {
		title,
		description
	},
	twitter: {
		title,
		description
	}
}

/**
 * SSR 只按站长默认值渲染；访客覆盖由 Head 里的阻塞脚本在首次绘制前落地，
 * 随后由 SkinProvider 接管响应式更新（见 src/skin/context.tsx）。
 */
const htmlStyle = {
	'--color-brand': theme.colorBrand,
	'--color-primary': theme.colorPrimary,
	'--color-secondary': theme.colorSecondary,
	'--color-brand-secondary': theme.colorBrandSecondary,
	'--color-bg': theme.colorBg,
	'--color-border': theme.colorBorder,
	'--color-card': theme.colorCard,
	'--color-article': theme.colorArticle,
	'--color-ink': theme.colorInk,
	'--color-muted': theme.colorMuted,
	'--color-line': theme.colorLine,
	'--color-surface': theme.colorSurface,
	'--color-subtle': theme.colorSubtle,
	'--skin-card-radius': `${skin.card.radius}px`,
	'--skin-card-radius-lg': `${skin.card.radiusLg}px`,
	'--skin-card-blur': skin.card.blur,
	'--skin-card-shadow': skin.card.shadow,
	'--skin-card-border-width': `${skin.card.borderWidth}px`,
	'--skin-bg-image': backgroundUrl ? `url("${backgroundUrl}")` : 'none',
	'--font-sans': font.family
} as React.CSSProperties

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang='zh-CN' data-skin={skin.id} suppressHydrationWarning style={htmlStyle} className={averiaFont.variable}>
			<Head fontCssHref={font.cssHref} preferenceBootstrap={buildPreferenceBootstrap(skin.id, font.id, currentBackgroundImageId, backgroundImages ?? [])} />

			<body>
				<script
					dangerouslySetInnerHTML={{
						__html: `
					if (/windows|win32/i.test(navigator.userAgent)) {
						document.documentElement.classList.add('windows');
					}
		      `
					}}
				/>

				<I18nProvider>
					<SkinProvider>
						<Layout>{children}</Layout>
					</SkinProvider>
				</I18nProvider>
			</body>
		</html>
	)
}
