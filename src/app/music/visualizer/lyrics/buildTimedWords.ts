import type { Word } from '../types'

// The upstream fallback for lines that carry no word-level timing (plain LRC, VTT cues, KRC lines
// without syllable tags, TTML lines without spans). It spreads the line window over pseudo words so
// word-by-word visualizers still get a monotonic per-word timeline on line-timed sources:
//
//   - whitespace-separated tokens are words; CJK tokens are split into one word per character
//   - CJK punctuation gets zero weight (it inherits a 50ms tick instead of a share of the window)
//   - western tokens weigh 1 + 0.15 per character so longer words get proportionally more time
//   - only 90% of the window is distributed, leaving a natural breath before the next line
//
// The final pass rescales everything back into [startTime, endTime] when the minimum word duration
// pushed the last word past the line end, so words never leave the line interval.

export const buildTimedWords = (text: string, startTime: number, endTime: number): Word[] => {
	const duration = Math.max(endTime - startTime, 0.1)
	const rawTokens = text.split(/\s+/).filter(token => token)
	const words: Word[] = []
	const tokens: Array<{ text: string; weight: number }> = []
	let totalWeight = 0

	for (const token of rawTokens) {
		if (/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(token)) {
			token.split('').forEach(char => {
				const isPunctuation = /[，。！？、：；"'）]/.test(char)
				const weight = isPunctuation ? 0 : 1
				tokens.push({ text: char, weight })
				totalWeight += weight
			})
		} else {
			const weight = 1 + token.length * 0.15
			tokens.push({ text: token, weight })
			totalWeight += weight
		}
	}

	if (totalWeight === 0) {
		totalWeight = 1
	}

	const activeDuration = duration * 0.9
	const timePerWeight = activeDuration / totalWeight
	let currentWordStart = startTime

	tokens.forEach(token => {
		const wordDuration = token.weight * timePerWeight
		const finalDuration = Math.max(wordDuration, 0.05)

		words.push({
			text: token.text,
			startTime: currentWordStart,
			endTime: currentWordStart + finalDuration
		})

		if (token.weight > 0) {
			currentWordStart += wordDuration
		} else {
			currentWordStart += 0.05
		}
	})

	if (words.length > 0) {
		const lastWord = words[words.length - 1]
		if (lastWord.endTime > endTime) {
			const scale = (endTime - startTime) / (lastWord.endTime - startTime)
			words.forEach(word => {
				word.startTime = startTime + (word.startTime - startTime) * scale
				word.endTime = startTime + (word.endTime - startTime) * scale
			})
		}
	}

	return words
}
