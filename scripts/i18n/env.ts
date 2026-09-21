import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** 读取 .env.local（不依赖 dotenv），翻译脚本专用的本地服务配置 */
function loadEnvLocal() {
	const file = resolve(process.cwd(), '.env.local')
	try {
		const text = readFileSync(file, 'utf8')
		for (const line of text.split('\n')) {
			const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
			if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
		}
	} catch {
		// 没有 .env.local 时交给下方校验报错
	}
}

loadEnvLocal()

const base = process.env.TRANSLATE_API_BASE
const key = process.env.TRANSLATE_API_KEY
const model = process.env.TRANSLATE_MODEL

if (!base || !key || !model) {
	console.error('缺少翻译服务配置：请在 .env.local 设置 TRANSLATE_API_BASE / TRANSLATE_API_KEY / TRANSLATE_MODEL')
	process.exit(1)
}

const LANGUAGE_NAMES: Record<string, string> = {
	en: 'English',
	ja: 'Japanese',
	ko: 'Korean',
	fr: 'French',
	de: 'German',
	es: 'Spanish',
	pt: 'Portuguese',
	it: 'Italian',
	ru: 'Russian',
	th: 'Thai',
	vi: 'Vietnamese',
	id: 'Indonesian',
	ar: 'Arabic',
	'zh-TW': 'Traditional Chinese'
}

function resolveTargetLanguage(): string {
	const explicit = process.env.TRANSLATE_TARGET_LANGUAGE
	if (explicit) return explicit
	const locale = process.env.TRANSLATE_TARGET || 'en'
	const name = LANGUAGE_NAMES[locale]
	if (!name) {
		console.error(`未知目标语言码 "${locale}"：请设置 TRANSLATE_TARGET_LANGUAGE（提示词用的语言英文名，如 German）`)
		process.exit(1)
	}
	return name
}

export const translateConfig = {
	baseUrl: base.replace(/\/$/, ''),
	apiKey: key,
	model,
	/** 目标语言的语言码（目录名/文件后缀），如 en / ja / ko */
	targetLocale: process.env.TRANSLATE_TARGET || 'en',
	/** 目标语言的英文名（提示词 "Translate to ..." 用）；未设置时按常见语言码推导，未知语言码必须显式提供 */
	targetLanguage: resolveTargetLanguage(),
	/** 同时在途的翻译请求数；本地服务无网络开销，适度并发即可 */
	concurrency: 4,
	/** 每次请求的最大段落数（沉浸式翻译建议 4，过大易缺段/错位） */
	maxParagraphsPerRequest: 4,
	/** 单次请求的字符上限，超过则再切小批 */
	maxCharsPerRequest: 2400
}
