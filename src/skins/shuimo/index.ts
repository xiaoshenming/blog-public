import type { SkinModule } from '../types'
import ShuimoDecor from './decor'

/**
 * 水墨皮肤：色值取自 shuimo-design/color 的《中国传统色》二十四节气表
 * （立秋·竹月 / 云母、霜降·烟墨、白露·胭脂虫、秋分·青雀头黛 等）。
 * colorBg 为「香皮」提亮后的宣纸调，纯香皮作整页底色偏暗。
 *
 * 素材：public/skins/shuimo/（宣纸纹理、墨笔触方框、墨块、竹枝，均来自 shuimo-design，MIT）
 * 专属样式：src/skins/shuimo/shuimo.css（由 globals.css 按目录显式引入）
 */
export const shuimoSkin: SkinModule = {
	preset: {
		id: 'shuimo',
		nameKey: 'skins.shuimoName',
		descriptionKey: 'skins.shuimoDesc',
		theme: {
			colorBrand: '#ab1d22',
			colorBrandSecondary: '#354e6b',
			colorPrimary: '#5c4f55',
			colorSecondary: '#7f9faf',
			colorBg: '#e8e2d5',
			colorBorder: '#c6beb1',
			colorCard: '#fbf7ee99',
			colorArticle: '#fdfbf6e6',
			colorInk: '#45465e',
			colorMuted: '#8b8378',
			colorLine: '#c6beb1',
			colorSurface: '#fbf7eed9',
			colorSurfaceStrong: '#fdfbf6f5',
			colorSubtle: '#f5f1e6'
		},
		card: {
			radius: 12,
			radiusLg: 16,
			blur: 'none',
			shadow: '0 12px 28px -18px rgb(69 70 94 / 28%), 0 2px 6px -2px rgb(69 70 94 / 12%)',
			borderWidth: 1
		},
		defaultFont: 'huiwenmincho',
		backgroundImageId: 'ink-ridges',
		preview: {
			bg: '#e8e2d5',
			card: '#fbf7ee',
			accent: '#ab1d22',
			ink: '#45465e'
		}
	},
	Decor: ShuimoDecor
}
