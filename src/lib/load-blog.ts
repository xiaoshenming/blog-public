import { DEFAULT_LOCALE, type Locale } from '@/i18n/config'
import type { BlogConfig } from '@/app/blog/types'

export type { BlogConfig } from '@/app/blog/types'

export type LoadedBlog = {
	slug: string
	config: BlogConfig
	markdown: string
	cover?: string
}

/**
 * Load blog data from public/blogs/{slug}
 * Used by both view page and edit page.
 * 非默认语言优先取语言变体（index.<locale>.md / config.<locale>.json），缺失时回落中文原文。
 */
export async function loadBlog(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<LoadedBlog> {
	if (!slug) {
		throw new Error('Slug is required')
	}

	const path = `blogs/${encodeURIComponent(slug)}`

	// Load config.json（非默认语言优先 config.<locale>.json）
	let config: BlogConfig = {}
	if (locale !== DEFAULT_LOCALE) {
		const localizedRes = await fetch(`/${path}/config.${locale}.json`)
		if (localizedRes.ok) {
			try {
				config = await localizedRes.json()
			} catch {
				config = {}
			}
		}
	}
	if (!config.title) {
		const configRes = await fetch(`/${path}/config.json`)
		if (configRes.ok) {
			try {
				const zhConfig: BlogConfig = await configRes.json()
				config = { ...zhConfig, ...config }
			} catch {
				config = {}
			}
		}
	}

	// Load index.md（非默认语言优先 index.<locale>.md，缺失回落中文）
	let markdown = ''
	if (locale !== DEFAULT_LOCALE) {
		const localizedRes = await fetch(`/${path}/index.${locale}.md`)
		if (localizedRes.ok) markdown = await localizedRes.text()
	}
	if (!markdown) {
		const mdRes = await fetch(`/${path}/index.md`)
		if (!mdRes.ok) {
			throw new Error('Blog not found')
		}
		markdown = await mdRes.text()
	}

	return {
		slug,
		config,
		markdown,
		cover: config.cover
	}
}
