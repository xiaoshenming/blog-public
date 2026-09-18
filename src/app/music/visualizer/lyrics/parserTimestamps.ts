import type { TimedTextEntry } from './types'

// LRC timestamp primitives shared by every line-based parser: tag regexes, `[mm:ss.xx]` /
// `<mm:ss.xx>` marker collection, metadata tags, the "precise" (word-tagged) line draft and the
// translation ↔ line alignment used to merge alternate tracks.

export interface DraftWord {
	text: string
	startTime: number
	endTime?: number
}

export interface DraftLine {
	words: DraftWord[]
	startTime: number
	endTime?: number
	fullText: string
}

interface TimestampMarker {
	time: number
	index: number
	endIndex: number
}

export interface LrcMetadata {
	title?: string
	artist?: string
}

export interface ParsedTimedEntriesResult {
	entries: TimedTextEntry[]
	isSorted: boolean
}

export const GLOBAL_LRC_TIME_REGEX = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g
export const GLOBAL_ANGLE_TIME_REGEX = /<(\d{2}):(\d{2})[.:](\d{2,3})>/g
export const LRC_LINE_TIME_REGEX = /^\[(\d{2}):(\d{2})[.:](\d{2,3})\]/
export const LEADING_LRC_TAGS_REGEX = /^((?:\[(?:\d{2}):(?:\d{2})[.:](?:\d{2,3})\])+)(.*)$/
const LRC_METADATA_REGEX = /^\[(ti|ar):([^\]]*)\]$/i

export const stripBom = (content: string): string => content.replace(/^\uFEFF/, '')

export const sortByStartTimeIfNeeded = <T extends { startTime: number }>(items: T[], isSorted: boolean): T[] => {
	if (isSorted) {
		return items
	}

	return [...items].sort((left, right) => left.startTime - right.startTime)
}

/**
 * Aligns an alternate track (translation / romanization) against sorted line start times.
 * Every line takes the nearest entry within ±1s, walking both lists once.
 */
export const findTranslationsForSortedStartTimes = (startTimes: number[], entries: TimedTextEntry[]): Array<string | undefined> => {
	if (startTimes.length === 0 || entries.length === 0) {
		return startTimes.map(() => undefined)
	}

	const translations: Array<string | undefined> = []
	let upperIndex = 0

	for (const startTime of startTimes) {
		while (upperIndex < entries.length && entries[upperIndex].startTime < startTime) {
			upperIndex += 1
		}

		let bestEntry: TimedTextEntry | undefined
		let bestDiff = 1.0

		const previous = entries[upperIndex - 1]
		if (previous) {
			const diff = Math.abs(previous.startTime - startTime)
			if (diff < bestDiff) {
				bestDiff = diff
				bestEntry = previous
			}
		}

		const current = entries[upperIndex]
		if (current) {
			const diff = Math.abs(current.startTime - startTime)
			if (diff < bestDiff) {
				bestDiff = diff
				bestEntry = current
			}
		}

		translations.push(bestEntry?.text)
	}

	return translations
}

export const parseTimestamp = (minute: string, second: string, fraction: string): number => {
	const min = parseInt(minute, 10)
	const sec = parseInt(second, 10)
	const ms = parseFloat(`0.${fraction}`)
	return min * 60 + sec + ms
}

const collectTimestampMarkers = (content: string, pattern: RegExp): TimestampMarker[] => {
	const regex = new RegExp(pattern.source, 'g')

	return Array.from(content.matchAll(regex)).map(match => {
		const index = match.index ?? 0
		return {
			time: parseTimestamp(match[1], match[2], match[3]),
			index,
			endIndex: index + match[0].length
		}
	})
}

export const parseMetadataLine = (line: string, metadata: LrcMetadata): boolean => {
	const match = line.match(LRC_METADATA_REGEX)
	if (!match) {
		return false
	}

	const key = match[1].toLowerCase()
	const value = match[2].trim()

	if (key === 'ti' && value) {
		metadata.title = value
	} else if (key === 'ar' && value) {
		metadata.artist = value
	}

	return true
}

const buildPreciseLineDraft = (content: string, markers: TimestampMarker[]): DraftLine | null => {
	if (markers.length < 2) {
		return null
	}

	const words: DraftWord[] = []
	let fullText = ''

	for (let index = 0; index < markers.length - 1; index += 1) {
		const current = markers[index]
		const next = markers[index + 1]
		const segment = content.slice(current.endIndex, next.index).replace(/\r/g, '')

		fullText += segment
		if (!segment.trim()) {
			continue
		}

		words.push({
			text: segment,
			startTime: current.time,
			endTime: next.time
		})
	}

	const trailingText = content.slice(markers[markers.length - 1].endIndex).replace(/\r/g, '')
	fullText += trailingText

	if (trailingText.trim()) {
		words.push({
			text: trailingText,
			startTime: markers[markers.length - 1].time
		})
	}

	if (!fullText.trim()) {
		return null
	}

	return {
		words,
		startTime: words[0]?.startTime ?? markers[0].time,
		endTime: words[words.length - 1]?.endTime,
		fullText
	}
}

/** Builds a word-tagged line draft when the content carries at least two markers of `pattern`. */
export const maybeBuildPreciseLineDraft = (content: string, pattern: RegExp, enabled: boolean): DraftLine | null => {
	if (!enabled) {
		return null
	}

	const markers = collectTimestampMarkers(content, pattern)
	return buildPreciseLineDraft(content, markers)
}

/** Reads a plain `[mm:ss.xx]text` line. Only the first of several leading tags is honoured. */
export const parseSimpleTimedTextEntry = (line: string): TimedTextEntry | null => {
	const match = line.match(LEADING_LRC_TAGS_REGEX)
	if (!match) {
		return null
	}

	const firstTag = match[1].match(LRC_LINE_TIME_REGEX)
	if (!firstTag) {
		return null
	}

	const text = match[2].trim()
	if (!text) {
		return null
	}

	return {
		startTime: parseTimestamp(firstTag[1], firstTag[2], firstTag[3]),
		text
	}
}

/**
 * Reads any LRC-family track (plain or word-tagged) into flat timed entries. Used for translation and
 * romanization tracks, whose word tags are collapsed back into the line text.
 */
export const parseTimedTextEntries = (content: string): ParsedTimedEntriesResult => {
	const metadata: LrcMetadata = {}
	const entries: TimedTextEntry[] = []
	let isSorted = true
	let lastStartTime = Number.NEGATIVE_INFINITY

	const rawLines = stripBom(content).split(/\r?\n/)

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
		const bracketDraft = angleDraft ? null : maybeBuildPreciseLineDraft(line, GLOBAL_LRC_TIME_REGEX, line.indexOf('[', 1) !== -1)
		const entry = angleDraft
			? {
					startTime: angleDraft.startTime,
					endTime: angleDraft.endTime,
					text: angleDraft.fullText
				}
			: bracketDraft
				? {
						startTime: bracketDraft.startTime,
						endTime: bracketDraft.endTime,
						text: bracketDraft.fullText
					}
				: parseSimpleTimedTextEntry(line)

		if (!entry || entry.text.length === 0) {
			continue
		}

		if (entry.startTime < lastStartTime) {
			isSorted = false
		}
		lastStartTime = entry.startTime
		entries.push(entry)
	}

	return {
		entries: sortByStartTimeIfNeeded(entries, isSorted),
		isSorted
	}
}
