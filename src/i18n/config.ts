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

/** <html lang> 的取值：中文用 zh-CN，英文用 en */
export function htmlLang(locale: Locale): string {
	return locale === 'en' ? 'en' : 'zh-CN'
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
