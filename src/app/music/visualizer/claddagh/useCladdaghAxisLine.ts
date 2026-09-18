'use client'

import { useEffect, useRef, type RefObject } from 'react'
import type { MotionValue } from 'motion/react'
import type { Theme } from '../types'
import { colorWithAlpha, mixColors } from '../colorMix'

// Audio-responsive axis line: a single requestAnimationFrame loop repaints the center line's
// gradient, length and glow from the smoothed bass/vocal springs. The loop is bounded to the
// element's lifetime and cancelled in cleanup, so nothing keeps running once the mode unmounts.

interface UseCladdaghAxisLineOptions {
	axisLineRef: RefObject<HTMLDivElement | null>
	smoothedBass: MotionValue<number>
	smoothedVocal: MotionValue<number>
	normalizePower: (power: number) => number
	theme: Theme
	centerNormalTiltDeg: number
	paused: boolean
	isChorus: boolean
	showAxisLine: boolean
}

export const useCladdaghAxisLine = ({
	axisLineRef,
	smoothedBass,
	smoothedVocal,
	normalizePower,
	theme,
	centerNormalTiltDeg,
	paused,
	isChorus,
	showAxisLine
}: UseCladdaghAxisLineOptions) => {
	const glowIntensityRef = useRef(0)

	// Smoothly animate axis line color and scale in response to audio power
	useEffect(() => {
		const lineEl = axisLineRef.current
		if (!lineEl) return

		let frameId = 0

		const updateColors = () => {
			const bassPower = paused ? 0 : normalizePower(smoothedBass.get())
			const vocalPower = paused ? 0 : normalizePower(smoothedVocal.get())
			const fromColor = theme.primaryColor || '#ffffff'
			let toColor = theme.accentColor || '#ffffff'
			// If primary and accent are the same, try secondary
			if (toColor === fromColor && theme.secondaryColor) {
				toColor = theme.secondaryColor
			}
			// If still the same, mix with white to guarantee visual color change on beats
			if (toColor === fromColor) {
				toColor = '#ffffff'
			}

			// Color response (using maximum of bass and vocal energy for high responsiveness)
			const colorPower = Math.max(bassPower, vocalPower)
			const colorDelta = Math.max(0, colorPower - 0.02)
			const colorRatio = Math.min(1.0, colorDelta / 0.58)

			// Mix between fromColor and toColor, pulsing alpha from 0.2 to 0.95 (vivid color beat)
			const mixed = mixColors(fromColor, toColor, colorRatio, 0.2 + 0.75 * colorRatio)

			// Linear-gradient fades out the line at its top-left and bottom-right endpoints (20% and 80%)
			// so that the endpoints of the short segment are smoothly blurred/faded.
			const gradientString = `linear-gradient(90deg, transparent, ${mixed} 20%, ${mixed} 80%, transparent)`
			lineEl.style.background = gradientString
			lineEl.style.backgroundImage = gradientString

			// Square the bass power value to expand the dynamic range and prevent easy saturation for length scaling
			const bassSqr = bassPower * bassPower

			// Apply dynamic length scaling using scaleX and subtle thickness scaling using scaleY
			const scaleX = 1.0 + bassSqr * 1.5
			const scaleY = 1.0 + bassSqr * 0.5
			lineEl.style.transform = `translate(-50%, -50%) rotate(${centerNormalTiltDeg}deg) scale(${scaleX}, ${scaleY})`

			// Smoothly transition glow intensity (transition duration ~330ms at 60fps)
			const targetIntensity = isChorus ? 1.0 : 0.0
			const diff = targetIntensity - glowIntensityRef.current
			if (Math.abs(diff) > 0.01) {
				glowIntensityRef.current += Math.sign(diff) * 0.05
				glowIntensityRef.current = Math.max(0, Math.min(1, glowIntensityRef.current))
			} else {
				glowIntensityRef.current = targetIntensity
			}

			const glowIntensity = glowIntensityRef.current
			if (glowIntensity > 0.001) {
				const glowSize = (4 + bassPower * 12) * glowIntensity
				const glowColor = colorWithAlpha(mixed, glowIntensity)
				lineEl.style.filter = `drop-shadow(0 0 ${glowSize.toFixed(1)}px ${glowColor})`
			} else {
				lineEl.style.filter = 'none'
			}

			frameId = requestAnimationFrame(updateColors)
		}

		frameId = requestAnimationFrame(updateColors)

		return () => {
			cancelAnimationFrame(frameId)
		}
		// showAxisLine gates whether the element is mounted at all, so it must re-arm the loop.
	}, [smoothedBass, smoothedVocal, theme.primaryColor, theme.accentColor, theme.secondaryColor, centerNormalTiltDeg, paused, isChorus, showAxisLine])
}
