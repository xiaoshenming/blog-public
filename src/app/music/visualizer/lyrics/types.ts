import type { Line, LyricData, Word } from '../types'

// Shared types of the lyric parsing layer (upstream src/utils/lyrics). Types that belong to the
// global data model (Word / Line / LyricData / LyricSyllable / LyricAlternateText ...) stay in
// `visualizer/types.ts`; everything lyrics-specific lives here.

export type UnifiedLyric = LyricData

/**
 * A display-planning unit built on top of parser words. It can group fragments for row splitting and
 * rendering while still keeping every original Word inside `words` for timing.
 */
export interface LyricLayoutUnit {
	// Text used for layout planning. This can differ from the raw parser token when semantic or sticky grouping is applied.
	text: string
	// Original parser words contained in this layout unit. Their timing is preserved and remains the source of truth.
	words: Word[]
	// Start/end span of the contained parser words.
	startTime: number
	endTime: number
	// True when Intl.Segmenter grouped CJK parser words into a semantic layout unit.
	isSemantic: boolean
	// True when punctuation/contraction fragments have been attached for visual layout stability.
	isSticky?: boolean
}

/** The Line fields layout planning reads. `wordSegments` carries the user's saved split. */
export type SegmentableLine = Pick<Line, 'fullText' | 'words' | 'wordSegments'>

export interface BuildPostLyricLayoutUnitsOptions {
	// Enables CJK semantic grouping before sticky punctuation is applied.
	semantic?: boolean
	// Enables language-agnostic punctuation/contraction attachment.
	sticky?: boolean
}

export interface LyricProcessingOptions {
	includeInterludes?: boolean
}

export type TimedLyricFormat = 'lrc' | 'enhanced-lrc' | 'vtt' | 'ttml'
export type NonTtmlTimedLyricFormat = Exclude<TimedLyricFormat, 'ttml'>
export type ExplicitFileTimedLyricFormat = Exclude<TimedLyricFormat, 'lrc' | 'enhanced-lrc'> | 'yrc' | 'qrc' | 'krc'

export type LyricParseFormat = TimedLyricFormat | 'yrc' | 'qrc' | 'krc' | 'awlrc'

/** A timestamped text entry of a (sub)track, used for lines and for translation/romanization tracks. */
export interface TimedTextEntry {
	startTime: number
	endTime?: number
	text: string
}

export type LineTimingClass = 'normal' | 'short' | 'micro'
export type LineTransitionMode = 'normal' | 'fast' | 'none'
export type WordRevealMode = 'normal' | 'fast' | 'instant'

export interface LineTransitionTiming {
	enterDuration: number
	exitDuration: number
	linePassHold: number
}

export interface LineRenderHints {
	rawDuration: number
	timingClass: LineTimingClass
	renderEndTime: number
	lineTransitionMode: LineTransitionMode
	wordRevealMode: WordRevealMode
}

export interface RenderHintWordLike {
	endTime: number
}

export interface RenderHintLineLike {
	startTime: number
	endTime: number
	words?: RenderHintWordLike[]
	renderHints?: LineRenderHints
}

export interface RenderHintLyricDataLike<TLine extends RenderHintLineLike = RenderHintLineLike> {
	lines: TLine[]
}

export interface MigrationResult<T> {
	value: T
	changed: boolean
}
