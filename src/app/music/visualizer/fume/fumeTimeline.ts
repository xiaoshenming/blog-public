import type { Line, Theme } from '../types'
import { getLineRenderEndTime } from '../lyrics/renderHints'
import { resolveWordColor } from '../wordColoring'
import type { FumeBlockVariant, FumeTextHoldStyle, WordRange } from './fumeTypes'
import { clamp, easeInCubic } from './fumeUtils'

// src/app/music/visualizer/fume/fumeTimeline.ts
// Time-axis derivation for a lyric line inside the article: how many graphemes have printed so far
// (stepped and fractional flavours), when a line stops being "active", and how already-read text
// is styled and faded once it has passed.

let lastFumePassedFadeDurationCache: {
	key: string
	duration: number
} | null = null

export const resolvePassedTextStyle = (variant: FumeBlockVariant, textHoldStyle: FumeTextHoldStyle) =>
	textHoldStyle === 'dimmed'
		? {
				opacity: variant === 'hero' ? 0.11 : 0.075,
				glowMultiplier: 0,
				shadowAlphaBase: 0,
				shadowAlphaTrail: 0
			}
		: {
				opacity: variant === 'hero' ? 0.74 : 0.58,
				glowMultiplier: 1,
				shadowAlphaBase: 0.1,
				shadowAlphaTrail: 0.16
			}

export const resolvePassedDimAmount = (currentTimeValue: number, passedAt: number, fadeDuration: number) => {
	if (!Number.isFinite(currentTimeValue) || !Number.isFinite(passedAt) || !Number.isFinite(fadeDuration) || fadeDuration <= 0) {
		return 1
	}

	const passedAge = Math.max(currentTimeValue - passedAt, 0)
	return easeInCubic(clamp(passedAge / fadeDuration, 0, 1))
}

export const resolveFumePassedFadeDuration = (lines: Line[], textHoldRatio: number) => {
	if (textHoldRatio >= 1) {
		return Number.POSITIVE_INFINITY
	}

	const timedLines = lines
		.map(line => ({
			startTime: line.startTime,
			endTime: getLineRenderEndTime(line)
		}))
		.filter(line => Number.isFinite(line.startTime) && Number.isFinite(line.endTime) && line.endTime >= line.startTime)
		.sort((left, right) => left.startTime - right.startTime)
	const cacheKey = timedLines.map(line => `${line.startTime.toFixed(3)}:${line.endTime.toFixed(3)}`).join('|') + `:${textHoldRatio.toFixed(3)}`

	if (lastFumePassedFadeDurationCache?.key === cacheKey) {
		return lastFumePassedFadeDurationCache.duration
	}

	if (timedLines.length <= 1) {
		const duration = clamp(8 * textHoldRatio, 2.4, 130)
		lastFumePassedFadeDurationCache = { key: cacheKey, duration }
		return duration
	}

	const first = timedLines[0]!
	const last = timedLines[timedLines.length - 1]!
	const totalDuration = Math.max(last.endTime - first.startTime, 0)
	const duration = clamp(totalDuration * textHoldRatio, 2.4, 130)
	lastFumePassedFadeDurationCache = { key: cacheKey, duration }
	return duration
}

export const getActiveColor = (wordText: string, theme: Theme) => {
	return resolveWordColor(wordText, theme.wordColors, theme.accentColor, {
		cjkMatchMode: 'bidirectional-contains'
	})
}

export const resolveWordRevealProgress = (range: WordRange, currentTimeValue: number) => {
	if (range.word.endTime <= range.word.startTime) {
		return currentTimeValue >= range.word.endTime ? 1 : 0
	}

	const duration = Math.max(range.word.endTime - range.word.startTime, 0.08)
	return clamp((currentTimeValue - range.word.startTime) / duration, 0, 1)
}

export const resolvePrintedGlyphsInRange = (range: WordRange, currentTimeValue: number) => {
	const length = Math.max(range.end - range.start, 0)
	if (length === 0) {
		return 0
	}

	if (currentTimeValue < range.word.startTime) {
		return 0
	}

	const timedGlyphCount = range.word.syllables?.length ? Math.min(range.graphemeTimings.length, length) : 0
	if (timedGlyphCount > 0) {
		if (currentTimeValue >= range.word.endTime) {
			return length
		}

		let printed = 0
		for (let index = 0; index < timedGlyphCount; index += 1) {
			if (currentTimeValue >= range.graphemeTimings[index]!.startTime) {
				printed = index + 1
			}
		}
		return clamp(printed, 0, length)
	}

	const progress = resolveWordRevealProgress(range, currentTimeValue)
	if (progress >= 1) {
		return length
	}

	return clamp(Math.floor(progress * length + 0.2), progress > 0 ? 1 : 0, length)
}

export const hasRevealCompletedByLineEnd = (line: Line, currentTimeValue: number) => currentTimeValue >= line.endTime

export const resolveLinePassCutoffTime = (line: Line, nextLineStartTime: number | null | undefined) => {
	const renderEndTime = getLineRenderEndTime(line)
	if (typeof nextLineStartTime !== 'number' || !Number.isFinite(nextLineStartTime)) {
		return renderEndTime
	}

	return Math.min(renderEndTime, nextLineStartTime)
}

export const resolveVisualProgressWithCutoff = (startedAt: number, duration: number, currentTimeValue: number, cutoffTime: number) => {
	const nominalEndTime = startedAt + Math.max(duration, 0.001)
	const effectiveEndTime = Math.max(startedAt + 0.001, Math.min(nominalEndTime, cutoffTime))

	return clamp((currentTimeValue - startedAt) / Math.max(effectiveEndTime - startedAt, 0.001), 0, 1)
}

export const resolvePrintedGraphemeCount = (line: Line, wordRanges: WordRange[], graphemeCount: number, currentTimeValue: number) => {
	if (graphemeCount === 0) {
		return 0
	}

	if (currentTimeValue < line.startTime) {
		return 0
	}

	if (hasRevealCompletedByLineEnd(line, currentTimeValue)) {
		return graphemeCount
	}

	if (wordRanges.length === 0) {
		const duration = Math.max(line.endTime - line.startTime, 0.12)
		const progress = clamp((currentTimeValue - line.startTime) / duration, 0, 1)
		return clamp(Math.floor(progress * graphemeCount + (progress > 0 ? 1 : 0)), 0, graphemeCount)
	}

	let printed = 0
	for (let index = 0; index < wordRanges.length; index += 1) {
		const range = wordRanges[index]!
		const partial = resolvePrintedGlyphsInRange(range, currentTimeValue)
		printed = range.start + partial

		if (partial < range.end - range.start) {
			return clamp(printed, 0, graphemeCount)
		}
	}

	return clamp(printed, 0, graphemeCount)
}

export const resolvePrintedGraphemeProgress = (line: Line, wordRanges: WordRange[], graphemeCount: number, currentTimeValue: number) => {
	if (graphemeCount === 0) {
		return 0
	}

	if (currentTimeValue < line.startTime) {
		return 0
	}

	if (hasRevealCompletedByLineEnd(line, currentTimeValue)) {
		return graphemeCount
	}

	if (wordRanges.length === 0) {
		const duration = Math.max(line.endTime - line.startTime, 0.12)
		const progress = clamp((currentTimeValue - line.startTime) / duration, 0, 1)
		return clamp(progress * graphemeCount, 0, graphemeCount)
	}

	let printed = 0
	for (let index = 0; index < wordRanges.length; index += 1) {
		const range = wordRanges[index]!
		if (currentTimeValue < range.word.startTime) {
			return clamp(printed, 0, graphemeCount)
		}

		const progress = resolveWordRevealProgress(range, currentTimeValue)
		const length = Math.max(range.end - range.start, 0)
		printed = range.start + progress * length

		if (progress < 1) {
			return clamp(printed, 0, graphemeCount)
		}
	}

	return clamp(printed, 0, graphemeCount)
}
