import type { Line } from '../types'
import { buildWordGraphemeTimings } from '../lyrics/graphemeTiming'

// Per-character timing derivation for the Tilt visualizer: a segment's slice of the active line is
// stretched over its words (using syllable timings when available) so each visible grapheme gets a
// start/end pair, plus the pulse envelope that turns a timing into a scale bump.

export interface CharTiming {
	charIndex: number
	startTime: number
	endTime: number
}

export const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export const findSegmentWordRange = (
	charOffset: number,
	segmentText: string,
	fullText: string,
	words: Array<{ text: string; startTime: number; endTime: number }>
): { startWordIndex: number; endWordIndex: number } => {
	const segmentStart = charOffset
	if (segmentStart < 0 || segmentStart >= fullText.length) return { startWordIndex: 0, endWordIndex: words.length }

	const segmentEnd = segmentStart + segmentText.length

	let fullTextPos = 0
	let startWordIndex = 0
	let endWordIndex = words.length

	for (let wi = 0; wi < words.length; wi++) {
		const wordText = words[wi].text
		const wordFullStart = fullText.indexOf(wordText, fullTextPos)

		if (wordFullStart === -1) {
			fullTextPos += wordText.length
			continue
		}

		const wordFullEnd = wordFullStart + wordText.length

		if (wordFullStart <= segmentStart && wordFullEnd > segmentStart) {
			startWordIndex = wi
		}

		if (wordFullStart < segmentEnd && wordFullEnd >= segmentEnd) {
			endWordIndex = wi + 1
			break
		}

		fullTextPos = wordFullEnd
	}

	return { startWordIndex, endWordIndex }
}

export const buildCharTimings = (
	charOffset: number,
	segmentText: string,
	segmentStartTime: number,
	segmentEndTime: number,
	activeLine: Line | null
): CharTiming[] => {
	const graphemes = [...GRAPHEME_SEGMENTER.segment(segmentText)]
	if (!activeLine || graphemes.length === 0) return []

	const nonSpaceGraphemes = graphemes.filter(g => !/^\s+$/.test(g.segment))
	if (nonSpaceGraphemes.length === 0) return []

	const totalDuration = Math.max(segmentEndTime - segmentStartTime, 0.3)
	const { startWordIndex, endWordIndex } = findSegmentWordRange(charOffset, segmentText, activeLine.fullText, activeLine.words)
	const segmentWords = activeLine.words.slice(startWordIndex, endWordIndex)

	let currentCharIndex = 0
	const timings: CharTiming[] = []

	if (segmentWords.length > 0) {
		for (const word of segmentWords) {
			if (word.syllables?.length) {
				const wordTimings = buildWordGraphemeTimings(word).filter(timing => !/^\s+$/.test(timing.char))
				for (const timing of wordTimings) {
					if (currentCharIndex >= nonSpaceGraphemes.length) break

					timings.push({
						charIndex: currentCharIndex,
						startTime: timing.startTime,
						endTime: timing.endTime
					})

					currentCharIndex++
				}
				continue
			}

			const wordGraphemes = [...GRAPHEME_SEGMENTER.segment(word.text)]
			const wordNonSpaceCount = wordGraphemes.filter(g => !/^\s+$/.test(g.segment)).length
			if (wordNonSpaceCount === 0) continue

			const wordDuration = Math.max(word.endTime - word.startTime, 0.05)
			const charDuration = wordDuration / wordNonSpaceCount
			let nonSpaceCi = 0

			for (const grapheme of wordGraphemes) {
				if (currentCharIndex >= nonSpaceGraphemes.length) break
				if (/^\s+$/.test(grapheme.segment)) continue

				timings.push({
					charIndex: currentCharIndex,
					startTime: word.startTime + nonSpaceCi * charDuration,
					endTime: word.startTime + (nonSpaceCi + 1) * charDuration
				})

				currentCharIndex++
				nonSpaceCi++
			}
		}
	}

	if (timings.length === 0 || timings.length !== nonSpaceGraphemes.length) {
		// Word/syllable coverage did not line up with the visible graphemes (joined words, stray
		// punctuation, missing timings): fall back to spreading the segment duration evenly.
		const avgCharDuration = totalDuration / nonSpaceGraphemes.length
		timings.length = 0
		currentCharIndex = 0

		for (let i = 0; i < graphemes.length; i++) {
			const isSpace = /^\s+$/.test(graphemes[i].segment)
			if (isSpace) continue

			timings.push({
				charIndex: currentCharIndex,
				startTime: segmentStartTime + currentCharIndex * avgCharDuration,
				endTime: segmentStartTime + (currentCharIndex + 1) * avgCharDuration
			})
			currentCharIndex++
		}
	}

	return timings
}

export const getCharPulseIntensity = (currentTime: number, charTiming: CharTiming): number => {
	const { startTime, endTime } = charTiming
	const rawDuration = Math.max(endTime - startTime, 0.05)
	const duration = Math.min(Math.max(rawDuration, 0.2), 0.9)
	const elapsed = currentTime - startTime

	if (elapsed < 0) return 0

	if (elapsed <= duration) {
		const progress = elapsed / duration
		return Math.sin(progress * Math.PI)
	}

	const afterElapsed = elapsed - duration
	const afterglowRamp = duration * 1.2
	if (afterElapsed >= afterglowRamp) return 0.25

	return 0.25 * (afterElapsed / afterglowRamp)
}
