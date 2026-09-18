import { colorWithAlpha } from '../colorMix'
import type { FumeBlock, RenderSegmentSlice } from './fumeTypes'
import { resolveSegmentGlyphAdvance, resolveSegmentGlyphOffset } from './fumeDrawHelpers'
import { resolveVisualProgressWithCutoff } from './fumeTimeline'
import { clamp, easeInOutCubic, easeOutCubic, isCJK, mix } from './fumeUtils'

// src/app/music/visualizer/fume/fumePrintStamp.ts
// The typewriter "print symbol": a small glowing block that drops onto a glyph just before its
// syllable starts and fades as the color trail takes over. Gated by the hidePrintSymbols tuning.

export interface FumePrintStampOptions {
	context: CanvasRenderingContext2D
	block: FumeBlock
	segment: RenderSegmentSlice
	grapheme: string
	globalOffset: number
	activeColor: string
	baseX: number
	baseY: number
	time: number
	linePassCutoffTime: number
	lineDuration: number
	glyphTrailStart: number
	wordDuration: number
	glyphCount: number
	activeGlowBoost: number
}

export const paintGraphemeActivationStamp = ({
	context,
	block,
	segment,
	grapheme,
	globalOffset,
	activeColor,
	baseX,
	baseY,
	time,
	linePassCutoffTime,
	lineDuration,
	glyphTrailStart,
	wordDuration,
	glyphCount,
	activeGlowBoost
}: FumePrintStampOptions) => {
	const glyphWindowDuration = Math.max(wordDuration / glyphCount, 0.04)
	const activationLeadDuration = clamp(Math.min(glyphWindowDuration * 0.86, lineDuration * 0.16), 0.055, block.variant === 'hero' ? 0.2 : 0.16)
	const activationReleaseDuration = activationLeadDuration * 0.42
	const activationWindowStart = glyphTrailStart - activationLeadDuration
	const activationWindowEnd = glyphTrailStart + activationReleaseDuration
	const glyphAdvance = resolveSegmentGlyphAdvance(segment, globalOffset)
	const stampProgress = resolveVisualProgressWithCutoff(activationWindowStart, activationWindowEnd - activationWindowStart, time, linePassCutoffTime)

	if (stampProgress > 0 && stampProgress < 1) {
		const glyphTrailPhase = resolveVisualProgressWithCutoff(glyphTrailStart, Math.max(activationWindowEnd - glyphTrailStart, 0.001), time, linePassCutoffTime)
		const isDropping = glyphTrailPhase <= 0
		const dropProgress = isDropping
			? easeOutCubic(resolveVisualProgressWithCutoff(activationWindowStart, Math.max(glyphTrailStart - activationWindowStart, 0.001), time, linePassCutoffTime))
			: 1
		const fadeProgress = isDropping ? 0 : easeInOutCubic(glyphTrailPhase)
		const blockPulse = isDropping ? mix(0.18, 1, Math.pow(dropProgress, 0.78)) : Math.pow(1 - fadeProgress, 1.2)
		const glyphVisualWidth = Math.max(glyphAdvance * 0.88, isCJK(grapheme) ? block.fontPx * 0.56 : block.fontPx * 0.38)
		const blockCenterX = baseX + segment.x + resolveSegmentGlyphOffset(segment, globalOffset) + glyphAdvance * 0.5
		const dropDistance = block.lineHeight * (block.variant === 'hero' ? 0.24 : 0.2)
		const activationBlockAlpha = blockPulse * (block.variant === 'hero' ? 0.82 : 0.72)
		const activationBlockWidth = glyphVisualWidth + block.fontPx * (block.variant === 'hero' ? 0.18 : 0.12)
		const activationBlockHeight = block.fontPx * (block.variant === 'hero' ? 0.72 : 0.62)
		const activationBlockY = baseY - block.fontPx * 0.38 - mix(dropDistance, 0, dropProgress)
		const activationBlockBlur = (8 + block.fontPx * 0.24) * blockPulse * activeGlowBoost

		if (activationBlockWidth > 0) {
			const blockLeft = blockCenterX - activationBlockWidth * 0.5
			context.save()
			context.fillStyle = colorWithAlpha(activeColor, activationBlockAlpha)
			context.shadowBlur = activationBlockBlur
			context.shadowColor = colorWithAlpha(activeColor, 0.56 * blockPulse)
			context.fillRect(blockLeft, activationBlockY - activationBlockHeight * 0.5, activationBlockWidth, activationBlockHeight)
			context.restore()
		}
	}
}
