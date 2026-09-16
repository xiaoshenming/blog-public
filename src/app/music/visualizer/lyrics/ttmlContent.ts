import type { TtmlBackgroundVocal, TtmlParsedContent, TtmlRubyTag, TtmlSubLyricContent, TtmlSyllable } from './ttmlTypes'
import { childElements, getAttribute, textContent, type XmlElement, type XmlNode } from './xmlMini'

// Inline content of a TTML line: timed `<span>` syllables (including ruby containers), the text
// between them, and the `ttm:role` spans that carry translations, romanizations and background vocals.

export const normalizeText = (text: string): string => text.replace(/\s+/g, ' ').trim()

export const joinSyllables = (words: TtmlSyllable[]): string => normalizeText(words.map(word => word.text + (word.endsWithSpace ? ' ' : '')).join(''))

/** TTML clock times (`hh:mm:ss.fff`, `mm:ss.fff`, `ss.fff`) and offset times (`12.5s`, `800ms`) to ms. */
export const parseTtmlTime = (value: string | undefined): number | undefined => {
	const trimmed = value?.trim()
	if (!trimmed) {
		return undefined
	}

	if (/^(?:\d+:){0,2}\d+(?:\.\d+)?$/.test(trimmed)) {
		const seconds = trimmed.split(':').reduce((total, part) => total * 60 + parseFloat(part), 0)
		return Math.round(seconds * 1000)
	}

	const offset = trimmed.match(/^(\d+(?:\.\d+)?)(h|m|s|ms)$/)
	if (offset) {
		const factor = offset[2] === 'h' ? 3600000 : offset[2] === 'm' ? 60000 : offset[2] === 's' ? 1000 : 1
		return Math.round(parseFloat(offset[1]) * factor)
	}

	return undefined
}

export const readTimeRange = (element: XmlElement): { begin?: number; end?: number } => ({
	begin: parseTtmlTime(getAttribute(element, 'begin')),
	end: parseTtmlTime(getAttribute(element, 'end'))
})

const isTimed = (element: XmlElement): boolean => {
	const { begin, end } = readTimeRange(element)
	return begin !== undefined && end !== undefined
}

const readRole = (element: XmlElement): string | undefined => getAttribute(element, 'role')?.trim().toLowerCase()

const isAuxiliaryRole = (role: string | undefined): boolean => role === 'x-translation' || role === 'x-romanization' || role === 'x-bg'

const buildSyllable = (element: XmlElement, begin: number, end: number, ruby?: TtmlRubyTag[]): TtmlSyllable | null => {
	// A ruby container's own text is the base text; its timed children are the readings.
	const rawText = ruby
		? element.children
				.filter(child => child.type === 'text' || !isTimed(child))
				.map(textContent)
				.join('')
		: textContent(element)
	const text = normalizeText(rawText)
	if (!text) {
		return null
	}

	const obscene = getAttribute(element, 'obscene')
	const emptyBeat = parseInt(getAttribute(element, 'emptyBeat') ?? getAttribute(element, 'empty-beat') ?? '', 10)

	return {
		text,
		startTime: begin,
		endTime: end,
		...(/\s$/.test(rawText) ? { endsWithSpace: true } : {}),
		...(ruby?.length ? { ruby } : {}),
		...(obscene === 'true' || obscene === '1' ? { obscene: true } : {}),
		...(Number.isFinite(emptyBeat) ? { emptyBeat } : {})
	}
}

const appendStrayText = (state: TtmlParsedContent, rawText: string) => {
	const lastWord = state.words[state.words.length - 1]
	if (!lastWord) {
		state.plainText += rawText
		return
	}

	// Text between timed spans is normally whitespace; it only tells us the previous syllable ends
	// with a space. Stray punctuation outside any span is glued onto the previous syllable.
	if (/^\s/.test(rawText)) {
		lastWord.endsWithSpace = true
	}
	const stray = normalizeText(rawText)
	if (stray) {
		lastWord.text += stray
	}
	if (/\s$/.test(rawText) && stray) {
		lastWord.endsWithSpace = true
	}
}

const pushSyllable = (state: TtmlParsedContent, syllable: TtmlSyllable) => {
	// Non-whitespace text that preceded the first timed span belongs to that first syllable.
	const prefix = normalizeText(state.plainText)
	if (state.words.length === 0 && prefix) {
		syllable.text = prefix + syllable.text
	}
	state.plainText = ''
	state.words.push(syllable)
}

const visitNode = (node: XmlNode, state: TtmlParsedContent, allowBackground: boolean) => {
	if (node.type === 'text') {
		appendStrayText(state, node.text)
		return
	}

	const role = readRole(node)
	if (role === 'x-translation') {
		state.translations.push(parseSubContent(node))
		return
	}
	if (role === 'x-romanization') {
		state.romanizations.push(parseSubContent(node))
		return
	}
	if (role === 'x-bg' && allowBackground) {
		state.backgroundVocal = parseBackgroundVocal(node)
		return
	}

	const { begin, end } = readTimeRange(node)
	if (begin === undefined || end === undefined) {
		// An untimed wrapper span: its children decide.
		node.children.forEach(child => visitNode(child, state, allowBackground))
		return
	}

	const timedChildren = childElements(node).filter(child => isTimed(child) && !isAuxiliaryRole(readRole(child)))
	if (timedChildren.length === 0) {
		const syllable = buildSyllable(node, begin, end)
		if (syllable) {
			pushSyllable(state, syllable)
		}
		return
	}

	// A timed span with timed children is either a ruby container (base text + timed readings) or a
	// plain grouping span, which flattens into its children.
	const ruby = timedChildren
		.map(child => {
			const range = readTimeRange(child)
			return { text: normalizeText(textContent(child)), startTime: range.begin, endTime: range.end }
		})
		.filter((tag): tag is TtmlRubyTag => Boolean(tag.text) && tag.startTime !== undefined && tag.endTime !== undefined)
	const rubySyllable = ruby.length > 0 ? buildSyllable(node, begin, end, ruby) : null
	if (rubySyllable) {
		pushSyllable(state, rubySyllable)
		return
	}

	node.children.forEach(child => visitNode(child, state, allowBackground))
}

/** Walks the children of a `<p>` or `<span>`. Background vocals are only recognised on the line itself. */
export const parseContent = (element: XmlElement, allowBackground: boolean): TtmlParsedContent => {
	const state: TtmlParsedContent = { words: [], plainText: '', translations: [], romanizations: [] }
	element.children.forEach(child => visitNode(child, state, allowBackground))
	return state
}

const contentText = (content: TtmlParsedContent, element: XmlElement): string =>
	content.words.length > 0 ? joinSyllables(content.words) : normalizeText(content.plainText || textContent(element))

const parseSubContent = (element: XmlElement): TtmlSubLyricContent => {
	const content = parseContent(element, false)
	const language = getAttribute(element, 'lang')

	return {
		...(language ? { language } : {}),
		text: contentText(content, element),
		...(content.words.length > 0 ? { words: content.words } : {})
	}
}

const parseBackgroundVocal = (element: XmlElement): TtmlBackgroundVocal => {
	const content = parseContent(element, false)
	const { begin, end } = readTimeRange(element)
	const words = content.words

	return {
		text: contentText(content, element),
		startTime: begin ?? words[0]?.startTime ?? 0,
		endTime: end ?? words[words.length - 1]?.endTime ?? 0,
		...(words.length > 0 ? { words } : {}),
		...(content.translations.length > 0 ? { translations: content.translations } : {}),
		...(content.romanizations.length > 0 ? { romanizations: content.romanizations } : {})
	}
}
