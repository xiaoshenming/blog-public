import { hasCjkText, splitCJKBySpace } from './sentenceCjkSpaceSplit'
import { splitByBracketsQuotes } from './sentencePairedSymbols'

// Level-by-level split rules used by SentenceLayout. Each rule receives one sentence fragment and
// returns either finer fragments or `[text]` when it finds no usable break point, so the caller can
// keep escalating to the next level until the target sentence count is reached.

export function splitByLevel(text: string, level: number): string[] {
	switch (level) {
		case 1:
			return splitByPunctuation(text)
		case 2:
			return splitByBracketsQuotes(text)
		case 3:
			return splitByWesternWords(text)
		case 4:
			return splitCJKBySpace(text)
		case 5:
			return splitBySpecialChars(text)
		default:
			return [text]
	}
}

function splitByPunctuation(text: string): string[] {
	const allPunctRegex = /[，。；！？、…·\.\,\;\!\?]+/g
	const matches = [...text.matchAll(allPunctRegex)]

	if (matches.length === 0) {
		return [text]
	}

	const result: string[] = []
	let lastIndex = 0

	for (const match of matches) {
		const punctStart = match.index
		const punctEnd = punctStart + match[0].length

		let trailingSpaces = ''
		const afterPunct = text.slice(punctEnd)
		const spaceMatch = afterPunct.match(/^\s+/)
		if (spaceMatch) {
			trailingSpaces = spaceMatch[0]
		}

		const beforePunct = text.slice(lastIndex, punctStart)
		const punctWithSpaces = match[0] + trailingSpaces

		if (beforePunct.length > 0) {
			result.push(beforePunct + punctWithSpaces)
		} else if (result.length > 0) {
			result[result.length - 1] += punctWithSpaces
		} else {
			result.push(punctWithSpaces)
		}

		lastIndex = punctEnd + trailingSpaces.length
	}

	if (lastIndex < text.length) {
		result.push(text.slice(lastIndex))
	}

	return result.filter(r => r.length > 0)
}

const charCountCache = new Map<string, number>()

function getGlobalCount(text: string, char: string): number {
	const key = `${text.length}:${char}`
	const cached = charCountCache.get(key)
	if (cached !== undefined) {
		return cached
	}
	const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const count = (text.match(new RegExp(escaped, 'g')) || []).length
	charCountCache.set(key, count)
	return count
}

function shouldSkipBoundary(fullText: string, beforeBlock: string): boolean {
	if (beforeBlock.length === 0) return false

	const sepChar = beforeBlock[beforeBlock.length - 1]

	if (sepChar === '-') return true
	if (sepChar === ':' || sepChar === '：' || sepChar === '/' || sepChar === '／' || sepChar === '|' || sepChar === '｜') {
		return getGlobalCount(fullText, sepChar) >= 2
	}

	return false
}

function splitByWesternWords(text: string): string[] {
	if (!hasCjkText(text)) {
		return [text]
	}

	const westernBlockRegex = /[a-zA-Z0-9]+(?:[a-zA-Z0-9'\-]*[a-zA-Z0-9]+)?(?:\s+[a-zA-Z0-9]+(?:[a-zA-Z0-9'\-]*[a-zA-Z0-9]+)?)+[.,;:!?。，；：！？]?\s*/g

	charCountCache.clear()

	let hasMultipleWordBlock = false
	let match: RegExpExecArray | null

	while ((match = westernBlockRegex.exec(text)) !== null) {
		const wordCount = match[0].match(/[a-zA-Z0-9]+/g)?.length || 0
		if (wordCount > 1) {
			hasMultipleWordBlock = true
			break
		}
	}

	if (!hasMultipleWordBlock) {
		return [text]
	}

	westernBlockRegex.lastIndex = 0

	const parts: string[] = []
	let lastIndex = 0

	while ((match = westernBlockRegex.exec(text)) !== null) {
		const blockStart = match.index
		const blockEnd = blockStart + match[0].length
		const beforeBlock = text.slice(lastIndex, blockStart)

		if (shouldSkipBoundary(text, beforeBlock)) {
			parts.push(beforeBlock + match[0])
		} else if (blockStart > lastIndex) {
			parts.push(beforeBlock)
			parts.push(match[0])
		} else {
			parts.push(match[0])
		}

		lastIndex = blockEnd
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex))
	}

	return parts.length > 1 ? parts : [text]
}

function splitBySpecialChars(text: string): string[] {
	const specialCharRegex = /[：:\/／\\|｜~～]+/
	const parts = text.split(specialCharRegex)

	if (parts.filter(part => part.length > 0).length <= 1) {
		return [text]
	}

	const result: string[] = []
	let lastIndex = 0

	for (const part of parts) {
		const index = text.indexOf(part, lastIndex)
		if (index > lastIndex) {
			const specialChar = text.slice(lastIndex, index)
			if (result.length > 0) {
				result[result.length - 1] += specialChar
			} else {
				result.push(specialChar)
			}
		}

		if (part) {
			result.push(part)
			lastIndex = index + part.length
		} else if (index !== -1) {
			lastIndex = index
		}
	}

	if (lastIndex < text.length) {
		const tail = text.slice(lastIndex)
		if (tail && result.length > 0) {
			result[result.length - 1] += tail
		} else if (tail) {
			result.push(tail)
		}
	}

	return result.filter(r => r.length > 0)
}
