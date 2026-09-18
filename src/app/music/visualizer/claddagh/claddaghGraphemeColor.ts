import type { Line, Theme } from '../types'
import { mixColors } from '../colorMix'
import { clamp } from './claddaghTiming'
import type { CladdaghRingSpacingItem } from './claddaghSpacing'

// Per-grapheme color + glow writer for the Claddagh ring: snaps the glyph from the dimmed base color
// to its highlight color as playback crosses it ("camera flash"), and derives the text-shadow bloom
// from the focus factor F and the current beat power. Called once per grapheme per frame by the
// ring frame writer; writes straight to the DOM and never touches React state.

export interface CladdaghGraphemeColorContext {
	line: Line
	theme: Theme
	/** Normalized (0..1) beat power sampled for this frame. */
	power: number
	/** Focus factor: 1 for the active grapheme on the active line, 0 on the back of the ring. */
	F: number
	baseColor: string
	highlightColor: string
}

// Update text color and text shadow (glow) progressively based on character playback status
export const writeCladdaghGraphemeColor = (el: HTMLSpanElement, item: CladdaghRingSpacingItem, latestTime: number, context: CladdaghGraphemeColorContext) => {
	const { line, theme, power, F, baseColor, highlightColor } = context

	let charProgress = 0
	if (latestTime >= item.endTime) {
		charProgress = 1
	} else if (latestTime > item.startTime) {
		const dur = item.endTime - item.startTime
		charProgress = dur > 0 ? (latestTime - item.startTime) / dur : 1
	}

	// Calculate glow based on focus factor F and power.
	// Restored exact original radius formula for Image 1 look
	const baseGlow = line.isChorus ? (36 + power * 24) * Math.pow(F, 1.5) : 24 * Math.pow(F, 2.0)

	const finalHighlightColor = item.charColor || highlightColor

	// Color and alpha with "camera flash" effect
	let targetColor = baseColor
	let currentAlpha = 0.55
	let flashPop = 0

	if (charProgress >= 1) {
		targetColor = finalHighlightColor
		currentAlpha = 1.0
	} else if (charProgress > 0) {
		// Near-instant transition (hard cut) for the color snap
		const progressFactor = Math.min(1, charProgress * 15.0)
		currentAlpha = 0.55 + 0.45 * progressFactor
		targetColor = mixColors(baseColor, finalHighlightColor, progressFactor, currentAlpha)

		// A quick decaying pop on the radius to emphasize the flash
		if (charProgress < 0.4) {
			flashPop = Math.pow(1 - charProgress / 0.4, 2.0) * 0.65
		}
	}

	const currentGlowRadius = baseGlow * (1.0 + flashPop)

	el.style.color = targetColor

	// Calculate a smooth fade-out factor so the shadow doesn't abruptly pop when it hits the 0.5px threshold.
	// At radius 2.5+, it's 1.0 (full original intensity). At 0.5, it's 0.0 (completely transparent).
	const shadowFade = clamp((currentGlowRadius - 0.5) / 2.0, 0, 1)

	if (currentGlowRadius > 0.5 && shadowFade > 0.01) {
		// Fade the target color's alpha to ensure the outer shadow vanishes seamlessly
		const fadedTargetColor = mixColors(targetColor, targetColor, 0, currentAlpha * shadowFade)

		if (line.isChorus) {
			// Blend targetColor with the theme's primary text color to create a bright inner core.
			// We use shadowFade directly as the alpha so it blooms beautifully at 1.0 near the center,
			// but fades to invisible at the edges.
			const innerGlowColor = mixColors(targetColor, theme.primaryColor || '#ffffff', 0.65, shadowFade)

			// Restored exact multiplier ratios from Image 1 (0.35, 1.0, 1.6)
			el.style.textShadow = `0 0 ${(currentGlowRadius * 0.35).toFixed(1)}px ${innerGlowColor}, 0 0 ${currentGlowRadius.toFixed(1)}px ${fadedTargetColor}, 0 0 ${(currentGlowRadius * 1.6).toFixed(1)}px ${fadedTargetColor}`
		} else {
			// Restored exact multiplier ratio from Image 1
			el.style.textShadow = `0 0 ${currentGlowRadius.toFixed(1)}px ${fadedTargetColor}`
		}
	} else {
		el.style.textShadow = 'none'
	}
}
