'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, htmlLang, persistLocale, readStoredLocale, type Locale } from './config'
import { translate, type TranslationKey, type TranslationParams } from './translate'

type I18nValue = {
	locale: Locale
	setLocale: (locale: Locale) => void
	toggleLocale: () => void
	t: (key: TranslationKey, params?: TranslationParams) => string
}

const I18nContext = createContext<I18nValue | null>(null)

/**
 * 客户端语言上下文：SSR 按默认语言（中文）渲染保证无 hydration 分歧，
 * 挂载后读取 localStorage 恢复选择；切换即时生效并持久化。
 */
export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

	useEffect(() => {
		const stored = readStoredLocale()
		if (stored !== DEFAULT_LOCALE) {
			document.documentElement.lang = htmlLang(stored)
			setLocaleState(stored)
		}
	}, [])

	const setLocale = useCallback((next: Locale) => {
		setLocaleState(previous => {
			if (previous === next) return previous
			persistLocale(next)
			return next
		})
	}, [])

	const toggleLocale = useCallback(() => {
		setLocaleState(previous => {
			const next: Locale = previous === 'zh' ? 'en' : 'zh'
			persistLocale(next)
			return next
		})
	}, [])

	const value = useMemo<I18nValue>(
		() => ({
			locale,
			setLocale,
			toggleLocale,
			t: (key, params) => translate(locale, key, params)
		}),
		[locale, setLocale, toggleLocale]
	)

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
	const value = useContext(I18nContext)
	if (!value) throw new Error('useI18n 必须在 <I18nProvider> 内使用')
	return value
}
