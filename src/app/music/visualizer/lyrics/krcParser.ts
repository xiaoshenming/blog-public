import type { Line, LyricData, Word } from '../types'
import { buildTimedWords } from './buildTimedWords'
import { finalizeParsedLyricLines } from './interludes'
import { findTranslationsForSortedStartTimes, parseTimedTextEntries, sortByStartTimeIfNeeded, stripBom } from './parserTimestamps'
import type { LyricProcessingOptions } from './types'

interface RawTimedLine {
	words: Word[]
	startTime: number
	endTime: number
	fullText: string
}

interface EmbeddedKrcTracks {
	translations: string[]
	romanizations: string[]
}

const decodeBase64Utf8 = (value: string): string => {
	let cleanB64 = value.trim()
	while (cleanB64.length % 4 !== 0) {
		cleanB64 += '='
	}

	return typeof Buffer !== 'undefined'
		? Buffer.from(cleanB64, 'base64').toString('utf8')
		: new TextDecoder('utf-8').decode(Uint8Array.from(atob(cleanB64), c => c.charCodeAt(0)))
}

const readEmbeddedTrack = (content: unknown, type: number): string[] => {
	if (!Array.isArray(content)) return []

	const track = content.find(
		(item): item is { type: number; lyricContent?: unknown } => typeof item === 'object' && item !== null && (item as { type?: unknown }).type === type
	)
	if (!track || !Array.isArray(track.lyricContent)) return []

	return track.lyricContent.map((lines: unknown) => {
		if (Array.isArray(lines)) {
			return lines.join('').trim()
		}
		return String(lines).trim()
	})
}

/**
 * Decodes the `[language:...]` tag KRC files embed: a base64 JSON blob whose `content` array carries
 * romanization (type 0) and translation (type 1) tracks aligned by line index.
 */
const readEmbeddedKrcTracks = (krcString: string): EmbeddedKrcTracks => {
	const empty: EmbeddedKrcTracks = { translations: [], romanizations: [] }
	const langMatch = krcString.match(/\[language:([^\]]*)\]/)
	if (!langMatch) {
		return empty
	}

	try {
		const decoded: unknown = JSON.parse(decodeBase64Utf8(langMatch[1]))
		const content = typeof decoded === 'object' && decoded !== null ? (decoded as { content?: unknown }).content : undefined
		return {
			romanizations: readEmbeddedTrack(content, 0),
			translations: readEmbeddedTrack(content, 1)
		}
	} catch (err) {
		console.error('[Kugou KRC] Failed to decode/parse language tag:', err)
		return empty
	}
}

/**
 * Parses Kugou KRC lyric format.
 * KRC is structured similar to QRC/YRC but uses angle brackets (<...>) for word tags
 * and relative millisecond offsets instead of absolute timestamps.
 */
export const parseKRC = (
	krcString: string,
	translationString: string = '',
	options: LyricProcessingOptions = {},
	romanizationString: string = ''
): LyricData => {
	const rawLinesData: RawTimedLine[] = []
	const embedded = readEmbeddedKrcTracks(krcString)
	const translationEntries = parseTimedTextEntries(translationString).entries
	const romanizationEntries = parseTimedTextEntries(romanizationString).entries
	const rawLines = stripBom(krcString).split(/\r?\n/)
	let isSorted = true
	let lastStartTime = Number.NEGATIVE_INFINITY

	for (const rawLine of rawLines) {
		const lineMatch = rawLine.match(/^\[(\d+),(\d+)\](.*)/)
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

		const wordRegex = /\<(\d+),(\d+)(?:,\d+)?\>([^\<]*)/g
		let wordMatch: RegExpExecArray | null

		while ((wordMatch = wordRegex.exec(rest)) !== null) {
			const wordStartOffsetMs = parseInt(wordMatch[1], 10)
			const wordDurationMs = parseInt(wordMatch[2], 10)
			const text = wordMatch[3]

			// Note: KRC word start offset is relative to the line start time.
			const wordStartMs = lineStartTimeMs + wordStartOffsetMs

			words.push({
				text,
				startTime: wordStartMs / 1000,
				endTime: (wordStartMs + wordDurationMs) / 1000
			})
			fullText += text
		}

		// If no word tags but text is present, build timed words
		const trimmedRest = rest.trim()
		if (words.length === 0 && trimmedRest.length > 0 && !trimmedRest.startsWith('[') && !trimmedRest.startsWith('<')) {
			words.push(...buildTimedWords(trimmedRest, lineStartTime, lineEndTime))
			fullText = trimmedRest
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
	const lines: Line[] = sortedRawLines.map((line, index) => {
		let translation = embedded.translations[index] || undefined
		let romanization = embedded.romanizations[index] || undefined
		if (!translation && translationEntries.length > 0) {
			const externalTrans = findTranslationsForSortedStartTimes([line.startTime], translationEntries)
			translation = externalTrans[0] || undefined
		}
		if (!romanization && romanizationEntries.length > 0) {
			const externalRomanization = findTranslationsForSortedStartTimes([line.startTime], romanizationEntries)
			romanization = externalRomanization[0] || undefined
		}
		return {
			...line,
			translation,
			romanization
		}
	})

	return { lines: finalizeParsedLyricLines(lines, options) }
}
