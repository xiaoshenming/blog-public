import '@/styles/globals.css'
import '@/styles/stylex-atoms.css'

import type { Metadata } from 'next'
import Layout from '@/layout'
import Head from '@/layout/head'
import siteContent from '@/config/site-content.json'
import { getFontOption } from '@/config/fonts'
import { Averia_Gruesa_Libre } from 'next/font/google'
import { I18nProvider } from '@/i18n/context'

const averiaFont = Averia_Gruesa_Libre({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--font-averia-next' })

const {
	meta: { title, description },
	theme,
	font: fontId
} = siteContent

const font = getFontOption(fontId)

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

const htmlStyle = {
	cursor: 'url(/images/cursor.svg) 2 1, auto',
	'--color-brand': theme.colorBrand,
	'--color-primary': theme.colorPrimary,
	'--color-secondary': theme.colorSecondary,
	'--color-brand-secondary': theme.colorBrandSecondary,
	'--color-bg': theme.colorBg,
	'--color-border': theme.colorBorder,
	'--color-card': theme.colorCard,
	'--color-article': theme.colorArticle,
	'--font-sans': font.family
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang='zh-CN' suppressHydrationWarning style={htmlStyle} className={averiaFont.variable}>
			<Head fontCssHref={font.cssHref} />

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
					<Layout>{children}</Layout>
				</I18nProvider>
			</body>
		</html>
	)
}
