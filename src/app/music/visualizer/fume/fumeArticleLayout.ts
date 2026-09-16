import type { FumeTuning, Line } from '../types'
import type { FumeArticleLayout, FumeLayoutAttemptOptions, FumeLayoutAttemptTiming, FumeLayoutTheme, ViewportSize } from './fumeTypes'
import { buildArticleLayoutAttempt } from './fumeLayoutAttempt'
import { clamp, hashString, nowMs, roundMs } from './fumeUtils'

// src/app/music/visualizer/fume/fumeArticleLayout.ts
// Article-level layout driver and its cache: searches column counts and density scales for the
// composition closest to the target paper height, then runs one render pass with the winner.
// The module-level cache lets a remount (or a same-geometry rebuild) reuse the previous article.

export const LAYOUT_REBUILD_DEBOUNCE_MS = 96

export interface FumeLayoutCacheEntry {
	key: string
	article: FumeArticleLayout | null
}

// Upstream kept this as a mutable module binding; ES modules cannot assign an import, so the same
// single-slot cache is reached through a read/write pair.
let lastFumeLayoutCache: FumeLayoutCacheEntry | null = null

export const readLastFumeLayoutCache = () => lastFumeLayoutCache

export const writeLastFumeLayoutCache = (next: FumeLayoutCacheEntry | null) => {
	lastFumeLayoutCache = next
}

const createFumeLayoutTiming = (): FumeLayoutAttemptTiming => ({
	lines: 0,
	prepareLayoutMs: 0,
	placementMs: 0,
	renderDetailsMs: 0
})

export const buildLayoutCacheKey = (lines: Line[], viewport: ViewportSize, layoutTheme: FumeLayoutTheme, lyricsFontScale: number, fumeTuning: FumeTuning) => {
	// Layout cache key intentionally ignores short-lived playback state.
	// Only geometry-affecting inputs should invalidate the whole article layout.
	let linesHash = 2166136261
	for (const line of lines) {
		const lineKey = `${line.startTime}:${line.endTime}:${line.fullText}:${line.words.length}:${line.isChorus ? 1 : 0}`
		linesHash ^= hashString(lineKey)
		linesHash = Math.imul(linesHash, 16777619)
	}

	return [
		Math.round(viewport.width),
		Math.round(viewport.height),
		layoutTheme.fontStyle,
		layoutTheme.fontFamily ?? '',
		layoutTheme.fontFamilyStack?.join(',') ?? '',
		layoutTheme.fontWeight ?? 'auto',
		layoutTheme.name,
		lyricsFontScale.toFixed(4),
		fumeTuning.heroScale.toFixed(4),
		lines.length,
		linesHash >>> 0
	].join('|')
}

export const buildArticleLayout = (
	lines: Line[],
	viewport: ViewportSize,
	layoutTheme: FumeLayoutTheme,
	lyricsFontScale: number,
	fumeTuning: FumeTuning
): FumeArticleLayout | null => {
	if (viewport.width <= 0 || viewport.height <= 0 || lines.length === 0) {
		return null
	}

	const paperWidth = clamp(Math.max(viewport.width * 1.95, viewport.width + 520), 920, 2400)
	const viewportHeight = Math.max(viewport.height, 240)
	const maxColumns = paperWidth >= 1120 ? 4 : paperWidth >= 760 ? 3 : paperWidth >= 500 ? 2 : 1
	const targetHeight = viewportHeight * 2.45
	const layoutSeedKey = layoutTheme.name

	let bestOptions: (FumeLayoutAttemptOptions & { mode: 'render' }) | null = null
	let bestScore = Number.POSITIVE_INFINITY
	let bestHeight = 0
	const totalStart = nowMs()
	const measureTiming = createFumeLayoutTiming()
	const renderTiming = createFumeLayoutTiming()
	const measureColumnTimings = new Map<number, FumeLayoutAttemptTiming>()
	let measureAttemptCount = 0

	// Try a few column counts and density scales, then keep the article that lands closest to the target height.
	// This is why the mode feels "composed" instead of hardcoding one layout recipe for every song.
	for (let columns = maxColumns; columns >= 1; columns -= 1) {
		let low = 0.82
		let high = 1.42
		const gap = clamp(Math.round(paperWidth * (columns >= 4 ? 0.0065 : columns === 3 ? 0.0085 : 0.0115)), 6, 14)
		const columnTiming = createFumeLayoutTiming()
		measureColumnTimings.set(columns, columnTiming)

		for (let iteration = 0; iteration < 8; iteration += 1) {
			const densityScale = (low + high) / 2
			measureAttemptCount += 1
			const attemptOptions: FumeLayoutAttemptOptions & { mode: 'measure' } = {
				paperWidth,
				viewportHeight,
				columns,
				gap,
				densityScale,
				seedKey: `${layoutSeedKey}:${columns}:${paperWidth}`,
				mode: 'measure',
				timing: columnTiming
			}
			const layout = buildArticleLayoutAttempt(lines, viewport, layoutTheme, lyricsFontScale, fumeTuning, attemptOptions)

			if (!layout) {
				continue
			}

			const coveragePenalty = Math.abs(layout.height - targetHeight)
			const overflowPenalty = layout.height < targetHeight ? 0 : (layout.height - targetHeight) * 0.14
			const score = coveragePenalty + overflowPenalty

			if (score < bestScore) {
				bestScore = score
				bestHeight = layout.height
				bestOptions = {
					paperWidth,
					viewportHeight,
					columns,
					gap,
					densityScale,
					seedKey: `${layoutSeedKey}:${columns}:${paperWidth}`,
					mode: 'render',
					timing: renderTiming
				}
			}

			if (layout.height < targetHeight) {
				low = densityScale
			} else {
				high = densityScale
			}
		}

		measureTiming.lines += columnTiming.lines
		measureTiming.prepareLayoutMs += columnTiming.prepareLayoutMs
		measureTiming.placementMs += columnTiming.placementMs
		measureTiming.renderDetailsMs += columnTiming.renderDetailsMs
	}

	const renderStart = nowMs()
	const article = bestOptions ? buildArticleLayoutAttempt(lines, viewport, layoutTheme, lyricsFontScale, fumeTuning, bestOptions) : null
	const renderMs = nowMs() - renderStart
	const totalMs = nowMs() - totalStart

	// Upstream gated this on Vite's import.meta.env.DEV; Next.js exposes the same switch as NODE_ENV.
	if (process.env.NODE_ENV === 'development') {
		console.info('[VisualizerFume] layout timing', {
			totalMs: roundMs(totalMs),
			measureMs: roundMs(measureTiming.prepareLayoutMs + measureTiming.placementMs),
			renderMs: roundMs(renderMs),
			attempts: measureAttemptCount,
			measuredLines: measureTiming.lines,
			renderedLines: renderTiming.lines,
			inputLines: lines.length,
			blocks: article?.blocks.length ?? 0,
			heroBlocks: article?.blocks.filter(block => block.variant === 'hero').length ?? 0,
			viewport: `${Math.round(viewport.width)}x${Math.round(viewport.height)}`,
			paperWidth: Math.round(paperWidth),
			targetHeight: Math.round(targetHeight),
			bestHeight: Math.round(bestHeight),
			finalHeight: Math.round(article?.height ?? 0),
			heightDelta: Math.round((article?.height ?? 0) - targetHeight),
			bestColumns: bestOptions?.columns ?? null,
			bestDensityScale: bestOptions ? Number(bestOptions.densityScale.toFixed(4)) : null,
			measureBreakdown: {
				prepareLayoutMs: roundMs(measureTiming.prepareLayoutMs),
				placementMs: roundMs(measureTiming.placementMs),
				renderDetailsMs: roundMs(measureTiming.renderDetailsMs)
			},
			renderBreakdown: {
				prepareLayoutMs: roundMs(renderTiming.prepareLayoutMs),
				placementMs: roundMs(renderTiming.placementMs),
				renderDetailsMs: roundMs(renderTiming.renderDetailsMs)
			},
			measureByColumns: Array.from(measureColumnTimings.entries()).map(([columns, timing]) => ({
				columns,
				lines: timing.lines,
				prepareLayoutMs: roundMs(timing.prepareLayoutMs),
				placementMs: roundMs(timing.placementMs)
			}))
		})
	}

	return article
}
