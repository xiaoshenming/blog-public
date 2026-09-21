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

/** 翻译整篇 markdown，输出与原文段结构一致的译文 */
export async function translateMarkdown(markdown: string): Promise<string> {
	const segments = splitMarkdown(markdown)
	const batches = batchIndexes(segments)

	for (const batch of batches) {
		const sources = batch.map(index => segments[index].text)
		let outputs: string[] | null = null
		try {
			if (sources.length === 1) {
				outputs = [(await chat(markdownSystem, singleParagraphUser(sources[0]))).trim()]
			} else {
				const raw = await chat(markdownSystem, multiParagraphUser(sources))
				outputs = splitBySeparator(raw, sources.length)
			}
		} catch {
			outputs = null
		}
		// 批翻译失败或段数错位 → 逐段降级，保证结构对齐
		if (!outputs) {
			outputs = []
			for (const source of sources) {
				try {
					outputs.push((await chat(markdownSystem, singleParagraphUser(source))).trim())
				} catch {
					outputs.push(source)
				}
			}
		}
		batch.forEach((segmentIndex, i) => {
			segments[segmentIndex].text = outputs?.[i] ?? sources[i]
		})
	}
	return segments.map(segment => segment.text).join('\n')
}
