import '@/styles/globals.css'
import '@/styles/stylex-atoms.css'

import type { Metadata } from 'next'
import Layout from '@/layout'
import Head from '@/layout/head'
import siteContent from '@/config/site-content.json'
import { getFontOption } from '@/config/fonts'
import { getSkinPreset } from '@/skins'
import { resolveBackgroundUrl, styleVars, themeVars } from '@/lib/skin'
import { buildPreferenceBootstrap } from '@/lib/skin-bootstrap'
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
 *
 * 变量表由 lib/skin 的 THEME_VARS / 质感令牌表统一生成，不在此手抄清单 ——
 * 手抄时漏掉一个令牌（曾漏 --color-surface-strong）只会静默回落 theme.css 的兜底值，
 * 因为 `as React.CSSProperties` 让 TS 查不出缺项。
 */
const htmlStyle = {
	...themeVars(theme),
	...styleVars(skin.card, skin.button),
	'--skin-bg-image': backgroundUrl ? `url("${backgroundUrl}")` : 'none',
	'--font-sans': font.family
} as React.CSSProperties

/** 参数全是模块常量，构建期算一次即可，不必每个 SSR 请求重算 */
const preferenceBootstrap = buildPreferenceBootstrap(skin.id, font.id, currentBackgroundImageId, backgroundImages ?? [])

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang='zh-CN' data-skin={skin.id} suppressHydrationWarning style={htmlStyle} className={averiaFont.variable}>
			<Head fontCssHref={font.cssHref} preferenceBootstrap={preferenceBootstrap} />

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
