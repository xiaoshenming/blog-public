'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { type VisualizerSharedProps } from '../definition'
import { getLineRenderEndTime } from '../lyrics/renderHints'
import { prepareActiveAndUpcoming, useVisualizerRuntime } from '../runtime'
import { DEFAULT_CADENZA_TUNING, type Line } from '../types'
import VisualizerShell from '../VisualizerShell'
import VisualizerSubtitleOverlay from '../VisualizerSubtitleOverlay'
import { buildPreparedState } from './layoutMeasure'
import { startCadenzaFrameLoop } from './renderFrame'
import type { AnimatedPlacementState, OverlayWordNodes, PreparedState, PreparedStateCacheContext } from './types'

// src/app/music/visualizer/cadenza/Visualizer.tsx
// Cadenza (Mindscape) renderer shell: owns the viewport observer, the prepared-line cache and its
// invalidation key, and wires the frame driver to the overlay/canvas layers. The layout pipeline
// lives in layoutMeasure/wordPlacement, the timeline math in wordTiming, the per-frame work in renderFrame.
type VisualizerProps = VisualizerSharedProps

// Upstream rendered `t('ui.waitingForMusic')` here; every upstream locale defines that key as an
// empty string, so the idle state is an invisible placeholder. Kept identical.
const WAITING_FOR_MUSIC_TEXT = ''

const VisualizerCadenza: React.FC<VisualizerProps> = props => {
	const {
		currentTime,
		currentLineIndex,
		lines,
		theme,
		subtitleTheme,
		audioPower,
		audioBands,
		showText = true,
		cadenzaTuning = DEFAULT_CADENZA_TUNING,
		lyricsFontScale = 1,
		subtitleFontScale = 1,
		subtitleOverlayOpacity,
		subtitleOverlayBackground,
		subtitleUpcomingLyricsBlur,
		isPlayerChromeHidden = false,
		hideTranslationSubtitle = false,
		showSubtitleTranslation = true,
		subtitleContentMode
	} = props
	const [viewport, setViewport] = useState({ width: 0, height: 0 })
	const containerRef = useRef<HTMLDivElement>(null)
	const lineLayerRef = useRef<HTMLDivElement>(null)
	const overlayRef = useRef<HTMLDivElement>(null)
	const overlayNodesRef = useRef<Map<string, OverlayWordNodes>>(new Map())
	const textCanvasRef = useRef<HTMLCanvasElement>(null)
	const animatedPlacementRef = useRef<Map<string, AnimatedPlacementState>>(new Map())
	const preparedStateCacheRef = useRef<Map<string, PreparedState>>(new Map())
	const preparedStateCacheContextKeyRef = useRef<string>('')
	const lastFrameTimeRef = useRef<number | null>(null)

	const { activeLine, recentCompletedLine, upcomingLine, nextLines } = useVisualizerRuntime({
		currentTime,
		currentLineIndex,
		lines,
		getLineEndTime: getLineRenderEndTime
	})
	const tuning = cadenzaTuning
	const emptyFontSize = `clamp(${(1.5 * lyricsFontScale).toFixed(3)}rem, ${(3.5 * lyricsFontScale).toFixed(3)}vw, ${(2.25 * lyricsFontScale).toFixed(3)}rem)`
	const translationFontSize = `clamp(${(1.125 * lyricsFontScale).toFixed(3)}rem, ${(2.6 * lyricsFontScale).toFixed(3)}vw, ${(1.25 * lyricsFontScale).toFixed(3)}rem)`
	const upcomingFontSize = `clamp(${(0.875 * lyricsFontScale).toFixed(3)}rem, ${(2 * lyricsFontScale).toFixed(3)}vw, ${(1 * lyricsFontScale).toFixed(3)}rem)`

	const preparedStateContext = useMemo<PreparedStateCacheContext>(
		() => ({
			showText,
			viewport,
			theme,
			tuning: {
				fontScale: tuning.fontScale,
				widthRatio: tuning.widthRatio
			}
		}),
		[showText, theme, tuning.fontScale, tuning.widthRatio, viewport]
	)

	const preparedStateContextKey = useMemo(() => {
		const wordColorSignature = (theme.wordColors ?? [])
			.map(entry => `${typeof entry?.word === 'string' ? entry.word : ''}:${typeof entry?.color === 'string' ? entry.color : ''}`)
			.join('||')

		// Prepared line state caches per-word highlight colors derived from the active theme.
		// Include accentColor so daylight/default resets invalidate already-seen lyric lines immediately.
		// Font family/style/weight feed the measured font string, viewport feeds font size and wrap
		// width, and the tuning pair feeds both, so all of them must be part of the key.
		return [
			showText ? '1' : '0',
			viewport.width,
			viewport.height,
			theme.fontStyle,
			theme.fontFamily ?? '',
			theme.fontFamilyStack?.join(',') ?? '',
			theme.fontWeight ?? 'auto',
			theme.animationIntensity,
			theme.accentColor,
			tuning.fontScale,
			tuning.widthRatio,
			wordColorSignature
		].join('|')
	}, [
		theme.accentColor,
		showText,
		theme.animationIntensity,
		theme.fontFamily,
		theme.fontFamilyStack,
		theme.fontWeight,
		theme.fontStyle,
		theme.wordColors,
		tuning.fontScale,
		tuning.widthRatio,
		viewport.height,
		viewport.width
	])

	if (preparedStateCacheContextKeyRef.current !== preparedStateContextKey) {
		preparedStateCacheRef.current.clear()
		preparedStateCacheContextKeyRef.current = preparedStateContextKey
	}

	// Per-line key: the lyric content itself. Everything environmental lives in the context key above.
	const getPreparedStateCacheKey = (line: Line) => [line.startTime, line.endTime, line.fullText, line.words.length].join('|')

	useEffect(() => {
		const element = containerRef.current
		if (!element) return

		const observer = new ResizeObserver(entries => {
			const entry = entries[0]
			if (!entry) return
			setViewport({
				width: entry.contentRect.width,
				height: entry.contentRect.height
			})
		})

		observer.observe(element)
		return () => observer.disconnect()
	}, [])

	const preparedState = useMemo<PreparedState | null>(() => {
		const getOrPrepareState = (line: Line | null | undefined) => {
			if (!line) {
				return null
			}

			const cacheKey = getPreparedStateCacheKey(line)
			const cached = preparedStateCacheRef.current.get(cacheKey)
			if (cached) {
				return cached
			}

			const nextState = buildPreparedState(line, preparedStateContext)
			if (nextState) {
				preparedStateCacheRef.current.set(cacheKey, nextState)
			}
			return nextState
		}

		if (!showText || viewport.width <= 0 || viewport.height <= 0) {
			getOrPrepareState(upcomingLine)
			return null
		}

		return prepareActiveAndUpcoming({
			activeLine,
			upcomingLine,
			prepareLine: getOrPrepareState
		})
	}, [activeLine, preparedStateContext, upcomingLine, showText, viewport.height, viewport.width])

	useEffect(() => {
		const textCanvas = textCanvasRef.current
		const lineLayer = lineLayerRef.current
		const overlay = overlayRef.current
		if (!textCanvas || !lineLayer || !overlay || viewport.width <= 0 || viewport.height <= 0) return

		return startCadenzaFrameLoop({
			textCanvas,
			lineLayer,
			overlay,
			viewport,
			showText,
			preparedState,
			activeLine,
			currentTime,
			audioPower,
			theme,
			tuning,
			animatedPlacementRef,
			overlayNodesRef,
			lastFrameTimeRef
		})
	}, [audioPower, currentTime, activeLine, preparedState, showText, theme, tuning.glowIntensity, tuning.motionAmount, viewport.height, viewport.width])

	return (
		<VisualizerShell ref={containerRef} theme={theme} audioPower={audioPower} audioBands={audioBands} sharedProps={props}>
			<div
				ref={lineLayerRef}
				className='pointer-events-none absolute inset-0 z-10'
				style={{
					opacity: 0,
					filter: 'none',
					transform: 'scale(1)',
					transformOrigin: '50% 42%',
					perspective: '1000px'
				}}>
				<div ref={overlayRef} className='pointer-events-none absolute inset-0 h-full w-full select-none' />
				<canvas ref={textCanvasRef} className='absolute inset-0 h-full w-full' />
			</div>

			<div className='pointer-events-none relative z-10 flex h-[70vh] w-full items-center justify-center p-8'>
				<AnimatePresence mode='wait'>
					{showText && !activeLine && (
						<motion.div
							key='empty'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className='absolute text-2xl opacity-50'
							style={{
								color: theme.secondaryColor,
								fontSize: emptyFontSize
							}}>
							{WAITING_FOR_MUSIC_TEXT}
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<VisualizerSubtitleOverlay
				showText={showText}
				activeLine={activeLine}
				recentCompletedLine={recentCompletedLine}
				nextLines={nextLines}
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

export default VisualizerCadenza
