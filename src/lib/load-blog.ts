import type { Locale } from '@/i18n/config'
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
 * 英文模式优先取 *.en 变体（index.en.md / config.en.json），缺失时回落中文原文。
 */
export async function loadBlog(slug: string, locale: Locale = 'zh'): Promise<LoadedBlog> {
	if (!slug) {
		throw new Error('Slug is required')
	}

	const path = `blogs/${encodeURIComponent(slug)}`

	// Load config.json（en 优先 config.en.json）
	let config: BlogConfig = {}
	if (locale === 'en') {
		const enConfigRes = await fetch(`/${path}/config.en.json`)
		if (enConfigRes.ok) {
			try {
				config = await enConfigRes.json()
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

	// Load index.md（en 优先 index.en.md，缺失回落中文）
	let markdown = ''
	if (locale === 'en') {
		const enMdRes = await fetch(`/${path}/index.en.md`)
		if (enMdRes.ok) markdown = await enMdRes.text()
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
