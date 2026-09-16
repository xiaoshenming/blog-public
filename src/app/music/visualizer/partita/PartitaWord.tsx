'use client'

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion, type MotionValue, type Variants, useMotionValueEvent } from 'motion/react'
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
			className='relative inline-block origin-center whitespace-nowrap will-change-transform'
			style={{
				fontSize,
				fontWeight: resolveThemeFontWeight(theme, 700),
				lineHeight: 1.22,
				marginRight: '0.8rem'
			}}>
			{/* Glow Layer */}
			<span className='pointer-events-none absolute inset-0 block select-none' aria-hidden='true'>
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
			<motion.span variants={bodyVariants} custom={wordCustom} className='relative z-10 block'>
				{word.text}
			</motion.span>

			{/* Chorus Ripple */}
			<AnimatePresence>
				{isChorus && status === 'active' && (
					<motion.span
						key='ripple'
						className='pointer-events-none absolute top-1/2 left-1/2 z-0 aspect-square h-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full border-1'
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
