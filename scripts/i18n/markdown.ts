import { translateConfig } from './env'
import { chat } from './client'
import { markdownSystem, multiParagraphUser, singleParagraphUser } from './prompt'

type Segment = { text: string; translatable: boolean }

/** 把 markdown 切成段：围栏代码块 / frontmatter 原样保留，其余按空行分段 */
export function splitMarkdown(markdown: string): Segment[] {
	const lines = markdown.split('\n')
	const segments: Segment[] = []
	let buffer: string[] = []
	let inFence = false

	const flush = () => {
		if (buffer.length === 0) return
		const text = buffer.join('\n')
		buffer = []
		if (text.trim() === '') {
			segments.push({ text: '', translatable: false })
		} else {
			segments.push({ text, translatable: true })
		}
	}

	for (const line of lines) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence
			buffer.push(line)
			continue
		}
		if (inFence) {
			buffer.push(line)
			continue
		}
		if (line.trim() === '') {
			flush()
			segments.push({ text: '', translatable: false })
			continue
		}
		buffer.push(line)
	}
	flush()

	// frontmatter（文件以 --- 开头的 YAML 块）不翻
	if (segments.length > 0 && segments[0].text.trim() === '---') {
		for (let i = 1; i < segments.length && i < 50; i++) {
			if (segments[i].text.trim() === '---') {
				for (let j = 0; j <= i; j++) segments[j].translatable = false
				break
			}
		}
	}
	return segments
}

/**
 * 行首标记：标题、引用（可多层）、无序/有序列表，以及行首的图片/链接开头符。
 * 这些字符决定块级结构，模型容易改写或丢弃，必须剥离后原样贴回。
 */
const LINE_MARKER_RE = /^(?:#{1,6} |>+ ?|[-*+] |\d+\. |!?\[)+/

/** 链接/图片目标 `](url)`（可含 title）：整段换成占位符，URL 不交给模型 */
const LINK_TARGET_RE = /\]\([^)\n]+\)/g

/** URL 占位符：纯 ASCII、无意义但显眼；不含 %%，避免与批分隔符混淆 */
function urlToken(index: number): string {
	return `@@URL${index}@@`
}

const URL_TOKEN_RE = /@@URL\d+@@/g

/** 含中文的段才做“整段回显”检测：模型偶发照抄原文不翻译（结构完好但正文没翻） */
const CJK_RE = /[一-鿿]/

type ProtectedSegment = {
	/** 发给模型的文本：行首标记已剥离、链接目标已换成占位符 */
	payload: string
	/** 还原译文并校验；行数 / 行首标记 / URL 占位符不符、或整段回显原文时返回 null */
	restore: (translated: string) => string | null
}

/** 抽出一段 markdown 的结构（行首标记、链接目标），只把纯正文交给模型 */
function protectSegment(source: string): ProtectedSegment {
	const lines = source.split('\n')
	const markers = lines.map(line => line.match(LINE_MARKER_RE)?.[0] ?? '')
	const targets: string[] = []
	const payloadLines = lines.map((line, index) => {
		const rest = line.slice(markers[index].length)
		return rest.replace(LINK_TARGET_RE, match => {
			targets.push(match)
			return urlToken(targets.length - 1)
		})
	})
	const expectedTokens = targets.map((_, index) => urlToken(index))

	return {
		payload: payloadLines.join('\n'),
		restore(translated: string): string | null {
			const outLines = translated.split('\n')
			if (outLines.length !== lines.length) return null
			// URL 集合校验：占位符的编号与数量必须与原文完全一致
			const found = translated.match(URL_TOKEN_RE) ?? []
			if (found.length !== expectedTokens.length) return null
			if (expectedTokens.some(token => found.filter(item => item === token).length !== 1)) return null

			const restoredLines: string[] = []
			for (let i = 0; i < outLines.length; i++) {
				// 原文有正文却译出空行 → 视为内容丢失
				if (payloadLines[i].trim() !== '' && outLines[i].trim() === '') return null
				let text = outLines[i]
				expectedTokens.forEach((token, k) => {
					text = text.split(token).join(targets[k])
				})
				const restored = markers[i] + text
				// 行首标记序列校验：模型自行补的标记会让序列与原文不一致
				if ((restored.match(LINE_MARKER_RE)?.[0] ?? '') !== markers[i]) return null
				restoredLines.push(restored)
			}
			const restored = restoredLines.join('\n')
			// 整段回显检测：含中文的段译出来与原文一字不差，说明模型没翻 → 视为失败交给上层重试
			if (CJK_RE.test(source) && restored === source) return null
			return restored
		}
	}
}

/** 相邻可翻段凑批：段数与字符数双重上限（小模型易缺段，批越小越稳） */
function batchIndexes(segments: Segment[]): number[][] {
	const batches: number[][] = []
	let current: number[] = []
	let chars = 0
	for (let i = 0; i < segments.length; i++) {
		if (!segments[i].translatable) continue
		const size = segments[i].text.length
		if (current.length > 0 && (current.length >= translateConfig.maxParagraphsPerRequest || chars + size > translateConfig.maxCharsPerRequest)) {
			batches.push(current)
			current = []
			chars = 0
		}
		current.push(i)
		chars += size
	}
	if (current.length > 0) batches.push(current)
	return batches
}

function splitBySeparator(output: string, count: number): string[] | null {
	const parts = output.split(/\n?\s*%%\s*\n?/).map(part => part.trim())
	if (parts.length === count) return parts
	// 首尾多打分隔符的容错：两端是空串则去掉再比
	if (parts.length === count + 2 && parts[0] === '' && parts[parts.length - 1] === '') return parts.slice(1, -1)
	return null
}

/** 单段翻译：只发送受保护正文，还原校验失败返回 null */
async function translateSegment(segment: ProtectedSegment): Promise<string | null> {
	try {
		const output = (await chat(markdownSystem, singleParagraphUser(segment.payload))).trim()
		return segment.restore(output)
	} catch {
		return null
	}
}

/**
 * 翻译整篇 markdown：结构标记不进模型，翻完按「行首标记序列 + URL 集合」校验，
 * 不符（含模型整段回显原文不翻译）则重试一次，仍不符保留原文（宁可留中文，不产出坏结构）。
 */
export async function translateMarkdown(markdown: string): Promise<string> {
	const segments = splitMarkdown(markdown)
	const batches = batchIndexes(segments)

	for (const batch of batches) {
		const sources = batch.map(index => segments[index].text)
		const protectedSegments = sources.map(protectSegment)
		const payloads = protectedSegments.map(segment => segment.payload)
		const results: Array<string | null> = payloads.map(() => null)

		try {
			if (payloads.length === 1) {
				results[0] = await translateSegment(protectedSegments[0])
			} else {
				const raw = await chat(markdownSystem, multiParagraphUser(payloads))
				const outputs = splitBySeparator(raw, payloads.length)
				if (outputs) {
					outputs.forEach((output, i) => {
						results[i] = protectedSegments[i].restore(output)
					})
				}
			}
		} catch {
			// 请求失败 → 交给下面逐段降级
		}

		// 批翻译失败或结构校验不过 → 逐段重试一次；仍失败保留原文
		for (let i = 0; i < batch.length; i++) {
			if (payloads[i].trim() === '') {
				segments[batch[i]].text = sources[i] // 纯结构段没有正文，原样保留
				continue
			}
			if (results[i] === null) results[i] = await translateSegment(protectedSegments[i])
			segments[batch[i]].text = results[i] ?? sources[i]
		}
	}
	return segments.map(segment => segment.text).join('\n')
}
