'use client'

import { createBlob, putFile, toBase64Utf8, readTextFileFromRepo, type TreeItem } from '@/lib/github-client'

import type { BlogIndexItem } from '@/app/blog/types'

export type { BlogIndexItem } from '@/app/blog/types'

/** 删除文章时需要同步清理的语言版索引（与 public/blogs 下的变体文件一致） */
export const LOCALIZED_INDEX_LOCALES = ['en', 'ja', 'ko'] as const

/**
 * 删除文章后同步过滤各语言版索引，返回可并入 commit tree 的更新条目。
 * 语言版索引缺失（未生成）或解析失败时跳过该语言，不影响删除主流程。
 */
export async function buildLocalizedIndexRemovals(token: string, owner: string, repo: string, branch: string, removedSlugs: string[]): Promise<TreeItem[]> {
	const items: TreeItem[] = []
	if (removedSlugs.length === 0) return items
	for (const locale of LOCALIZED_INDEX_LOCALES) {
		const path = `public/blogs/index.${locale}.json`
		try {
			const txt = await readTextFileFromRepo(token, owner, repo, path, branch)
			if (!txt) continue
			const list = JSON.parse(txt)
			if (!Array.isArray(list)) continue
			const next = list.filter((item: { slug?: string }) => !!item?.slug && !removedSlugs.includes(item.slug))
			if (next.length === list.length) continue
			const blob = await createBlob(token, owner, repo, toBase64Utf8(JSON.stringify(next, null, 2)), 'base64')
			items.push({ path, mode: '100644', type: 'blob', sha: blob.sha })
		} catch {
			// 该语言索引不存在或读取失败：跳过
		}
	}
	return items
}

export async function upsertBlogsIndex(token: string, owner: string, repo: string, item: BlogIndexItem, branch: string): Promise<void> {
	const indexPath = 'public/blogs/index.json'
	let list: BlogIndexItem[] = []
	try {
		const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
		if (txt) list = JSON.parse(txt)
	} catch {
		// ignore parse errors and start from empty list
	}
	const map = new Map<string, BlogIndexItem>(list.map(i => [i.slug, i]))
	map.set(item.slug, item)
	const next = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
	const base64 = toBase64Utf8(JSON.stringify(next, null, 2))
	await putFile(token, owner, repo, indexPath, base64, 'Update blogs index', branch)
}

export async function prepareBlogsIndex(token: string, owner: string, repo: string, item: BlogIndexItem, branch: string): Promise<string> {
	const indexPath = 'public/blogs/index.json'
	let list: BlogIndexItem[] = []
	try {
		const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
		if (txt) list = JSON.parse(txt)
	} catch {
		// ignore parse errors and start from empty list
	}
	const map = new Map<string, BlogIndexItem>(list.map(i => [i.slug, i]))
	map.set(item.slug, item)
	const next = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
	return JSON.stringify(next, null, 2)
}

export async function removeBlogsFromIndex(token: string, owner: string, repo: string, slugs: string[], branch: string): Promise<string> {
	const indexPath = 'public/blogs/index.json'
	let list: BlogIndexItem[] = []
	try {
		const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
		if (txt) list = JSON.parse(txt)
	} catch {
		// ignore parse errors and keep empty list
	}
	const slugSet = new Set(slugs.filter(Boolean))
	if (slugSet.size === 0) {
		return JSON.stringify(list, null, 2)
	}
	const next = list.filter(item => !slugSet.has(item.slug))
	return JSON.stringify(next, null, 2)
}

export async function removeBlogFromIndex(token: string, owner: string, repo: string, slug: string, branch: string): Promise<string> {
	return removeBlogsFromIndex(token, owner, repo, [slug], branch)
}
