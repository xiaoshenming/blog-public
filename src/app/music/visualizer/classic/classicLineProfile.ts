import type { ClassicTuning, Line, Word } from '../types'
import { DEFAULT_CLASSIC_TUNING } from '../types'
import { getLineRenderEndTime, getLineRenderHints } from '../lyrics/renderHints'

// src/app/music/visualizer/classic/classicLineProfile.ts
// Classic's tuning resolution plus the per-line render profile it derives from the lyric
// pipeline's renderHints: how fast words reveal, how long a word stays "active", and how the
// line container enters/exits. Pure functions shared by the renderer and the word component.

export interface ClassicLineRenderProfile {
	renderHints: NonNullable<Line['renderHints']> | null
	lineRenderEndTime: number
	lineTransitionMode: 'normal' | 'fast' | 'none'
	wordRevealMode: 'normal' | 'fast' | 'instant'
	wordLookahead: number
}

const clampClassicBreathingFloatMultiplier = (value: number) => Math.min(2, Math.max(0, value))
const clampClassicWordSpacing = (value: number) => Math.min(2, Math.max(0, value))

export const resolveClassicTuning = (tuning?: ClassicTuning): ClassicTuning => ({
	enableWordRotation: tuning?.enableWordRotation ?? DEFAULT_CLASSIC_TUNING.enableWordRotation,
	breathingFloatMultiplier: clampClassicBreathingFloatMultiplier(tuning?.breathingFloatMultiplier ?? DEFAULT_CLASSIC_TUNING.breathingFloatMultiplier),
	useLegacyLayout: tuning?.useLegacyLayout ?? DEFAULT_CLASSIC_TUNING.useLegacyLayout,
	wordSpacing: clampClassicWordSpacing(tuning?.wordSpacing ?? DEFAULT_CLASSIC_TUNING.wordSpacing ?? 0.7)
})

export const resolveClassicLineRenderProfile = (line: Line | null | undefined): ClassicLineRenderProfile | null => {
	if (!line) {
		return null
	}

	// Render hints come from the lyric pipeline, not from the visualizer itself.
	// This function is just repackaging them into something easier to consume frame-by-frame.
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

export const getClassicWordActiveEndTime = (word: Word, renderProfile: ClassicLineRenderProfile) => {
	if (renderProfile.wordRevealMode === 'instant') {
		return renderProfile.lineRenderEndTime
	}

	if (renderProfile.wordRevealMode === 'fast') {
		return Math.min(renderProfile.lineRenderEndTime, Math.max(word.endTime, word.startTime + 0.12))
	}

	return word.endTime
}

export const getClassicWordDisplayDuration = (word: Word, renderProfile: ClassicLineRenderProfile) => {
	const activeEndTime = getClassicWordActiveEndTime(word, renderProfile)
	const minDuration = renderProfile.wordRevealMode === 'instant' ? 0.08 : renderProfile.wordRevealMode === 'fast' ? 0.12 : 0.1

	return Math.max(activeEndTime - word.startTime, minDuration)
}

export const getClassicLineContainerMotion = (renderProfile: ClassicLineRenderProfile | null) => {
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
