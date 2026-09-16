'use client'

import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import type { Line, Theme } from '../types'
import { buildLineGraphemeTimeline } from '../lyrics/graphemeTiming'
import { resolveThemeFontStack, resolveThemeFontWeight } from '../fontStacks'
import { colorWithAlpha } from '../colorMix'
import { buildWordColorRanges } from '../wordColoring'
import { adjustCladdaghTimeline, shouldHoldCladdaghFrameForPlaybackReset } from './claddaghTiming'
import { buildMeasuredSpacingInfo, CLADDAGH_LETTER_SPACING_EM, type CladdaghActiveSpacingItem, type CladdaghRingSpacingItem } from './claddaghSpacing'
import { writeCladdaghRingFrame } from './claddaghFrameWriter'

export interface RingLineProps {
	line: Line
	lineIndex: number
	centerLineIndex: number
	currentTime: MotionValue<number>
	lineOffset: MotionValue<number>
	theme: Theme
	lyricsFontScale?: number
	Rx: number
	Ry: number
	audioPower: MotionValue<number>
	containerWidth: number
	containerHeight: number
	activeSpacingInfo: CladdaghActiveSpacingItem[]
	renderBaseIndex: number
	lines: Line[]
	focusScaleRatio?: number
	ellipseTiltDeg?: number
	textSpacingScale?: number
	letterSpacingOffset?: number
}

/**
 * Component representing a single line of lyrics projected onto a portion of the 3D ring.
 */
const RingLine: React.FC<RingLineProps> = ({
	line,
	lineIndex,
	centerLineIndex,
	currentTime,
	lineOffset,
	theme,
	lyricsFontScale = 1.0,
	Rx,
	Ry,
	audioPower,
	containerWidth,
	containerHeight,
	activeSpacingInfo,
	renderBaseIndex,
	lines,
	focusScaleRatio,
	ellipseTiltDeg,
	textSpacingScale = 1,
	letterSpacingOffset = 0
}) => {
	const fontStack = resolveThemeFontStack(theme)
	const baseFontSize = 72 * lyricsFontScale
	const fontWeight = resolveThemeFontWeight(theme, 700)
	const fontSpec = `${fontWeight} ${baseFontSize}px ${fontStack}`

	const baseColor = useMemo(() => colorWithAlpha(theme.primaryColor, 0.55), [theme.primaryColor])
	const highlightColor = theme.accentColor || theme.primaryColor

	const isRawScaleRef = useRef(false)
	const normalizePower = useCallback((power: number) => {
		if (!Number.isFinite(power)) return 0
		if (power > 1.0) {
			isRawScaleRef.current = true
		}
		return Math.max(0, Math.min(1, isRawScaleRef.current ? power / 255 : power))
	}, [])

	// Calculate layout positioning and angles for each character/grapheme.
	const spacingInfo = useMemo<CladdaghRingSpacingItem[]>(() => {
		const timeline = adjustCladdaghTimeline(buildLineGraphemeTimeline(line), line)
		const wordColorRanges = buildWordColorRanges(line.fullText, theme.wordColors)

		let codeUnitCursor = 0
		const data = timeline.map(t => {
			const charLength = t.char.length
			const startOffset = codeUnitCursor
			const endOffset = codeUnitCursor + charLength
			codeUnitCursor = endOffset

			// Find if this character overlaps with any wordColor range
			const matchedRange = wordColorRanges.find(range => startOffset < range.endOffset && range.startOffset < endOffset)
			const charColor = matchedRange ? matchedRange.color : null

			return {
				...t,
				charColor
			}
		})

		return buildMeasuredSpacingInfo(data, fontSpec, baseFontSize, Rx, textSpacingScale, letterSpacingOffset)
	}, [line, theme.wordColors, fontSpec, baseFontSize, Rx, textSpacingScale, letterSpacingOffset])

	const charRefs = useRef<(HTMLSpanElement | null)[]>([])
	const previousTimeRef = useRef(currentTime.get())
	const holdResetFrameRef = useRef(false)

	useLayoutEffect(() => {
		const handler = (latestTime: number) => {
			if (shouldHoldCladdaghFrameForPlaybackReset(previousTimeRef.current, latestTime, centerLineIndex)) {
				holdResetFrameRef.current = true
			}
			previousTimeRef.current = latestTime

			// MotionValue time resets before React commits the matching line index.
			// Preserve the completed frame instead of rendering the old last line at time zero.
			if (holdResetFrameRef.current && centerLineIndex > 0) {
				return
			}
			holdResetFrameRef.current = false

			if (spacingInfo.length === 0) return

			writeCladdaghRingFrame(
				{
					spacingInfo,
					charRefs,
					line,
					lineIndex,
					centerLineIndex,
					lineOffset,
					power: normalizePower(audioPower.get()),
					theme,
					baseColor,
					highlightColor,
					baseFontSize,
					Rx,
					Ry,
					lines,
					activeSpacingInfo,
					renderBaseIndex,
					focusScaleRatio,
					ellipseTiltDeg
				},
				latestTime
			)
		}

		const handleUpdate = () => {
			handler(currentTime.get())
		}

		const unsubscribeTime = currentTime.on('change', handler)
		const unsubscribeOffset = lineOffset.on('change', handleUpdate)
		handler(currentTime.get())

		return () => {
			unsubscribeTime()
			unsubscribeOffset()
		}
	}, [
		spacingInfo,
		lineIndex,
		centerLineIndex,
		lineOffset,
		Rx,
		Ry,
		audioPower,
		currentTime,
		containerWidth,
		containerHeight,
		activeSpacingInfo,
		renderBaseIndex,
		highlightColor,
		baseColor,
		focusScaleRatio,
		ellipseTiltDeg,
		lines,
		line
	])

	return (
		<div className='pointer-events-none absolute inset-0 h-full w-full'>
			{spacingInfo.map((item, idx) => (
				<span
					key={idx}
					ref={el => {
						charRefs.current[idx] = el
					}}
					style={{
						position: 'absolute',
						left: '50%',
						top: '50%',
						opacity: 0,
						transform: 'translate3d(-50%, -50%, 0px) scale(0.2)',
						transformOrigin: 'center center',
						willChange: 'transform, opacity, filter, color, text-shadow',
						fontFamily: fontStack,
						fontSize: `${baseFontSize}px`,
						fontWeight,
						letterSpacing: `${CLADDAGH_LETTER_SPACING_EM}em`,
						whiteSpace: 'nowrap',
						color: baseColor
					}}>
					{item.char}
				</span>
			))}
		</div>
	)
}

export default RingLine
