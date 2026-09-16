import type { TargetAndTransition } from 'motion/react'
import type { Line, Theme, Word as WordType } from '../types'
import { getLineRenderEndTime, getLineRenderHints } from '../lyrics/renderHints'
import { resolveWordColor } from '../wordColoring'
import type { PartitaLineRenderProfile } from './partitaTypes'

// src/app/music/visualizer/partita/partitaTimeline.ts
// Line render profile and the word-level timing derived from it. The profile is built once per
// active line from getLineRenderHints() and decides the line container's enter/exit motion, how
// each word's active window ends (fast / instant reveal clamps it to the line render end) and how
// much lookahead a word gets before its parser startTime.

export const resolvePartitaLineRenderProfile = (line: Line | null | undefined): PartitaLineRenderProfile | null => {
	if (!line) {
		return null
	}

	const renderHints = getLineRenderHints(line)
	const wordRevealMode = renderHints?.wordRevealMode ?? 'normal'

	return {
		renderHints,
		lineRenderEndTime: getLineRenderEndTime(line),
		lineTransitionMode: renderHints?.lineTransitionMode ?? 'normal',
		wordRevealMode,
		wordLookahead: wordRevealMode === 'instant' ? 0.03 : wordRevealMode === 'fast' ? 0.08 : 0.15
	}
}

export const getPartitaWordActiveEndTime = (word: WordType, renderProfile: PartitaLineRenderProfile) => {
	if (renderProfile.wordRevealMode === 'instant') {
		return renderProfile.lineRenderEndTime
	}

	if (renderProfile.wordRevealMode === 'fast') {
		return Math.min(renderProfile.lineRenderEndTime, Math.max(word.endTime, word.startTime + 0.12))
	}

	return word.endTime
}

export const getPartitaWordDisplayDuration = (word: WordType, renderProfile: PartitaLineRenderProfile) => {
	const activeEndTime = getPartitaWordActiveEndTime(word, renderProfile)
	const minDuration = renderProfile.wordRevealMode === 'instant' ? 0.08 : renderProfile.wordRevealMode === 'fast' ? 0.12 : 0.1

	return Math.max(activeEndTime - word.startTime, minDuration)
}

export interface PartitaLineContainerMotion {
	initial: TargetAndTransition
	animate: TargetAndTransition
	exit: TargetAndTransition
}

export const getPartitaLineContainerMotion = (renderProfile: PartitaLineRenderProfile | null): PartitaLineContainerMotion => {
	if (renderProfile?.lineTransitionMode === 'none') {
		return {
			initial: { opacity: 1, scale: 1, filter: 'blur(0px)' },
			animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
			exit: { opacity: 0, scale: 1.02, filter: 'blur(6px)', transition: { duration: 0.12, ease: 'easeOut' as const } }
		}
	}

	if (renderProfile?.lineTransitionMode === 'fast') {
		return {
			initial: { opacity: 0.35, scale: 0.96, filter: 'blur(4px)' },
			animate: {
				opacity: 1,
				scale: 1,
				filter: 'blur(0px)',
				transition: { duration: 0.16, ease: 'easeOut' as const },
				transitionEnd: { filter: 'none' }
			},
			exit: {
				opacity: 0,
				scale: 1.04,
				filter: 'blur(10px)',
				transition: { duration: 0.16, ease: 'easeInOut' as const }
			}
		}
	}

	return {
		initial: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
		animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
		exit: { opacity: 0, scale: 1.1, filter: 'blur(20px)', transition: { duration: 0.3 } }
	}
}

export const getActiveColor = (wordText: string, theme: Theme) => {
	return resolveWordColor(wordText, theme.wordColors, theme.accentColor)
}
