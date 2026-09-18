'use client'

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion, type MotionValue, type Variants, useMotionValueEvent } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import type { Theme, Word } from '../types'
import { buildWordGraphemeTimings } from '../lyrics/graphemeTiming'
import { resolveThemeFontWeight } from '../fontStacks'
import { type ClassicLineRenderProfile, getClassicWordActiveEndTime, getClassicWordDisplayDuration } from './classicLineProfile'
import type { WordLayoutConfig } from './classicWordLayout'
import type { ClassicWordVariantCustom } from './classicWordVariants'

// src/app/music/visualizer/classic/ClassicWord.tsx
// One lyric word of the Classic line. Every word derives its own status from currentTime so it
// can animate on its own without depending on parent rerenders.
//
// For a single lyric line, words mostly go through 3 states:
// waiting -> word is not live yet, keep it in a lighter pre-entry pose.
// active -> word is currently singing, drive the main glow/body/ripple here.
// passed -> word already played, keep a bit of afterglow and drift so the line does not die too abruptly.
type ClassicWordStatus = 'waiting' | 'active' | 'passed'

/** 词块样式（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 词容器：行内块、以中心为变换原点、禁止换行 */
	word: {
		position: 'relative',
		display: 'inline-block',
		transformOrigin: 'center',
		whiteSpace: 'nowrap',
		willChange: 'transform'
	},
	/** 辉光层：绝对铺满、不响应指针、禁选中 */
	glowLayer: {
		position: 'absolute',
		inset: 0,
		display: 'block',
		pointerEvents: 'none',
		userSelect: 'none'
	},
	/** 文字主体层：相对定位浮在辉光之上 */
	body: {
		position: 'relative',
		zIndex: 10,
		display: 'block'
	},
	/** 合唱涟漪：居中圆环，放大扩散后淡出 */
	ripple: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		zIndex: 0,
		aspectRatio: '1',
		height: '150%',
		translate: '-50% -50%',
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		pointerEvents: 'none'
	}
})

interface ClassicWordProps {
	word: Word
	config: WordLayoutConfig
	currentTime: MotionValue<number>
	theme: Theme
	isChaotic: boolean
	layoutVariants: Variants
	bodyVariants: Variants
	glowVariants: Variants
	baseColor: string
	activeColor: string
	renderProfile: ClassicLineRenderProfile
	isChorus?: boolean
	fontSize: string
}

const ClassicWord: React.FC<ClassicWordProps> = ({
	word,
	config,
	currentTime,
	theme,
	layoutVariants,
	bodyVariants,
	glowVariants,
	baseColor,
	activeColor,
	renderProfile,
	isChorus,
	fontSize
}) => {
	const [status, setStatus] = useState<ClassicWordStatus>('waiting')
	const rippleScale = useMemo(() => 1.5 + Math.random() * 2, [])
	const duration = getClassicWordDisplayDuration(word, renderProfile)
	const activeEndTime = getClassicWordActiveEndTime(word, renderProfile)
	const graphemeTimings = useMemo(() => buildWordGraphemeTimings(word), [word])

	useMotionValueEvent(currentTime, 'change', (latest: number) => {
		let newStatus: ClassicWordStatus = 'waiting'

		if (latest >= word.startTime - renderProfile.wordLookahead && latest <= activeEndTime) {
			newStatus = 'active'
		} else if (latest > activeEndTime) {
			newStatus = 'passed'
		} else {
			newStatus = 'waiting'
		}

		if (newStatus !== status) {
			setStatus(newStatus)
		}
	})

	// The body span, the single-glyph glow span and the container all read the same payload.
	const wordCustom: ClassicWordVariantCustom = {
		config,
		activeColor,
		baseColor,
		duration,
		wordRevealMode: renderProfile.wordRevealMode
	}

	return (
		<motion.div
			key={config.id}
			custom={wordCustom}
			variants={layoutVariants}
			initial='waiting'
			animate={status}
			// 禁止词内换行，避免意外断行
			className={stylex.props(sx.word).className}
			style={{
				fontSize,
				fontWeight: resolveThemeFontWeight(theme, 700),
				marginRight: config.marginRight,
				alignSelf: config.alignSelf,
				lineHeight: 1.22
			}}>
			{/* Glow Layer - Handles Text Shadow - Absolute Position */}
			<span {...stylex.props(sx.glowLayer)} aria-hidden='true'>
				{graphemeTimings.length > 1 ? (
					graphemeTimings.map((timing, index) => {
						const graphemeCustom: ClassicWordVariantCustom = {
							...wordCustom,
							index,
							total: graphemeTimings.length,
							charStartTime: timing.startTime,
							charEndTime: timing.endTime,
							wordStartTime: word.startTime
						}
						return (
							<motion.span key={index} variants={glowVariants} custom={graphemeCustom}>
								{timing.char}
							</motion.span>
						)
					})
				) : (
					<motion.span variants={glowVariants} custom={wordCustom}>
						{word.text}
					</motion.span>
				)}
			</span>

			{/* Body Layer - Handles Color and Blur - Relative Position */}
			<motion.span variants={bodyVariants} custom={wordCustom} {...stylex.props(sx.body)}>
				{word.text}
			</motion.span>

			{/* Chorus Ripple Effect */}
			<AnimatePresence>
				{isChorus && status === 'active' && (
					<motion.span
						key='ripple'
						className={stylex.props(sx.ripple).className}
						style={{ borderColor: activeColor, filter: 'blur(1px)' }}
						initial={{ scale: 0.2, opacity: 0.8 }}
						animate={{ scale: rippleScale, opacity: 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5, ease: 'easeOut' }}
					/>
				)}
			</AnimatePresence>
		</motion.div>
	)
}

export default ClassicWord
