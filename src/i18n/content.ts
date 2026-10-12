import { DEFAULT_LOCALE, type Locale } from './config'

/**
 * 内容数据多语言选择 —— 全站内容页共用的唯一规则，改这里即改所有页面。
 *
 *   - **编辑态一律返回中文源**：管理端的写回链路以中文为数据源（见 src/lib/blog-index.ts 等），
 *     用译文编辑会把译文提交回仓库，污染数据源
 *   - 访客态按当前语言取变体；**变体缺失或为空**时回落中文源
 *
 * 各页面静态 import 自己的语言变体（`list.en.json` 等）后组成 byLocale 表传入；
 * 新增语言时在表里补一项即可。
 */
export function localizedContent<T>(source: T, byLocale: Partial<Record<Locale, T>>, locale: Locale, isEditMode = false): T {
	if (isEditMode || locale === DEFAULT_LOCALE) return source

	const localized = byLocale[locale]
	if (localized == null) return source
	// 空数组 / 空串视为「未翻译」，回落中文源，避免页面显示成空白
	if (Array.isArray(localized) && localized.length === 0) return source
	if (typeof localized === 'string' && localized.trim() === '') return source

	return localized
}

/**
 * 对象型内容（如 about 的 { title, description, content }）的字段级合并变体：
 * 语言版是 Partial，逐字段覆盖中文源，缺失字段保留中文。
 * 编辑态同样固定中文源。
 */
export function mergeLocalizedContent<T extends object>(source: T, byLocale: Partial<Record<Locale, Partial<T>>>, locale: Locale, isEditMode = false): T {
	if (isEditMode || locale === DEFAULT_LOCALE) return source
	const localized = byLocale[locale]
	return localized ? { ...source, ...localized } : source
}
