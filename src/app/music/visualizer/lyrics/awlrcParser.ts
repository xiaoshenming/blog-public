import type { Line, LyricData, Word } from '../types'
import { finalizeParsedLyricLines } from './interludes'
import { findTranslationsForSortedStartTimes, parseMetadataLine, stripBom, type LrcMetadata } from './parserTimestamps'
import type { LyricProcessingOptions, TimedTextEntry } from './types'

// Mirrors LX Music's own `timeExp` (lrc-file-parser): 1..3 colon-separated fields plus a fraction,
// so `[ss.ms]`, `[mm:ss.ms]` and `[hh:mm:ss.ms]` all parse.
const AWLRC_LINE_REGEX = /^\[(\d{1,3}(?::\d{1,3}){0,2})\.(\d{1,3})\](.*)$/
// LX normalises KRC's three-field syllable tag down to two fields, but accept the original as well.
const AWLRC_WORD_REGEX = /<(\d+),(\d+)(?:,\d+)?>([^<]*)/g

/**
 * Converts an awlrc line head to seconds.
 *
 * LX Music builds these stamps as `${mm}:${ss}.${ms}` where `ms` is the raw `time % 1000` remainder,
 * and its KuGou and Migu adapters emit it without zero padding (only the QQ adapter pads to three
 * digits). So the fraction is a verbatim millisecond count, not a decimal fraction: `[02:43.97]` is
 * 43s 97ms, not 43s 970ms. Reading it as an LRC centisecond fraction shifts those lines by up to
 * 900ms and pushes them past the following line.
 */
const parseAwlrcTimestamp = (fields: string, fraction: string): number => {
	const parts = fields.split(':').map(part => parseInt(part, 10))
	while (parts.length < 3) {
		parts.unshift(0)
	}

	const [hours, minutes, seconds] = parts
	return hours * 3600 + minutes * 60 + seconds + parseInt(fraction, 10) / 1000
}

/** Reads a plain (non word-by-word) container track using awlrc timestamp semantics. */
const parseAwlrcAlternateTrack = (content: string): TimedTextEntry[] => {
	const entries: TimedTextEntry[] = []

	for (const rawLine of stripBom(content).split(/\r?\n/)) {
		const match = rawLine.trim().match(AWLRC_LINE_REGEX)
		const text = match?.[3]?.trim()
		if (!match || !text) {
			continue
		}

		entries.push({ startTime: parseAwlrcTimestamp(match[1], match[2]), text })
	}

	return entries
}

/**
 * Resolves an alternate track against line start times.
 *
 * KuGou's container tracks are timestamp-identical to the awlrc track, so a single exact hit proves
 * the track is timestamp-keyed; from there every lookup stays exact. A line with no exact counterpart
 * genuinely has no alternate text (title and composer credits are blank rows in those tracks), and
 * falling back to the ±1s nearest-neighbour match there would hand it the next line's translation.
 * Only a track with zero exact hits — a differently-timed source — uses the nearest-neighbour match.
 */
const resolveAlternateTracks = (startTimes: number[], entries: TimedTextEntry[]): Array<string | undefined> => {
	if (entries.length === 0) {
		return startTimes.map(() => undefined)
	}

	const exactByMs = new Map<number, string>()
	for (const entry of entries) {
		const key = Math.round(entry.startTime * 1000)
		if (!exactByMs.has(key)) {
			exactByMs.set(key, entry.text)
		}
	}

	const exact = startTimes.map(startTime => exactByMs.get(Math.round(startTime * 1000)))
	if (exact.some(text => text !== undefined)) {
		return exact
	}

	return findTranslationsForSortedStartTimes(startTimes, entries)
}

/**
 * Parses the word-by-word track of a KuGou/LX `[awlrc:...]` container.
 * Unlike KRC, the line head carries only a start timestamp — the line end is derived from the last
 * syllable, whose `<offsetMs,durationMs>` marker is relative to the line start.
 */
export const parseAwlrc = (
	awlrcString: string,
	translationString: string = '',
	options: LyricProcessingOptions = {},
	romanizationString: string = ''
): LyricData => {
	const metadata: LrcMetadata = {}
	const drafts: Array<{ words: Word[]; startTime: number; endTime: number; fullText: string }> = []

	for (const rawLine of stripBom(awlrcString).split(/\r?\n/)) {
		const line = rawLine.trim()
		if (!line || parseMetadataLine(line, metadata)) {
			continue
		}

		const lineMatch = line.match(AWLRC_LINE_REGEX)
		if (!lineMatch) {
			continue
		}

		const startTime = parseAwlrcTimestamp(lineMatch[1], lineMatch[2])
		const words: Word[] = []
		let fullText = ''
		// Cursor repairs the zero-duration and backwards syllable markers KuGou occasionally emits.
		let cursorMs = 0

		AWLRC_WORD_REGEX.lastIndex = 0
		let wordMatch: RegExpExecArray | null
		while ((wordMatch = AWLRC_WORD_REGEX.exec(lineMatch[3])) !== null) {
			const offsetMs = Math.max(parseInt(wordMatch[1], 10), cursorMs)
			const durationMs = Math.max(parseInt(wordMatch[2], 10), 1)

			words.push({
				text: wordMatch[3],
				startTime: startTime + offsetMs / 1000,
				endTime: startTime + (offsetMs + durationMs) / 1000
			})
			cursorMs = offsetMs + durationMs
			fullText += wordMatch[3]
		}

		if (words.length === 0 || !fullText.trim()) {
			continue
		}

		drafts.push({ words, startTime, endTime: startTime + cursorMs / 1000, fullText })
	}

	// Some exports order the credit lines by fraction digits rather than by value (`.79` before `.181`).
	drafts.sort((left, right) => left.startTime - right.startTime)

	// The container's tracks are all stamped by the same LX writer, so they must be read with the
	// same timestamp semantics as the awlrc track or the exact-match alignment below falls apart.
	const startTimes = drafts.map(draft => draft.startTime)
	const translations = resolveAlternateTracks(startTimes, parseAwlrcAlternateTrack(translationString))
	const romanizations = resolveAlternateTracks(startTimes, parseAwlrcAlternateTrack(romanizationString))

	const lines: Line[] = drafts.map((draft, index) => {
		const next = drafts[index + 1]
		// The derived end may overrun the next line when the final syllable is padded.
		const endTime = next ? Math.min(draft.endTime, next.startTime) : draft.endTime

		return {
			words: draft.words,
			startTime: draft.startTime,
			endTime: Math.max(endTime, draft.startTime),
			fullText: draft.fullText,
			translation: translations[index],
			romanization: romanizations[index]
		}
	})

	return {
		lines: finalizeParsedLyricLines(lines, options),
		title: metadata.title,
		artist: metadata.artist,
		isWordByWord: true
	}
}
