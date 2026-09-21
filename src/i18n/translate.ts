import { en } from './dictionaries/en'
import { zh, type Dictionary } from './dictionaries/zh'
import type { Locale } from './config'

export type TranslationParams = Record<string, string | number>

/** 两层字典的合法 key，如 'blog.loading'、'nav.recentPosts' */
type DomainKeys<T> = { [K in keyof T & string]: T[K] extends string ? K : never }[keyof T & string]
export type TranslationKey = { [D in keyof Dictionary & string]: `${D}.${DomainKeys<Dictionary[D]>}` }[keyof Dictionary & string]

const dictionaries: Record<Locale, Dictionary> = { zh, en }

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
	const raw = resolve(dictionaries[locale], key) ?? resolve(zh, key)
	if (raw === undefined) {
		if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] 缺少文案: ${key}`)
		return key
	}
	if (!params) return raw
	return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}
