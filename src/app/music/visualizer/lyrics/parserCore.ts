import type { Line, LyricData } from '../types'
import { parseAwlrc } from './awlrcParser'
import { buildTimedWords } from './buildTimedWords'
import { finalizeParsedLyricLines } from './interludes'
import { parseKRC } from './krcParser'
import {
	findTranslationsForSortedStartTimes,
	GLOBAL_ANGLE_TIME_REGEX,
	GLOBAL_LRC_TIME_REGEX,
	LRC_LINE_TIME_REGEX,
	maybeBuildPreciseLineDraft,
	parseMetadataLine,
	parseSimpleTimedTextEntry,
	parseTimedTextEntries,
	sortByStartTimeIfNeeded,
	stripBom,
	type DraftLine,
	type LrcMetadata
} from './parserTimestamps'
import { buildLyricDataFromTTMLResult } from './ttmlConversion'
import { parseTtmlDocument } from './ttmlParser'
import type { LyricParseFormat, LyricProcessingOptions, TimedTextEntry } from './types'
import { parseVTT } from './vttParser'
import { parseQRC, parseYRC } from './yrcQrcParser'

export type { LyricParseFormat, TimedTextEntry } from './types'
export { INTERLUDE_FULL_TEXT, attachInterludes, finalizeParsedLyricLines, isInterludeLine } from './interludes'
export { findTranslationsForSortedStartTimes } from './parserTimestamps'
export { buildTimedWords } from './buildTimedWords'
export { parseAwlrc } from './awlrcParser'
export { parseKRC } from './krcParser'
export { parseVTT } from './vttParser'
export { parseQRC, parseYRC } from './yrcQrcParser'

/**
 * Plain LRC: one `[mm:ss.xx]` tag per line. Each line lasts until the next one starts, capped to an
 * estimated reading time (0.5s per character + 2s) when the gap is long, and receives a pseudo
 * word-by-word timeline from `buildTimedWords`.
 */
export const parseLRC = (
	lrcString: string,
	translationString: string = '',
	options: LyricProcessingOptions = {},
	romanizationString: string = ''
): LyricData => {
	const lines: Line[] = []
	const rawEntries: TimedTextEntry[] = []
	let rawEntriesSorted = true
	let lastStartTime = Number.NEGATIVE_INFINITY

	for (const rawLine of stripBom(lrcString).split(/\r?\n/)) {
		const entry = parseSimpleTimedTextEntry(rawLine)
		if (!entry || entry.text.length === 0) {
			continue
		}

		if (entry.startTime < lastStartTime) {
			rawEntriesSorted = false
		}
		lastStartTime = entry.startTime
		rawEntries.push(entry)
	}

	const sortedRawEntries = sortByStartTimeIfNeeded(rawEntries, rawEntriesSorted)
	const transEntries = parseTimedTextEntries(translationString).entries
	const romanizationEntries = parseTimedTextEntries(romanizationString).entries
	const translations = findTranslationsForSortedStartTimes(
		sortedRawEntries.map(entry => entry.startTime),
		transEntries
	)
	const romanizations = findTranslationsForSortedStartTimes(
		sortedRawEntries.map(entry => entry.startTime),
		romanizationEntries
	)

	for (let index = 0; index < sortedRawEntries.length; index += 1) {
		const current = sortedRawEntries[index]
		const next = sortedRawEntries[index + 1]
		const translation = translations[index]

		let duration = next ? next.startTime - current.startTime : 5
		const estimatedReadingTime = current.text.length * 0.5
		if (duration > estimatedReadingTime + 2 && duration > 5) {
			duration = Math.min(duration, estimatedReadingTime + 2)
		}

		const endTime = current.startTime + duration
		lines.push({
			words: buildTimedWords(current.text, current.startTime, endTime),
			startTime: current.startTime,
			endTime,
			fullText: current.text,
			translation,
			romanization: romanizations[index]
		})
	}

	return { lines: finalizeParsedLyricLines(lines, options) }
}

/**
 * Enhanced LRC: `<mm:ss.xx>` word tags inside a line, or several inline `[mm:ss.xx]` tags per line.
 * Lines without word tags fall back to the plain-LRC pseudo timeline.
 */
export const parseEnhancedLRC = (
	lrcString: string,
	translationString: string = '',
	options: LyricProcessingOptions = {},
	romanizationString: string = ''
): LyricData => {
	const metadata: LrcMetadata = {}
	const drafts: DraftLine[] = []
	const translationEntries = parseTimedTextEntries(translationString).entries
	const romanizationEntries = parseTimedTextEntries(romanizationString).entries
	const rawLines = stripBom(lrcString).split(/\r?\n/)
	let isSorted = true
	let lastStartTime = Number.NEGATIVE_INFINITY

	for (const rawLine of rawLines) {
		const line = rawLine.trim()
		if (!line) {
			continue
		}

		if (parseMetadataLine(line, metadata)) {
			continue
		}

		const lineTagMatch = line.match(LRC_LINE_TIME_REGEX)
		const body = lineTagMatch ? line.slice(lineTagMatch[0].length) : line
		const angleDraft = maybeBuildPreciseLineDraft(body, GLOBAL_ANGLE_TIME_REGEX, body.includes('<'))
		if (angleDraft) {
			if (angleDraft.startTime < lastStartTime) {
				isSorted = false
			}
			lastStartTime = angleDraft.startTime
			drafts.push(angleDraft)
			continue
		}

		const bracketDraft = maybeBuildPreciseLineDraft(line, GLOBAL_LRC_TIME_REGEX, line.indexOf('[', 1) !== -1)
		if (bracketDraft) {
			if (bracketDraft.startTime < lastStartTime) {
				isSorted = false
			}
			lastStartTime = bracketDraft.startTime
			drafts.push(bracketDraft)
			continue
		}

		const simpleEntry = parseSimpleTimedTextEntry(line)
		if (simpleEntry) {
			if (simpleEntry.startTime < lastStartTime) {
				isSorted = false
			}
			lastStartTime = simpleEntry.startTime
			drafts.push({
				words: [],
				startTime: simpleEntry.startTime,
				fullText: simpleEntry.text
			})
		}
	}

	const sortedDrafts = sortByStartTimeIfNeeded(drafts, isSorted)
	const translations = findTranslationsForSortedStartTimes(
		sortedDrafts.map(draft => draft.startTime),
		translationEntries
	)
	const romanizations = findTranslationsForSortedStartTimes(
		sortedDrafts.map(draft => draft.startTime),
		romanizationEntries
	)

	const lines: Line[] = sortedDrafts.map((draft, index) => {
		let lineEndTime = Math.max(draft.endTime ?? sortedDrafts[index + 1]?.startTime ?? draft.startTime + 5, draft.startTime + 0.001)

		const words =
			draft.words.length > 0
				? draft.words.map((word, wordIndex) => {
						const nextWordStart = draft.words[wordIndex + 1]?.startTime
						const fallbackEnd = nextWordStart ?? lineEndTime
						const endTime = Math.max(word.endTime ?? fallbackEnd, word.startTime + 0.001)
						return {
							text: word.text,
							startTime: word.startTime,
							endTime
						}
					})
				: buildTimedWords(draft.fullText, draft.startTime, lineEndTime)

		if (words.length > 0) {
			lineEndTime = Math.max(lineEndTime, words[words.length - 1].endTime)
		}

		return {
			words,
			startTime: draft.startTime,
			endTime: lineEndTime,
			fullText: draft.fullText,
			translation: translations[index],
			romanization: romanizations[index]
		}
	})

	return {
		lines: finalizeParsedLyricLines(lines, options),
		title: metadata.title,
		artist: metadata.artist
	}
}

/** TTML carries its own translation / romanization tracks, so the alternate strings are ignored. */
export const parseTTML = (
	ttmlString: string,
	_translationString: string = '',
	options: LyricProcessingOptions = {},
	_romanizationString: string = ''
): LyricData => {
	const ttmlResult = parseTtmlDocument(stripBom(ttmlString))
	const parsed = buildLyricDataFromTTMLResult(ttmlResult, buildTimedWords)

	return {
		...parsed,
		lines: finalizeParsedLyricLines(parsed.lines, options)
	}
}

export const parseLyricsByFormat = (
	format: LyricParseFormat,
	content: string,
	translation: string = '',
	options: LyricProcessingOptions = {},
	romanization: string = ''
): LyricData => {
	switch (format) {
		case 'yrc':
			return parseYRC(content, translation, options, romanization)
		case 'qrc':
			return parseQRC(content, translation, options, romanization)
		case 'krc':
			return parseKRC(content, translation, options, romanization)
		case 'awlrc':
			return parseAwlrc(content, translation, options, romanization)
		case 'enhanced-lrc':
			return parseEnhancedLRC(content, translation, options, romanization)
		case 'vtt':
			return parseVTT(content, translation, options, romanization)
		case 'ttml':
			return parseTTML(content, translation, options, romanization)
		case 'lrc':
		default:
			return parseLRC(content, translation, options, romanization)
	}
}
