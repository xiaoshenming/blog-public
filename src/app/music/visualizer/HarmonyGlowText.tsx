'use client'

import React, { useMemo } from 'react'
import { motion, type MotionValue, useTransform } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import type { Line, LyricBackgroundVocal, Theme, Word } from './types'
import { resolveThemeFontStack, resolveThemeFontWeight } from './fontStacks'
import { buildLineGraphemeTimeline } from './lyrics/graphemeTiming'
import { measureGraphemeOffsets, resolveClampFontPx } from './harmonyTextMetrics'
import { colorWithAlpha } from './colorMix'
import { resolveWordColor } from './wordColoring'

// src/app/music/visualizer/HarmonyGlowText.tsx
// One background-vocal line with a grapheme-accurate fill sweep: the dimmed text is always
// there, and a masked bright copy is revealed from the left as `currentTime` moves through the
// timed words. Used only by VisualizerHarmonyOverlay.

/** 文字样式（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 外层：行内块、保留空白与换行、词内可断行 */
	root: {
		position: 'relative',
		display: 'inline-block',
		overflowWrap: 'break-word',
		whiteSpace: 'pre-wrap'
	},
	/** 高亮层：绝对定位叠放、不响应指针 */
	glowLayer: {
		position: 'absolute',
		display: 'block',
		whiteSpace: 'pre-wrap',
		pointerEvents: 'none'
	},
	/** 高亮层内文：块级、保留空白与换行 */
	glowInner: {
		display: 'block',
		overflowWrap: 'break-word',
		whiteSpace: 'pre-wrap'
	}
})

interface HarmonyTextPart {
	key: string
	text: string
	word?: Word
}

// Preserves punctuation and whitespace while letting each timed word own its color and sweep.
const buildHarmonyTextParts = (vocal: LyricBackgroundVocal): HarmonyTextPart[] => {
	const parts: HarmonyTextPart[] = []
	let cursor = 0

	vocal.words.forEach((word, index) => {
		const matchIndex = vocal.text.indexOf(word.text, cursor)
		if (matchIndex < 0) {
			return
		}
		if (matchIndex > cursor) {
			parts.push({ key: `static-${cursor}`, text: vocal.text.slice(cursor, matchIndex) })
		}
		parts.push({ key: `word-${index}-${word.startTime}`, text: word.text, word })
		cursor = matchIndex + word.text.length
	})

	if (cursor < vocal.text.length) {
		parts.push({ key: `static-${cursor}`, text: vocal.text.slice(cursor) })
	}

	return parts.length > 0 ? parts : [{ key: 'full', text: vocal.text }]
}

const createHarmonyLine = (vocal: LyricBackgroundVocal): Line => ({
	fullText: vocal.text,
	startTime: vocal.startTime,
	endTime: vocal.endTime,
	words: vocal.words
})

interface HarmonyGlowTextProps {
	vocal: LyricBackgroundVocal
	currentTime: MotionValue<number>
	theme: Theme
	subtitleFontScale: number
}

const HarmonyGlowText: React.FC<HarmonyGlowTextProps> = ({ vocal, currentTime, theme, subtitleFontScale }) => {
	const fontPx = resolveClampFontPx(0.95, 1.8, 1.3) * subtitleFontScale
	const fontWeight = resolveThemeFontWeight(theme, 500)
	const fontFamily = resolveThemeFontStack(theme)
	const fontSpec = `${fontWeight} ${fontPx}px ${fontFamily}`
	const parts = useMemo(() => buildHarmonyTextParts(vocal), [vocal])
	const graphemeTimings = useMemo(() => buildLineGraphemeTimeline(createHarmonyLine(vocal)), [vocal])
	const graphemeOffsets = useMemo(() => measureGraphemeOffsets(vocal.text, fontPx, fontSpec), [fontPx, fontSpec, vocal.text])
	const fillWidth = useTransform(currentTime, latest => {
		const fullWidth = graphemeOffsets[graphemeOffsets.length - 1] ?? 0
		if (latest <= vocal.startTime) return 0
		if (latest >= vocal.endTime) return fullWidth

		const timingCount = Math.min(graphemeTimings.length, graphemeOffsets.length - 1)
		for (let index = 0; index < timingCount; index += 1) {
			const timing = graphemeTimings[index]
			const start = Math.max(vocal.startTime, timing.startTime)
			const end = Math.max(start, timing.endTime)
			const startWidth = graphemeOffsets[index] ?? 0
			const endWidth = graphemeOffsets[index + 1] ?? startWidth

			if (latest < start) return startWidth
			if (latest <= end) {
				return startWidth + (endWidth - startWidth) * ((latest - start) / Math.max(0.001, end - start))
			}
		}

		return fullWidth
	})
	const glowPaddingPx = Math.round(Math.max(fontPx * 0.85, 16))
	const paddedMaskImage = useTransform(fillWidth, latest => {
		const softness = Math.max(Math.min(fontPx * 1.35, 36), 18)
		const edge = latest + glowPaddingPx
		const solidEnd = Math.max(edge - softness, 0)
		return `linear-gradient(90deg, #000 0px, #000 ${solidEnd}px, rgba(0,0,0,0.86) ${Math.max(solidEnd, edge - softness * 0.5)}px, transparent ${edge}px, transparent 100%)`
	})
	const renderParts = (active: boolean) =>
		parts.map(part => {
			const color = part.word ? resolveWordColor(part.word.text, theme.wordColors, theme.accentColor, { cjkMatchMode: 'exact' }) : theme.secondaryColor
			return (
				<span
					key={part.key}
					style={
						active
							? {
									color,
									WebkitTextFillColor: color
								}
							: { color: colorWithAlpha(color, 0.56) }
					}>
					{part.text}
				</span>
			)
		})

	return (
		<span
			className={stylex.props(sx.root).className}
			style={{
				fontFamily,
				fontSize: `clamp(${(0.95 * subtitleFontScale).toFixed(3)}rem, ${(1.8 * subtitleFontScale).toFixed(3)}vw, ${(1.3 * subtitleFontScale).toFixed(3)}rem)`,
				fontWeight,
				lineHeight: 1.3
			}}>
			{renderParts(false)}
			<motion.span
				aria-hidden
				className={stylex.props(sx.glowLayer).className}
				style={{
					left: -glowPaddingPx,
					right: -glowPaddingPx,
					top: -glowPaddingPx,
					padding: glowPaddingPx,
					WebkitMaskImage: paddedMaskImage,
					maskImage: paddedMaskImage,
					WebkitMaskSize: '100% 100%',
					maskSize: '100% 100%',
					WebkitMaskRepeat: 'no-repeat',
					maskRepeat: 'no-repeat'
				}}>
				<span {...stylex.props(sx.glowInner)}>{renderParts(true)}</span>
			</motion.span>
		</span>
	)
}

export default HarmonyGlowText
