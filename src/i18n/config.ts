export const LOCALES = ['zh', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'zh'

export const LOCALE_STORAGE_KEY = 'blog-locale'

const LOCALE_LABELS: Record<Locale, string> = {
	zh: '中文',
	en: 'English'
}

export function localeLabel(locale: Locale): string {
	return LOCALE_LABELS[locale]
}

/** 各语言的 <html lang> 取值；未登记的语言直接用语言码本身 */
const HTML_LANGS: Partial<Record<Locale, string>> = {
	zh: 'zh-CN'
}

export function htmlLang(locale: Locale): string {
	return HTML_LANGS[locale] ?? locale
}

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** 仅浏览器端调用：读取持久化的语言选择，非法值回落默认语言 */
export function readStoredLocale(): Locale {
	try {
		const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
		return isLocale(stored) ? stored : DEFAULT_LOCALE
	} catch {
		return DEFAULT_LOCALE
	}
}

export function persistLocale(locale: Locale) {
	try {
		window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
		document.documentElement.lang = htmlLang(locale)
	} catch {}
}
