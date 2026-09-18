// The `TTMLResult` shape of `@applemusic-like-lyrics/ttml` (timestamps in milliseconds), reproduced
// here because the blog does not carry that dependency. `ttmlConversion` maps it onto LyricData.

export interface TtmlRubyTag {
	text: string
	startTime: number
	endTime: number
}

export interface TtmlSyllable {
	text: string
	startTime: number
	endTime: number
	/** Whether a space follows this syllable; `text` itself never carries the space. */
	endsWithSpace?: boolean
	ruby?: TtmlRubyTag[]
	obscene?: boolean
	emptyBeat?: number
}

export interface TtmlSubLyricContent {
	language?: string
	text: string
	words?: TtmlSyllable[]
}

export interface TtmlLyricBase {
	text: string
	startTime: number
	endTime: number
	words?: TtmlSyllable[]
	translations?: TtmlSubLyricContent[]
	romanizations?: TtmlSubLyricContent[]
	backgroundVocal?: TtmlBackgroundVocal
}

export type TtmlBackgroundVocal = Omit<TtmlLyricBase, 'backgroundVocal'>

export interface TtmlLyricLine extends TtmlLyricBase {
	id?: string
	agentId?: string
	songPart?: string
	/** Increasing index of the enclosing `<div>`, separating same-named song parts of different blocks. */
	blockIndex?: number
}

export interface TtmlAgent {
	id: string
	name?: string
	type?: string
}

export interface TtmlMetadata {
	language?: string
	timingMode?: 'Word' | 'Line'
	agents?: Record<string, TtmlAgent>
}

export interface TTMLResult {
	metadata: TtmlMetadata
	lines: TtmlLyricLine[]
}

/** Accumulator of the inline content walk over a `<p>` / `<span>`. */
export interface TtmlParsedContent {
	words: TtmlSyllable[]
	plainText: string
	translations: TtmlSubLyricContent[]
	romanizations: TtmlSubLyricContent[]
	backgroundVocal?: TtmlBackgroundVocal
}
