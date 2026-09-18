import type { Variants } from 'motion/react'
import type { Theme } from '../types'
import type { WordRevealMode } from '../lyrics/renderHints'
import type { WordLayoutConfig } from './partitaTypes'

// src/app/music/visualizer/partita/partitaVariants.ts
// The three variant maps PartitaWord animates with. They are dynamic variants: PartitaWord hands
// the payloads below through `custom`, and the resolvers turn them into the waiting / active /
// passed targets. Layout moves the word box, body colours/blurs the visible text, glow drives the
// per-grapheme highlight sweep on the transparent overlay copy of the text.

// Payload every PartitaWord layer passes through `custom`.
export interface PartitaWordVariantCustom {
	config: WordLayoutConfig
	activeColor: string
	baseColor: string
	duration: number
	wordRevealMode: WordRevealMode
}

// The glow layer either renders one span per grapheme (and passes that grapheme's timing) or a
// single span for the whole display word (and passes nothing extra). The two shapes never mix.
export type PartitaGlowVariantCustom = PartitaWordVariantCustom &
	(
		| {
				index: number
				total: number
				charStartTime: number
				charEndTime: number
				wordStartTime: number
		  }
		| {
				index?: undefined
				total?: undefined
				charStartTime?: undefined
				charEndTime?: undefined
				wordStartTime?: undefined
		  }
	)

export const createPartitaLayoutVariants = (theme: Theme): Variants => ({
	waiting: ({ config }: PartitaWordVariantCustom) => ({
		opacity: 0,
		scale: 0.5,
		x: config.x + Math.sin(config.y) * 100,
		y: config.y + Math.cos(config.x) * 50,
		rotate: config.rotate + 20,
		transition: { duration: 0.4 }
	}),
	active: ({ config }: PartitaWordVariantCustom) => ({
		opacity: 1,
		scale: isNaN(config.scale) ? 1.5 : config.scale * 1.4,
		x: config.x,
		y: config.y,
		rotate: config.rotate,
		transition: {
			type: 'spring' as const,
			stiffness: 200,
			damping: 20,
			opacity: { duration: 0.1 }
		}
	}),
	passed: ({ config }: PartitaWordVariantCustom) => ({
		opacity: theme.animationIntensity === 'chaotic' ? 0.9 : 0.82,
		scale: config.scale || 1,
		x: config.x,
		y: config.y,
		rotate: config.rotate + config.passedRotate,
		transition: {
			duration: 0.5,
			rotate: {
				duration: 5,
				ease: 'linear'
			}
		}
	})
})

export const PARTITA_BODY_VARIANTS: Variants = {
	waiting: ({ baseColor }: PartitaWordVariantCustom) => ({
		color: baseColor,
		filter: 'blur(10px)',
		transition: { duration: 0.4 }
	}),
	active: ({ activeColor, duration, wordRevealMode }: PartitaWordVariantCustom) => ({
		color: activeColor,
		filter: 'none',
		transition: {
			color: { duration: duration || 0.2, ease: 'linear' },
			filter: { type: 'tween', duration: wordRevealMode === 'instant' ? 0.08 : wordRevealMode === 'fast' ? 0.12 : 0.2 }
		},
		transitionEnd: {
			filter: 'none'
		}
	}),
	passed: ({ baseColor, wordRevealMode }: PartitaWordVariantCustom) => ({
		color: baseColor,
		filter: 'blur(0px)',
		transition: {
			color: { duration: wordRevealMode === 'instant' ? 0.12 : wordRevealMode === 'fast' ? 0.24 : 0.8, ease: 'easeInOut' },
			filter: { duration: wordRevealMode === 'instant' ? 0.12 : wordRevealMode === 'fast' ? 0.2 : 0.5 }
		},
		transitionEnd: {
			filter: 'none'
		}
	})
}

export const PARTITA_GLOW_VARIANTS: Variants = {
	waiting: {
		color: 'transparent',
		textShadow: 'none'
	},
	active: (custom: PartitaGlowVariantCustom) => {
		const { activeColor, duration, wordRevealMode } = custom

		if (wordRevealMode === 'instant') {
			return {
				color: 'transparent',
				textShadow: ['none', `0 0 14px ${activeColor}, 0 0 24px ${activeColor}`, 'none'],
				transition: {
					duration: Math.min(duration || 0.08, 0.12),
					times: [0, 0.35, 1],
					ease: 'easeOut'
				}
			}
		}

		if (wordRevealMode === 'fast') {
			return {
				color: 'transparent',
				textShadow: ['none', `0 0 18px ${activeColor}, 0 0 32px ${activeColor}`, 'none'],
				transition: {
					duration: Math.min(Math.max(duration || 0.12, 0.12), 0.2),
					times: [0, 0.4, 1],
					ease: 'easeInOut'
				}
			}
		}

		// Letter-level sweep glow (Classic style)
		if (custom.total !== undefined && custom.total > 1) {
			const { index, total, charStartTime, charEndTime, wordStartTime } = custom
			const singleDuration = duration / total
			const hasCharTiming = typeof charStartTime === 'number' && typeof charEndTime === 'number' && typeof wordStartTime === 'number'
			const resolvedCharDuration = hasCharTiming ? charEndTime - charStartTime : 0
			const charDuration = hasCharTiming ? Math.max(resolvedCharDuration, 0.001) : singleDuration
			const charDelay = hasCharTiming ? Math.max(0, charStartTime - wordStartTime) : singleDuration * index
			return {
				color: 'transparent',
				textShadow: ['none', `0 0 20px ${activeColor}, 0 0 40px ${activeColor}`, 'none'],
				transition: {
					duration: charDuration * 6,
					times: [0, 0.3, 1],
					delay: charDelay,
					ease: 'easeInOut'
				}
			}
		}

		// Single char / CJK: sustained glow (Classic style)
		return {
			color: 'transparent',
			textShadow: ['none', `0 0 20px ${activeColor}, 0 0 40px ${activeColor}`, `0 0 20px ${activeColor}, 0 0 40px ${activeColor}`],
			transition: {
				duration: duration || 0.1,
				times: [0, 0.9, 1],
				ease: 'easeInOut'
			}
		}
	},
	passed: ({ wordRevealMode }: PartitaWordVariantCustom) => ({
		color: 'transparent',
		textShadow: 'none',
		transition: { duration: wordRevealMode === 'instant' ? 0.12 : wordRevealMode === 'fast' ? 0.22 : 0.9, ease: 'easeOut' }
	})
}

// Slow breathing float of the whole lyric block; distance and period scale with the theme intensity.
export const createPartitaLyricContainerFloat = (intensity: Theme['animationIntensity']) => {
	const configByIntensity = {
		calm: { distance: 10, duration: 8.5 },
		normal: { distance: 14, duration: 7 },
		chaotic: { distance: 18, duration: 5.8 }
	} as const

	const { distance, duration } = configByIntensity[intensity]

	return {
		animate: {
			y: [0, -distance, 0, distance * 0.45, 0],
			scale: [1, 1.01, 1, 0.995, 1]
		},
		transition: {
			duration,
			repeat: Infinity,
			ease: 'easeInOut' as const
		}
	}
}
