/**
 * UI 字典翻译：读 src/i18n/dictionaries/zh/*.ts，经本地 LLM 翻译生成 en/*.ts 与 en/index.ts。
 * 增量语义：en 文件里已有的译文保留（可人工校对后重跑不丢），只翻新增 key；--force 全量重翻。
 */
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chat, mapWithConcurrency } from './client'
import { translateConfig } from './env'
import { multiParagraphUser, singleParagraphUser, uiSystem } from './prompt'

const ZH_DIR = resolve(process.cwd(), 'src/i18n/dictionaries/zh')
const EN_DIR = resolve(process.cwd(), 'src/i18n/dictionaries/en')
const DOMAINS = ['collections', 'common', 'nav', 'home', 'blog', 'about', 'music', 'toolbox'] as const
const force = process.argv.includes('--force')

type Entries = Record<string, string>

async function importDictionary(dir: string, domain: string): Promise<Entries> {
	const file = resolve(dir, `${domain}.ts`)
	if (!existsSync(file)) return {}
	const mod = await import(file)
	const value = (mod as Record<string, unknown>)[domain]
	if (!value || typeof value !== 'object') return {}
	return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
}

function hasChinese(text: string) {
	return /[\u4e00-\u9fff]/.test(text)
}

async function translateBatch(texts: string[]): Promise<string[]> {
	const raw = await chat(uiSystem, multiParagraphUser(texts))
	const parts = raw
		.split(/\n?\s*%%\s*\n?/)
		.map(part => part.trim())
		.filter(part => part.length > 0)
	if (parts.length !== texts.length) throw new Error(`段数错位：期望 ${texts.length}，得到 ${parts.length}`)
	return parts
}

async function translateEntries(entries: Entries): Promise<Entries> {
	const keys = Object.keys(entries)
	const results: Entries = {}
	const pending: string[] = []

	for (const key of keys) {
		const value = entries[key]
		if (!hasChinese(value)) results[key] = value
		else pending.push(key)
	}

	// 批量翻，批内失败降级逐条，单条失败保留中文（运行时还有 zh 兜底）
	const batches: string[][] = []
	for (let i = 0; i < pending.length; i += translateConfig.maxParagraphsPerRequest + 2) {
		batches.push(pending.slice(i, i + translateConfig.maxParagraphsPerRequest + 2))
	}
	await mapWithConcurrency(batches, translateConfig.concurrency, async batch => {
		try {
			const outputs = await translateBatch(batch.map(key => entries[key]))
			batch.forEach((key, i) => (results[key] = outputs[i]))
		} catch {
			for (const key of batch) {
				try {
					results[key] = (await chat(uiSystem, singleParagraphUser(entries[key]))).trim()
				} catch {
					results[key] = entries[key]
					console.warn(`  ! 翻译失败，保留中文: ${key}`)
				}
			}
		}
	})
	return results
}

function toTsModule(domain: string, entries: Entries): string {
	const lines = Object.entries(entries).map(([key, value]) => `\t${key}: ${JSON.stringify(value)}`)
	return `// 由 scripts/i18n/dict.ts 生成；可直接手工修正，重跑默认保留已有译文（--force 覆盖）\nexport const ${domain} = {\n${lines.join(',\n')}\n}\n`
}

async function main() {
	let translatedCount = 0

	for (const domain of DOMAINS) {
		const zhEntries = await importDictionary(ZH_DIR, domain)
		const oldEntries = force ? {} : await importDictionary(EN_DIR, domain)

		const pending: Entries = {}
		const merged: Entries = {}
		for (const [key, value] of Object.entries(zhEntries)) {
			const old = oldEntries[key]
			if (old !== undefined && !hasChinese(old)) {
				merged[key] = old
			} else {
				pending[key] = value
			}
		}

		const translated = await translateEntries(pending)
		Object.assign(merged, translated)
		translatedCount += Object.keys(pending).length

		await writeFile(resolve(EN_DIR, `${domain}.ts`), toTsModule(domain, merged), 'utf8')
		console.log(`✓ ${domain}: ${Object.keys(zhEntries).length} 条（本次翻译 ${Object.keys(pending).length}）`)
	}

	await writeAggregatedIndex()
	console.log(`完成：共翻译 ${translatedCount} 条 UI 文案`)
}

async function writeAggregatedIndex() {
	// 聚合文件最后写，确保引用的域文件都已生成
	const imports = DOMAINS.map(domain => `import { ${domain} } from './${domain}'`).join('\n')
	await writeFile(
		resolve(EN_DIR, 'index.ts'),
		`// 由 scripts/i18n/dict.ts 生成：聚合英文字典各域\n${imports}\n\nexport const en = { ${DOMAINS.join(', ')} }\n`,
		'utf8'
	)
}

main().catch(error => {
	console.error(error)
	process.exit(1)
})
