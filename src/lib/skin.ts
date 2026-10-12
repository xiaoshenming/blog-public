import { DEFAULT_SKIN_ID, SKIN_PRESETS, getSkinPreset, isSkinId, type SkinId, type SkinTheme } from '@/skins'
import { FONT_OPTIONS } from '@/config/fonts'

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

/** 卡片质感变量名，由 card.stylex.ts 消费 */
const CARD_VARS = ['--skin-card-radius', '--skin-card-radius-lg', '--skin-card-blur', '--skin-card-shadow', '--skin-card-border-width'] as const

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

/** 应用皮肤：切换 data-skin（皮肤专属 CSS 与装饰层的开关）并写入卡片质感变量 */
export function applySkin(skinId?: string | null) {
	if (typeof document === 'undefined') return
	const skin = getSkinPreset(skinId)
	const root = document.documentElement
	root.setAttribute('data-skin', skin.id)
	root.style.setProperty(CARD_VARS[0], `${skin.card.radius}px`)
	root.style.setProperty(CARD_VARS[1], `${skin.card.radiusLg}px`)
	root.style.setProperty(CARD_VARS[2], skin.card.blur)
	root.style.setProperty(CARD_VARS[3], skin.card.shadow)
	root.style.setProperty(CARD_VARS[4], `${skin.card.borderWidth}px`)
}

/**
 * 移除所有内联的皮肤变量，回到 theme.css 的兜底值。
 * 配置弹窗的「取消」用它还原预览期间改动的样式。
 */
export function resetSkinVars() {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	for (const cssVar of Object.values(THEME_VARS)) root.style.removeProperty(cssVar)
	for (const cssVar of CARD_VARS) root.style.removeProperty(cssVar)
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

/** 访客选择的字体；返回 null 表示未覆盖 */
export function readStoredFont(): string | null {
	return readStorage(FONT_STORAGE_KEY)
}

export function persistFont(fontId: string | null) {
	writeStorage(FONT_STORAGE_KEY, fontId)
}

export function clearStoredPreferences() {
	persistSkin(null)
	persistFont(null)
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

/**
 * 生成注入 <head> 的阻塞式引导脚本：在首次绘制前就落地访客偏好，
 * 否则选了水墨的访客会先看到一帧站长默认皮肤再跳变。
 *
 * 脚本必须自包含（此时还没有 React 与模块加载），所以把皮肤/字体预设与站长的背景图清单序列化进去。
 * 键名刻意压缩：这段 JSON 会出现在每一份 HTML 里。
 *   t = theme 的 CSS 变量表, c = 卡片质感变量, df = 皮肤推荐字体, b = 皮肤关联背景图 id
 *   f = font-family, h = 字体样式表, im = 背景图 id→url, sb = 站长当前背景图 id
 */
export function buildPreferenceBootstrap(
	siteSkinId: string,
	siteFontId: string,
	siteBackgroundImageId: string | null | undefined,
	backgroundImages: ReadonlyArray<{ id: string; url: string }>
): string {
	const skins: Record<string, { t: Record<string, string>; c: Record<string, string>; df: string; b?: string }> = {}
	for (const skin of SKIN_PRESETS) {
		const theme: Record<string, string> = {}
		for (const [key, cssVar] of Object.entries(THEME_VARS)) {
			const value = skin.theme[key as keyof SkinTheme]
			if (value) theme[cssVar] = value
		}
		skins[skin.id] = {
			t: theme,
			c: {
				'--skin-card-radius': `${skin.card.radius}px`,
				'--skin-card-radius-lg': `${skin.card.radiusLg}px`,
				'--skin-card-blur': skin.card.blur,
				'--skin-card-shadow': skin.card.shadow,
				'--skin-card-border-width': `${skin.card.borderWidth}px`
			},
			df: skin.defaultFont,
			...(skin.backgroundImageId ? { b: skin.backgroundImageId } : {})
		}
	}

	const fonts: Record<string, { f: string; h?: string }> = {}
	for (const font of FONT_OPTIONS) {
		fonts[font.id] = font.cssHref ? { f: font.family, h: font.cssHref } : { f: font.family }
	}

	const images: Record<string, string> = {}
	for (const image of backgroundImages) {
		if (image.id && image.url) images[image.id] = image.url
	}

	const data = JSON.stringify({ skins, fonts, images, siteSkinId, siteFontId, siteBgId: siteBackgroundImageId || '' })

	return `(function(){try{
var d=${data},r=document.documentElement;
var vs=localStorage.getItem(${JSON.stringify(SKIN_STORAGE_KEY)});
var vf=localStorage.getItem(${JSON.stringify(FONT_STORAGE_KEY)});
var sid=(vs&&d.skins[vs])?vs:d.siteSkinId;
var s=d.skins[sid]||d.skins[d.siteSkinId];
if(s){r.setAttribute('data-skin',sid);
for(var k in s.t)r.style.setProperty(k,s.t[k]);
for(var c in s.c)r.style.setProperty(c,s.c[c]);}
var bid=(vs&&s&&s.b)?s.b:d.siteBgId;
var burl=bid?d.images[bid]:null;
r.style.setProperty(${JSON.stringify(BACKGROUND_VAR)},burl?'url("'+burl+'")':'none');
var fid=vf||(vs&&s?s.df:null)||d.siteFontId;
var fo=d.fonts[fid]||d.fonts[d.siteFontId];
if(fo){if(fo.h&&!document.querySelector('link[data-font-css][href="'+fo.h+'"]')){
var l=document.createElement('link');l.rel='stylesheet';l.href=fo.h;l.setAttribute('data-font-css','');
document.head.appendChild(l);}
r.style.setProperty('--font-sans',fo.f);}
}catch(e){}})();`
}
