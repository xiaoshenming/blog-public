import { joinSyllables, normalizeText, parseContent, readTimeRange } from './ttmlContent'
import type { TtmlAgent, TtmlLyricLine, TtmlMetadata, TTMLResult } from './ttmlTypes'
import { childElements, findElements, findFirstElement, getAttribute, parseXml, textContent, type XmlElement } from './xmlMini'

export type {
	TtmlAgent,
	TtmlBackgroundVocal,
	TtmlLyricBase,
	TtmlLyricLine,
	TtmlMetadata,
	TTMLResult,
	TtmlRubyTag,
	TtmlSubLyricContent,
	TtmlSyllable
} from './ttmlTypes'
export { parseTtmlTime } from './ttmlContent'

// Reads Apple Music / AMLL style TTML into the `TTMLResult` shape of `@applemusic-like-lyrics/ttml`
// (timestamps in milliseconds), so `ttmlConversion` can stay a faithful port of upstream. Only the
// vocabulary the conversion consumes is modelled: timed `<p>` lines, timed `<span>` syllables (with
// ruby containers), `ttm:role` x-translation / x-romanization / x-bg spans, agents and song parts.

const readSongPart = (element: XmlElement): string | undefined => getAttribute(element, 'songPart') ?? getAttribute(element, 'song-part')

const parseLine = (paragraph: XmlElement, divSongPart: string | undefined, blockIndex: number | undefined): TtmlLyricLine | null => {
	const content = parseContent(paragraph, true)
	const { begin, end } = readTimeRange(paragraph)
	const words = content.words
	const startTime = begin ?? words[0]?.startTime ?? content.backgroundVocal?.startTime
	const endTime = end ?? words[words.length - 1]?.endTime ?? content.backgroundVocal?.endTime
	if (startTime === undefined || endTime === undefined) {
		return null
	}

	const text = words.length > 0 ? joinSyllables(words) : normalizeText(content.plainText)
	if (!text && !content.backgroundVocal) {
		return null
	}

	// `itunes:key` ("L1", "L2"...) is the line id in Apple / AMLL files; `xml:id` is the generic fallback.
	const id = getAttribute(paragraph, 'key') ?? getAttribute(paragraph, 'id')
	const agentId = getAttribute(paragraph, 'agent')
	const songPart = readSongPart(paragraph) ?? divSongPart

	return {
		text,
		startTime,
		endTime,
		...(words.length > 0 ? { words } : {}),
		...(content.translations.length > 0 ? { translations: content.translations } : {}),
		...(content.romanizations.length > 0 ? { romanizations: content.romanizations } : {}),
		...(content.backgroundVocal ? { backgroundVocal: content.backgroundVocal } : {}),
		...(id ? { id } : {}),
		...(agentId ? { agentId } : {}),
		...(songPart ? { songPart } : {}),
		...(typeof blockIndex === 'number' ? { blockIndex } : {})
	}
}

/** `<ttm:agent xml:id="v1" type="person"><ttm:name>...</ttm:name></ttm:agent>` entries of the head. */
const parseAgents = (root: XmlElement): Record<string, TtmlAgent> | undefined => {
	const agents: Record<string, TtmlAgent> = {}
	for (const agentElement of findElements(root, 'agent')) {
		const id = getAttribute(agentElement, 'id')
		if (!id) {
			continue
		}
		const nameElement = findFirstElement(agentElement, 'name')
		const name = normalizeText(nameElement ? textContent(nameElement) : '')
		const type = getAttribute(agentElement, 'type')
		agents[id] = { id, ...(name ? { name } : {}), ...(type ? { type } : {}) }
	}
	return Object.keys(agents).length > 0 ? agents : undefined
}

/** Lines of `<body>`. Each `<div>` is one block: its song part is inherited and its index recorded. */
const parseBody = (root: XmlElement): TtmlLyricLine[] => {
	const body = findFirstElement(root, 'body')
	if (!body) {
		return []
	}

	const lines: TtmlLyricLine[] = []
	let blockIndex = 0
	const collect = (paragraphs: XmlElement[], songPart: string | undefined, index: number | undefined) => {
		for (const paragraph of paragraphs) {
			const line = parseLine(paragraph, songPart, index)
			if (line) {
				lines.push(line)
			}
		}
	}

	for (const child of childElements(body)) {
		if (child.localName === 'div') {
			collect(findElements(child, 'p'), readSongPart(child), blockIndex)
			blockIndex += 1
		} else if (child.localName === 'p') {
			collect([child], undefined, undefined)
		}
	}

	return lines
}

const resolveTimingMode = (root: XmlElement, lines: TtmlLyricLine[]): TtmlMetadata['timingMode'] => {
	const declared = getAttribute(root, 'timing')?.trim().toLowerCase()
	if (declared === 'word') {
		return 'Word'
	}
	if (declared === 'line') {
		return 'Line'
	}
	return lines.some(line => line.words?.length) ? 'Word' : 'Line'
}

/** Parses a TTML document. Throws when the document has no `<tt>` root, like the upstream parser. */
export const parseTtmlDocument = (xml: string): TTMLResult => {
	const document = parseXml(xml)
	const root = childElements(document).find(element => element.localName === 'tt') ?? findFirstElement(document, 'tt')
	if (!root) {
		throw new Error('Invalid TTML document: missing <tt> root element')
	}

	const lines = parseBody(root)
	const language = getAttribute(root, 'lang')
	const agents = parseAgents(root)

	return {
		metadata: {
			timingMode: resolveTimingMode(root, lines),
			...(language ? { language } : {}),
			...(agents ? { agents } : {})
		},
		lines
	}
}
