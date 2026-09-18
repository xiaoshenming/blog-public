import type { Line, LyricData } from '../types'
import { splitBilingualLrcTracks } from './bilingualTracks'
import { detectTimedLyricFormat } from './formatDetection'
import { parseLyricsByFormat } from './parserCore'
import type { LyricParseFormat, LyricProcessingOptions } from './types'

// Facade of the lyric parsing layer for the blog player. `music-utils.ts` only needs to hand a raw
// lyric string in and get sorted `Line[]` with a word-by-word timeline out; everything format specific
// stays behind `parseLyricsByFormat`.

export { parseLyricsByFormat } from './parserCore'
export { detectTimedLyricFormat } from './formatDetection'
export { splitBilingualLrcTracks } from './bilingualTracks'
export type { LineRenderHints, LyricParseFormat, LyricProcessingOptions } from './types'

const MS_LINE_HEAD_REGEX = /^\[(\d+),(\d+)\](.*)$/
const KRC_WORD_TAG_REGEX = /<\d+,\d+(?:,\d+)?>/
const PAREN_WORD_TAG_REGEX = /\(\d+,\d+(?:,\d+)?\)/
const LEADING_PAREN_WORD_TAG_REGEX = /^\s*\(\d+,\d+(?:,\d+)?\)/
const AWLRC_LINE_REGEX = /^\[\d{1,3}(?::\d{1,3}){0,2}\.\d{1,3}\]\s*<\d+,\d+(?:,\d+)?>/m

/**
 * Content-based format sniffing. `detectTimedLyricFormat` only knows the text formats (LRC family,
 * VTT, TTML); the millisecond-head formats of the Chinese services are told apart here by their first
 * `[startMs,durationMs]` line:
 *
 *   - `<offset,duration>` word tags            -> KRC (KuGou, offsets relative to the line)
 *   - text follows each `(start,duration,0)`   -> YRC (NetEase)
 *   - text precedes / surrounds the tags       -> QRC (QQ Music)
 *   - no word tags at all                      -> KRC, whose line-timed fallback builds pseudo words
 */
export const detectLyricSourceFormat = (source: string): LyricParseFormat => {
	const normalized = source.replace(/^\uFEFF/, '')

	for (const rawLine of normalized.split(/\r?\n/)) {
		const head = rawLine.trim().match(MS_LINE_HEAD_REGEX)
		if (!head) {
			continue
		}

		const rest = head[3]
		if (KRC_WORD_TAG_REGEX.test(rest)) {
			return 'krc'
		}
		if (LEADING_PAREN_WORD_TAG_REGEX.test(rest)) {
			return 'yrc'
		}
		if (PAREN_WORD_TAG_REGEX.test(rest)) {
			return 'qrc'
		}
		return 'krc'
	}

	if (AWLRC_LINE_REGEX.test(normalized)) {
		return 'awlrc'
	}

	return detectTimedLyricFormat(normalized)
}

/**
 * Parses a raw lyric string of any supported format into `LyricData`, with lines sorted by start time.
 * LRC-family sources are first split into main / translation tracks so bilingual files with repeated
 * timestamps end up with `Line.translation` filled in.
 */
export const parseLyricSourceData = (source: string, options: LyricProcessingOptions = {}): LyricData => {
	const format = detectLyricSourceFormat(source)
	const parsed =
		format === 'lrc' || format === 'enhanced-lrc' ? parseBilingualLrcFamily(format, source, options) : parseLyricsByFormat(format, source, '', options)

	return {
		...parsed,
		lines: [...parsed.lines].sort((left, right) => left.startTime - right.startTime)
	}
}

const parseBilingualLrcFamily = (format: 'lrc' | 'enhanced-lrc', source: string, options: LyricProcessingOptions): LyricData => {
	const { main, translation } = splitBilingualLrcTracks(source)
	return parseLyricsByFormat(format, main, translation, options)
}

/**
 * Parses a raw lyric string into lines with a word-by-word timeline, sorted by start time.
 *
 * Every line carries `words` even on line-timed sources: plain LRC, VTT and untagged KRC/TTML lines get
 * the upstream pseudo timeline from `buildTimedWords` (whitespace tokens, one word per CJK character,
 * spread over the line window), so word-by-word visualizers work on plain LRC as well.
 */
export const parseLyricSource = (source: string, options: LyricProcessingOptions = {}): Line[] => parseLyricSourceData(source, options).lines
