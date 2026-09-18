'use client'

import { layoutWithLines, prepareWithSegments, type LayoutCursor, type LayoutLinesResult, type PreparedTextWithSegments } from '@chenglou/pretext'
import { resolveThemeFontStack, resolveThemeFontWeight } from '../fontStacks'
import { buildWordGraphemeTimings } from '../lyrics/graphemeTiming'
import type { Line, Theme } from '../types'
import { resolveWordColor } from '../wordColoring'
import type { LineFragmentView, PreparedState, PreparedStateCacheContext, SegmentMeta, WordRange } from './types'
import { clamp, isCJK, splitGraphemes } from './textUtils'
import { buildWordPlacements } from './wordPlacement'

// src/app/music/visualizer/cadenza/layoutMeasure.ts
// Text preparation and measurement: font sizing, pretext prepare/wrap, the segment<->grapheme
// bridge, word range remapping and the per-wrapped-line fragment split that feeds placement.

export const chooseFontPx = (width: number, line: Line) => {
	const graphemeCount = splitGraphemes(line.fullText).length || 1
	const wordCount = line.words.length || 1
	const widthBase = clamp(width * 0.086, 34, 94)
	const lengthPenalty = graphemeCount > 12 ? Math.min((graphemeCount - 12) * 1.8, 34) : 0
	const densityPenalty = wordCount > 7 ? Math.min((wordCount - 7) * 1.5, 18) : 0
	return clamp(widthBase - lengthPenalty - densityPenalty, 28, 104)
}

// The same resolved weight drives pretext measurement, the canvas font and the overlay font,
// so measured and painted glyphs never disagree.
export const buildCanvasFont = (theme: Theme, fontPx: number) => `${resolveThemeFontWeight(theme, 700)} ${fontPx}px ${resolveThemeFontStack(theme)}`

export const buildPreparedState = (line: Line, context: PreparedStateCacheContext): PreparedState | null => {
	const { showText, viewport, theme, tuning } = context

	if (!showText || viewport.width <= 0 || viewport.height <= 0) {
		return null
	}

	const fontPx = clamp(chooseFontPx(viewport.width, line) * tuning.fontScale, 24, 132)
	const font = buildCanvasFont(theme, fontPx)
	// This is the expensive part of the mode.
	// Once a line reaches here, we fully measure it, wrap it, split it, and convert it into placement-ready fragments.
	const prepared = prepareWithSegments(line.fullText, font)
	const text = prepared.segments.join('')
	const { segmentMetas, graphemes } = buildSegmentMetas(prepared)
	const lineHeight = Math.round(fontPx * (isCJK(text) ? 1.22 : 1.1))
	const availableWidth = Math.max(viewport.width - 48, 120)
	const minWidth = Math.min(220, availableWidth)
	const wrapCompression = graphemes.length > 12 ? clamp(0.92 - (graphemes.length - 12) * 0.018, 0.62, 0.92) : 0.92
	const compactWidthRatio = tuning.widthRatio * wrapCompression
	const maxWidth = clamp(Math.min(viewport.width * compactWidthRatio, 820), minWidth, availableWidth)
	const layout = layoutWithLines(prepared, maxWidth, lineHeight)
	const ranges = findWordRanges(line, graphemes, theme)
	const lineFragments = buildLineFragments(prepared, segmentMetas, graphemes, layout, ranges)
	const placements = buildWordPlacements(
		lineFragments,
		fontPx,
		lineHeight,
		maxWidth,
		theme.animationIntensity,
		line.startTime * 1000,
		line.fullText === '......'
	)

	return {
		prepared,
		text,
		font,
		fontPx,
		lineHeight,
		maxWidth,
		layout,
		segmentMetas,
		graphemes,
		placements
	}
}

const getActiveColor = (wordText: string, theme: Theme) => {
	return resolveWordColor(wordText, theme.wordColors, theme.accentColor)
}

export const buildSegmentMetas = (prepared: PreparedTextWithSegments) => {
	// pretext works in segments, but most animation logic wants global grapheme offsets.
	// This bridge lets us move back and forth between those two coordinate systems.
	const segmentMetas: SegmentMeta[] = []
	const graphemes: string[] = []
	let graphemeCursor = 0

	for (const segment of prepared.segments) {
		const segmentGraphemes = splitGraphemes(segment)
		segmentMetas.push({
			graphemeStart: graphemeCursor,
			graphemeEnd: graphemeCursor + segmentGraphemes.length,
			graphemeCount: segmentGraphemes.length
		})
		graphemes.push(...segmentGraphemes)
		graphemeCursor += segmentGraphemes.length
	}

	return { segmentMetas, graphemes }
}

export const findWordRanges = (line: Line, graphemes: string[], theme: Theme) => {
	// We have to remap lyric words back onto the grapheme stream after pretext segmentation.
	// If this goes wrong, glow/highlight gets assigned to the wrong text slice.
	const ranges: WordRange[] = []
	let cursor = 0

	for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
		const word = line.words[wordIndex]!
		const target = splitGraphemes(word.text)
		let start = -1

		for (let i = cursor; i <= graphemes.length - target.length; i++) {
			let isMatch = true
			for (let j = 0; j < target.length; j++) {
				if (graphemes[i + j] !== target[j]) {
					isMatch = false
					break
				}
			}
			if (isMatch) {
				start = i
				break
			}
		}

		if (start === -1) {
			start = clamp(cursor, 0, graphemes.length)
		}

		const end = clamp(start + target.length, start, graphemes.length)

		ranges.push({
			wordIndex,
			word,
			start,
			end,
			color: getActiveColor(word.text, theme),
			graphemeTimings: buildWordGraphemeTimings(word)
		})

		cursor = end
	}

	return ranges
}

export const cursorToGlobalOffset = (cursor: LayoutCursor, segmentMetas: SegmentMeta[]) => {
	if (segmentMetas.length === 0) return 0
	const segment = segmentMetas[cursor.segmentIndex]

	if (!segment) {
		return segmentMetas[segmentMetas.length - 1]!.graphemeEnd
	}

	return clamp(segment.graphemeStart + cursor.graphemeIndex, segment.graphemeStart, segment.graphemeEnd)
}

// Upstream targets pretext ^0.0.8 and reads `prepared.breakableFitAdvances`: per-grapheme fit
// advances for overflow-breakable segments, `null` otherwise. The blog pins pretext 0.0.3, where the
// same parallel array is still called `breakableWidths` (identical `(number[] | null)[]` shape and
// meaning). Read whichever the installed runtime provides so partial-segment measurement stays exact
// on both versions instead of silently falling back to the proportional estimate below.
type BreakableAdvancesHost = {
	breakableFitAdvances?: (number[] | null)[]
	breakableWidths?: (number[] | null)[]
}

const getBreakableGraphemeAdvances = (prepared: PreparedTextWithSegments, segmentIndex: number): number[] | null => {
	const host = prepared as unknown as BreakableAdvancesHost
	return host.breakableFitAdvances?.[segmentIndex] ?? host.breakableWidths?.[segmentIndex] ?? null
}

export const getPartialSegmentWidth = (
	prepared: PreparedTextWithSegments,
	segmentIndex: number,
	segmentMeta: SegmentMeta,
	startOffset: number,
	endOffset: number
) => {
	const localStart = clamp(startOffset - segmentMeta.graphemeStart, 0, segmentMeta.graphemeCount)
	const localEnd = clamp(endOffset - segmentMeta.graphemeStart, 0, segmentMeta.graphemeCount)

	if (localEnd <= localStart) return 0
	if (localStart === 0 && localEnd === segmentMeta.graphemeCount) {
		return prepared.widths[segmentIndex] ?? 0
	}

	const breakableFitAdvances = getBreakableGraphemeAdvances(prepared, segmentIndex)
	if (breakableFitAdvances && breakableFitAdvances.length > 0) {
		let width = 0
		for (let i = localStart; i < localEnd; i++) {
			width += breakableFitAdvances[i] ?? 0
		}
		return width
	}

	const fullWidth = prepared.widths[segmentIndex] ?? 0
	if (segmentMeta.graphemeCount === 0) return fullWidth
	return fullWidth * ((localEnd - localStart) / segmentMeta.graphemeCount)
}

export const widthBetweenOffsets = (prepared: PreparedTextWithSegments, segmentMetas: SegmentMeta[], startOffset: number, endOffset: number) => {
	if (endOffset <= startOffset) return 0

	let width = 0

	for (let segmentIndex = 0; segmentIndex < segmentMetas.length; segmentIndex++) {
		const meta = segmentMetas[segmentIndex]!
		if (endOffset <= meta.graphemeStart) break
		if (startOffset >= meta.graphemeEnd) continue

		const sliceStart = Math.max(startOffset, meta.graphemeStart)
		const sliceEnd = Math.min(endOffset, meta.graphemeEnd)
		width += getPartialSegmentWidth(prepared, segmentIndex, meta, sliceStart, sliceEnd)
	}

	return width
}

export const buildLineFragments = (
	prepared: PreparedTextWithSegments,
	segmentMetas: SegmentMeta[],
	graphemes: string[],
	layout: LayoutLinesResult,
	ranges: WordRange[]
): LineFragmentView[] => {
	// Wrapped layout lines can cut straight through a lyric word.
	// So first build fragments per wrapped line, then later decide which fragments are still "the same word".
	const lineViews = layout.lines.map(line => {
		const lineStart = cursorToGlobalOffset(line.start, segmentMetas)
		const lineEnd = cursorToGlobalOffset(line.end, segmentMetas)

		const fragments = ranges.flatMap(range => {
			if (range.end <= lineStart || range.start >= lineEnd) {
				return []
			}

			const fragmentStart = Math.max(range.start, lineStart)
			const fragmentEnd = Math.min(range.end, lineEnd)
			return [
				{
					wordIndex: range.wordIndex,
					lineIndex: 0,
					word: range.word,
					text: graphemes.slice(fragmentStart, fragmentEnd).join(''),
					color: range.color,
					startX: widthBetweenOffsets(prepared, segmentMetas, lineStart, fragmentStart),
					endX: widthBetweenOffsets(prepared, segmentMetas, lineStart, fragmentEnd),
					fragmentStartInWord: fragmentStart - range.start,
					fragmentEndInWord: fragmentEnd - range.start,
					wordGraphemeCount: Math.max(range.end - range.start, 1),
					wordGraphemeTimings: range.graphemeTimings,
					fragmentIndexInWord: 0,
					fragmentCountInWord: 1,
					isPrimaryFragment: true,
					isSplitAcrossLines: false
				}
			]
		})

		return { line, lineStart, lineEnd, fragments }
	})

	const fragmentCountByWord = new Map<number, number>()
	lineViews.forEach(lineView => {
		lineView.fragments.forEach(fragment => {
			fragmentCountByWord.set(fragment.wordIndex, (fragmentCountByWord.get(fragment.wordIndex) ?? 0) + 1)
		})
	})

	const seenFragmentsByWord = new Map<number, number>()

	return lineViews.map((lineView, lineIndex) => ({
		...lineView,
		fragments: lineView.fragments.map(fragment => {
			const fragmentCountInWord = fragmentCountByWord.get(fragment.wordIndex) ?? 1
			const fragmentIndexInWord = seenFragmentsByWord.get(fragment.wordIndex) ?? 0
			seenFragmentsByWord.set(fragment.wordIndex, fragmentIndexInWord + 1)

			return {
				...fragment,
				lineIndex,
				fragmentIndexInWord,
				fragmentCountInWord,
				isPrimaryFragment: fragmentIndexInWord === 0,
				isSplitAcrossLines: fragmentCountInWord > 1
			}
		})
	}))
}
