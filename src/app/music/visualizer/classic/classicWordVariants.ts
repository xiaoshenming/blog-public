import type { Variants } from 'motion/react'
import type { Theme } from '../types'
import type { WordRevealMode } from '../lyrics/renderHints'
import type { WordLayoutConfig } from './classicWordLayout'

// src/app/music/visualizer/classic/classicWordVariants.ts
// The three motion variant sets every Classic word animates through (waiting -> active -> passed)
// plus the whole-line breathing float. Kept apart from the renderer so the timing curves read as
// one unit; each variant resolver receives the word's `custom` payload typed below.

export interface ClassicWordVariantCustom {
	config: WordLayoutConfig
	activeColor: string
	baseColor: string
	duration: number
	wordRevealMode: WordRevealMode
	// Only the per-grapheme glow spans carry these.
	index?: number
	total?: number
	charStartTime?: number
	charEndTime?: number
	wordStartTime?: number
}

export interface ClassicWordVariants {
	layoutVariants: Variants
	bodyVariants: Variants
	glowVariants: Variants
}

interface BuildClassicWordVariantsOptions {
	enableWordRotation: boolean
	animationIntensity: Theme['animationIntensity']
}

export const buildClassicWordVariants = ({ enableWordRotation, animationIntensity }: BuildClassicWordVariantsOptions): ClassicWordVariants => {
	// Container motion is the "body" of each word.
	// waiting/active/passed all reuse the same layout config but interpret it differently.
	const layoutVariants: Variants = {
		waiting: ({ config }: ClassicWordVariantCustom) => ({
			opacity: 0,
			scale: 0.5,
			x: config.x + Math.sin(config.y) * 100,
			y: config.y + Math.cos(config.x) * 50,
			rotate: enableWordRotation ? config.rotate + 20 : 0,
			transition: { duration: 0.4 }
		}),
		active: ({ config }: ClassicWordVariantCustom) => ({
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
		passed: ({ config }: ClassicWordVariantCustom) => ({
			opacity: animationIntensity === 'chaotic' ? 0.9 : 0.82,
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
	}

	// Body layer is where color transition and blur cleanup happen.
	// Glow is separated so we can overdrive highlight without making the actual glyph unreadable.
	const bodyVariants: Variants = {
		waiting: ({ baseColor }: ClassicWordVariantCustom) => ({
			color: baseColor,
			filter: 'blur(10px)',
			transition: { duration: 0.4 }
		}),
		active: ({ activeColor, duration, wordRevealMode }: ClassicWordVariantCustom) => ({
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
		passed: ({ baseColor, wordRevealMode }: ClassicWordVariantCustom) => ({
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

	// Glow layer is transparent text + text-shadow only.
	// This is why active highlights can look large without changing the readable body thickness.
	const glowVariants: Variants = {
		waiting: {
			color: 'transparent',
			textShadow: 'none'
		},
		active: ({ activeColor, duration, index, total, charStartTime, charEndTime, wordStartTime, wordRevealMode }: ClassicWordVariantCustom) => {
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

			if (total !== undefined && total > 1) {
				const singleDuration = duration / total
				const hasCharTiming = typeof charStartTime === 'number' && typeof charEndTime === 'number' && typeof wordStartTime === 'number'
				const resolvedCharDuration = hasCharTiming ? charEndTime - charStartTime : 0
				const charDuration = hasCharTiming ? Math.max(resolvedCharDuration, 0.001) : singleDuration
				const charDelay = hasCharTiming ? Math.max(0, charStartTime - wordStartTime) : singleDuration * (index ?? 0)
				return {
					color: 'transparent',
					textShadow: ['none', `0 0 20px ${activeColor}, 0 0 40px ${activeColor}`, 'none'],
					transition: {
						duration: charDuration * 6, // stretch the fade over a few letters
						times: [0, 0.3, 1], // peak early, then fade
						delay: charDelay,
						ease: 'easeInOut'
					}
				}
			}
			return {
				color: 'transparent',
				textShadow: ['none', `0 0 20px ${activeColor}, 0 0 40px ${activeColor}`, `0 0 20px ${activeColor}, 0 0 40px ${activeColor}`],
				transition: {
					duration: duration || 0.1, // stretch the fade over the word duration
					times: [0, 0.9, 1], // peak early, then fade
					ease: 'easeInOut'
				}
			}
		},
		passed: ({ wordRevealMode }: ClassicWordVariantCustom) => ({
			color: 'transparent',
			textShadow: 'none',
			transition: { duration: wordRevealMode === 'instant' ? 0.12 : wordRevealMode === 'fast' ? 0.22 : 0.9, ease: 'easeOut' }
		})
	}

	return { layoutVariants, bodyVariants, glowVariants }
}

// Small whole-line breathing motion so the screen never feels fully static between word events.
export const buildClassicLyricContainerFloat = (multiplier: number, animationIntensity: Theme['animationIntensity']) => {
	if (multiplier <= 0) {
		return null
	}

	const configByIntensity = {
		calm: { distance: 10, duration: 8.5 },
		normal: { distance: 14, duration: 7 },
		chaotic: { distance: 18, duration: 5.8 }
	} as const

	const { distance, duration } = configByIntensity[animationIntensity]
	const scaledDistance = distance * multiplier

	return {
		animate: {
			y: [0, -scaledDistance, 0, scaledDistance * 0.45, 0],
			scale: [1, 1 + 0.01 * multiplier, 1, 1 - 0.005 * multiplier, 1]
		},
		transition: {
			duration,
			repeat: Infinity,
			ease: 'easeInOut' as const
		}
	}
}
