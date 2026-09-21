'use client'

import useSWR from 'swr'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LOCALE } from '@/i18n/config'

export type CategoriesConfig = {
	categories: string[]
}

const fetcher = async (url: string): Promise<CategoriesConfig> => {
	const res = await fetch(url, { cache: 'no-store' })
	if (!res.ok) {
		return { categories: [] }
	}
	const data = await res.json()
	if (Array.isArray(data)) {
		return { categories: data.filter((item): item is string => typeof item === 'string') }
	}
	if (Array.isArray((data as any)?.categories)) {
		return { categories: (data as any).categories.filter((item: unknown): item is string => typeof item === 'string') }
	}
	return { categories: [] }
}

/**
 * 分类列表。默认返回中文源（写作后台等管理链路必须用中文，避免译文写回数据源）；
 * localeAware 为 true 时（访客展示端）优先加载语言版分类，缺失回落中文。
 */
export function useCategories(options?: { localeAware?: boolean }) {
	const { locale } = useI18n()
	const localeAware = options?.localeAware ?? false
	const { data, error, isLoading } = useSWR<CategoriesConfig>(
		['/blogs/categories.json', localeAware ? locale : DEFAULT_LOCALE],
		async () => {
			const base = await fetcher('/blogs/categories.json')
			if (!localeAware || locale === DEFAULT_LOCALE) return base
			const localized = await fetcher(`/blogs/categories.${locale}.json`)
			return localized.categories.length > 0 ? localized : base
		},
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true
		}
	)

	return {
		categories: data?.categories ?? [],
		loading: isLoading,
		error
	}
}
