import { getLineRenderEndTime } from '../lyrics/renderHints'
import { colorWithAlpha } from '../colorMix'
import type { FumeArticleLayout, FumeBlockPaintState } from './fumeTypes'
import { buildCanvasFont, createStaticBlockSnapshot } from './fumeDrawHelpers'
import { paintFumeBlockActive } from './fumeGlyphPaint'
import { resolveLinePassCutoffTime, resolvePassedDimAmount, resolvePassedTextStyle, resolvePrintedGraphemeCount } from './fumeTimeline'
import { clamp, isCJK } from './fumeUtils'

// src/app/music/visualizer/fume/fumeBlockPaint.ts
// The frame loop's block walk: viewport culling with overscan, the waiting/passed fast path that
// draws cached whole-block raster snapshots (with the textHoldRatio dim blend), and the hand-off
// to the active painter for blocks currently being revealed.

export const paintFumeBlocks = (state: FumeBlockPaintState, article: FumeArticleLayout) => {
	const { context, theme, lines, time, viewport, screenScale, cameraX, cameraY } = state
	const viewportCenterX = viewport.width * 0.5
	const viewportCenterY = viewport.height * 0.5

	for (const block of article.blocks) {
		const screenLeft = viewportCenterX + (block.x - cameraX) * screenScale
		const screenTop = viewportCenterY + (block.y - cameraY) * screenScale
		const screenRight = screenLeft + block.width * screenScale
		const screenBottom = screenTop + block.height * screenScale
		const overscan = 180

		if (screenRight < -overscan || screenLeft > viewport.width + overscan || screenBottom < -overscan || screenTop > viewport.height + overscan) {
			continue
		}

		const waitingOpacity = block.variant === 'hero' ? 0.06 : 0.035
		const activeOpacity = block.variant === 'hero' ? 0.985 : 0.92
		const effectiveTextHoldStyle = state.textHoldRatio >= 1 ? 'standard' : 'dimmed'
		const passedStyle = resolvePassedTextStyle(block.variant, effectiveTextHoldStyle)
		const passedOpacity = passedStyle.opacity
		const transitionPassedStyle = resolvePassedTextStyle(block.variant, 'standard')
		const baselineOffset = block.lineHeight * (isCJK(block.line.fullText) ? 0.52 : 0.5)
		const lineEndTime = getLineRenderEndTime(block.line)
		const nextLineStartTime = lines[block.sourceLineIndex + 1]?.startTime ?? null
		const linePassCutoffTime = resolveLinePassCutoffTime(block.line, nextLineStartTime)
		const revealCompleteTime = block.line.endTime
		const hasRevealCompleted = time >= revealCompleteTime
		const hasPassCutoffReached = time >= linePassCutoffTime
		const lineDuration = Math.max(lineEndTime - block.line.startTime, 0.18)
		const colorTrailDuration = clamp(lineDuration * (block.variant === 'hero' ? 0.42 : 0.52), 0.45, 1.45)
		const staticState = time < block.line.startTime ? 'waiting' : time >= lineEndTime + colorTrailDuration ? 'passed' : null

		if (staticState) {
			const snapshotScale = clamp(window.devicePixelRatio || 1, 1, 2)
			const cacheStyleKey = staticState === 'passed' ? effectiveTextHoldStyle : 'base'
			const cacheKey = `${block.id}:${staticState}:${cacheStyleKey}:${snapshotScale}`
			let snapshot = state.snapshotCache.get(cacheKey)

			if (!snapshot) {
				snapshot =
					createStaticBlockSnapshot(
						block,
						theme,
						staticState === 'waiting' ? colorWithAlpha(theme.primaryColor, waitingOpacity) : colorWithAlpha(theme.primaryColor, passedOpacity),
						staticState === 'waiting' ? 0 : (2 + block.fontPx * 0.1) * 0.65 * state.passedGlowBase * passedStyle.glowMultiplier,
						staticState === 'waiting' ? 'transparent' : colorWithAlpha(theme.primaryColor, passedStyle.shadowAlphaBase)
					) ?? undefined

				if (snapshot) {
					state.snapshotCache.set(cacheKey, snapshot)
				}
			}

			if (snapshot) {
				if (staticState === 'passed' && effectiveTextHoldStyle === 'dimmed') {
					const passedAt = lineEndTime + colorTrailDuration
					const baseDimAmount = resolvePassedDimAmount(time, passedAt, state.passedFadeDuration)
					const dimAmount = baseDimAmount * (1 - state.overviewTextRestoreProgress)
					const standardStyle = resolvePassedTextStyle(block.variant, 'standard')
					const standardCacheKey = `${block.id}:passed:standard:${snapshotScale}`
					let standardSnapshot = state.snapshotCache.get(standardCacheKey)

					if (!standardSnapshot) {
						standardSnapshot =
							createStaticBlockSnapshot(
								block,
								theme,
								colorWithAlpha(theme.primaryColor, standardStyle.opacity),
								(2 + block.fontPx * 0.1) * 0.65 * state.passedGlowBase * standardStyle.glowMultiplier,
								colorWithAlpha(theme.primaryColor, standardStyle.shadowAlphaBase)
							) ?? undefined

						if (standardSnapshot) {
							state.snapshotCache.set(standardCacheKey, standardSnapshot)
						}
					}

					if (standardSnapshot) {
						if (dimAmount <= 0) {
							context.drawImage(
								standardSnapshot.canvas,
								block.x - standardSnapshot.padding,
								block.y - standardSnapshot.padding,
								block.width + standardSnapshot.padding * 2,
								block.height + standardSnapshot.padding * 2
							)
							continue
						}

						if (dimAmount < 1) {
							const previousAlpha = context.globalAlpha
							context.globalAlpha = previousAlpha * (1 - dimAmount)
							context.drawImage(
								standardSnapshot.canvas,
								block.x - standardSnapshot.padding,
								block.y - standardSnapshot.padding,
								block.width + standardSnapshot.padding * 2,
								block.height + standardSnapshot.padding * 2
							)
							context.globalAlpha = previousAlpha * dimAmount
							context.drawImage(
								snapshot.canvas,
								block.x - snapshot.padding,
								block.y - snapshot.padding,
								block.width + snapshot.padding * 2,
								block.height + snapshot.padding * 2
							)
							context.globalAlpha = previousAlpha
							continue
						}
					}
				}

				context.drawImage(
					snapshot.canvas,
					block.x - snapshot.padding,
					block.y - snapshot.padding,
					block.width + snapshot.padding * 2,
					block.height + snapshot.padding * 2
				)
				continue
			}
		}

		const printedCount = resolvePrintedGraphemeCount(block.line, block.wordRanges, block.graphemes.length, time)
		const totalGraphemeCount = block.graphemes.length

		context.save()
		context.font = buildCanvasFont(block, theme)
		context.textAlign = 'left'
		context.textBaseline = 'middle'

		paintFumeBlockActive(state, block, {
			waitingOpacity,
			activeOpacity,
			transitionPassedStyle,
			baselineOffset,
			linePassCutoffTime,
			lineDuration,
			colorTrailDuration,
			hasRevealCompleted,
			hasPassCutoffReached,
			printedCount,
			totalGraphemeCount
		})

		context.restore()
	}
}
