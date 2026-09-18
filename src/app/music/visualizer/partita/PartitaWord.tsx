'use client'

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion, type MotionValue, type Variants, useMotionValueEvent } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import type { Theme, Word as WordType } from '../types'
import { buildWordGraphemeTimings } from '../lyrics/graphemeTiming'
import { resolveThemeFontWeight } from '../fontStacks'
import type { PartitaLineRenderProfile, PartitaWordStatus, WordLayoutConfig } from './partitaTypes'
import { getPartitaWordActiveEndTime, getPartitaWordDisplayDuration } from './partitaTimeline'
import type { PartitaGlowVariantCustom, PartitaWordVariantCustom } from './partitaVariants'

// src/app/music/visualizer/partita/PartitaWord.tsx
// Word component is still basically Classic under the hood.
// The big difference is that here the word lives inside a chunked column layout instead of a free-form line.
// It renders one display word: the body layer keeps the whole text in a single span, the glow layer
// splits non-CJK text into graphemes so the highlight can sweep through them, and the chorus ripple
// fires while the word is active.

interface PartitaWordProps {
	word: WordType
	config: WordLayoutConfig
	currentTime: MotionValue<number>
	theme: Theme
	layoutVariants: Variants
	bodyVariants: Variants
	glowVariants: Variants
	baseColor: string
	activeColor: string
	renderProfile: PartitaLineRenderProfile
	isChorus?: boolean
	fontSize: string
}

/** 迁移自 Tailwind 的静态样式（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 单词根容器：行内块、不换行（位移旋转仍由变体动画控制） */
	word: {
		position: 'relative',
		display: 'inline-block',
		transformOrigin: 'center',
		whiteSpace: 'nowrap',
		willChange: 'transform'
	},
	/** 高亮层：绝对铺满、禁止选中 */
	glowLayer: {
		pointerEvents: 'none',
		position: 'absolute',
		inset: 0,
		display: 'block',
		userSelect: 'none'
	},
	/** 主体层：位于高亮层之上 */
	bodyLayer: {
		position: 'relative',
		zIndex: 10,
		display: 'block'
	},
	/** 副歌波纹：等比方圆、居中扩散（颜色与模糊保留内联） */
	ripple: {
		pointerEvents: 'none',
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
		borderColor: colors.border
	}
})

const PartitaWord: React.FC<PartitaWordProps> = ({
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
	const [status, setStatus] = useState<PartitaWordStatus>('waiting')
	const rippleScale = useMemo(() => 1.5 + Math.random() * 2, [])
	const duration = getPartitaWordDisplayDuration(word, renderProfile)
	const activeEndTime = getPartitaWordActiveEndTime(word, renderProfile)
	const graphemeTimings = useMemo(() => buildWordGraphemeTimings(word), [word])

	useMotionValueEvent(currentTime, 'change', (latest: number) => {
		let newStatus: PartitaWordStatus = 'waiting'
		if (latest >= word.startTime - renderProfile.wordLookahead && latest <= activeEndTime) {
			newStatus = 'active'
		} else if (latest > activeEndTime) {
			newStatus = 'passed'
		}
		if (newStatus !== status) setStatus(newStatus)
	})

	const wordCustom: PartitaWordVariantCustom = {
		config,
		activeColor,
		baseColor,
		duration,
		wordRevealMode: renderProfile.wordRevealMode
	}

	return (
		<motion.div
			key={`${config.id}`}
			custom={wordCustom}
			variants={layoutVariants}
			initial='waiting'
			animate={status}
			{...stylex.props(styles.word)}
			style={{
				fontSize,
				fontWeight: resolveThemeFontWeight(theme, 700),
				lineHeight: 1.22,
				marginRight: '0.8rem'
			}}>
			{/* Glow Layer */}
			<span {...stylex.props(styles.glowLayer)} aria-hidden='true'>
				{graphemeTimings.length > 1 ? (
					graphemeTimings.map((timing, index) => {
						const glowCustom: PartitaGlowVariantCustom = {
							...wordCustom,
							index,
							total: graphemeTimings.length,
							charStartTime: timing.startTime,
							charEndTime: timing.endTime,
							wordStartTime: word.startTime
						}
						return (
							<motion.span key={index} variants={glowVariants} custom={glowCustom}>
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

			{/* Body Layer */}
			<motion.span variants={bodyVariants} custom={wordCustom} {...stylex.props(styles.bodyLayer)}>
				{word.text}
			</motion.span>

			{/* Chorus Ripple */}
			<AnimatePresence>
				{isChorus && status === 'active' && (
					<motion.span
						key='ripple'
						{...stylex.props(styles.ripple)}
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

export default PartitaWord
