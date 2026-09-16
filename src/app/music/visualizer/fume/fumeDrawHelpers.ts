import type { Theme } from '../types'
import { resolveThemeFontStack } from '../fontStacks'
import type { FumeBlock, RenderLineSlice, RenderSegmentSlice, StaticBlockSnapshot, ViewportSize } from './fumeTypes'
import { buildFontSpec } from './fumeTextMeasure'
import { clamp, isCJK } from './fumeUtils'

// src/app/music/visualizer/fume/fumeDrawHelpers.ts
// Low-level canvas drawing utilities of the Fume block painter: the resolved canvas font, the
// style key used to batch graphemes into runs, per-segment glyph metrics, the clipped text-run
// draw, and the rasterized whole-block snapshot used for waiting/passed lines.

// Upstream sized/cleared the canvas with the same block before the loop starts and inside every
// frame; both sites share this helper. The DPR transform is (re)applied unconditionally because
// resizing a canvas resets its context transform.
export const syncFumeCanvasSize = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, viewport: ViewportSize) => {
	const width = Math.max(Math.floor(viewport.width), 1)
	const height = Math.max(Math.floor(viewport.height), 1)
	const dpr = window.devicePixelRatio || 1

	if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
		canvas.width = Math.floor(width * dpr)
		canvas.height = Math.floor(height * dpr)
		canvas.style.width = `${width}px`
		canvas.style.height = `${height}px`
	}

	context.setTransform(dpr, 0, 0, dpr, 0, 0)
	context.clearRect(0, 0, width, height)
}

export const buildCanvasFont = (block: FumeBlock, theme: Theme) => {
	const fontFamily = resolveThemeFontStack(theme)
	return buildFontSpec(block.fontPx, block.variant, fontFamily, theme)
}

export const buildTextStyleKey = (fillStyle: string, shadowBlur: number, shadowColor: string) => `${fillStyle}|${shadowColor}|${shadowBlur.toFixed(3)}`

export const resolveRenderLineOffset = (renderLine: RenderLineSlice, localOffset: number) => {
	if (localOffset <= 0) {
		return 0
	}
	if (localOffset >= renderLine.graphemes.length) {
		return renderLine.width
	}
	return renderLine.glyphOffsets[localOffset] ?? renderLine.width
}

export const resolveSegmentGlyphOffset = (segment: RenderSegmentSlice, globalOffset: number) => {
	const localOffset = clamp(globalOffset - segment.start, 0, segment.measuredGlyphOffsets.length - 1)
	return segment.measuredGlyphOffsets[localOffset] ?? 0
}

export const resolveSegmentGlyphAdvance = (segment: RenderSegmentSlice, globalOffset: number) => {
	const localOffset = clamp(globalOffset - segment.start, 0, segment.measuredGlyphOffsets.length - 2)
	const current = segment.measuredGlyphOffsets[localOffset] ?? 0
	const next = segment.measuredGlyphOffsets[localOffset + 1] ?? current
	return Math.max(next - current, 0)
}

export const drawRenderTextRun = (
	context: CanvasRenderingContext2D,
	renderLine: RenderLineSlice,
	segment: RenderSegmentSlice,
	runStart: number,
	runEnd: number,
	baseX: number,
	baseY: number
) => {
	if (!segment.text || runEnd <= runStart) {
		return
	}

	const segmentRunStart = Math.max(runStart - segment.localStart, 0)
	const segmentRunEnd = Math.min(runEnd - segment.localStart, segment.measuredGlyphOffsets.length - 1)
	const clipLeft = segment.measuredGlyphOffsets[segmentRunStart] ?? resolveRenderLineOffset(renderLine, runStart) - segment.x
	const clipRight = segment.measuredGlyphOffsets[segmentRunEnd] ?? resolveRenderLineOffset(renderLine, runEnd) - segment.x
	const clipWidth = Math.max(clipRight - clipLeft, 0)
	if (clipWidth <= 0) {
		return
	}

	context.save()
	context.beginPath()
	context.rect(baseX + segment.x + clipLeft, baseY - Math.max(clipWidth, 1) - 64, clipWidth, Math.max(128 + clipWidth * 2, 256))
	context.clip()
	context.fillText(segment.text, baseX + segment.x, baseY)
	context.restore()
}

export const createStaticBlockSnapshot = (block: FumeBlock, theme: Theme, fillStyle: string, shadowBlur = 0, shadowColor = 'transparent') => {
	if (typeof document === 'undefined') {
		return null
	}

	const rasterScale = clamp(window.devicePixelRatio || 1, 1, 2)
	const padding = Math.ceil(Math.max(block.fontPx * 0.32, shadowBlur + block.fontPx * 0.08, 4))
	const canvas = document.createElement('canvas')
	canvas.width = Math.max(1, Math.ceil((block.width + padding * 2) * rasterScale))
	canvas.height = Math.max(1, Math.ceil((block.height + padding * 2) * rasterScale))

	const context = canvas.getContext('2d')
	if (!context) {
		return null
	}

	const baselineOffset = block.lineHeight * (isCJK(block.line.fullText) ? 0.52 : 0.5)
	context.setTransform(rasterScale, 0, 0, rasterScale, 0, 0)
	context.font = buildCanvasFont(block, theme)
	context.textAlign = 'left'
	context.textBaseline = 'middle'
	context.fillStyle = fillStyle
	context.shadowBlur = shadowBlur
	context.shadowColor = shadowColor

	for (const renderLine of block.renderLines) {
		context.fillText(renderLine.text, renderLine.left + padding, renderLine.top + baselineOffset + padding)
	}

	context.shadowBlur = 0
	context.shadowColor = 'transparent'
	return { canvas, padding }
}
