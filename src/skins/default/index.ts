import type { SkinModule } from '../types'

/**
 * 默认皮肤：与 theme.css 中 :root 的兜底值、site-content.json 的初始值保持一致。
 * 改动这里要同步那两处，否则「无 JS 兜底 / SSR 首屏 / 选中态预览」三者会对不上。
 */
export const defaultSkin: SkinModule = {
	preset: {
		id: 'default',
		nameKey: 'skins.defaultName',
		descriptionKey: 'skins.defaultDesc',
		theme: {
			colorBrand: '#35bfab',
			colorBrandSecondary: '#1fc9e7',
			colorPrimary: '#334f52',
			colorSecondary: '#7b888e',
			colorBg: '#eeeeee',
			colorBorder: '#ffffff',
			colorCard: '#ffffff66',
			colorArticle: '#ffffffcc',
			colorInk: '#364153',
			colorMuted: '#6a7282',
			colorLine: '#d1d5dc',
			colorSurface: '#ffffff99',
			colorSurfaceStrong: '#ffffffcc',
			colorSubtle: '#f9fafb'
		},
		card: {
			radius: 40,
			radiusLg: 64,
			blur: 'blur(4px)',
			shadow: '0 40px 50px -32px rgb(0 0 0 / 5%), inset 0 0 20px rgb(255 255 255 / 25%)',
			borderWidth: 1
		},
		defaultFont: 'system',
		preview: {
			bg: '#eeeeee',
			card: '#ffffff',
			accent: '#35bfab',
			ink: '#334f52'
		}
	}
}
