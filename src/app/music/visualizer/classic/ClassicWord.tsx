'use client'

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion, type MotionValue, type Variants, useMotionValueEvent } from 'motion/react'
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
			// Add `whitespace-nowrap` to prevent unexpected line breaks
			className='relative inline-block origin-center whitespace-nowrap will-change-transform'
			style={{
				fontSize,
				fontWeight: resolveThemeFontWeight(theme, 700),
				marginRight: config.marginRight,
				alignSelf: config.alignSelf,
				lineHeight: 1.22
			}}>
			{/* Glow Layer - Handles Text Shadow - Absolute Position */}
			<span className='pointer-events-none absolute inset-0 block select-none' aria-hidden='true'>
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
			<motion.span variants={bodyVariants} custom={wordCustom} className='relative z-10 block'>
				{word.text}
			</motion.span>

			{/* Chorus Ripple Effect */}
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

export default ClassicWord
