import { colorWithAlpha, mixColors } from '../colorMix'
import type { FumeBlock, FumeBlockActivePaintContext, FumeBlockPaintState } from './fumeTypes'
import { buildTextStyleKey, drawRenderTextRun } from './fumeDrawHelpers'
import { paintGraphemeActivationStamp } from './fumePrintStamp'
import { getActiveColor, resolveVisualProgressWithCutoff } from './fumeTimeline'
import { clamp, easeOutCubic, mix, resolveDelayedGlowEnvelope } from './fumeUtils'

// src/app/music/visualizer/fume/fumeGlyphPaint.ts
// Active (mid-reveal) painting of one block: the line-wide accent glow envelope, then the
// per-grapheme state machine that turns word/syllable timings into fill+shadow material,
// batched into clipped text runs whenever consecutive glyphs share a style.

export const paintFumeBlockActive = (state: FumeBlockPaintState, block: FumeBlock, active: FumeBlockActivePaintContext) => {
	const { context, theme } = state
	const time = state.time
	const isLineActive = time >= block.line.startTime && time <= active.linePassCutoffTime

	if (isLineActive) {
		const lineProgress = resolveVisualProgressWithCutoff(block.line.startTime, active.lineDuration, time, active.linePassCutoffTime)
		const lineGlowEnvelope = resolveDelayedGlowEnvelope(lineProgress, 0.8)
		const lineGlowAlpha = ((block.variant === 'hero' ? 0.16 : 0.12) + lineGlowEnvelope * (block.variant === 'hero' ? 0.26 : 0.2)) * state.glowIntensity
		const lineGlowBlur =
			((block.variant === 'hero' ? 12 : 8) + lineGlowEnvelope * (block.fontPx * (block.variant === 'hero' ? 0.7 : 0.52))) * state.glowIntensity
		const lineGlowColor = colorWithAlpha(theme.accentColor, lineGlowAlpha)

		context.save()
		context.fillStyle = lineGlowColor
		context.shadowBlur = lineGlowBlur
		context.shadowColor = colorWithAlpha(theme.accentColor, lineGlowAlpha * 1.35)

		for (const renderLine of block.renderLines) {
			const glowBaseX = block.x + renderLine.left
			const glowBaseY = block.y + renderLine.top + active.baselineOffset

			for (const segment of renderLine.segments) {
				if (segment.text.trim().length === 0) {
					continue
				}

				context.fillText(segment.text, glowBaseX + segment.x, glowBaseY)
			}
		}

		context.restore()
	}

	for (const renderLine of block.renderLines) {
		const baseX = block.x + renderLine.left
		const baseY = block.y + renderLine.top + active.baselineOffset

		for (const segment of renderLine.segments) {
			let runStart = -1
			let runFillStyle = ''
			let runShadowBlur = 0
			let runShadowColor = 'transparent'
			let runStyleKey = ''

			const flushRun = (segmentEnd: number) => {
				if (runStart < 0 || !runStyleKey || segmentEnd <= runStart) {
					return
				}

				const localStart = runStart - renderLine.start
				const localEnd = segmentEnd - renderLine.start
				const runText = renderLine.graphemes.slice(localStart, localEnd).join('')
				if (!runText || (runText.trim().length === 0 && runFillStyle === '')) {
					runStart = -1
					runStyleKey = ''
					return
				}

				context.fillStyle = runFillStyle
				context.shadowBlur = runShadowBlur
				context.shadowColor = runShadowColor
				drawRenderTextRun(context, renderLine, segment, localStart, localEnd, baseX, baseY)
				context.shadowBlur = 0
				context.shadowColor = 'transparent'
				runStart = -1
				runStyleKey = ''
			}

			for (let globalOffset = segment.start; globalOffset < segment.end; globalOffset += 1) {
				const graphemeIndex = globalOffset - renderLine.start
				const grapheme = renderLine.graphemes[graphemeIndex]!
				const rangeIndex = block.wordRangeIndexByOffset[globalOffset] ?? -1
				const range = rangeIndex >= 0 ? block.wordRanges[rangeIndex]! : null
				const colorRangeIndex = block.colorRangeIndexByOffset[globalOffset] ?? -1
				const colorRange = colorRangeIndex >= 0 ? block.wordRanges[colorRangeIndex]! : range
				const isPrinted = active.hasRevealCompleted || globalOffset < active.printedCount
				const isFrontier =
					active.printedCount > 0 &&
					globalOffset === active.printedCount &&
					active.printedCount < active.totalGraphemeCount &&
					!active.hasRevealCompleted &&
					!active.hasPassCutoffReached

				let alpha = isPrinted ? active.activeOpacity : isFrontier ? 0.82 : active.waitingOpacity
				let shadowBlur = 0
				let shadowColor = 'transparent'
				let fillStyle = colorWithAlpha(theme.primaryColor, alpha)

				if (range) {
					const wordDuration = Math.max(range.word.endTime - range.word.startTime, 0.08)
					const wordProgress = clamp((time - range.word.startTime) / wordDuration, 0, 1)
					const glyphCount = Math.max(range.end - range.start, 1)
					const glyphIndexInRange = globalOffset - range.start
					const glyphTiming = range.word.syllables?.length
						? range.graphemeTimings[Math.min(glyphIndexInRange, Math.max(range.graphemeTimings.length - 1, 0))]
						: undefined
					const glyphStartTime = glyphTiming?.startTime ?? range.word.startTime + (glyphIndexInRange / glyphCount) * wordDuration
					const glyphEndTime = glyphTiming?.endTime ?? range.word.startTime + ((glyphIndexInRange + 1) / glyphCount) * wordDuration
					const glyphDuration = Math.max(glyphEndTime - glyphStartTime, 0.001)
					const glyphProgress = glyphTiming
						? clamp((time - glyphStartTime) / glyphDuration + 0.16, 0, 1)
						: clamp(wordProgress * glyphCount - glyphIndexInRange + 0.16, 0, 1)
					const easedGlyphProgress = easeOutCubic(glyphProgress)
					const activeColor = getActiveColor((colorRange ?? range).word.text, theme)
					const glyphTrailStart = glyphStartTime + glyphDuration * 0.18
					const colorTrailPhase = resolveVisualProgressWithCutoff(glyphTrailStart, active.colorTrailDuration, time, active.linePassCutoffTime)
					const colorTrailProgress = Math.pow(colorTrailPhase, 1.35)

					if (active.hasPassCutoffReached) {
						alpha = mix(active.activeOpacity, active.transitionPassedStyle.opacity, colorTrailProgress)
						fillStyle = mixColors(activeColor, theme.primaryColor, 0.18 + colorTrailProgress * 0.82, alpha)
						shadowBlur = (2 + block.fontPx * 0.1) * (1 - colorTrailProgress * 0.35) * state.passedGlowBase * active.transitionPassedStyle.glowMultiplier
						shadowColor = colorWithAlpha(
							mixColors(activeColor, theme.primaryColor, 0.55 + colorTrailProgress * 0.45),
							active.transitionPassedStyle.shadowAlphaBase + (1 - colorTrailProgress) * active.transitionPassedStyle.shadowAlphaTrail
						)
					} else if (time < range.word.startTime) {
						alpha = active.waitingOpacity
						fillStyle = colorWithAlpha(theme.primaryColor, alpha)
					} else if (time <= glyphTrailStart) {
						alpha = mix(active.waitingOpacity, active.activeOpacity, easedGlyphProgress)
						fillStyle = mixColors(theme.primaryColor, activeColor, 0.22 + easedGlyphProgress * 0.78, alpha)
						shadowBlur = (4 + block.fontPx * 0.22) * easedGlyphProgress * state.activeGlowBoost
						shadowColor = colorWithAlpha(activeColor, 0.4 + easedGlyphProgress * 0.44)
					} else {
						alpha = mix(active.activeOpacity, active.transitionPassedStyle.opacity, colorTrailProgress)
						fillStyle = mixColors(activeColor, theme.primaryColor, 0.18 + colorTrailProgress * 0.82, alpha)
						shadowBlur = (2 + block.fontPx * 0.1) * (1 - colorTrailProgress * 0.35) * state.passedGlowBase * active.transitionPassedStyle.glowMultiplier
						shadowColor = colorWithAlpha(
							mixColors(activeColor, theme.primaryColor, 0.55 + colorTrailProgress * 0.45),
							active.transitionPassedStyle.shadowAlphaBase + (1 - colorTrailProgress) * active.transitionPassedStyle.shadowAlphaTrail
						)
					}

					if (state.showPrintStamp && grapheme.trim().length > 0) {
						paintGraphemeActivationStamp({
							context,
							block,
							segment,
							grapheme,
							globalOffset,
							activeColor,
							baseX,
							baseY,
							time,
							linePassCutoffTime: active.linePassCutoffTime,
							lineDuration: active.lineDuration,
							glyphTrailStart,
							wordDuration,
							glyphCount,
							activeGlowBoost: state.activeGlowBoost
						})
					}
				}

				if (alpha <= 0.002) {
					flushRun(globalOffset)
					continue
				}

				const styleKey = buildTextStyleKey(fillStyle, shadowBlur, shadowColor)
				if (runStart < 0) {
					runStart = globalOffset
					runFillStyle = fillStyle
					runShadowBlur = shadowBlur
					runShadowColor = shadowColor
					runStyleKey = styleKey
					continue
				}

				if (styleKey !== runStyleKey) {
					flushRun(globalOffset)
					runStart = globalOffset
					runFillStyle = fillStyle
					runShadowBlur = shadowBlur
					runShadowColor = shadowColor
					runStyleKey = styleKey
				}
			}

			flushRun(segment.end)
		}
	}
}
