import { DEFAULT_LOCALE, type Locale } from './config'

/**
 * 内容数据多语言选择：默认语言用中文源数据，其他语言查变体表，缺失回落中文。
 * 页面里静态 import 各语言变体（list.en.json 等），加语言时在表里补一项。
 */
export function localizedContent<T>(source: T, byLocale: Partial<Record<Locale, T>>, locale: Locale): T {
	return locale === DEFAULT_LOCALE ? source : (byLocale[locale] ?? source)
}
