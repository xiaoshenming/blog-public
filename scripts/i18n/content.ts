/**
 * 内容翻译：把博客正文与内容 JSON 翻成英文变体文件（缺失时站点运行时回落中文）。
 *  - public/blogs/<slug>/index.md        → index.<locale>.md（--skip-existing 时已存在则跳过）
 *  - public/blogs/<slug>/config.json     → config.<locale>.json（title/summary/tags/category）
 *  - public/blogs/index.json             → index.<locale>.json；categories.json → categories.<locale>.json
 *  - src/app/about/list.json             → list.<locale>.json
 *  - src/app/{share,projects,pictures}/list.json、snippets/list.json → list.<locale>.json（只翻文本字段）
 */
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chat, mapWithConcurrency } from './client'
import { translateConfig } from './env'
import { multiParagraphUser, singleParagraphUser, uiSystem } from './prompt'
import { translateMarkdown } from './markdown'

const skipExisting = process.argv.includes('--skip-existing')
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7)

/** 目标语言码：文件变体后缀（.en / .ja / ...），由 TRANSLATE_TARGET 控制 */
const t = translateConfig.targetLocale

const BLOGS_DIR = resolve(process.cwd(), 'public/blogs')

function hasChinese(text: unknown): boolean {
	return typeof text === 'string' && /[\u4e00-\u9fff]/.test(text)
}

async function translateText(text: string): Promise<string> {
	return (await chat(uiSystem, singleParagraphUser(text))).trim()
}

async function translateList(items: string[]): Promise<string[]> {
	const raw = await chat(uiSystem, multiParagraphUser(items))
	const parts = raw
		.split(/\n?\s*%%\s*\n?/)
		.map(part => part.trim())
		.filter(part => part.length > 0)
	return parts.length === items.length ? parts : items
}

/** 翻译对象里的指定文本字段，其余字段原样保留 */
async function translateFields<T extends Record<string, unknown>>(item: T, fields: { text: string[]; list: string[] }): Promise<T> {
	const output: Record<string, unknown> = { ...item }
	for (const field of fields.text) {
		if (hasChinese(item[field])) output[field] = await translateText(String(item[field]))
	}
	for (const field of fields.list) {
		const value = item[field]
		if (Array.isArray(value) && value.some(hasChinese)) output[field] = await translateList(value.map(String))
	}
	return output as T
}

async function translateBlogPost(slug: string) {
	const dir = resolve(BLOGS_DIR, slug)
	const mdPath = resolve(dir, 'index.md')
	if (!existsSync(mdPath)) return

	if (skipExisting && existsSync(resolve(dir, `index.${t}.md`))) {
		console.log(`- 跳过已有译文: ${slug}`)
	} else {
		const markdown = await readFile(mdPath, 'utf8')
		const translated = await translateMarkdown(markdown)
		await writeFile(resolve(dir, `index.${t}.md`), translated, 'utf8')
		console.log(`✓ 文章: ${slug}（${markdown.length} → ${translated.length} 字符）`)
	}

	const configPath = resolve(dir, 'config.json')
	const localizedConfigPath = resolve(dir, `config.${t}.json`)
	if (existsSync(configPath)) {
		if (skipExisting && existsSync(localizedConfigPath)) {
			console.log(`- 跳过已有 config: ${slug}`)
		} else {
			const config = JSON.parse(await readFile(configPath, 'utf8'))
			const translatedConfig = await translateFields(config, { text: ['title', 'summary', 'category'], list: ['tags'] })
			await writeFile(localizedConfigPath, JSON.stringify(translatedConfig, null, '\t'), 'utf8')
			console.log(`✓ config: ${slug}`)
		}
	}
}

async function translateBlogsIndex() {
	const localizedIndexPath = resolve(BLOGS_DIR, `index.${t}.json`)
	if (skipExisting && existsSync(localizedIndexPath)) {
		console.log(`- 跳过已有: blogs/index.${t}.json`)
	} else {
		const list: Array<Record<string, unknown>> = JSON.parse(await readFile(resolve(BLOGS_DIR, 'index.json'), 'utf8'))
		const translated = await mapWithConcurrency(list, translateConfig.concurrency, item =>
			translateFields(item, { text: ['title', 'summary', 'category'], list: ['tags'] })
		)
		// 语言版索引只保留文本字段，date/cover/slug/hidden 以中文索引为准
		const stripped = translated.map(item => {
			const { slug, title, summary, tags, category } = item
			return {
				slug,
				...(title !== undefined && { title }),
				...(summary !== undefined && { summary }),
				...(tags !== undefined && { tags }),
				...(category !== undefined && { category })
			}
		})
		await writeFile(localizedIndexPath, JSON.stringify(stripped, null, '\t'), 'utf8')
		console.log(`✓ blogs/index.${t}.json（${stripped.length} 条）`)
	}

	const categoriesPath = resolve(BLOGS_DIR, 'categories.json')
	if (existsSync(categoriesPath)) {
		const { categories } = JSON.parse(await readFile(categoriesPath, 'utf8'))
		await writeFile(resolve(BLOGS_DIR, `categories.${t}.json`), JSON.stringify({ categories: await translateList(categories) }, null, '\t'), 'utf8')
		console.log(`✓ categories.${t}.json`)
	}
}

async function translateAbout() {
	const localizedPath = resolve(process.cwd(), `src/app/about/list.${t}.json`)
	if (skipExisting && existsSync(localizedPath)) {
		console.log(`- 跳过已有: about/list.${t}.json`)
		return
	}
	const data = JSON.parse(await readFile(resolve(process.cwd(), 'src/app/about/list.json'), 'utf8'))
	const output = { ...data }
	if (hasChinese(data.title)) output.title = await translateText(data.title)
	if (hasChinese(data.description)) output.description = await translateText(data.description)
	if (hasChinese(data.content)) output.content = await translateMarkdown(data.content)
	await writeFile(localizedPath, JSON.stringify(output, null, '\t') + '\n', 'utf8')
	console.log(`✓ about/list.${t}.json`)
}

async function translateListFile(page: 'share' | 'projects' | 'pictures' | 'snippets') {
	const localizedPath = resolve(process.cwd(), `src/app/${page}/list.${t}.json`)
	if (skipExisting && existsSync(localizedPath)) {
		console.log(`- 跳过已有: ${page}/list.${t}.json`)
		return
	}
	const path = resolve(process.cwd(), `src/app/${page}/list.json`)
	const data = JSON.parse(await readFile(path, 'utf8'))

	let output: unknown
	if (page === 'snippets') {
		const items = (Array.isArray(data) ? data : []).map(String)
		output = await mapWithConcurrency(items, translateConfig.concurrency, async item => (hasChinese(item) ? translateText(item) : item))
	} else {
		const fields = page === 'pictures' ? { text: ['description'], list: [] } : { text: ['description'], list: ['tags'] }
		output = await mapWithConcurrency(data as Array<Record<string, unknown>>, translateConfig.concurrency, item => translateFields(item, fields))
	}
	await writeFile(localizedPath, JSON.stringify(output, null, '\t') + '\n', 'utf8')
	console.log(`✓ ${page}/list.${t}.json`)
}

async function main() {
	const tasks: Array<{ name: string; run: () => Promise<void> }> = [
		{ name: 'blogs-index', run: translateBlogsIndex },
		{ name: 'about', run: translateAbout },
		{ name: 'share', run: () => translateListFile('share') },
		{ name: 'projects', run: () => translateListFile('projects') },
		{ name: 'pictures', run: () => translateListFile('pictures') },
		{ name: 'snippets', run: () => translateListFile('snippets') }
	]
	const indexPath = resolve(BLOGS_DIR, 'index.json')
	const slugs: string[] = existsSync(indexPath) ? (JSON.parse(await readFile(indexPath, 'utf8')) as Array<{ slug: string }>).map(item => item.slug) : []
	for (const slug of slugs) {
		tasks.push({ name: `blog:${slug}`, run: () => translateBlogPost(slug) })
	}

	const selected = only ? tasks.filter(task => task.name.includes(only)) : tasks
	for (const task of selected) {
		await task.run()
	}
	console.log(`内容翻译完成（${selected.length} 项）`)
}

main().catch(error => {
	console.error(error)
	process.exit(1)
})
