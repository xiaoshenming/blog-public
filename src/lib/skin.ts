import {
	DEFAULT_SKIN_ID,
	SKIN_PRESETS,
	getSkinPreset,
	isSkinId,
	type SkinButtonStyle,
	type SkinCardStyle,
	type SkinId,
	type SkinTheme
} from '@/skins'
import { FONT_OPTIONS } from '@/config/fonts'
import { applyFont } from '@/lib/font'

export const SKIN_STORAGE_KEY = 'blog-skin'
export const FONT_STORAGE_KEY = 'blog-font'

/** theme 字段 → CSS 自定义属性。新增令牌时同步 theme.css 与 tokens.stylex.ts */
const THEME_VARS: Record<keyof SkinTheme, string> = {
	colorBrand: '--color-brand',
	colorBrandSecondary: '--color-brand-secondary',
	colorPrimary: '--color-primary',
	colorSecondary: '--color-secondary',
	colorBg: '--color-bg',
	colorBorder: '--color-border',
	colorCard: '--color-card',
	colorArticle: '--color-article',
	colorInk: '--color-ink',
	colorMuted: '--color-muted',
	colorLine: '--color-line',
	colorSurface: '--color-surface',
	colorSurfaceStrong: '--color-surface-strong',
	colorSubtle: '--color-subtle'
}

/**
 * 质感令牌表：皮肤预设里的一个字段 → 一个 CSS 自定义属性 + 取值函数。
 * 单一映射表同时供运行时（applySkin）、引导脚本序列化（buildPreferenceBootstrap）
 * 与 SSR 内联样式（themeVars / styleVars）使用，四处共用一份，避免各写一遍而漂移。
 */
type TokenSpec<T> = Record<keyof T, { cssVar: string; toValue: (style: T) => string }>

/** 卡片质感，由 card.stylex.ts 消费 */
const CARD_TOKENS: TokenSpec<SkinCardStyle> = {
	radius: { cssVar: '--skin-card-radius', toValue: c => `${c.radius}px` },
	radiusLg: { cssVar: '--skin-card-radius-lg', toValue: c => `${c.radiusLg}px` },
	blur: { cssVar: '--skin-card-blur', toValue: c => c.blur },
	shadow: { cssVar: '--skin-card-shadow', toValue: c => c.shadow },
	borderWidth: { cssVar: '--skin-card-border-width', toValue: c => `${c.borderWidth}px` },
	edge: { cssVar: '--skin-card-edge', toValue: c => c.edge ?? 'none' }
}

/** 按钮质感，由 button.stylex.ts 消费 */
const BUTTON_TOKENS: TokenSpec<SkinButtonStyle> = {
	radius: { cssVar: '--skin-btn-radius', toValue: b => `${b.radius}px` },
	radiusLg: { cssVar: '--skin-btn-radius-lg', toValue: b => `${b.radiusLg}px` },
	borderWidth: { cssVar: '--skin-btn-border-width', toValue: b => `${b.borderWidth}px` },
	frame: { cssVar: '--skin-btn-frame', toValue: b => b.frame ?? 'none' },
	texture: { cssVar: '--skin-btn-texture', toValue: b => b.texture ?? 'none' }
}

/** 全部质感令牌表，按预设里的分组组织 */
const STYLE_TOKENS = { card: CARD_TOKENS, button: BUTTON_TOKENS } as const

/** 把一组质感令牌序列化成 { cssVar: value }，供内联注入与引导脚本共用 */
function serializeTokens<T extends object>(style: T, spec: TokenSpec<T>): Record<string, string> {
	const out: Record<string, string> = {}
	for (const key of Object.keys(spec) as (keyof T)[]) {
		const { cssVar, toValue } = spec[key]
		out[cssVar] = toValue(style)
	}
	return out
}

/**
 * 配色字段 → CSS 变量值的平表。
 * 导出给根布局生成 SSR 内联样式用 —— 那边曾手抄一份 14 个变量的清单，漏掉了
 * --color-surface-strong，且 `as React.CSSProperties` 把漏项藏到了运行时。
 * 由本函数统一生成后，THEME_VARS 是唯一的令牌清单来源。
 */
export function themeVars(theme: SkinTheme): Record<string, string> {
	const out: Record<string, string> = {}
	for (const [key, cssVar] of Object.entries(THEME_VARS)) {
		const value = theme[key as keyof SkinTheme]
		if (value) out[cssVar] = value
	}
	return out
}

/** 卡片 + 按钮质感 → CSS 变量值的平表（同样导出给根布局） */
export function styleVars(card: SkinCardStyle, button: SkinButtonStyle): Record<string, string> {
	return { ...serializeTokens(card, CARD_TOKENS), ...serializeTokens(button, BUTTON_TOKENS) }
}

/** 背景图变量名，由 layout 的背景层消费 */
export const BACKGROUND_VAR = '--skin-bg-image'

export function applyTheme(theme?: Partial<SkinTheme> | null) {
	if (typeof document === 'undefined' || !theme) return
	const root = document.documentElement
	for (const [key, cssVar] of Object.entries(THEME_VARS)) {
		const value = theme[key as keyof SkinTheme]
		if (value) root.style.setProperty(cssVar, value)
	}
}

/** 应用皮肤：切换 data-skin（皮肤专属 CSS 与装饰层的开关）并写入卡片/按钮质感变量 */
export function applySkin(skinId?: string | null) {
	if (typeof document === 'undefined') return
	const skin = getSkinPreset(skinId)
	const root = document.documentElement
	root.setAttribute('data-skin', skin.id)
	for (const [group, spec] of Object.entries(STYLE_TOKENS)) {
		const vars = serializeTokens(skin[group as keyof typeof STYLE_TOKENS], spec as TokenSpec<object>)
		for (const [cssVar, value] of Object.entries(vars)) root.style.setProperty(cssVar, value)
	}
}

function readStorage(key: string): string | null {
	try {
		return window.localStorage.getItem(key)
	} catch {
		return null
	}
}

function writeStorage(key: string, value: string | null) {
	try {
		if (value === null) window.localStorage.removeItem(key)
		else window.localStorage.setItem(key, value)
	} catch {}
}

/** 访客选择的皮肤；返回 null 表示未覆盖，应使用站长默认值 */
export function readStoredSkin(): SkinId | null {
	const stored = readStorage(SKIN_STORAGE_KEY)
	return isSkinId(stored) ? stored : null
}

export function persistSkin(skinId: SkinId | null) {
	writeStorage(SKIN_STORAGE_KEY, skinId)
}

/**
 * 访客选择的字体；返回 null 表示未覆盖。
 * 与 readStoredSkin 一样要校验有效性：脏值（字体被删、手改 localStorage、跨版本残留）
 * 会让 resolveFont 返回一个不存在的 id —— 视觉上静默回落 system 看不出问题，
 * 但字体菜单里没有任何一项处于选中态，且「皮肤推荐字体」这条优先级被无效值短路。
 */
export function readStoredFont(): string | null {
	const stored = readStorage(FONT_STORAGE_KEY)
	return stored && FONT_OPTIONS.some(font => font.id === stored) ? stored : null
}

export function persistFont(fontId: string | null) {
	writeStorage(FONT_STORAGE_KEY, fontId)
}

/**
 * 解析最终生效值：访客覆盖 > 站长默认 > 代码兜底。
 * SSR 阶段拿不到 localStorage，只走后两级，与 I18nProvider 的取舍一致。
 */
export function resolveSkin(visitorSkin: SkinId | null, siteSkin?: string | null): SkinId {
	if (visitorSkin) return visitorSkin
	return isSkinId(siteSkin) ? siteSkin : DEFAULT_SKIN_ID
}

export function resolveFont(visitorFont: string | null, siteFont: string | null | undefined, skinId: SkinId): string {
	return visitorFont ?? siteFont ?? getSkinPreset(skinId).defaultFont
}

/**
 * 背景图取值同样走 CSS 变量（--skin-bg-image）而非 React 条件渲染，
 * 这样访客覆盖时也能由引导脚本在首次绘制前落地，不会先闪一帧站长的背景。
 * 变量里存的是完整的 `url("...")` 或 `none`。
 */
export function applyBackgroundImage(url?: string | null) {
	if (typeof document === 'undefined') return
	document.documentElement.style.setProperty(BACKGROUND_VAR, url ? `url("${url}")` : 'none')
}

type AppearanceSource = {
	/** 访客在 localStorage 里的覆盖；null 表示未覆盖 */
	visitorSkin: SkinId | null
	visitorFont: string | null
	/** 站长设置 */
	siteSkin?: string | null
	siteFont?: string | null
	siteTheme: SkinTheme
	siteBackgroundImageId?: string | null
	backgroundImages: ReadonlyArray<{ id: string; url: string }>
}

/**
 * 按「访客覆盖 > 站长设置 > 代码兜底」解析出最终外观，并一次性落地到 DOM。
 *
 * 这是「按访客视角落地外观」的统一入口，SkinProvider 与配置面板共用。
 * （applyTheme / applySkin / applyFont / applyBackgroundImage 这些原语仍是公开的，
 *  皮肤配置面板在「选皮肤即预览」时会直接调它们写 DOM；那是预览路径，关窗时会
 *  由本函数覆盖回访客视角。这里说的是「解析 + 落地」这件事只有一套实现。）
 * 之前两处各有一套：SkinProvider 走下面的解析函数，配置面板则直接写站长值 ——
 * 于是配置面板「取消」后 DOM 停在站长值，而 localStorage 里的访客覆盖还在，
 * 且 SkinProvider 的依赖没变不会重跑，页面与 localStorage 就此不一致，直到下次刷新。
 */
export function applyResolvedAppearance(source: AppearanceSource) {
	const skinId = resolveSkin(source.visitorSkin, source.siteSkin)
	const preset = getSkinPreset(skinId)
	// 访客一旦自己选了皮肤，就该看到该皮肤的完整配色，而不是站长微调过的版本
	applyTheme(source.visitorSkin ? preset.theme : source.siteTheme)
	applySkin(skinId)
	applyFont(resolveFont(source.visitorFont, source.visitorSkin ? null : source.siteFont, skinId))
	applyBackgroundImage(resolveBackgroundUrl(source.visitorSkin, skinId, source.siteBackgroundImageId, source.backgroundImages))
}

/**
 * 解析最终生效的背景图 url。
 * 访客选的皮肤若自带关联背景就用它，否则回落站长的背景设置 ——
 * 「默认」皮肤没有关联背景，访客选它时应当看到站长的背景，而不是背景凭空消失。
 * 找不到对应图片（站长删了该图）时返回 null，即不显示背景。
 */
export function resolveBackgroundUrl(
	visitorSkin: SkinId | null,
	skinId: SkinId,
	siteBackgroundImageId: string | null | undefined,
	images: ReadonlyArray<{ id: string; url: string }>
): string | null {
	const id = (visitorSkin && getSkinPreset(skinId).backgroundImageId) || siteBackgroundImageId
	if (!id) return null
	return images.find(item => item.id === id)?.url ?? null
}
