'use client'

import React, { useInsertionEffect, useMemo, useRef } from 'react'
import { motion, motionValue, type MotionValue } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import type { Line, Theme, TiltColorScheme } from '../types'
import { resolveThemeFontWeight } from '../fontStacks'
import { REM_PX, type TiltSegment } from './tiltLayout'
import { GRAPHEME_SEGMENTER, buildCharTimings, getCharPulseIntensity } from './tiltCharTimings'

// One laid-out segment of the Tilt block. Two typography modes: the normal horizontal line and the
// large italic "tilt" line whose characters alternate up/down. Each grapheme carries its own scale
// MotionValue, pulsed straight from currentTime so the per-character beat never touches React state.

interface TiltLineProps {
	segment: TiltSegment
	theme: Theme
	fontScale: number
	scaleMultiplier: number
	visible: boolean
	colorScheme?: TiltColorScheme
	currentTime?: MotionValue<number>
	segmentStartTime?: number
	segmentEndTime?: number
	activeLine?: Line | null
}

/** 迁移自 Tailwind 的静态样式（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 行内文本不换行 */
	nowrap: {
		whiteSpace: 'nowrap'
	},
	/** 逐字行内块（缩放仍由 MotionValue 控制） */
	charInline: {
		display: 'inline-block'
	}
})

const TiltLine: React.FC<TiltLineProps> = ({
	segment,
	theme,
	fontScale,
	scaleMultiplier,
	visible,
	colorScheme = 'default',
	currentTime,
	segmentStartTime = 0,
	segmentEndTime = 0,
	activeLine = null
}) => {
	const baseFontScale = fontScale * scaleMultiplier
	const shortLastBoost = segment.isShortLastLine ? 1.18 : 1
	const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
	const tiltFontPx = Math.min(viewportWidth * 0.06875 * baseFontScale, 5.625 * REM_PX * baseFontScale)
	const yOffset = tiltFontPx / 6
	const normalFontSize = `clamp(${(3.125 * baseFontScale * shortLastBoost).toFixed(3)}rem, ${(6.875 * baseFontScale * shortLastBoost).toFixed(3)}vw, ${(5.625 * baseFontScale * shortLastBoost).toFixed(3)}rem)`
	const tiltFontSize = `clamp(${(3.125 * baseFontScale).toFixed(3)}rem, ${(6.875 * baseFontScale).toFixed(3)}vw, ${(5.625 * baseFontScale).toFixed(3)}rem)`

	const getColors = () => {
		switch (colorScheme) {
			case 'swap':
				return { normal: theme.accentColor || theme.primaryColor, tilt: theme.primaryColor }
			case 'accentAll':
				return { normal: theme.accentColor || theme.primaryColor, tilt: theme.accentColor || theme.primaryColor }
			case 'primaryAll':
				return { normal: theme.primaryColor, tilt: theme.primaryColor }
			default:
				return { normal: theme.primaryColor, tilt: theme.accentColor || theme.primaryColor }
		}
	}

	const colors = getColors()

	const graphemes = useMemo(() => [...GRAPHEME_SEGMENTER.segment(segment.text)], [segment.text])
	let visualIndex = 0

	const charTimings = useMemo(() => {
		if (!activeLine) return []
		return buildCharTimings(segment.charOffset, segment.text, segmentStartTime, segmentEndTime, activeLine)
	}, [activeLine, segment.charOffset, segment.text, segmentStartTime, segmentEndTime])

	const charScaleMvs = useRef<MotionValue<number>[]>([])
	if (charScaleMvs.current.length !== graphemes.length) {
		charScaleMvs.current = graphemes.map(() => motionValue(1))
	}

	const charIndexMap = useMemo(() => {
		let idx = 0
		return graphemes.map(seg => {
			const isSpace = /^\s+$/.test(seg.segment)
			if (!isSpace) idx++
			return idx - 1
		})
	}, [graphemes])

	useInsertionEffect(() => {
		if (!currentTime) return

		const handler = (latest: number) => {
			if (!visible) return
			const mvs = charScaleMvs.current
			if (mvs.length !== graphemes.length) return
			if (!charTimings || charTimings.length === 0) {
				for (let i = 0; i < mvs.length; i++) mvs[i].set(1)
				return
			}

			for (let ti = 0; ti < graphemes.length; ti++) {
				const seg = graphemes[ti]
				if (/^\s+$/.test(seg.segment)) {
					mvs[ti].set(1)
					continue
				}
				const ci = charIndexMap[ti]
				const charTiming = charTimings[ci]
				if (!charTiming) {
					mvs[ti].set(1)
					continue
				}
				const intensity = getCharPulseIntensity(latest, charTiming)

				mvs[ti].set(1 + intensity * (segment.isTilt ? 0.18 : 0.15))
			}
		}
		const unsubscribe = currentTime.on('change', handler)
		handler(currentTime.get())
		return unsubscribe
	}, [currentTime, graphemes, charTimings, segment, charIndexMap, visible])

	if (!segment.isTilt) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
				exit={{ opacity: 0, y: -12 }}
				transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
				{...stylex.props(styles.nowrap)}
				style={{
					fontSize: normalFontSize,
					color: colors.normal,
					fontFamily: 'inherit',
					lineHeight: 1.35,
					fontWeight: resolveThemeFontWeight(theme, 400),
					letterSpacing: '0.08em'
				}}>
				{graphemes.map((seg, ti) => {
					const isSpace = /^\s+$/.test(seg.segment)
					const ci = visualIndex
					if (!isSpace) visualIndex += 1

					return (
						<motion.span
							key={ti}
							initial={{ opacity: 0 }}
							animate={
								visible
									? {
											opacity: 1
										}
									: {
											opacity: 0
										}
							}
							transition={{
								duration: 0.5,
								delay: visible && !isSpace ? ci * 0.04 : 0,
								ease: [0.25, 0.46, 0.45, 0.94]
							}}
							{...stylex.props(styles.charInline)}
							style={{
								scale: charScaleMvs.current[ti],
								transition: 'transform 0.06s ease-out',
								...(isSpace ? { minWidth: '0.25em' } : {})
							}}>
							{isSpace ? '\u00A0' : seg.segment}
						</motion.span>
					)
				})}
			</motion.div>
		)
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 24, scale: 0.92 }}
			animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.92 }}
			exit={{ opacity: 0, y: -16, scale: 0.95 }}
			transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
			{...stylex.props(styles.nowrap)}
			style={{
				fontSize: tiltFontSize,
				color: colors.tilt,
				fontFamily: 'inherit',
				fontStyle: 'italic',
				lineHeight: 1.25,
				fontWeight: resolveThemeFontWeight(theme, 300),
				letterSpacing: '0.15em'
			}}>
			{graphemes.map((seg, ti) => {
				const isSpace = /^\s+$/.test(seg.segment)
				const isEven = visualIndex % 2 === 0
				const yStagger = isEven ? -1 : 1
				const ci = visualIndex
				if (!isSpace) visualIndex += 1

				return (
					<motion.span
						key={ti}
						initial={{
							opacity: 0,
							y: isSpace ? 0 : yStagger * yOffset * 2
						}}
						animate={
							visible
								? {
										opacity: 1,
										y: isSpace ? 0 : yStagger * yOffset
									}
								: {
										opacity: 0,
										y: isSpace ? 0 : yStagger * yOffset * 2
									}
						}
						transition={{
							duration: 0.5,
							delay: visible && !isSpace ? ci * 0.05 : 0,
							ease: [0.25, 0.46, 0.45, 0.94]
						}}
						{...stylex.props(styles.charInline)}
						style={{
							scale: charScaleMvs.current[ti],
							transition: 'transform 0.06s ease-out',
							...(isSpace ? { minWidth: '0.35em' } : {})
						}}>
						{isSpace ? '\u00A0' : seg.segment}
					</motion.span>
				)
			})}
		</motion.div>
	)
}

export default TiltLine
