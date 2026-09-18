import { splitByLevel } from './sentenceSplitRules'
import type { LyricLayoutUnit } from './types'

interface SentenceSplitOptions {
	text: string
	targetCount: number
}

class SentenceLayout implements LyricLayoutUnit {
	text: string
	words: { text: string; startTime: number; endTime: number }[] = []
	startTime: number = 0
	endTime: number = 0
	isSemantic: boolean = true

	constructor(text: string) {
		this.text = text
	}

	static splitIntoSentences(text: string, targetCount: number, timeSeed?: number): SentenceLayout[] {
		if (targetCount <= 1 && targetCount >= 0) {
			return [new SentenceLayout(text)]
		}

		const maxLevel = targetCount === -1 ? 1 : targetCount === -2 ? 2 : targetCount === -3 ? 3 : targetCount === -4 ? 4 : targetCount === -5 ? 5 : 5

		let sentences = [text]

		for (let level = 1; level <= maxLevel; level++) {
			if (sentences.length >= Math.abs(targetCount) && targetCount > 0) {
				break
			}

			const newSentences: string[] = []
			for (const sentence of sentences) {
				newSentences.push(...splitByLevel(sentence, level))
			}
			sentences = newSentences
		}

		let result = sentences.map(s => new SentenceLayout(s))

		if (targetCount > 0 && result.length < targetCount) {
			result = SentenceLayout.secondarySplit(result, targetCount, timeSeed)
		}

		if (result.length > 1 && result.length > targetCount && targetCount > 0) {
			result = SentenceLayout.mergeSentences(result, targetCount)
		}

		return result
	}

	// The one word-granularity Segmenter left outside wordSegmentation, and so the one place the
	// user's saved segmentation does not reach. It splits a sentence *fragment* rather than a whole
	// line, purely to find a break point, so a per-line boundary list would have to be mapped into
	// fragment coordinates first. Left as is deliberately.
	private static secondarySplit(sentences: SentenceLayout[], targetCount: number, timeSeed?: number): SentenceLayout[] {
		const Segmenter = Intl?.Segmenter
		const segmenter = Segmenter ? new Segmenter(undefined, { granularity: 'word' }) : null

		while (sentences.length < targetCount) {
			const candidates = sentences.filter(s => s.text.length > 2)
			if (candidates.length === 0) break

			if (segmenter) {
				const semanticCandidates: { sentence: SentenceLayout; index: number; splitPos: number; score: number }[] = []

				for (const s of candidates) {
					try {
						const segments = Array.from(segmenter.segment(s.text))

						const wordPositions: { start: number; end: number }[] = []
						let offset = 0
						for (const seg of segments) {
							if (seg.isWordLike) {
								wordPositions.push({ start: offset, end: offset + seg.segment.length })
							}
							offset += seg.segment.length
						}

						if (wordPositions.length >= 2) {
							const midChar = s.text.length / 2
							let bestGapIdx = 1
							let bestDist = Infinity
							for (let g = 1; g < wordPositions.length; g++) {
								const dist = Math.abs(wordPositions[g].start - midChar)
								if (dist < bestDist) {
									bestDist = dist
									bestGapIdx = g
								}
							}

							const splitPos = wordPositions[bestGapIdx].start
							const balanceScore = 1 - Math.abs(splitPos - midChar) / midChar

							semanticCandidates.push({
								sentence: s,
								index: sentences.indexOf(s),
								splitPos,
								score: balanceScore * 10 + wordPositions.length
							})
						}
					} catch {
						// A fragment the Segmenter rejects simply falls through to the midpoint split below.
					}
				}

				if (semanticCandidates.length > 0) {
					semanticCandidates.sort((a, b) => b.score - a.score)
					const best = semanticCandidates[0]
					const firstHalf = best.sentence.text.slice(0, best.splitPos)
					const secondHalf = best.sentence.text.slice(best.splitPos)
					sentences.splice(best.index, 1, new SentenceLayout(firstHalf), new SentenceLayout(secondHalf))
					continue
				}
			}

			const pseudoRandom = (seed: number) => {
				const x = Math.sin(seed) * 10000
				return x - Math.floor(x)
			}

			const textHash = sentences.reduce((acc, s) => acc + s.text.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0), 0)
			const seed = textHash + sentences.length + (timeSeed ?? 0)
			const randomIndex = Math.floor(pseudoRandom(seed) * candidates.length)
			const selectedCandidate = candidates[randomIndex]
			const candidateIndex = sentences.indexOf(selectedCandidate)

			const midPoint = Math.floor(selectedCandidate.text.length / 2)
			const firstHalf = selectedCandidate.text.slice(0, midPoint)
			const secondHalf = selectedCandidate.text.slice(midPoint)

			sentences.splice(candidateIndex, 1, new SentenceLayout(firstHalf), new SentenceLayout(secondHalf))
		}

		return sentences
	}

	private static mergeSentences(sentences: SentenceLayout[], targetCount: number): SentenceLayout[] {
		while (sentences.length > targetCount) {
			let bestMergeIndex = 0
			let shortestCombinedLength = Infinity

			for (let i = 0; i < sentences.length - 1; i++) {
				const combinedLength = sentences[i].text.length + sentences[i + 1].text.length
				if (combinedLength < shortestCombinedLength) {
					shortestCombinedLength = combinedLength
					bestMergeIndex = i
				}
			}

			const merged = new SentenceLayout(sentences[bestMergeIndex].text + sentences[bestMergeIndex + 1].text)

			sentences.splice(bestMergeIndex, 2, merged)
		}

		return sentences
	}
}

export { SentenceLayout }
export type { SentenceSplitOptions }
