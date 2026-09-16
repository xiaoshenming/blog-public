// Level-2 rule of SentenceLayout: split a fragment around its outermost bracket / quote pairs.

interface PairedSymbolDef {
	open?: RegExp
	close?: RegExp
	openStr?: string
	closeStr?: string
}

interface OutermostMatch {
	openStart: number
	openEnd: number
	closeStart: number
	closeEnd: number
}

const PAIRED_SYMBOLS: PairedSymbolDef[] = [
	{ open: /「/, close: /」/ },
	{ open: /『/, close: /』/ },
	{ open: /《/, close: /》/ },
	{ open: /【/, close: /】/ },
	{ open: /｛/, close: /｝/ },
	{ open: /［/, close: /］/ },
	{ open: /\[/, close: /\]/ },
	{ open: /（/, close: /）/ },
	{ open: /\(/, close: /\)/ },
	{ openStr: '"', closeStr: '"' },
	{ openStr: "'", closeStr: "'" }
]

function findRegexMatch(regex: RegExp, text: string, fromIndex = 0): { start: number; end: number } | null {
	regex.lastIndex = fromIndex
	const match = regex.exec(text)
	return match ? { start: match.index, end: match.index + match[0].length } : null
}

function findStringMatch(str: string, text: string, fromIndex = 0): { start: number; end: number } | null {
	const idx = text.indexOf(str, fromIndex)
	return idx === -1 ? null : { start: idx, end: idx + str.length }
}

export function splitByBracketsQuotes(text: string): string[] {
	const result = extractOutermostPairs(text, PAIRED_SYMBOLS)
	return result.length > 1 ? result : [text]
}

function extractOutermostPairs(text: string, defs: PairedSymbolDef[]): string[] {
	const best = findOutermostPair(text, defs)

	if (!best) {
		return [text]
	}

	const before = text.slice(0, best.openStart)
	const pairedContent = text.slice(best.openStart, best.closeEnd)
	const remainder = text.slice(best.closeEnd)

	const result: string[] = []

	if (before.length > 0) {
		result.push(...extractOutermostPairs(before, defs))
	}

	result.push(pairedContent)

	if (remainder.length > 0) {
		result.push(...extractOutermostPairs(remainder, defs))
	}

	return result.filter(p => p.length > 0)
}

function findOutermostPair(text: string, defs: PairedSymbolDef[]): OutermostMatch | null {
	let best: OutermostMatch | null = null

	for (const def of defs) {
		const openMatch = def.openStr !== undefined ? findStringMatch(def.openStr, text) : findRegexMatch(def.open!, text)

		if (!openMatch) continue

		const searchFrom = openMatch.end
		const closeMatch = def.closeStr !== undefined ? findStringMatch(def.closeStr, text, searchFrom) : findRegexMatch(def.close!, text, searchFrom)

		if (!closeMatch) continue

		const candidate: OutermostMatch = {
			openStart: openMatch.start,
			openEnd: openMatch.end,
			closeStart: closeMatch.start,
			closeEnd: closeMatch.end
		}

		if (!best || candidate.openStart < best.openStart) {
			best = candidate
		} else if (candidate.openStart === best.openStart && candidate.closeEnd > best.closeEnd) {
			best = candidate
		}
	}

	return best
}
