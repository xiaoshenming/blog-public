import type { SkinModule } from '../types'
import ShuimoDecor from './decor'

/**
 * 水墨皮肤：色值取自 shuimo-design/color 的《中国传统色》二十四节气表
 * （立秋·竹月 / 云母、霜降·烟墨、白露·胭脂虫、秋分·青雀头黛 等）。
 * colorBg 为「香皮」提亮后的宣纸调，纯香皮作整页底色偏暗。
 *
 * 素材：public/skins/shuimo/（宣纸纹理、墨笔触方框与墨线、青海波、毛笔光标、竹枝，均来自 shuimo-design，MIT）
 * 专属样式：src/skins/shuimo/shuimo.css（由 globals.css 按目录显式引入）
 */
export const shuimoSkin: SkinModule = {
	preset: {
		id: 'shuimo',
		nameKey: 'skins.shuimoName',
		descriptionKey: 'skins.shuimoDesc',
		theme: {
			colorBrand: '#a81c2b',
			colorBrandSecondary: '#354e6b',
			colorPrimary: '#2b333e',
			colorSecondary: '#7f9faf',
			colorBg: '#e8e2d5',
			colorBorder: '#c6beb1',
			/**
			 * 卡片/正文/控件底色比默认皮肤更实、更亮：水墨下卡片要读作「铺在画上的纸」，
			 * 半透明度过高会让它和背景的宣纸底色糊成一片（实测 60% 时卡片与页面几乎同色，
			 * 整页糊成一块米色，墨线框也失去了衬托）。数值按背景画实测调到「明显更亮但不刺眼」。
			 */
			colorCard: '#fdfbf6e0',
			colorArticle: '#fefdfaf2',
			colorInk: '#2b333e',
			colorMuted: '#8b8378',
			colorLine: '#c6beb1',
			colorSurface: '#fdfbf6e8',
			colorSurfaceStrong: '#fefdfaf5',
			colorSubtle: '#f5f1e6'
		},
		card: {
			/**
			 * 圆角收到近方：水墨的框是手写的方框，圆角一大会立刻变成「现代卡片」。
			 * squircle 分支同步收小 —— 该分支下圆角视觉上比同值正圆角小，
			 * 默认皮肤是 40→64，此处按同样比例 3→5。
			 */
			radius: 3,
			radiusLg: 5,
			blur: 'none',
			/**
			 * 阴影压到几乎不可见：参考实现（shuimo-ui）全库不用 box-shadow，
			 * 层次靠墨线框与纸色深浅拉开。这里只留一道贴边的淡墨，
			 * 让卡片与背景之间有一条分界，而不是靠投影浮起来。
			 */
			shadow: '0 1px 2px -1px rgb(43 51 62 / 10%)',
			/** 边框交给墨线贴图（edge），不再画实线边框 */
			borderWidth: 0,
			/**
			 * 四边墨线：上/下用横笔触，左/右用竖笔触。
			 * 顺序与 card.stylex.ts 的 background-position / repeat / size 一一对应。
			 *
			 * 用 ink-line-* 而非 line-*：原始素材（crossrange 548×5 / vertical 6×548）
			 * 是给输入框当分隔线用的，alpha 峰值只有 70%、全图均值仅 20%
			 * （按 alpha 通道实测），放到卡片尺度上只剩一道灰痕，撑不住「墨框」。
			 * ink-line-* 是同一素材把 alpha 整体乘 1.75 后的成品（逐像素核对过），
			 * 峰值 70%→100%，非零像素均值：横版 31%→53%、竖版 45%
			 * （竖版原素材的笔触本就比横版实，两版数值不同，勿套用同一组）。
			 * 仍是 shuimo-ui 素材的 MIT 衍生物。
			 * 淡的那版仍用于标题下划线、滑块轨道这些本就该轻的地方。
			 */
			edge: "url('/skins/shuimo/ink-line-h.webp'), url('/skins/shuimo/ink-line-h.webp'), url('/skins/shuimo/ink-line-v.webp'), url('/skins/shuimo/ink-line-v.webp')"
		},
		button: {
			/** 方角：水墨的按钮是手写方框，圆角一大会退回「现代卡片」的观感 */
			radius: 2,
			radiusLg: 4,
			/**
			 * 边框加宽到 5px 以容纳墨笔触 —— 与参考实现同值（那边的素材 156×45、slice 8，
			 * 四边各 8px 的笔触被缩放到 5px 边框宽度上）。
			 */
			borderWidth: 5,
			/** 墨笔触方框：只给 source 与 slice，宽度交给 borderWidth，repeat 走初始值 stretch */
			frame: "url('/skins/shuimo/brush-frame.webp') 8",
			/** 青海波纹底（button-mask.svg，19×9.5 平铺）：参考实现里按钮的底纹 */
			texture: "url('/skins/shuimo/wave-mask.svg')"
		},
		defaultFont: 'huiwenmincho',
		backgroundImageId: 'ink-ridges',
		/** 远山随指针微动：参考实现里让背景「活」起来的那一环，见 src/hooks/use-parallax.ts */
		backgroundParallax: true,
		preview: {
			bg: '#e8e2d5',
			card: '#fbf7ee',
			accent: '#a81c2b',
			ink: '#2b333e'
		}
	},
	Decor: ShuimoDecor
}
