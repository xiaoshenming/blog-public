'use client'

import React, { useMemo, useRef } from 'react'
import { motion } from 'motion/react'
import { Hourglass } from 'lucide-react'
import { buildFumeBackgroundScene } from '../FumeBackground'
import { getRecentCompletedLine, getUpcomingLines } from '../runtime'
import VisualizerShell from '../VisualizerShell'
import VisualizerSubtitleOverlay from '../VisualizerSubtitleOverlay'
import { colorWithAlpha } from '../colorMix'
import type { VisualizerSharedProps } from '../definition'
import { getLineRenderEndTime } from '../lyrics/renderHints'
import { DEFAULT_FUME_TUNING, type FumeTuning } from '../types'
import { resolveArticleOverviewCamera } from './fumeCamera'
import { resolveFumePassedFadeDuration } from './fumeTimeline'
import type { FumeLayoutTheme, VisualizerProps } from './fumeTypes'
import { clamp } from './fumeUtils'
import { useFumeArticle } from './useFumeArticle'
import { useFumeFrame } from './useFumeFrame'
import { useFumeViewport } from './useFumeViewport'

// src/app/music/visualizer/fume/VisualizerFume.tsx
// "Turn the whole lyric into an article, then move a camera through it." This component wires the
// pipeline together: it derives the tuning/layout inputs, builds the article layout, hands the
// canvas + camera + painting to useFumeFrame, and renders the shell, the layout-pending card and
// the shared subtitle overlay around it.
const VisualizerFume: React.FC<VisualizerProps> = props => {
	const {
		currentTime,
		currentLineIndex,
		lines,
		theme,
		subtitleTheme,
		audioPower,
		audioBands,
		showText = true,
		seed,
		staticMode = false,
		lyricsFontScale = 1,
		subtitleFontScale = 1,
		fumeTuning,
		subtitleOverlayOpacity,
		subtitleOverlayBackground,
		subtitleUpcomingLyricsBlur,
		isPlayerChromeHidden = false,
		hideTranslationSubtitle = false,
		showSubtitleTranslation = true,
		subtitleContentMode,
		paused = false
	} = props
	const viewportRef = useRef<HTMLDivElement | null>(null)
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const viewport = useFumeViewport(viewportRef)

	const runtime = useMemo(() => {
		const activeLine = lines[currentLineIndex] ?? null
		const timeNow = currentTime.get()
		return {
			activeLine,
			recentCompletedLine: getRecentCompletedLine({
				lines,
				currentLineIndex,
				currentTime: timeNow,
				getLineEndTime: getLineRenderEndTime
			}),
			nextLines: getUpcomingLines(lines, currentLineIndex, 2)
		}
	}, [currentLineIndex, lines])
	const resolvedFumeTuning = useMemo<FumeTuning>(
		() => ({
			hidePrintSymbols: fumeTuning?.hidePrintSymbols ?? DEFAULT_FUME_TUNING.hidePrintSymbols,
			disableGeometricBackground: fumeTuning?.disableGeometricBackground ?? DEFAULT_FUME_TUNING.disableGeometricBackground,
			backgroundObjectOpacity: clamp(fumeTuning?.backgroundObjectOpacity ?? DEFAULT_FUME_TUNING.backgroundObjectOpacity, 0, 1),
			textHoldRatio: clamp(fumeTuning?.textHoldRatio ?? DEFAULT_FUME_TUNING.textHoldRatio, 0, 1),
			cameraTrackingMode:
				fumeTuning?.cameraTrackingMode === 'stepped' || fumeTuning?.cameraTrackingMode === 'smooth'
					? fumeTuning.cameraTrackingMode
					: DEFAULT_FUME_TUNING.cameraTrackingMode,
			cameraSpeed: clamp(fumeTuning?.cameraSpeed ?? DEFAULT_FUME_TUNING.cameraSpeed, 0.55, 1.85),
			glowIntensity: clamp(fumeTuning?.glowIntensity ?? DEFAULT_FUME_TUNING.glowIntensity, 0, 1.8),
			heroScale: clamp(fumeTuning?.heroScale ?? DEFAULT_FUME_TUNING.heroScale, 0.82, 1.32)
		}),
		[fumeTuning]
	)
	const layoutTheme = useMemo<FumeLayoutTheme>(
		() => ({
			name: theme.name,
			fontStyle: theme.fontStyle,
			fontFamily: theme.fontFamily,
			fontFamilyStack: theme.fontFamilyStack,
			fontWeight: theme.fontWeight
		}),
		[theme.fontFamily, theme.fontFamilyStack, theme.fontStyle, theme.fontWeight, theme.name]
	)
	const layoutFumeTuning = useMemo<FumeTuning>(
		() => ({
			...DEFAULT_FUME_TUNING,
			heroScale: resolvedFumeTuning.heroScale
		}),
		[resolvedFumeTuning.heroScale]
	)
	const { article, isLayoutPending } = useFumeArticle({ lines, viewport, layoutTheme, layoutFumeTuning, lyricsFontScale })
	const lastRenderableLine = useMemo(() => {
		for (let index = lines.length - 1; index >= 0; index -= 1) {
			const line = lines[index]
			if (line?.fullText.trim().length) {
				return line
			}
		}
		return null
	}, [lines])
	const overviewStartTime = useMemo(() => {
		if (!lastRenderableLine) {
			return Number.POSITIVE_INFINITY
		}

		const lineStartTime = lastRenderableLine.startTime
		const lineRenderEndTime = getLineRenderEndTime(lastRenderableLine)
		return lineStartTime + Math.max(lineRenderEndTime - lineStartTime, 0) * 0.5
	}, [lastRenderableLine])
	const backgroundScene = useMemo(
		() =>
			buildFumeBackgroundScene({
				viewport,
				world: {
					width: article?.width ?? Math.max(viewport.width * 1.8, viewport.width),
					height: article?.height ?? Math.max(viewport.height * 1.8, viewport.height)
				},
				paperBounds: article?.paperBounds,
				seed: `${seed ?? 'fume'}:${theme.name}`
			}),
		[article?.height, article?.paperBounds, article?.width, seed, theme.name, viewport]
	)
	const overviewCamera = useMemo(() => (article ? resolveArticleOverviewCamera(article, viewport) : null), [article, viewport])
	const cameraSpeed = resolvedFumeTuning.cameraSpeed
	const glowIntensity = resolvedFumeTuning.glowIntensity
	const backgroundObjectOpacity = resolvedFumeTuning.backgroundObjectOpacity
	const showPrintStamp = !resolvedFumeTuning.hidePrintSymbols
	const textHoldRatio = resolvedFumeTuning.textHoldRatio
	const passedFadeDuration = useMemo(() => resolveFumePassedFadeDuration(lines, textHoldRatio), [lines, textHoldRatio])
	const translationFontSize = `clamp(${(1.05 * lyricsFontScale).toFixed(3)}rem, ${(2.2 * lyricsFontScale).toFixed(3)}vw, ${(1.2 * lyricsFontScale).toFixed(3)}rem)`
	const upcomingFontSize = `clamp(${(0.875 * lyricsFontScale).toFixed(3)}rem, ${(1.8 * lyricsFontScale).toFixed(3)}vw, ${(1 * lyricsFontScale).toFixed(3)}rem)`
	const hasPrintedContent = useFumeFrame({
		canvasRef,
		currentTime,
		currentLineIndex,
		lines,
		theme,
		viewport,
		article,
		backgroundScene,
		overviewCamera,
		overviewStartTime,
		audioPower,
		audioBands,
		cameraTrackingMode: resolvedFumeTuning.cameraTrackingMode,
		cameraSpeed,
		glowIntensity,
		backgroundObjectOpacity,
		showPrintStamp,
		textHoldRatio,
		passedFadeDuration,
		showText,
		staticMode,
		paused
	})

	return (
		<VisualizerShell
			theme={theme}
			audioPower={audioPower}
			audioBands={audioBands}
			sharedProps={{
				...props,
				background: {
					...props.background,
					common: {
						...props.background?.common,
						disableGeometricBackground: Boolean(props.background?.common?.disableGeometricBackground) || resolvedFumeTuning.disableGeometricBackground
					}
				}
			}}>
			<div ref={viewportRef} className='pointer-events-none relative z-10 h-full w-full'>
				{(article || lines.length === 0) && (
					<motion.div
						initial={false}
						animate={{
							opacity: 1,
							scale: article && showText ? (hasPrintedContent ? 1 : 0.985) : 1
						}}
						transition={{ duration: 0.45, ease: 'easeOut' }}
						className='absolute top-0 left-1/2 -translate-x-1/2'
						style={{
							width: viewport.width,
							height: viewport.height
						}}>
						<canvas ref={canvasRef} className='absolute inset-0 h-full w-full' />
					</motion.div>
				)}

				{isLayoutPending && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='absolute inset-0 flex items-center justify-center'>
						<div
							className='flex min-w-40 flex-col items-center gap-4 rounded-3xl border px-6 py-5'
							style={{
								backgroundColor: theme.backgroundColor,
								borderColor: colorWithAlpha(theme.secondaryColor, 0.24),
								boxShadow: `0 18px 60px ${colorWithAlpha(theme.backgroundColor, 0.52)}`
							}}>
							<Hourglass size={24} className='animate-pulse' style={{ color: colorWithAlpha(theme.primaryColor, 0.78) }} />
							<div className='flex w-28 flex-col gap-2.5'>
								<div className='h-2 animate-pulse rounded-full' style={{ backgroundColor: colorWithAlpha(theme.primaryColor, 0.32) }} />
								<div className='h-2 w-[78%] animate-pulse rounded-full' style={{ backgroundColor: colorWithAlpha(theme.primaryColor, 0.22) }} />
								<div className='h-2 w-[56%] animate-pulse rounded-full' style={{ backgroundColor: colorWithAlpha(theme.secondaryColor, 0.2) }} />
							</div>
						</div>
					</motion.div>
				)}
			</div>

			<VisualizerSubtitleOverlay
				showText={showText}
				activeLine={runtime.activeLine}
				recentCompletedLine={runtime.recentCompletedLine}
				nextLines={runtime.nextLines}
				theme={theme}
				subtitleTheme={subtitleTheme}
				translationFontSize={translationFontSize}
				upcomingFontSize={upcomingFontSize}
				subtitleOverlayOpacity={subtitleOverlayOpacity}
				subtitleOverlayBackground={subtitleOverlayBackground}
				subtitleUpcomingLyricsBlur={subtitleUpcomingLyricsBlur}
				subtitleFontScale={subtitleFontScale}
				isPlayerChromeHidden={isPlayerChromeHidden}
				hideTranslationSubtitle={hideTranslationSubtitle}
				showSubtitleTranslation={showSubtitleTranslation}
				subtitleContentMode={subtitleContentMode}
			/>
		</VisualizerShell>
	)
}

export default VisualizerFume
