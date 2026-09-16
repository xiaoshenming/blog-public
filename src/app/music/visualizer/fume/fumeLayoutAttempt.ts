import type { FumeTuning, Line } from '../types'
import { resolveThemeFontStack } from '../fontStacks'
import { getLineRenderEndTime } from '../lyrics/renderHints'
import type { FumeArticleLayout, FumeArticleLayoutMetrics, FumeBlock, FumeLayoutAttemptOptions, FumeLayoutTheme, ViewportSize } from './fumeTypes'
import { buildPreparedSingleLine, chooseBlockVariant, chooseFallbackHeroBlockIndex } from './fumeBlockVariant'
import {
	buildFontSpec,
	buildGlyphOffsets,
	buildRenderSegments,
	buildSegmentMetas,
	buildWordRangeIndexByOffset,
	buildWordRangesFromWords,
	cursorToGlobalOffset
} from './fumeTextMeasure'
import { nowMs, seeded, splitGraphemes } from './fumeUtils'

// src/app/music/visualizer/fume/fumeLayoutAttempt.ts
// One placement pass over the lyric: shuffles the lines deterministically, drops each one into the
// masonry columns as a body or hero block, and (in render mode) builds every per-grapheme structure
// the frame loop needs. Measure mode stops at the geometry so the search driver can score it cheaply.

export function buildArticleLayoutAttempt(
	lines: Line[],
	viewport: ViewportSize,
	layoutTheme: FumeLayoutTheme,
	lyricsFontScale: number,
	fumeTuning: FumeTuning,
	options: FumeLayoutAttemptOptions & { mode: 'measure' }
): FumeArticleLayoutMetrics | null
export function buildArticleLayoutAttempt(
	lines: Line[],
	viewport: ViewportSize,
	layoutTheme: FumeLayoutTheme,
	lyricsFontScale: number,
	fumeTuning: FumeTuning,
	options: FumeLayoutAttemptOptions & { mode?: 'render' }
): FumeArticleLayout | null
export function buildArticleLayoutAttempt(
	lines: Line[],
	viewport: ViewportSize,
	layoutTheme: FumeLayoutTheme,
	lyricsFontScale: number,
	fumeTuning: FumeTuning,
	options: FumeLayoutAttemptOptions
): FumeArticleLayout | FumeArticleLayoutMetrics | null {
	if (viewport.width <= 0 || viewport.height <= 0 || lines.length === 0) {
		return null
	}

	const { paperWidth, viewportHeight, columns, gap, densityScale, seedKey, mode = 'render', timing } = options
	const shouldBuildRenderDetails = mode === 'render'
	const horizontalMargin = Math.max(viewport.width * 0.86, 280)
	const verticalMargin = Math.max(viewport.height * 0.82, 220)
	const columnWidth = (paperWidth - gap * (columns - 1)) / columns
	const fontFamily = resolveThemeFontStack(layoutTheme)
	// Empty lines do not help the article layout.
	// Also shuffle placement order deterministically so the paper feels composed rather than strictly chronological.
	const filteredLines = lines
		.map((line, index) => ({ line, index }))
		.filter(entry => entry.line.fullText.trim().length > 0)
		.sort((left, right) => {
			const leftSeed = seeded(`${seedKey}:${left.index}:${left.line.fullText}`)
			const rightSeed = seeded(`${seedKey}:${right.index}:${right.line.fullText}`)
			return leftSeed - rightSeed
		})

	const blocks: FumeBlock[] = []
	const columnHeights = Array.from({ length: columns }, () => verticalMargin)
	let bodyColumnTieCursor = 0
	let heroPlacementTieCursor = 0
	const forcedHeroIndex = chooseFallbackHeroBlockIndex(filteredLines)

	filteredLines.forEach(({ line, index }, blockIndex) => {
		timing && (timing.lines += 1)
		const variant = chooseBlockVariant(line, blockIndex, filteredLines.length, forcedHeroIndex)
		// Hero blocks are allowed to claim more visual territory.
		// Body blocks should stay narrow so the article still reads like columns.
		const heroSpanColumns = variant === 'hero' ? Math.min(columns, columns <= 1 ? 1 : 2) : 1
		const heroSpanWidth = heroSpanColumns > 1 ? columnWidth * heroSpanColumns + gap * (heroSpanColumns - 1) : paperWidth
		const blockWidth = variant === 'hero' ? (heroSpanColumns === 1 ? paperWidth : columns === 2 ? columnWidth * 1.5 + gap * 0.5 : heroSpanWidth) : columnWidth
		const paddingX = 0
		const paddingY = 0
		const innerWidth = Math.max(blockWidth - paddingX * 2, 120)
		const prepareLayoutStart = timing ? nowMs() : 0
		const preparedSingleLine = buildPreparedSingleLine(
			line.fullText,
			fontFamily,
			innerWidth,
			variant,
			lyricsFontScale,
			densityScale,
			fumeTuning.heroScale,
			layoutTheme
		)
		if (timing) {
			timing.prepareLayoutMs += nowMs() - prepareLayoutStart
		}
		const fontPx = preparedSingleLine.fontPx
		const lineHeight = Math.round(fontPx * (variant === 'hero' ? 1.02 : 1.06))
		const layout = preparedSingleLine.layout
		const blockGap = variant === 'hero' ? Math.max(Math.round(lineHeight * 0.2), 6) : Math.max(Math.round(lineHeight * 0.08), 2)
		const blockHeight = paddingY * 2 + layout.lines.length * lineHeight
		let x = 0
		let y = 0
		const placementStart = timing ? nowMs() : 0

		if (variant === 'hero') {
			// Hero placement tries to find the calmest large slot across multiple columns.
			if (heroSpanColumns === 1) {
				y = Math.max(...columnHeights)
				x = horizontalMargin
				columnHeights[0] = y + blockHeight + blockGap
			} else {
				let bestHeight = Number.POSITIVE_INFINITY
				let candidateStarts: number[] = []

				for (let startColumn = 0; startColumn <= columns - heroSpanColumns; startColumn += 1) {
					let coveredHeight = 0
					for (let columnIndex = startColumn; columnIndex < startColumn + heroSpanColumns; columnIndex += 1) {
						coveredHeight = Math.max(coveredHeight, columnHeights[columnIndex] ?? 0)
					}

					if (coveredHeight < bestHeight) {
						bestHeight = coveredHeight
						candidateStarts = [startColumn]
					} else if (coveredHeight === bestHeight) {
						candidateStarts.push(startColumn)
					}
				}

				const targetStart = candidateStarts.length > 0 ? candidateStarts[heroPlacementTieCursor % candidateStarts.length]! : 0
				heroPlacementTieCursor += 1
				y = bestHeight
				x = horizontalMargin + targetStart * (columnWidth + gap) + Math.max((heroSpanWidth - blockWidth) * 0.5, 0)

				for (let columnIndex = targetStart; columnIndex < targetStart + heroSpanColumns; columnIndex += 1) {
					columnHeights[columnIndex] = y + blockHeight + blockGap
				}
			}
		} else {
			// Body placement is simpler: drop into the currently shortest column.
			let targetColumn = 0
			let minHeight = columnHeights[0] ?? 0
			const candidateColumns = [0]

			for (let columnIndex = 1; columnIndex < columns; columnIndex += 1) {
				const height = columnHeights[columnIndex] ?? 0

				if (height < minHeight) {
					minHeight = height
					candidateColumns.length = 0
					candidateColumns.push(columnIndex)
				} else if (height === minHeight) {
					candidateColumns.push(columnIndex)
				}
			}

			targetColumn = candidateColumns[bodyColumnTieCursor % candidateColumns.length] ?? 0
			bodyColumnTieCursor += 1
			x = horizontalMargin + targetColumn * (columnWidth + gap)
			y = columnHeights[targetColumn]!
			columnHeights[targetColumn] = y + blockHeight + blockGap
		}
		if (timing) {
			timing.placementMs += nowMs() - placementStart
		}

		if (shouldBuildRenderDetails) {
			// Measure-only passes stop before this point.
			// Render passes continue and build every structure needed for glyph printing and per-line focus.
			const renderDetailsStart = timing ? nowMs() : 0
			const prepared = preparedSingleLine.prepared
			const fontSpec = buildFontSpec(fontPx, variant, fontFamily, layoutTheme)
			const { graphemes, segmentMetas } = buildSegmentMetas(prepared)
			const wordRanges = buildWordRangesFromWords(line, graphemes)
			const wordRangeIndexByOffset = buildWordRangeIndexByOffset(graphemes.length, wordRanges)
			const colorRangeIndexByOffset = buildWordRangeIndexByOffset(graphemes.length, wordRanges, 'color')
			const renderLines = layout.lines.map((layoutLine, lineIndex) => {
				const start = cursorToGlobalOffset(layoutLine.start, segmentMetas)
				const end = cursorToGlobalOffset(layoutLine.end, segmentMetas)
				const lineGraphemes = splitGraphemes(layoutLine.text)

				return {
					id: `${line.startTime}-${lineIndex}`,
					text: layoutLine.text,
					start,
					end,
					graphemes: lineGraphemes,
					glyphOffsets: buildGlyphOffsets(prepared, segmentMetas, start, lineGraphemes.length),
					segments: buildRenderSegments(prepared, segmentMetas, start, end, fontSpec),
					left: variant === 'hero' ? Math.max((blockWidth - layoutLine.width) * 0.08, 0) : 0,
					top: paddingY + lineIndex * lineHeight,
					width: layoutLine.width
				}
			})

			blocks.push({
				id: `fume-${line.startTime}-${index}`,
				sourceLineIndex: index,
				line,
				variant,
				x,
				y,
				width: blockWidth,
				height: blockHeight,
				innerWidth,
				fontPx,
				lineHeight,
				prepared,
				layout,
				graphemes,
				segmentMetas,
				wordRanges,
				wordRangeIndexByOffset,
				colorRangeIndexByOffset,
				renderLines
			})
			if (timing) {
				timing.renderDetailsMs += nowMs() - renderDetailsStart
			}
		}
	})

	const articleHeight = Math.max(0, ...columnHeights) + verticalMargin

	const metrics = {
		width: paperWidth + horizontalMargin * 2,
		height: articleHeight,
		viewportHeight,
		columns,
		gap,
		paperBounds: {
			left: horizontalMargin,
			top: verticalMargin,
			right: horizontalMargin + paperWidth,
			bottom: Math.max(articleHeight - verticalMargin, verticalMargin)
		}
	}

	if (!shouldBuildRenderDetails) {
		return metrics
	}

	const chronologicalBlocks = [...blocks].sort((left, right) => left.sourceLineIndex - right.sourceLineIndex)
	const blockBySourceLineIndex = new Map<number, FumeBlock>()
	for (const block of chronologicalBlocks) {
		blockBySourceLineIndex.set(block.sourceLineIndex, block)
	}
	const firstRenderableStartTime = chronologicalBlocks[0]?.line.startTime ?? Number.POSITIVE_INFINITY
	const lastChronologicalRenderEndTime =
		chronologicalBlocks.length > 0 ? getLineRenderEndTime(chronologicalBlocks[chronologicalBlocks.length - 1]!.line) : Number.NEGATIVE_INFINITY

	return {
		...metrics,
		blocks,
		blockBySourceLineIndex,
		chronologicalBlocks,
		firstRenderableStartTime,
		lastChronologicalRenderEndTime
	}
}
