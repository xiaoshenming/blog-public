import type { LyricLayoutUnit } from './types'

// Sticky punctuation / contraction pass of the post-parser layout planning.
// Attaches punctuation-like layout units to the previous unit before a visualizer splits rows/chunks,
// so source fragments such as `It`, `’`, `s` are never placed in separate visual layers.

const APOSTROPHE_ONLY_REGEX = /^['’]\s*$/
const CONTRACTION_SUFFIX_REGEX = /^(s|t|m|d|ll|re|ve|em)\s*$/i
const DIRECT_CONTRACTION_REGEX = /^['’](s|t|m|d|ll|re|ve|em)\s*$/i
const TRAILING_APOSTROPHE_REGEX = /['’]\s*$/
const TRAILING_WORD_CHAR_REGEX = /[\p{L}\p{N}]$/u
const INLINE_CONTRACTION_REGEX = /[\p{L}\p{N}]+['’](s|t|m|d|ll|re|ve|em)/iu
const STICKY_TRAILING_PUNCTUATION_REGEX = /^[,.;:!?，。！？、：；）】》」』〉〕］)}\]"'’”’]+$/u

const cloneUnit = (unit: LyricLayoutUnit): LyricLayoutUnit => ({
	...unit,
	words: [...unit.words]
})

const appendUnitToStickyUnit = (target: LyricLayoutUnit, unit: LyricLayoutUnit) => {
	target.text += unit.text
	target.words.push(...unit.words)
	target.endTime = unit.endTime
	target.isSticky = true
}

const canAttachToPrevious = (text: string) => TRAILING_WORD_CHAR_REGEX.test(text.trimEnd())

const endsWithApostrophe = (text: string) => TRAILING_APOSTROPHE_REGEX.test(text.trimEnd())

const isApostropheOnlyUnit = (unit: LyricLayoutUnit) => APOSTROPHE_ONLY_REGEX.test(unit.text.trim())

const isContractionSuffixUnit = (unit: LyricLayoutUnit) => CONTRACTION_SUFFIX_REGEX.test(unit.text.trim())

const isDirectContractionUnit = (unit: LyricLayoutUnit) => DIRECT_CONTRACTION_REGEX.test(unit.text.trim())

const isStickyTrailingPunctuationUnit = (unit: LyricLayoutUnit) => STICKY_TRAILING_PUNCTUATION_REGEX.test(unit.text.trim())

const hasAttachedTrailingPunctuation = (unit: LyricLayoutUnit) => {
	if (unit.words.length <= 1) {
		return false
	}

	const lastWord = unit.words[unit.words.length - 1]
	return Boolean(
		lastWord &&
			isStickyTrailingPunctuationUnit({
				text: lastWord.text,
				words: [lastWord],
				startTime: lastWord.startTime,
				endTime: lastWord.endTime,
				isSemantic: false
			})
	)
}

const hasInlineContraction = (unit: LyricLayoutUnit) => unit.words.length > 1 && !unit.isSemantic && INLINE_CONTRACTION_REGEX.test(unit.text)

export const applyStickyPunctuationLayoutUnits = (units: LyricLayoutUnit[]): LyricLayoutUnit[] => {
	const merged: LyricLayoutUnit[] = []

	for (let index = 0; index < units.length; index += 1) {
		const current = units[index]
		const previous = merged[merged.length - 1]
		if (!previous) {
			merged.push(cloneUnit(current))
			continue
		}

		const next = units[index + 1]
		if (isApostropheOnlyUnit(current) && next && canAttachToPrevious(previous.text) && isContractionSuffixUnit(next)) {
			appendUnitToStickyUnit(previous, current)
			appendUnitToStickyUnit(previous, next)
			index += 1
			continue
		}

		if (isDirectContractionUnit(current) && canAttachToPrevious(previous.text)) {
			appendUnitToStickyUnit(previous, current)
			continue
		}

		if (isContractionSuffixUnit(current) && endsWithApostrophe(previous.text)) {
			appendUnitToStickyUnit(previous, current)
			continue
		}

		if (isStickyTrailingPunctuationUnit(current) && canAttachToPrevious(previous.text)) {
			appendUnitToStickyUnit(previous, current)
			continue
		}

		merged.push(cloneUnit(current))
	}

	return merged.map(unit => (hasAttachedTrailingPunctuation(unit) || hasInlineContraction(unit) ? { ...unit, isSticky: true } : unit))
}
