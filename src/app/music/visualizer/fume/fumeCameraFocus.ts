import type { FumeBlock } from './fumeTypes'
import { resolveGlyphAdvance, widthBetweenOffsets } from './fumeTextMeasure'
import { clamp, easeInOutCubic, mix } from './fumeUtils'

// src/app/music/visualizer/fume/fumeCameraFocus.ts
// Where inside a block the camera should look: the print head position in stepped (whole
// graphemes) or smooth (fractional, cross-line blended) tracking, plus the block's entry point
// that the camera leans toward right after a retarget.

export const resolveSteppedBlockFocusPoint = (block: FumeBlock, printedCount: number) => {
	if (block.renderLines.length === 0) {
		return {
			x: block.x + block.width * 0.5,
			y: block.y + block.height * 0.5
		}
	}

	const effectiveOffset = clamp(printedCount, 0, block.graphemes.length)
	const targetLine = block.renderLines.find(renderLine => effectiveOffset <= renderLine.end) ?? block.renderLines[block.renderLines.length - 1]!
	const localOffset = clamp(effectiveOffset, targetLine.start, targetLine.end)
	const progressWidth = widthBetweenOffsets(block.prepared, block.segmentMetas, targetLine.start, localOffset)
	const minX = block.x + targetLine.left
	const maxX = minX + targetLine.width

	return {
		x: clamp(minX + progressWidth, minX, maxX),
		y: block.y + targetLine.top + block.lineHeight * 0.5
	}
}

export const resolveSmoothBlockFocusPoint = (block: FumeBlock, printedProgress: number) => {
	if (block.renderLines.length === 0) {
		return {
			x: block.x + block.width * 0.5,
			y: block.y + block.height * 0.5
		}
	}

	const effectiveOffset = clamp(printedProgress, 0, block.graphemes.length)
	const findRenderLineIndex = (offset: number) => {
		const exactIndex = block.renderLines.findIndex(renderLine => offset <= renderLine.end)
		return exactIndex >= 0 ? exactIndex : block.renderLines.length - 1
	}

	const resolvePointOnRenderLine = (lineIndex: number, offset: number) => {
		const targetLine = block.renderLines[lineIndex] ?? block.renderLines[block.renderLines.length - 1]!
		const clampedOffset = clamp(offset, targetLine.start, targetLine.end)
		const baseOffset = Math.floor(clampedOffset)
		const fractionalOffset = clampedOffset - baseOffset
		const baseWidth = widthBetweenOffsets(block.prepared, block.segmentMetas, targetLine.start, baseOffset)
		const localGlyphIndex = baseOffset - targetLine.start
		const glyphAdvance = localGlyphIndex >= 0 && localGlyphIndex < targetLine.graphemes.length ? resolveGlyphAdvance(targetLine, localGlyphIndex) : 0
		const minX = block.x + targetLine.left
		const maxX = minX + targetLine.width

		return {
			x: clamp(minX + baseWidth + glyphAdvance * fractionalOffset, minX, maxX),
			y: block.y + targetLine.top + block.lineHeight * 0.5
		}
	}

	const targetLineIndex = findRenderLineIndex(effectiveOffset)
	let point = resolvePointOnRenderLine(targetLineIndex, effectiveOffset)
	const currentLine = block.renderLines[targetLineIndex]!
	const crossLineBlendWindow = 0.7

	if (targetLineIndex > 0 && effectiveOffset < currentLine.start + crossLineBlendWindow) {
		const previousLine = block.renderLines[targetLineIndex - 1]!
		const blend = easeInOutCubic(clamp(1 - (effectiveOffset - previousLine.end) / crossLineBlendWindow, 0, 1))
		const previousPoint = resolvePointOnRenderLine(targetLineIndex - 1, previousLine.end)
		point = {
			x: mix(point.x, previousPoint.x, blend),
			y: mix(point.y, previousPoint.y, blend)
		}
	} else if (targetLineIndex < block.renderLines.length - 1 && effectiveOffset > currentLine.end - crossLineBlendWindow) {
		const nextLine = block.renderLines[targetLineIndex + 1]!
		const blend = easeInOutCubic(clamp((effectiveOffset - (currentLine.end - crossLineBlendWindow)) / crossLineBlendWindow, 0, 1))
		const nextPoint = resolvePointOnRenderLine(targetLineIndex + 1, nextLine.start)
		point = {
			x: mix(point.x, nextPoint.x, blend),
			y: mix(point.y, nextPoint.y, blend)
		}
	}

	return point
}

export const resolveBlockEntryFocusPoint = (block: FumeBlock) => {
	const firstRenderLine = block.renderLines[0]
	if (!firstRenderLine) {
		return {
			x: block.x + block.width * 0.5,
			y: block.y + block.height * 0.5
		}
	}

	return {
		x: block.x + firstRenderLine.left,
		y: block.y + firstRenderLine.top + block.lineHeight * 0.5
	}
}
