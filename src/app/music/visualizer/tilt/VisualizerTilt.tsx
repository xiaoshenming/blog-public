'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DEFAULT_TILT_TUNING } from '../types'
import { getLineRenderEndTime } from '../lyrics/renderHints'
import type { VisualizerSharedProps } from '../definition'
import { useVisualizerRuntime } from '../runtime'
import VisualizerShell from '../VisualizerShell'
import VisualizerSubtitleOverlay from '../VisualizerSubtitleOverlay'
import { buildTiltLayout, type TiltLayout } from './tiltLayout'
import { findSegmentWordRange } from './tiltCharTimings'
import TiltLine from './TiltLine'

// src/app/music/visualizer/tilt/VisualizerTilt.tsx
// Tilt visualizer: splits lyrics into 1-4 lines with probabilistic layout,
// featuring two typography modes (normal horizontal vs large italic staggered).
// Lines are revealed sequentially in time order; tilt chars have up-down alternating offsets.

type VisualizerTiltProps = VisualizerSharedProps

// Upstream rendered t('ui.waitingForMusic') here; that key is an empty string in both the zh-CN and
// en locales, so the idle state shows no text. Kept empty to match.
const WAITING_FOR_MUSIC_TEXT = ''

const VisualizerTilt: React.FC<VisualizerTiltProps & { staticMode?: boolean }> = props => {
	const {
		currentTime,
		currentLineIndex,
		lines,
		theme,
		subtitleTheme,
		audioPower,
		audioBands,
		showText = true,
		lyricsFontScale = 1,
		subtitleFontScale = 1,
		subtitleOverlayOpacity,
		subtitleOverlayBackground,
		subtitleUpcomingLyricsBlur,
		isPlayerChromeHidden = false,
		hideTranslationSubtitle = false,
		showSubtitleTranslation = true,
		subtitleContentMode,
		tiltTuning = DEFAULT_TILT_TUNING
	} = props
	const [visibleSegmentIndex, setVisibleSegmentIndex] = useState(-1)

	const { activeLine, recentCompletedLine, nextLines } = useVisualizerRuntime({
		currentTime,
		currentLineIndex,
		lines,
		getLineEndTime: getLineRenderEndTime
	})

	const layout = useMemo<TiltLayout | null>(() => {
		if (!activeLine?.fullText) return null
		return buildTiltLayout(activeLine.fullText, activeLine.startTime, tiltTuning, theme, lyricsFontScale)
	}, [activeLine?.fullText, activeLine?.startTime, tiltTuning, theme, lyricsFontScale])

	const segmentTimings = useMemo(() => {
		if (!activeLine || !layout) return null

		return layout.segments.map(seg => {
			const { startWordIndex, endWordIndex } = findSegmentWordRange(seg.charOffset, seg.text, activeLine.fullText, activeLine.words)
			const segWords = activeLine.words.slice(startWordIndex, endWordIndex)

			if (segWords.length > 0) {
				return {
					start: segWords[0].startTime,
					end: segWords[segWords.length - 1].endTime
				}
			}

			return {
				start: activeLine.startTime,
				end: getLineRenderEndTime(activeLine)
			}
		})
	}, [activeLine, layout])

	// 上游用的是 useInsertionEffect，但这个 handler 会调度 setState，React 19 dev 下会报
	// "useInsertionEffect must not schedule updates"。订阅+立即求值的语义在 useEffect 下一致，
	// 对离散的段落切换没有可感知差异。
	useEffect(() => {
		const handler = (latest: number) => {
			if (!segmentTimings || !activeLine) {
				setVisibleSegmentIndex(-1)
				return
			}

			let targetIndex = -1
			for (let i = 0; i < segmentTimings.length; i++) {
				if (latest >= segmentTimings[i].start - 0.25) {
					targetIndex = i
				}
			}

			if (latest < activeLine.startTime - 0.1 || latest > getLineRenderEndTime(activeLine)) {
				targetIndex = -1
			}

			setVisibleSegmentIndex(prev => (prev !== targetIndex ? targetIndex : prev))
		}
		const unsubscribe = currentTime.on('change', handler)
		handler(currentTime.get())
		return unsubscribe
	}, [currentTime, segmentTimings, activeLine])

	const translationFontSize = `clamp(${(1.125 * lyricsFontScale).toFixed(3)}rem, ${(2.6 * lyricsFontScale).toFixed(3)}vw, ${(1.25 * lyricsFontScale).toFixed(3)}rem)`
	const upcomingFontSize = `clamp(${(0.875 * lyricsFontScale).toFixed(3)}rem, ${(2 * lyricsFontScale).toFixed(3)}vw, ${(1 * lyricsFontScale).toFixed(3)}rem)`

	return (
		<VisualizerShell theme={theme} audioPower={audioPower} audioBands={audioBands} sharedProps={props}>
			<div className='pointer-events-none relative z-10 flex h-[70vh] w-full items-center justify-center p-8'>
				<AnimatePresence mode='popLayout'>
					{showText && activeLine && layout ? (
						<motion.div
							key={`tilt-${activeLine.startTime}`}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeInOut' } }}
							className='flex flex-col items-center justify-center gap-y-3 sm:gap-y-4'>
							{layout.segments.map((segment, si) => (
								<TiltLine
									key={`seg-${si}-${segment.text}`}
									segment={segment}
									theme={theme}
									fontScale={lyricsFontScale}
									scaleMultiplier={layout.scaleMultiplier}
									visible={si <= visibleSegmentIndex}
									colorScheme={tiltTuning?.colorScheme}
									currentTime={currentTime}
									segmentStartTime={segmentTimings?.[si]?.start ?? 0}
									segmentEndTime={segmentTimings?.[si]?.end ?? 0}
									activeLine={activeLine}
								/>
							))}
						</motion.div>
					) : showText && !activeLine ? (
						<motion.div
							key='tilt-empty'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className='absolute text-2xl opacity-50'
							style={{ color: theme.secondaryColor }}>
							{WAITING_FOR_MUSIC_TEXT}
						</motion.div>
					) : null}
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

export default VisualizerTilt
