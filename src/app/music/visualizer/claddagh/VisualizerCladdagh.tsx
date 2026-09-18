'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useSpring } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { DEFAULT_CLADDAGH_TUNING } from '../types'
import { buildLineGraphemeTimeline } from '../lyrics/graphemeTiming'
import { resolveThemeFontStack, resolveThemeFontWeight } from '../fontStacks'
import type { VisualizerSharedProps } from '../definition'
import { useVisualizerRuntime } from '../runtime'
import VisualizerShell from '../VisualizerShell'
import VisualizerSubtitleOverlay from '../VisualizerSubtitleOverlay'
import { adjustCladdaghTimeline } from './claddaghTiming'
import { buildMeasuredSpacingInfo } from './claddaghSpacing'
import { useCladdaghAxisLine } from './useCladdaghAxisLine'
import RingLine from './RingLine'

// src/app/music/visualizer/claddagh/VisualizerCladdagh.tsx
// Claddagh: lyric lines wrap around a slender tilted ellipse, one half-turn per line. The
// active grapheme sits at the front; the ring rotates by grapheme timing and springs a
// half-turn on every line change while neighbouring lines recede into the back half.

interface DebugWindow {
	visualizerDimensions?: { width: number; height: number }
	visualizerRx?: number
	visualizerRy?: number
}

/** 回环模式样式（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 根容器：铺满、纵向居中、隐藏溢出、禁选中 */
	root: {
		position: 'relative',
		display: 'flex',
		height: '100%',
		width: '100%',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		userSelect: 'none'
	},
	/** 背景层：底层、不响应指针 */
	backdrop: {
		position: 'absolute',
		inset: 0,
		zIndex: 1,
		overflow: 'hidden',
		pointerEvents: 'none'
	}
})

const VisualizerCladdagh: React.FC<VisualizerSharedProps> = props => {
	const {
		currentTime,
		currentLineIndex,
		lines,
		theme,
		subtitleTheme,
		showText = true,
		lyricsFontScale = 1.0,
		subtitleFontScale = 1,
		subtitleOverlayOpacity,
		subtitleOverlayBackground,
		subtitleUpcomingLyricsBlur,
		hideTranslationSubtitle,
		showSubtitleTranslation,
		subtitleContentMode,
		audioPower,
		audioBands,
		claddaghTuning = DEFAULT_CLADDAGH_TUNING,
		paused = false
	} = props

	const centerNormalTiltDeg = 90 - claddaghTuning.ellipseTiltDeg

	const isRawScaleRef = useRef(false)
	const normalizePower = useCallback((power: number) => {
		if (!Number.isFinite(power)) return 0
		if (power > 1.0) {
			isRawScaleRef.current = true
		}
		return Math.max(0, Math.min(1, isRawScaleRef.current ? power / 255 : power))
	}, [])

	const { activeLine, recentCompletedLine, nextLines } = useVisualizerRuntime({
		currentTime,
		currentLineIndex,
		lines
	})

	const isChorus = activeLine?.isChorus ?? false

	const smoothedBass = useSpring(audioBands.bass, {
		stiffness: 150,
		damping: 25
	})
	const smoothedVocal = useSpring(audioBands.vocal, {
		stiffness: 120,
		damping: 24
	})
	const fontStack = resolveThemeFontStack(theme)
	const baseFontSize = 72 * lyricsFontScale
	const fontWeight = resolveThemeFontWeight(theme, 700)
	const fontSpec = `${fontWeight} ${baseFontSize}px ${fontStack}`

	const containerRef = useRef<HTMLDivElement>(null)
	const axisLineRef = useRef<HTMLDivElement>(null)
	const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

	useCladdaghAxisLine({
		axisLineRef,
		smoothedBass,
		smoothedVocal,
		normalizePower,
		theme,
		centerNormalTiltDeg,
		paused,
		isChorus,
		showAxisLine: claddaghTuning.showAxisLine
	})

	// Initialize dimensions on mount to avoid zero size on first render
	useEffect(() => {
		const container = containerRef.current
		if (container) {
			const rect = container.getBoundingClientRect()
			if (rect.width > 0 && rect.height > 0) {
				setDimensions({ width: rect.width, height: rect.height })
			}
		}
		// Track container dimensions responsively using ResizeObserver
		const observer = new ResizeObserver(entries => {
			const entry = entries[0]
			if (entry) {
				const { width, height } = entry.contentRect
				if (width > 0 && height > 0) {
					setDimensions({ width, height })
				}
			}
		})
		if (container) observer.observe(container)
		return () => observer.disconnect()
	}, [])

	// Radial configuration (increased to prevent long sentence overlaps)
	const Rx = (dimensions.width > 0 ? Math.min(dimensions.width * 0.44, 560) : 360) * claddaghTuning.radiusScale
	const Ry = Rx > 0 ? Rx * 0.707 : 254 // 45-degree angle projection ratio
	const focusSpacingScale = (1 + claddaghTuning.focusScaleRatio) / (1 + DEFAULT_CLADDAGH_TUNING.focusScaleRatio)
	const activeTextSpacingScale = focusSpacingScale

	if (typeof window !== 'undefined') {
		// Upstream exposes the live ring metrics on window for devtools probing.
		const debugWindow = window as unknown as DebugWindow
		debugWindow.visualizerDimensions = dimensions
		debugWindow.visualizerRx = Rx
		debugWindow.visualizerRy = Ry
	}

	// Determine the focus line index
	const focusIndex = currentLineIndex !== -1 ? currentLineIndex : recentCompletedLine ? lines.indexOf(recentCompletedLine) : -1
	const centerLineIndex = Math.max(-1, focusIndex)
	const [renderBaseIndex, setRenderBaseIndex] = useState(centerLineIndex)

	const activeSpacingInfo = useMemo(() => {
		const line = lines[renderBaseIndex]
		if (!line) return []
		const timeline = adjustCladdaghTimeline(buildLineGraphemeTimeline(line), line)
		return buildMeasuredSpacingInfo(timeline, fontSpec, baseFontSize, Rx, activeTextSpacingScale, claddaghTuning.letterSpacingOffset)
	}, [lines, renderBaseIndex, fontSpec, baseFontSize, Rx, activeTextSpacingScale, claddaghTuning.letterSpacingOffset])

	// Coordinate rotation offsets using MotionValue for line transition自转 animations
	const lineOffset = useMotionValue(centerLineIndex * Math.PI)
	const lastIndexRef = useRef(centerLineIndex)

	useEffect(() => {
		const prev = lastIndexRef.current
		const curr = centerLineIndex
		lastIndexRef.current = curr

		if (Math.abs(curr - prev) > 1) {
			lineOffset.set(curr * Math.PI)
			setRenderBaseIndex(curr)
		} else {
			// Update renderBaseIndex immediately so activeSpacingInfo tracks
			// the new active line from the start. This prevents the wordOffset
			// discontinuity that occurred when onComplete switched it later.
			setRenderBaseIndex(curr)
			const controls = animate(lineOffset, curr * Math.PI, {
				type: 'spring',
				stiffness: 55,
				damping: 14,
				mass: 0.9
			})
			return () => controls.stop()
		}
	}, [centerLineIndex, lineOffset])

	// Keep the transition pair + one preceding line rendered so the outgoing
	// line remains visible during the spring rotation.
	const lineIndicesToRender = useMemo(() => {
		const indices: number[] = []
		if (lines.length === 0) return []
		for (let i = renderBaseIndex - 1; i <= renderBaseIndex + 2; i++) {
			if (i >= 0 && i < lines.length) {
				indices.push(i)
			}
		}
		if (indices.length === 0) {
			indices.push(Math.max(0, Math.min(centerLineIndex, lines.length - 1)))
		}
		return indices
	}, [centerLineIndex, lines.length, renderBaseIndex])

	return (
		<VisualizerShell theme={theme} audioPower={audioPower} audioBands={audioBands} sharedProps={props}>
			<motion.div
				initial={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
				animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
				exit={{ opacity: 0, scale: 1.04, filter: 'blur(4px)' }}
				transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
				ref={containerRef}
				{...stylex.props(sx.root)}>
				{/* Background Dedicated Visuals */}
				<div {...stylex.props(sx.backdrop)}>
					{/* Center Axis Line with blurred/faded endpoints */}
					{claddaghTuning.showAxisLine && (
						<div
							ref={axisLineRef}
							style={{
								position: 'absolute',
								left: '50%',
								top: '50%',
								width: '300px',
								height: '4px',
								transform: `translate(-50%, -50%) rotate(${centerNormalTiltDeg}deg) scale(1, 1)`,
								transformOrigin: 'center center',
								willChange: 'background, transform, filter'
							}}
						/>
					)}
				</div>

				<div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 10 }}>
					{showText &&
						Rx > 0 &&
						Ry > 0 &&
						lineIndicesToRender.map(idx => (
							<RingLine
								key={idx}
								line={lines[idx]}
								lineIndex={idx}
								centerLineIndex={centerLineIndex}
								currentTime={currentTime}
								lineOffset={lineOffset}
								theme={theme}
								lyricsFontScale={lyricsFontScale}
								Rx={Rx}
								Ry={Ry}
								audioPower={smoothedBass}
								containerWidth={dimensions.width}
								containerHeight={dimensions.height}
								activeSpacingInfo={activeSpacingInfo}
								renderBaseIndex={renderBaseIndex}
								lines={lines}
								focusScaleRatio={claddaghTuning.focusScaleRatio}
								ellipseTiltDeg={claddaghTuning.ellipseTiltDeg}
								textSpacingScale={activeTextSpacingScale}
								letterSpacingOffset={claddaghTuning.letterSpacingOffset}
							/>
						))}
				</div>
			</motion.div>

			{showText && (
				<VisualizerSubtitleOverlay
					showText={showText}
					activeLine={activeLine}
					recentCompletedLine={recentCompletedLine}
					nextLines={nextLines}
					theme={theme}
					subtitleTheme={subtitleTheme}
					translationFontSize='clamp(1.1rem, 2.2vw, 1.45rem)'
					upcomingFontSize='clamp(0.95rem, 1.8vw, 1.2rem)'
					subtitleOverlayOpacity={subtitleOverlayOpacity}
					subtitleOverlayBackground={subtitleOverlayBackground}
					subtitleUpcomingLyricsBlur={subtitleUpcomingLyricsBlur}
					subtitleFontScale={subtitleFontScale}
					hideTranslationSubtitle={hideTranslationSubtitle}
					showSubtitleTranslation={showSubtitleTranslation}
					subtitleContentMode={subtitleContentMode}
				/>
			)}
		</VisualizerShell>
	)
}

export default VisualizerCladdagh
