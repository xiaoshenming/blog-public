import type { LayoutCursor, PreparedTextWithSegments } from '@chenglou/pretext'
import type { Line, Theme } from '../types'
import { resolveThemeFontWeight } from '../fontStacks'
import { buildWordGraphemeTimings } from '../lyrics/graphemeTiming'
import type { FumeBlockVariant, PreparedTextWithFitAdvances, RenderLineSlice, RenderSegmentSlice, SegmentMeta, WordRange } from './fumeTypes'
import { clamp, splitGraphemes } from './fumeUtils'

// src/app/music/visualizer/fume/fumeTextMeasure.ts
// Text geometry on top of pretext: mapping layout cursors to global grapheme offsets, measuring
// partial widths between offsets, cutting a laid-out line into render segments, and binding
// each lyric word to the grapheme range it owns.

export const buildFontSpec = (fontPx: number, variant: FumeBlockVariant, fontFamily: string, theme: Pick<Theme, 'fontWeight'>) => {
	const fontWeight = resolveThemeFontWeight(theme, variant === 'hero' ? 780 : 640)
	return `${fontWeight} ${fontPx}px ${fontFamily}`
}

let segmentMeasureCanvas: HTMLCanvasElement | null = null
const segmentMeasureCache = new Map<string, number[]>()

export const measureSegmentGlyphOffsets = (text: string, fontSpec: string) => {
	const cacheKey = `${fontSpec}__${text}`
	const cached = segmentMeasureCache.get(cacheKey)
	if (cached) {
		return cached
	}

	const graphemes = splitGraphemes(text)
	const offsets = new Array<number>(graphemes.length + 1).fill(0)
	if (typeof document === 'undefined') {
		return offsets
	}

	if (!segmentMeasureCanvas) {
		segmentMeasureCanvas = document.createElement('canvas')
	}

	const context = segmentMeasureCanvas.getContext('2d')
	if (!context) {
		return offsets
	}

	context.font = fontSpec
	for (let index = 1; index <= graphemes.length; index += 1) {
		offsets[index] = context.measureText(graphemes.slice(0, index).join('')).width
	}

	segmentMeasureCache.set(cacheKey, offsets)
	return offsets
}

export const buildSegmentMetas = (prepared: PreparedTextWithSegments) => {
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

	return { graphemes, segmentMetas }
}

export const buildWordRangesFromWords = (line: Line, graphemes: string[]) => {
	if (line.words.length === 0 || graphemes.length === 0) {
		return [] as WordRange[]
	}

	const rangedWords = line.words.filter(word => splitGraphemes(word.text).length > 0)
	if (rangedWords.length === 0) {
		return [] as WordRange[]
	}
	const ranges: WordRange[] = []
	let cursor = 0

	for (let wordIndex = 0; wordIndex < rangedWords.length; wordIndex += 1) {
		const word = rangedWords[wordIndex]!
		const wordGraphemes = splitGraphemes(word.text)
		const start = clamp(cursor, 0, graphemes.length)
		let end = clamp(start + wordGraphemes.length, start, graphemes.length)

		// Some lyric payloads omit inter-word spaces from word.text while fullText keeps them.
		// In that case, keep the visual stream contiguous by attaching immediately following
		// whitespace to the current word range instead of shifting every later word left.
		while (end < graphemes.length && /\s/.test(graphemes[end] ?? '')) {
			end += 1
		}

		ranges.push({
			wordIndex,
			word,
			start,
			end,
			colorStart: start,
			colorEnd: end,
			graphemeTimings: buildWordGraphemeTimings(word)
		})
		cursor = end
	}

	return ranges
}

export const buildWordRangeIndexByOffset = (graphemeCount: number, wordRanges: WordRange[], rangeKind: 'timing' | 'color' = 'timing') => {
	const indices = new Array<number>(graphemeCount).fill(-1)
	for (let rangeIndex = 0; rangeIndex < wordRanges.length; rangeIndex += 1) {
		const range = wordRanges[rangeIndex]!
		const start = rangeKind === 'color' ? range.colorStart : range.start
		const end = rangeKind === 'color' ? range.colorEnd : range.end
		for (let offset = start; offset < end && offset < graphemeCount; offset += 1) {
			indices[offset] = rangeIndex
		}
	}
	return indices
}

export const cursorToGlobalOffset = (cursor: LayoutCursor, segmentMetas: SegmentMeta[]) => {
	if (segmentMetas.length === 0) return 0
	const segment = segmentMetas[cursor.segmentIndex]

	if (!segment) {
		return segmentMetas[segmentMetas.length - 1]!.graphemeEnd
	}

	return clamp(segment.graphemeStart + cursor.graphemeIndex, segment.graphemeStart, segment.graphemeEnd)
}

const getPartialSegmentWidth = (
	prepared: PreparedTextWithFitAdvances,
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

	const breakableFitAdvances = prepared.breakableFitAdvances?.[segmentIndex]
	if (breakableFitAdvances && breakableFitAdvances.length > 0) {
		let width = 0
		for (let index = localStart; index < localEnd; index += 1) {
			width += breakableFitAdvances[index] ?? 0
		}
		return width
	}

	const fullWidth = prepared.widths[segmentIndex] ?? 0
	if (segmentMeta.graphemeCount === 0) return fullWidth
	return fullWidth * ((localEnd - localStart) / segmentMeta.graphemeCount)
}

export const widthBetweenOffsets = (prepared: PreparedTextWithFitAdvances, segmentMetas: SegmentMeta[], startOffset: number, endOffset: number) => {
	if (endOffset <= startOffset) return 0

	let width = 0

	for (let segmentIndex = 0; segmentIndex < segmentMetas.length; segmentIndex += 1) {
		const meta = segmentMetas[segmentIndex]!
		if (endOffset <= meta.graphemeStart) break
		if (startOffset >= meta.graphemeEnd) continue

		const sliceStart = Math.max(startOffset, meta.graphemeStart)
		const sliceEnd = Math.min(endOffset, meta.graphemeEnd)
		width += getPartialSegmentWidth(prepared, segmentIndex, meta, sliceStart, sliceEnd)
	}

	return width
}

export const buildGlyphOffsets = (prepared: PreparedTextWithFitAdvances, segmentMetas: SegmentMeta[], startOffset: number, graphemeCount: number) => {
	const offsets = new Array<number>(graphemeCount)
	for (let index = 0; index < graphemeCount; index += 1) {
		offsets[index] = widthBetweenOffsets(prepared, segmentMetas, startOffset, startOffset + index)
	}
	return offsets
}

export const resolveGlyphAdvance = (renderLine: RenderLineSlice, graphemeIndex: number) => {
	const currentOffset = renderLine.glyphOffsets[graphemeIndex] ?? 0
	const nextOffset = graphemeIndex < renderLine.graphemes.length - 1 ? (renderLine.glyphOffsets[graphemeIndex + 1] ?? renderLine.width) : renderLine.width
	return Math.max(nextOffset - currentOffset, 0)
}

export const buildRenderSegments = (
	prepared: PreparedTextWithFitAdvances,
	segmentMetas: SegmentMeta[],
	lineStart: number,
	lineEnd: number,
	fontSpec: string
) => {
	const segments: RenderSegmentSlice[] = []

	for (let segmentIndex = 0; segmentIndex < segmentMetas.length; segmentIndex += 1) {
		const meta = segmentMetas[segmentIndex]!
		if (lineEnd <= meta.graphemeStart) {
			break
		}
		if (lineStart >= meta.graphemeEnd) {
			continue
		}

		const start = Math.max(lineStart, meta.graphemeStart)
		const end = Math.min(lineEnd, meta.graphemeEnd)
		if (end <= start) {
			continue
		}

		const localStart = start - lineStart
		const localEnd = end - lineStart
		const segmentText = prepared.segments[segmentIndex] ?? ''
		const segmentGraphemes = splitGraphemes(segmentText)
		const text =
			start === meta.graphemeStart && end === meta.graphemeEnd
				? segmentText
				: segmentGraphemes.slice(start - meta.graphemeStart, end - meta.graphemeStart).join('')
		const measuredGlyphOffsets = measureSegmentGlyphOffsets(text, fontSpec)

		segments.push({
			text,
			start,
			end,
			localStart,
			localEnd,
			x: widthBetweenOffsets(prepared, segmentMetas, lineStart, start),
			width: widthBetweenOffsets(prepared, segmentMetas, start, end),
			isFullSegment: start === meta.graphemeStart && end === meta.graphemeEnd,
			measuredGlyphOffsets
		})
	}

	return segments
}
