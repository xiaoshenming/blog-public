import type { Line, LyricData, Word } from '../types'
import { finalizeParsedLyricLines } from './interludes'
import { findTranslationsForSortedStartTimes, parseTimedTextEntries, sortByStartTimeIfNeeded, stripBom } from './parserTimestamps'
import type { LyricProcessingOptions, TimedTextEntry } from './types'

// NetEase YRC and QQ Music QRC. Both use a `[startMs,durationMs]` line head followed by
// `(startMs,durationMs[,0])` word tags with absolute millisecond timestamps; they differ in where
// the word text sits relative to its tag.

interface RawTimedLine {
	words: Word[]
	startTime: number
	endTime: number
	fullText: string
}

const LINE_HEAD_REGEX = /^\[(\d+),(\d+)\](.*)/

const attachAlternateTracks = (sortedRawLines: RawTimedLine[], translationEntries: TimedTextEntry[], romanizationEntries: TimedTextEntry[]): Line[] => {
	const startTimes = sortedRawLines.map(line => line.startTime)
	const translations = findTranslationsForSortedStartTimes(startTimes, translationEntries)
	const romanizations = findTranslationsForSortedStartTimes(startTimes, romanizationEntries)

	return sortedRawLines.map((line, index) => ({
		...line,
		translation: translations[index],
		romanization: romanizations[index]
	}))
}

/** YRC: every word tag is immediately followed by its text, `(start,dur,0)text`. */
export const parseYRC = (
	yrcString: string,
	translationString: string = '',
	options: LyricProcessingOptions = {},
	romanizationString: string = ''
): LyricData => {
	const rawLinesData: RawTimedLine[] = []
	const translationEntries = parseTimedTextEntries(translationString).entries
	const romanizationEntries = parseTimedTextEntries(romanizationString).entries
	const rawLines = stripBom(yrcString).split(/\r?\n/)
	let isSorted = true
	let lastStartTime = Number.NEGATIVE_INFINITY

	for (const rawLine of rawLines) {
		const lineMatch = rawLine.match(LINE_HEAD_REGEX)
		if (!lineMatch) {
			continue
		}

		const lineStartTimeMs = parseInt(lineMatch[1], 10)
		const lineDurationMs = parseInt(lineMatch[2], 10)
		const rest = lineMatch[3]
		const lineStartTime = lineStartTimeMs / 1000
		const lineEndTime = (lineStartTimeMs + lineDurationMs) / 1000

		const words: Word[] = []
		let fullText = ''

		const wordRegex = /\((\d+),(\d+),(\d+)\)([^\(]*)/g
		let wordMatch: RegExpExecArray | null

		while ((wordMatch = wordRegex.exec(rest)) !== null) {
			const wordStartMs = parseInt(wordMatch[1], 10)
			const wordDurationMs = parseInt(wordMatch[2], 10)
			const text = wordMatch[4]

			words.push({
				text,
				startTime: wordStartMs / 1000,
				endTime: (wordStartMs + wordDurationMs) / 1000
			})
			fullText += text
		}

		if (words.length > 0) {
			if (lineStartTime < lastStartTime) {
				isSorted = false
			}
			lastStartTime = lineStartTime
			rawLinesData.push({
				words,
				startTime: lineStartTime,
				endTime: lineEndTime,
				fullText
			})
		}
	}

	const sortedRawLines = sortByStartTimeIfNeeded(rawLinesData, isSorted)
	const lines = attachAlternateTracks(sortedRawLines, translationEntries, romanizationEntries)

	return { lines: finalizeParsedLyricLines(lines, options) }
}

/**
 * QRC: word text sits between tags. Files disagree on whether the text precedes or follows its tag, so
 * each line decides from its leading/trailing chunks and falls back to the longer neighbour.
 */
export const parseQRC = (
	qrcString: string,
	translationString: string = '',
	options: LyricProcessingOptions = {},
	romanizationString: string = ''
): LyricData => {
	const rawLinesData: RawTimedLine[] = []
	const parseQrcTrackEntries = (track: string): TimedTextEntry[] => {
		if (!track.trim()) return []

		const qrcLines = parseQRC(track).lines
		if (qrcLines.length > 0) {
			return qrcLines.map(line => ({ startTime: line.startTime, text: line.fullText }))
		}

		return parseTimedTextEntries(track).entries
	}
	const translationEntries = parseQrcTrackEntries(translationString)
	const romanizationEntries = parseQrcTrackEntries(romanizationString)
	const rawLines = stripBom(qrcString).split(/\r?\n/)
	let isSorted = true
	let lastStartTime = Number.NEGATIVE_INFINITY

	for (const rawLine of rawLines) {
		const lineMatch = rawLine.match(LINE_HEAD_REGEX)
		if (!lineMatch) {
			continue
		}

		const lineStartTimeMs = parseInt(lineMatch[1], 10)
		const lineDurationMs = parseInt(lineMatch[2], 10)
		const rest = lineMatch[3]
		const lineStartTime = lineStartTimeMs / 1000
		const lineEndTime = (lineStartTimeMs + lineDurationMs) / 1000

		const words: Word[] = []
		let fullText = ''
		const tagRegex = /\((\d+),(\d+)(?:,\d+)?\)/g
		const tags: Array<{ startMs: number; durationMs: number; tagStart: number; tagEnd: number }> = []
		let tagMatch: RegExpExecArray | null

		while ((tagMatch = tagRegex.exec(rest)) !== null) {
			tags.push({
				startMs: parseInt(tagMatch[1], 10),
				durationMs: parseInt(tagMatch[2], 10),
				tagStart: tagMatch.index,
				tagEnd: tagMatch.index + tagMatch[0].length
			})
		}

		if (tags.length === 0) {
			continue
		}

		const textChunks: string[] = []
		let cursor = 0
		for (const tag of tags) {
			textChunks.push(rest.slice(cursor, tag.tagStart))
			cursor = tag.tagEnd
		}
		textChunks.push(rest.slice(cursor))

		const prefersLeadingText = textChunks[0].trim().length > 0 && textChunks[textChunks.length - 1].trim().length === 0
		const prefersTrailingText = textChunks[0].trim().length === 0 && textChunks[textChunks.length - 1].trim().length > 0

		for (let index = 0; index < tags.length; index += 1) {
			const tag = tags[index]
			const leadingText = textChunks[index] ?? ''
			const trailingText = textChunks[index + 1] ?? ''
			let text = ''

			if (prefersLeadingText) {
				text = leadingText
			} else if (prefersTrailingText) {
				text = trailingText
			} else if (trailingText.trim().length > 0 && leadingText.trim().length === 0) {
				text = trailingText
			} else if (leadingText.trim().length > 0 && trailingText.trim().length === 0) {
				text = leadingText
			} else {
				text = trailingText.length >= leadingText.length ? trailingText : leadingText
			}

			if (!text) {
				continue
			}

			words.push({
				text,
				startTime: tag.startMs / 1000,
				endTime: (tag.startMs + tag.durationMs) / 1000
			})
			fullText += text
		}

		if (words.length > 0) {
			if (lineStartTime < lastStartTime) {
				isSorted = false
			}
			lastStartTime = lineStartTime
			rawLinesData.push({
				words,
				startTime: lineStartTime,
				endTime: lineEndTime,
				fullText
			})
		}
	}

	const sortedRawLines = sortByStartTimeIfNeeded(rawLinesData, isSorted)
	const lines = attachAlternateTracks(sortedRawLines, translationEntries, romanizationEntries)

	return { lines: finalizeParsedLyricLines(lines, options) }
}
