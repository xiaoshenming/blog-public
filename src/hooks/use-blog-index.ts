import useSWR from 'swr'
import { useAuthStore } from '@/hooks/use-auth'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LOCALE } from '@/i18n/config'
import type { BlogIndexItem } from '@/app/blog/types'

export type { BlogIndexItem } from '@/app/blog/types'

// 改进 fetcher，抛出状态码以便处理 404
const fetcher = async (url: string) => {
	const res = await fetch(url, { cache: 'no-store' })
	if (!res.ok) {
		const error: any = new Error('Fetch failed')
		error.status = res.status
		throw error
	}
	const data = await res.json()
	return Array.isArray(data) ? data : []
}

/** 非默认语言的语言版标题/摘要/标签/分类按 slug 覆盖中文索引；语言版索引缺失时整体回落中文 */
async function fetchIndexWithLocale(locale: string): Promise<BlogIndexItem[]> {
	const list = await fetcher('/blogs/index.json')
	if (locale === DEFAULT_LOCALE) return list
	try {
		const res = await fetch(`/blogs/index.${locale}.json`, { cache: 'no-store' })
		if (!res.ok) return list
		const localizedList: BlogIndexItem[] = await res.json()
		const map = new Map(list.map(item => [item.slug, item]))
		for (const localized of localizedList) {
			const base = map.get(localized.slug)
			if (base) map.set(localized.slug, { ...base, ...localized, date: base.date, cover: base.cover })
			else map.set(localized.slug, localized)
		}
		return Array.from(map.values())
	} catch {
		return list
	}
}

export function useBlogIndex() {
	const { isAuth } = useAuthStore()
	const { locale } = useI18n()
	const { data, error, isLoading } = useSWR<BlogIndexItem[]>(['/blogs/index.json', locale], () => fetchIndexWithLocale(locale), {
		revalidateOnFocus: false,
		revalidateOnReconnect: true
	})

	let result = data || []
	if (!isAuth) {
		result = result.filter(item => !item.hidden)
	}

	return {
		items: result,
		loading: isLoading,
		error
	}
}

export function useLatestBlog() {
	const { items, loading, error } = useBlogIndex()

	const latestBlog = items.length > 0 ? items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null

	return {
		blog: latestBlog,
		loading,
		error
	}
}
