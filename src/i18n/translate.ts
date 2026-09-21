import { zh, type Dictionary } from './dictionaries/zh'
import { DEFAULT_LOCALE, type Locale } from './config'
import { dictionaries } from './locales'

export type TranslationParams = Record<string, string | number>

/** 两层字典的合法 key，如 'blog.loading'、'nav.recentPosts' */
type DomainKeys<T> = { [K in keyof T & string]: T[K] extends string ? K : never }[keyof T & string]
export type TranslationKey = { [D in keyof Dictionary & string]: `${D}.${DomainKeys<Dictionary[D]>}` }[keyof Dictionary & string]

/** 当前语言缺字典时整体回落中文（注册表不强制校验结构，key 级回落在此兜底） */
function dictionaryOf(locale: Locale): Dictionary {
	return (locale !== DEFAULT_LOCALE ? (dictionaries[locale] as Dictionary | undefined) : undefined) ?? zh
}

/** 非 React 环境的当前语言；由 I18nProvider 在挂载与切换时同步 */
let activeLocale: Locale = DEFAULT_LOCALE

export function setI18nLocale(locale: Locale) {
	activeLocale = locale
}

function resolve(dict: Dictionary, key: string): string | undefined {
	let value: unknown = dict
	for (const part of key.split('.')) {
		if (!value || typeof value !== 'object') return undefined
		value = (value as Record<string, unknown>)[part]
	}
	return typeof value === 'string' ? value : undefined
}

/**
 * 取文案：当前语言缺 key 时回落中文，再缺则开发态告警并显示 key 本身。
 * 非组件环境（工具函数、store 等）也可直接调用。
 */
export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
	const raw = resolve(dictionaryOf(locale), key) ?? resolve(zh, key)
	if (raw === undefined) {
		if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] 缺少文案: ${key}`)
		return key
	}
	if (!params) return raw
	return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/** 供组件外使用（push 服务的 toast、纯函数等）：跟随最近一次语言切换 */
export function t(key: TranslationKey, params?: TranslationParams): string {
	return translate(activeLocale, key, params)
}
