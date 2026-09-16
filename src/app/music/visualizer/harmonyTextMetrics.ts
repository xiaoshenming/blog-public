import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext'

// src/app/music/visualizer/harmonyTextMetrics.ts
// Text measurement the harmony overlay needs for its per-grapheme glow sweep. Upstream these
// lived in monet/monetLyricsModel.ts; Monet is not ported, so the two helpers the shared overlay
// depends on are kept here with the same caching behaviour.

const ROOT_FONT_PX = 16
const VIEWPORT_WIDTH_FALLBACK_PX = 1280
const GRAPHEME_OFFSETS_CACHE_LIMIT = 420

const graphemeOffsetsCache = new Map<string, number[]>()

const graphemeSegmenter =
	typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

/** Mirrors a CSS `clamp(minRem, preferredVw, maxRem)` so canvas/measurement code sees the same px the DOM does. */
export const resolveClampFontPx = (minRem: number, preferredVw: number, maxRem: number): number => {
	const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : VIEWPORT_WIDTH_FALLBACK_PX
	return Math.min(maxRem * ROOT_FONT_PX, Math.max(minRem * ROOT_FONT_PX, viewportWidth * (preferredVw / 100)))
}

export const splitGraphemes = (text: string): string[] => {
	if (!text) {
		return []
	}
	if (graphemeSegmenter) {
		return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment)
	}
	return Array.from(text)
}

const measureTextWidthAtPx = (text: string, fontPx: number, fontSpec: string): number => {
	const prepared = prepareWithSegments(text || ' ', fontSpec)
	const layout = layoutWithLines(prepared, 99999, fontPx * 1.2)
	return layout.lines[0]?.width ?? Math.max(text.length, 1) * fontPx * 0.6
}

const rememberGraphemeOffsets = (key: string, offsets: number[]) => {
	if (graphemeOffsetsCache.size >= GRAPHEME_OFFSETS_CACHE_LIMIT) {
		const oldestKey = graphemeOffsetsCache.keys().next().value
		if (oldestKey) {
			graphemeOffsetsCache.delete(oldestKey)
		}
	}
	graphemeOffsetsCache.set(key, offsets)
	return offsets
}

/** Builds cumulative grapheme offsets so a fill edge can sweep through glyphs instead of stepping whole words. */
export const measureGraphemeOffsets = (text: string, fontPx: number, fontSpec: string): number[] => {
	const cacheKey = `${fontPx}|${fontSpec}|${text}`
	const cached = graphemeOffsetsCache.get(cacheKey)
	if (cached) {
		return cached
	}

	const graphemes = splitGraphemes(text)
	const offsets = new Array<number>(graphemes.length + 1).fill(0)
	for (let index = 1; index <= graphemes.length; index += 1) {
		offsets[index] = measureTextWidthAtPx(graphemes.slice(0, index).join(''), fontPx, fontSpec)
	}
	return rememberGraphemeOffsets(cacheKey, offsets)
}

/** Metrics measured while a web font was still loading came from a fallback face; call this once fonts settle. */
export const clearHarmonyTextMetricsCache = () => {
	graphemeOffsetsCache.clear()
}
