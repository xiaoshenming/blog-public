import type { Word } from '../types'
import { applyStickyPunctuationLayoutUnits } from './stickyPunctuation'
import type { BuildPostLyricLayoutUnitsOptions, LyricLayoutUnit, SegmentableLine } from './types'
import { hasWordSegmentationOverride, segmentLyricWords } from './wordSegmentation'

export type { BuildPostLyricLayoutUnitsOptions, LyricLayoutUnit, SegmentableLine } from './types'
export { applyStickyPunctuationLayoutUnits } from './stickyPunctuation'

// Builds parser-preserving lyric layout units for visualizer display planning.
//
// This file runs after lyrics have already been parsed into Line.words.
// It must not rewrite the Line object or collapse parser words globally, because YRC/QRC/enhanced-LRC
// can intentionally expose tiny timed fragments such as:
//
//   Line.words: ["It", "’", "s", "unbelievable"]
//
// Visualizers often need a more readable display shape than those raw timed fragments. Layout units are
// that display-planning layer: they can group fragments for row splitting and rendering while still keeping
// every original Word inside `words` for timing.
//
// Example with sticky punctuation:
//
//   input words:  It | ’ | s | unbelievable
//   layoutUnits: It’s(isSticky, words=[It, ’, s]) | unbelievable
//
// Example with CJK semantic grouping:
//
//   input words:  世 | 界 | 。
//   layoutUnits: 世界。(isSemantic, isSticky, words=[世, 界, 。])
//
// Display words are derived later. Sticky non-semantic units render as one visual word; semantic CJK units
// still return their original words so per-character timing stays intact.

interface WordSegment {
	segment: string
	isWordLike?: boolean
}

const CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/
const WHITESPACE_REGEX = /^\s+$/

const hasCjkText = (text: string) => CJK_REGEX.test(text)

export const createSingleWordLayoutUnits = (words: Word[]): LyricLayoutUnit[] =>
	words.map(word => ({
		text: word.text,
		words: [word],
		startTime: word.startTime,
		endTime: word.endTime,
		isSemantic: false
	}))

// Delegates to the one word segmenter in the codebase, which also honours the user's saved
// segmentation for this line. Only the two fields this file aligns on are kept.
const getWordSegments = (line: SegmentableLine): WordSegment[] | null => {
	const segments = segmentLyricWords(line)
	return segments.length > 0 ? segments.map(({ segment, isWordLike }) => ({ segment, isWordLike })) : null
}

const appendWordsToUnit = (unit: LyricLayoutUnit, text: string, words: Word[]) => {
	unit.text += text
	unit.words.push(...words)
	unit.endTime = words[words.length - 1]?.endTime ?? unit.endTime
}

// Maps Intl.Segmenter output back onto parser words.
// If any segment cannot be aligned exactly, callers fall back to one-word units instead of guessing.
const mapSegmentsToWords = (segments: WordSegment[], words: Word[]): LyricLayoutUnit[] | null => {
	const units: LyricLayoutUnit[] = []
	let wordIndex = 0

	for (const segment of segments) {
		const segmentText = segment.segment
		if (!segmentText || WHITESPACE_REGEX.test(segmentText)) {
			continue
		}

		const startWordIndex = wordIndex
		let collectedText = ''

		while (wordIndex < words.length && collectedText.length < segmentText.length) {
			collectedText += words[wordIndex].text
			wordIndex += 1

			if (!segmentText.startsWith(collectedText)) {
				return null
			}
		}

		if (collectedText !== segmentText) {
			return null
		}

		const segmentWords = words.slice(startWordIndex, wordIndex)
		const firstWord = segmentWords[0]
		const lastWord = segmentWords[segmentWords.length - 1]
		if (!firstWord || !lastWord) {
			return null
		}

		if (!segment.isWordLike && units.length > 0) {
			appendWordsToUnit(units[units.length - 1], segmentText, segmentWords)
			continue
		}

		units.push({
			text: segmentText,
			words: segmentWords,
			startTime: firstWord.startTime,
			endTime: lastWord.endTime,
			isSemantic: Boolean(segment.isWordLike && hasCjkText(segmentText) && segmentWords.length > 1)
		})
	}

	if (wordIndex !== words.length || units.length === 0) {
		return null
	}

	return units
}

// Legacy-compatible helper: only performs CJK semantic grouping.
// It does not apply sticky punctuation, so existing callers can keep the old behavior.
export const buildCjkSemanticLayoutUnits = (line: SegmentableLine): LyricLayoutUnit[] => {
	if (line.words.length === 0) {
		return []
	}

	const fallbackUnits = createSingleWordLayoutUnits(line.words)
	// The CJK gate exists because Intl.Segmenter only adds information over parser words for
	// scripts without spaces. A user-supplied split is deliberate in any script, so it skips it.
	if (!hasCjkText(line.fullText) && !hasWordSegmentationOverride(line)) {
		return fallbackUnits
	}

	const segments = getWordSegments(line)
	if (!segments) {
		return fallbackUnits
	}

	return mapSegmentsToWords(segments, line.words) ?? fallbackUnits
}

// Main post-parser entry point for visualizer layout preparation.
// Order is intentional: semantic grouping first, sticky punctuation second.
//
// Examples:
//
//   buildPostLyricLayoutUnits(line, { semantic: false, sticky: false })
//   -> one layout unit per parser word
//
//   buildPostLyricLayoutUnits(line, { semantic: true, sticky: false })
//   -> CJK semantic units only
//
//   buildPostLyricLayoutUnits(line, { semantic: true, sticky: true })
//   -> CJK semantic units, then punctuation/contraction attachment
export const buildPostLyricLayoutUnits = (line: SegmentableLine, options: BuildPostLyricLayoutUnitsOptions = {}): LyricLayoutUnit[] => {
	const rawUnits = options.semantic ? buildCjkSemanticLayoutUnits(line) : createSingleWordLayoutUnits(line.words)

	return options.sticky ? applyStickyPunctuationLayoutUnits(rawUnits) : rawUnits
}

// Converts layout units into the words a renderer should actually draw.
// Sticky non-semantic units become one rendered Word, e.g. It + ’ + s -> It’s.
// Semantic CJK units return their original words so per-character timing remains available.
export const buildDisplayWordsFromLayoutUnits = (units: LyricLayoutUnit[]): Word[] =>
	units.flatMap(unit => {
		if (!unit.isSticky || unit.isSemantic) {
			return unit.words
		}

		return [
			{
				text: unit.text,
				startTime: unit.startTime,
				endTime: unit.endTime
			}
		]
	})
