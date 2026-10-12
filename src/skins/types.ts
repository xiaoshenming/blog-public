import type { ComponentType } from 'react'
import type { TranslationKey } from '@/i18n/translate'

/**
 * 皮肤系统的类型定义。
 *
 * 新增一个皮肤：
 *   1. 建 `src/skins/<id>/`：`index.ts`（预设，导出 SkinModule）+ 可选 `decor.tsx`（装饰层）+ 可选 `<id>.css`（专属样式）
 *   2. 在 `SKIN_IDS`（下方，类型源）与 `src/skins/index.ts` 的 `SKIN_MODULES` 各加一处（漏了会在开发态报错）
 *   3. 在 `src/styles/globals.css` 里 `@import` 该皮肤的 CSS
 *   4. 在四语字典的 `skins` 命名空间补 `nameKey` / `descriptionKey`
 * 素材放 `public/skins/<id>/`。
 */

export const SKIN_IDS = ['default', 'shuimo'] as const

export type SkinId = (typeof SKIN_IDS)[number]

export const DEFAULT_SKIN_ID: SkinId = 'default'

/** 与 site-content.json 的 theme 对象同构 */
export type SkinTheme = {
	colorBrand: string
	colorBrandSecondary: string
	colorPrimary: string
	colorSecondary: string
	colorBg: string
	colorBorder: string
	colorCard: string
	colorArticle: string
	colorInk: string
	colorMuted: string
	colorLine: string
	colorSurface: string
	/** 比 surface 更实的一层：悬停底色、需要压住背景的条状控件 */
	colorSurfaceStrong: string
	colorSubtle: string
}

/** 卡片质感：写入 --skin-card-* 自定义属性，由 card.stylex.ts 消费 */
export type SkinCardStyle = {
	/** 基础圆角，单位 px */
	radius: number
	/** squircle 升级后的圆角，单位 px */
	radiusLg: number
	/** backdrop-filter 取值，'none' 表示不做背景模糊 */
	blur: string
	/** box-shadow 取值 */
	shadow: string
	/** 边框宽度，单位 px */
	borderWidth: number
}

export type SkinPreset = {
	id: SkinId
	/** 皮肤名与描述的字典 key，位于 `skins` 命名空间，四语齐备 */
	nameKey: TranslationKey
	descriptionKey: TranslationKey
	theme: SkinTheme
	card: SkinCardStyle
	/** 选中该皮肤时填入 font 字段的推荐字体 id，站长可再改 */
	defaultFont: string
	/**
	 * 该皮肤关联的背景图 id（对应 site-content.json 的 backgroundImages[].id）。
	 * 站长选中皮肤时会填入 currentBackgroundImageId，可再改或清空；
	 * 访客选中皮肤时直接套用，得到该皮肤的完整外观。
	 * 未设置、或该图已被站长删除时回落站长设置（layout 侧对找不到的 id 静默跳过）。
	 */
	backgroundImageId?: string
	/** 配置面板与访客切换菜单里的色块预览 */
	preview: {
		bg: string
		card: string
		accent: string
		ink: string
	}
}

/** 一个皮肤的完整交付物：预设 + 可选的装饰层组件 */
export type SkinModule = {
	preset: SkinPreset
	/** 皮肤专属装饰层；不提供则不渲染任何装饰 */
	Decor?: ComponentType
}

export function isSkinId(value: unknown): value is SkinId {
	return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value)
}
