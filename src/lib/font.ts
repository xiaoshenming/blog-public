import { getFontOption } from '@/config/fonts'

const FONT_CSS_ATTR = 'data-font-css'

/** 按需挂载字体样式表，重复调用不会产生重复的 <link> */
export function ensureFontCss(href?: string) {
	if (!href || typeof document === 'undefined') return
	if (document.querySelector(`link[${FONT_CSS_ATTR}][href="${href}"]`)) return
	const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = href
	link.setAttribute(FONT_CSS_ATTR, '')
	document.head.appendChild(link)
}

/**
 * 把字体应用到当前页面，与 SSR 在 <html> 上内联 `--font-sans` 的方式一致，
 * 配置弹窗的预览 / 保存 / 取消还原都走这里
 */
export function applyFont(fontId?: string | null) {
	if (typeof document === 'undefined') return
	const option = getFontOption(fontId)
	ensureFontCss(option.cssHref)
	document.documentElement.style.setProperty('--font-sans', option.family)
}
