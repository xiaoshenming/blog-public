import { layoutWithLines, prepareWithSegments, type PreparedTextWithSegments, type PrepareOptions } from '@chenglou/pretext'
import type { Line, Theme } from '../types'
import type { FumeBlockVariant } from './fumeTypes'
import { buildFontSpec } from './fumeTextMeasure'
import { clamp, countRenderableGraphemes, seeded } from './fumeUtils'

// src/app/music/visualizer/fume/fumeBlockVariant.ts
// Decides how each lyric line sits on the paper: whether it becomes a hero or body block, which
// font size it gets, and the binary search that keeps most blocks on a single line.

export const FUME_PRETEXT_OPTIONS = { whiteSpace: 'pre-wrap' } satisfies PrepareOptions

export const chooseNaturalBlockVariant = (line: Line, index: number, total: number) => {
	const graphemeCount = countRenderableGraphemes(line.fullText)
	if (graphemeCount === 0) {
		return 'body' as const
	}

	if (line.isChorus && graphemeCount <= 22) {
		return 'hero' as const
	}

	const shortEnough = graphemeCount >= 4 && graphemeCount <= 28
	const centered = Math.abs(index - total / 2) / Math.max(total, 1)
	const random = seeded(`${line.fullText}:${index}`)
	return shortEnough && centered < 0.72 && ((index + 1) % 6 === 0 || random > 0.965) ? 'hero' : 'body'
}

export const chooseFallbackHeroBlockIndex = (entries: Array<{ line: Line; index: number }>) => {
	if (entries.length === 0) {
		return -1
	}

	const hasNaturalHero = entries.some(({ line }, blockIndex) => chooseNaturalBlockVariant(line, blockIndex, entries.length) === 'hero')
	if (hasNaturalHero) {
		return -1
	}

	let bestIndex = -1
	let bestScore = Number.NEGATIVE_INFINITY

	entries.forEach(({ line }, blockIndex) => {
		const graphemeCount = countRenderableGraphemes(line.fullText)
		if (graphemeCount === 0) {
			return
		}

		const isComfortableHeroLength = graphemeCount >= 4 && graphemeCount <= 28
		const isAcceptableFallbackLength = graphemeCount <= 36
		if (!isComfortableHeroLength && !isAcceptableFallbackLength) {
			return
		}

		const centered = Math.abs(blockIndex - entries.length / 2) / Math.max(entries.length, 1)
		const centerScore = 1 - centered
		const lengthScore = graphemeCount >= 6 && graphemeCount <= 22 ? 1 : graphemeCount <= 28 ? 0.72 : 0.36
		const chorusScore = line.isChorus ? 0.28 : 0
		const stableJitter = seeded(`${line.fullText}:${blockIndex}:fallback-hero`) * 0.04
		const score = centerScore * 0.62 + lengthScore * 0.34 + chorusScore + stableJitter

		if (score > bestScore) {
			bestScore = score
			bestIndex = blockIndex
		}
	})

	if (bestIndex >= 0) {
		return bestIndex
	}

	let shortestIndex = -1
	let shortestCount = Number.POSITIVE_INFINITY
	entries.forEach(({ line }, blockIndex) => {
		const graphemeCount = countRenderableGraphemes(line.fullText)
		if (graphemeCount > 0 && graphemeCount < shortestCount) {
			shortestCount = graphemeCount
			shortestIndex = blockIndex
		}
	})

	return shortestIndex
}

export const chooseBlockVariant = (line: Line, index: number, total: number, forcedHeroIndex: number): FumeBlockVariant =>
	index === forcedHeroIndex ? 'hero' : chooseNaturalBlockVariant(line, index, total)

export const chooseFontPx = (line: Line, variant: FumeBlockVariant, width: number, lyricsFontScale: number, densityScale: number) => {
	const graphemeCount = Math.max(countRenderableGraphemes(line.fullText), 1)
	const density = graphemeCount + line.words.length * 1.4
	const base = variant === 'hero' ? width / Math.max(Math.sqrt(density) * 1.5, 4.5) : width / Math.max(Math.sqrt(density) * 2.25, 7)

	const scaled = base * lyricsFontScale * densityScale
	return variant === 'hero' ? clamp(scaled, 24, 54) : clamp(scaled, 14, 28)
}

export const buildPreparedSingleLine = (
	text: string,
	fontFamily: string,
	width: number,
	variant: FumeBlockVariant,
	lyricsFontScale: number,
	densityScale: number,
	heroScale: number,
	theme: Pick<Theme, 'fontWeight'>
) => {
	let low = variant === 'hero' ? 18 : 10
	let high = variant === 'hero' ? 58 : 30
	let best: {
		fontPx: number
		prepared: PreparedTextWithSegments
		layout: ReturnType<typeof layoutWithLines>
	} | null = null

	// Fume really wants most blocks to stay single-line when possible.
	// So do a tiny binary search for a font size that still fits before falling back.
	for (let iteration = 0; iteration < 8; iteration += 1) {
		const candidateFontPx = ((low + high) / 2) * lyricsFontScale * densityScale * (variant === 'hero' ? heroScale : 1)
		const fontSpec = buildFontSpec(candidateFontPx, variant, fontFamily, theme)
		const prepared = prepareWithSegments(text, fontSpec, FUME_PRETEXT_OPTIONS)
		const layout = layoutWithLines(prepared, width, Math.round(candidateFontPx * (variant === 'hero' ? 1.02 : 1.06)))

		if (layout.lineCount <= 1) {
			best = {
				fontPx: candidateFontPx,
				prepared,
				layout
			}
			low = (low + high) / 2
		} else {
			high = (low + high) / 2
		}
	}

	if (best) {
		return best
	}

	const fallbackFontPx = (variant === 'hero' ? 18 : 10) * lyricsFontScale * densityScale * (variant === 'hero' ? heroScale : 1)
	const fontSpec = buildFontSpec(fallbackFontPx, variant, fontFamily, theme)
	const prepared = prepareWithSegments(text, fontSpec, FUME_PRETEXT_OPTIONS)
	return {
		fontPx: fallbackFontPx,
		prepared,
		layout: layoutWithLines(prepared, width, Math.round(fallbackFontPx * (variant === 'hero' ? 1.02 : 1.06)))
	}
}
