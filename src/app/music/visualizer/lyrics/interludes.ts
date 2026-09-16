import type { Line, Word } from '../types'
import { annotateLyricLines } from './renderHints'
import type { LyricProcessingOptions } from './types'

// Interlude synthesis and the shared post-parse finalization every format parser runs through.

export const INTERLUDE_FULL_TEXT = '......'

export const isInterludeLine = (line: Pick<Line, 'fullText'>): boolean => line.fullText === INTERLUDE_FULL_TEXT

/**
 * Inserts `......` interlude lines into gaps longer than 3s (and before a late first line). Each
 * interlude carries six dot words spread evenly over the gap so word-by-word modes can animate it.
 */
export const attachInterludes = (lines: Line[]): Line[] => {
	const finalLines: Line[] = []

	const createInterlude = (start: number, end: number): Line => {
		const duration = end - start
		const words: Word[] = []
		const wordDuration = duration / 6

		for (let index = 0; index < 6; index += 1) {
			words.push({
				text: '.',
				startTime: start + index * wordDuration,
				endTime: start + (index + 1) * wordDuration
			})
		}

		return {
			startTime: start,
			endTime: end,
			fullText: INTERLUDE_FULL_TEXT,
			words
		}
	}

	if (lines.length > 0 && lines[0].startTime > 3) {
		finalLines.push(createInterlude(0.5, lines[0].startTime - 0.5))
	}

	for (let index = 0; index < lines.length; index += 1) {
		const current = lines[index]
		finalLines.push(current)

		const next = lines[index + 1]
		if (next) {
			const gap = next.startTime - current.endTime
			if (gap > 3) {
				finalLines.push(createInterlude(current.endTime + 0.05, next.startTime - 0.05))
			}
		}
	}

	return finalLines
}

export const finalizeParsedLyricLines = (lines: Line[], options: Pick<LyricProcessingOptions, 'includeInterludes'> = {}): Line[] => {
	const withOptionalInterludes = options.includeInterludes === false ? lines : attachInterludes(lines)

	return annotateLyricLines(withOptionalInterludes)
}
