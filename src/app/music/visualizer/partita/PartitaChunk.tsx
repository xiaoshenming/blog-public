'use client'

import React, { useState } from 'react'
import { motion, type MotionValue, type Variants, useMotionValueEvent } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import type { Theme, Word as WordType } from '../types'
import type { PartitaLineRenderProfile, PartitaWordStatus, WordLayoutConfig } from './partitaTypes'
import { getActiveColor, getPartitaWordActiveEndTime } from './partitaTimeline'
import PartitaWord from './PartitaWord'

// src/app/music/visualizer/partita/PartitaChunk.tsx
// Chunk is the structural wrapper.
// It does not own lyric timing directly; it mostly exists so guide lines and grouped word offsets have a place to live.
// Its active window still comes from chunkWords (first / last parser word), so merged display text
// never shifts the animation timing; displayWords only decide which PartitaWord objects get drawn.

interface PartitaChunkProps {
	chunkWords: WordType[]
	displayWords: WordType[]
	config: WordLayoutConfig
	guideIndex: number
	currentTime: MotionValue<number>
	theme: Theme
	layoutVariants: Variants
	bodyVariants: Variants
	glowVariants: Variants
	baseColor: string
	renderProfile: PartitaLineRenderProfile
	isChorus?: boolean
	showGuideLines: boolean
	fontSize: string
}

/** 迁移自 Tailwind 的静态样式（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 词块容器：行内弹性、居中且不换行（位移旋转仍由动画控制） */
	chunk: {
		position: 'relative',
		display: 'inline-flex',
		transformOrigin: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		whiteSpace: 'nowrap'
	},
	/** 竖向引导线：1px 宽、不拦截指针 */
	guideVertical: {
		pointerEvents: 'none',
		position: 'absolute',
		width: 1
	},
	/** 横向引导线：1px 高、不拦截指针 */
	guideHorizontal: {
		pointerEvents: 'none',
		position: 'absolute',
		height: 1
	}
})

const PartitaChunk: React.FC<PartitaChunkProps> = ({
	chunkWords,
	displayWords,
	config,
	guideIndex,
	currentTime,
	theme,
	layoutVariants,
	bodyVariants,
	glowVariants,
	baseColor,
	renderProfile,
	isChorus,
	showGuideLines,
	fontSize
}) => {
	const [chunkStatus, setChunkStatus] = useState<PartitaWordStatus>('waiting')

	const chunkStartTime = chunkWords[0].startTime
	const chunkEndTime = getPartitaWordActiveEndTime(chunkWords[chunkWords.length - 1], renderProfile)

	useMotionValueEvent(currentTime, 'change', (latest: number) => {
		let newStatus: PartitaWordStatus = 'waiting'
		if (latest >= chunkStartTime - renderProfile.wordLookahead && latest <= chunkEndTime) {
			newStatus = 'active'
		} else if (latest > chunkEndTime) {
			newStatus = 'passed'
		}
		if (newStatus !== chunkStatus) setChunkStatus(newStatus)
	})

	const activeColor = getActiveColor(displayWords.map(w => w.text).join(' '), theme)
	const guidePosition = guideIndex % 2 === 0 ? 'left' : 'right'

	return (
		<motion.div
			{...stylex.props(styles.chunk)}
			style={{
				marginBottom: config.marginBottom,
				alignSelf: config.alignSelf,
				lineHeight: 1,
				minWidth: 'auto',
				minHeight: 'auto',
				padding: '0.2rem 0.5rem'
			}}
			animate={{
				opacity: chunkStatus === 'waiting' ? 0 : 1,
				scale: chunkStatus === 'waiting' ? 0.85 : 1,
				x: chunkStatus === 'waiting' ? config.x + (guidePosition === 'left' ? -40 : 40) : config.x,
				y: config.y,
				rotate: config.rotate
			}}
			transition={
				chunkStatus === 'active'
					? {
							type: 'spring' as const,
							stiffness: 200,
							damping: 20,
							opacity: { duration: 0.1 }
						}
					: {
							duration: 0.4,
							ease: 'easeOut' as const
						}
			}>
			{showGuideLines && guidePosition === 'left' && (
				<>
					<motion.span
						{...stylex.props(styles.guideVertical)}
						style={{
							left: '-8px',
							bottom: '-16px',
							height: '32px',
							transformOrigin: 'bottom',
							backgroundColor: chunkStatus === 'active' ? activeColor : chunkStatus === 'passed' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)',
							boxShadow: chunkStatus === 'active' ? `0 0 10px ${activeColor}45` : 'none'
						}}
						animate={{
							scaleY: chunkStatus === 'waiting' ? 0 : 1,
							opacity: chunkStatus === 'waiting' ? 0 : 1
						}}
						transition={{
							duration: 0.4,
							ease: 'easeOut' as const
						}}
						aria-hidden='true'
					/>
					<motion.span
						{...stylex.props(styles.guideHorizontal)}
						style={{
							left: '-16px',
							bottom: '-8px',
							width: 'calc(100% + 36px)',
							transformOrigin: 'left',
							backgroundColor: chunkStatus === 'active' ? activeColor : chunkStatus === 'passed' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)',
							boxShadow: chunkStatus === 'active' ? `0 0 10px ${activeColor}35` : 'none'
						}}
						animate={{
							scaleX: chunkStatus === 'waiting' ? 0 : 1,
							opacity: chunkStatus === 'waiting' ? 0 : 1
						}}
						transition={{
							duration: 0.4,
							ease: 'easeOut' as const
						}}
						aria-hidden='true'
					/>
				</>
			)}
			{showGuideLines && guidePosition === 'right' && (
				<>
					<motion.span
						{...stylex.props(styles.guideVertical)}
						style={{
							right: '-8px',
							bottom: '-16px',
							height: '32px',
							transformOrigin: 'bottom',
							backgroundColor: chunkStatus === 'active' ? activeColor : chunkStatus === 'passed' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)',
							boxShadow: chunkStatus === 'active' ? `0 0 10px ${activeColor}45` : 'none'
						}}
						animate={{
							scaleY: chunkStatus === 'waiting' ? 0 : 1,
							opacity: chunkStatus === 'waiting' ? 0 : 1
						}}
						transition={{
							duration: 0.4,
							ease: 'easeOut' as const
						}}
						aria-hidden='true'
					/>
					<motion.span
						{...stylex.props(styles.guideHorizontal)}
						style={{
							right: '-16px',
							bottom: '-8px',
							width: 'calc(100% + 36px)',
							transformOrigin: 'right',
							backgroundColor: chunkStatus === 'active' ? activeColor : chunkStatus === 'passed' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)',
							boxShadow: chunkStatus === 'active' ? `0 0 10px ${activeColor}35` : 'none'
						}}
						animate={{
							scaleX: chunkStatus === 'waiting' ? 0 : 1,
							opacity: chunkStatus === 'waiting' ? 0 : 1
						}}
						transition={{
							duration: 0.4,
							ease: 'easeOut' as const
						}}
						aria-hidden='true'
					/>
				</>
			)}

			{displayWords.map((w, idx) => {
				// Per-word random offset only (chunk position is on the container)
				const wordSeed = displayWords[0].startTime + idx * 7.13
				const random = (offset: number) => {
					const x = Math.sin(wordSeed + offset) * 10000
					return x - Math.floor(x)
				}

				const intensity = theme.animationIntensity
				const isCalm = intensity === 'calm'
				const isChaotic = intensity === 'chaotic'
				const baseSpread = isChaotic ? 15 : isCalm ? 0 : 6
				const baseRotate = isChaotic ? 8 : isCalm ? 0 : 3

				const wordConfig: WordLayoutConfig = {
					id: `${config.id}-w${idx}`,
					x: (random(1) - 0.5) * baseSpread * 2,
					y: (random(2) - 0.5) * baseSpread * 2,
					rotate: (random(3) - 0.5) * baseRotate * 2,
					scale: config.scale,
					marginBottom: '0',
					alignSelf: 'auto',
					passedRotate: (random(8) - 0.5) * 20
				}

				return (
					<PartitaWord
						key={`${w.text}-${idx}`}
						word={w}
						config={wordConfig}
						currentTime={currentTime}
						theme={theme}
						layoutVariants={layoutVariants}
						bodyVariants={bodyVariants}
						glowVariants={glowVariants}
						baseColor={baseColor}
						activeColor={getActiveColor(w.text, theme)}
						renderProfile={renderProfile}
						isChorus={isChorus}
						fontSize={fontSize}
					/>
				)
			})}
		</motion.div>
	)
}

export default PartitaChunk
