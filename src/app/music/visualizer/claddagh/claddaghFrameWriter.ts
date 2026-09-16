import type { MotionValue } from 'motion/react'
import type { Line, Theme } from '../types'
import { clamp, getLinePlaybackProgress, getLineWordOffset, getVisualLength, normalizeReadableAngle } from './claddaghTiming'
import type { CladdaghActiveSpacingItem, CladdaghRingSpacingItem } from './claddaghSpacing'
import { writeCladdaghGraphemeColor } from './claddaghGraphemeColor'

// Per-frame driver for one ring line: projects every grapheme onto the tilted ellipse and writes
// transform / opacity / filter straight to the DOM, then hands each glyph to the grapheme color
// writer for color / text-shadow. Runs on every currentTime or lineOffset change, so nothing here
// may touch React state.

const CLADDAGH_BACK_FOLLOW_RATIO = 0.28
const CLADDAGH_BACK_ORBIT_FOLLOW_RATIO = 0.52
export const CLADDAGH_NEXT_LINE_ENTRY_LEAD_SECONDS = 0.34

export interface CladdaghRingFrameParams {
	spacingInfo: CladdaghRingSpacingItem[]
	charRefs: { current: Array<HTMLSpanElement | null> }
	line: Line
	lineIndex: number
	centerLineIndex: number
	lineOffset: MotionValue<number>
	/** Normalized (0..1) beat power sampled by the owning line for this frame. */
	power: number
	theme: Theme
	baseColor: string
	highlightColor: string
	baseFontSize: number
	Rx: number
	Ry: number
	lines: Line[]
	activeSpacingInfo: CladdaghActiveSpacingItem[]
	renderBaseIndex: number
	focusScaleRatio?: number
	ellipseTiltDeg?: number
}

export const writeCladdaghRingFrame = (params: CladdaghRingFrameParams, latestTime: number) => {
	const {
		spacingInfo,
		charRefs,
		line,
		lineIndex,
		centerLineIndex,
		lineOffset,
		power,
		theme,
		baseColor,
		highlightColor,
		baseFontSize,
		Rx,
		Ry,
		lines,
		activeSpacingInfo,
		renderBaseIndex,
		focusScaleRatio,
		ellipseTiltDeg
	} = params

	const mvsLength = spacingInfo.length
	if (mvsLength === 0) return

	const curLineOffset = lineOffset.get()
	const intensity = theme.animationIntensity || 'normal'
	let intensityMultiplier = 0.25
	let maxScale = 1.25

	if (intensity === 'calm') {
		intensityMultiplier = 0.08
		maxScale = 1.08
	} else if (intensity === 'chaotic') {
		intensityMultiplier = 0.95
		maxScale = 1.95
	}

	// Scale radius, bounded to avoid excessive translation
	const scaleFactor = Math.min(1 + power * intensityMultiplier, maxScale)
	const currentRx = Rx * scaleFactor
	const currentRy = Ry * scaleFactor

	const isUpcomingLine = lineIndex > centerLineIndex
	const upcomingEntryProgress = isUpcomingLine
		? clamp((latestTime - (line.startTime - CLADDAGH_NEXT_LINE_ENTRY_LEAD_SECONDS)) / CLADDAGH_NEXT_LINE_ENTRY_LEAD_SECONDS, 0, 1)
		: 0
	const lineDiffFromCenter = Math.abs(curLineOffset - lineIndex * Math.PI) / Math.PI

	// Calculate overlap mitigation factors based on current and next line lengths
	const currentLine = lines[centerLineIndex]
	const currentLen = currentLine ? getVisualLength(currentLine.fullText) : 0
	const targetLine = lines[lineIndex]
	const targetLen = targetLine ? getVisualLength(targetLine.fullText) : 0

	let lengthFadeFactor = 1.0
	let lengthScaleFactor = 1.0

	if (lineIndex > centerLineIndex && currentLen > 10) {
		const fadeStrength = clamp((currentLen - 10) / 8, 0, 1)
		const targetStrength = clamp((targetLen - 5) / 5, 0.4, 1)
		const combinedStrength = fadeStrength * targetStrength

		const targetMinOpacity = 1.0 - combinedStrength
		const targetMinScale = 1.0 - combinedStrength * 0.25

		const transitionProgress = clamp((lineDiffFromCenter - 0.4) / 0.5, 0, 1)

		lengthFadeFactor = 1.0 - (1.0 - targetMinOpacity) * transitionProgress
		lengthScaleFactor = 1.0 - (1.0 - targetMinScale) * transitionProgress
	}
	const activeLine = lines[renderBaseIndex]
	const activeNextLine = lines[renderBaseIndex + 1]
	// Extend the render end time to the next line's start time (minus lead time) so the ring slowly drifts
	// continuously during instrumental gaps, while leaving time for the next line's entry animation.
	const activeRenderEnd = activeLine
		? Math.max(
				activeLine.renderHints?.renderEndTime ?? activeLine.endTime,
				activeNextLine ? activeNextLine.startTime - CLADDAGH_NEXT_LINE_ENTRY_LEAD_SECONDS : activeLine.endTime + 10.0
			)
		: undefined

	const nextLine = lines[lineIndex + 1]
	const ownRenderEnd = Math.max(
		line.renderHints?.renderEndTime ?? line.endTime,
		nextLine ? nextLine.startTime - CLADDAGH_NEXT_LINE_ENTRY_LEAD_SECONDS : line.endTime + 10.0
	)

	const activeWordOffset = getLineWordOffset(activeSpacingInfo, latestTime, activeRenderEnd)
	const ownWordOffset = getLineWordOffset(spacingInfo, latestTime, ownRenderEnd)
	const activeLineProgress = getLinePlaybackProgress(activeSpacingInfo, latestTime, activeRenderEnd)
	const backOrbitFollow = Math.PI * CLADDAGH_BACK_ORBIT_FOLLOW_RATIO * (1 - Math.pow(1 - activeLineProgress, 1.35))
	let wordOffset = ownWordOffset
	if (lineIndex < centerLineIndex) {
		// Past lines keep their own completed word offset instead of
		// tracking the new active line, to avoid snapping back to 0.
	} else {
		// Use lineDiffFromCenter as a continuous blend factor so the
		// back-follow contribution fades out smoothly during the spring
		// rotation, instead of jumping to 0 when renderBaseIndex updates.
		const backFollowFactor = lineIndex > centerLineIndex ? 1 : clamp(lineDiffFromCenter, 0, 1)
		wordOffset += (activeWordOffset * CLADDAGH_BACK_FOLLOW_RATIO + backOrbitFollow) * backFollowFactor
	}

	const R_ref = currentRx
	const R_major = currentRx
	const R_minor = currentRx * 0.09 // Squashed minor axis for a slender ellipse (matching orange design)

	for (let i = 0; i < mvsLength; i++) {
		const el = charRefs.current[i]
		if (!el) continue

		const item = spacingInfo[i]
		const nominalAngle = item.nominalAngle

		const theta = lineIndex * Math.PI + nominalAngle // Spacing by 180 degrees
		const psi = theta - curLineOffset - wordOffset

		// deltaDist is the linear distance along the arc in pixels
		const deltaDist = psi * R_ref

		// Angle along the major axis
		const thetaCurve = deltaDist / R_major

		// Calculate depth factor D (1 in the front, 0 in the back) based on ellipse curve position
		const localCos = Math.cos(thetaCurve)
		const D = (localCos + 1) / 2

		// Scale character spacing along the major axis by depth to make back characters gather closer together
		const spacingFactor = 0.35 + 0.65 * Math.pow(D, 1.2)

		// Ellipse positions centered at origin (0, 0)
		// Active character (psi = 0) is at (0, R_minor) before rotation
		const rawX = Math.sin(thetaCurve) * R_major * spacingFactor

		let rawY = localCos * R_minor
		if (line.isChorus) {
			// Alternating vertical stagger that pushes even/odd indices up/down, pulsing with beat power
			const staggerAmount = baseFontSize * (0.06 + power * 0.12)
			rawY += (i % 2 === 0 ? 1 : -1) * staggerAmount
		}

		// Rotate the coordinate system by exactly -ellipseTiltDeg degrees
		// so the major axis aligns exactly with the screen's anti-diagonal.
		const thetaRot = -((ellipseTiltDeg ?? 45) * Math.PI) / 180
		const cosTheta = Math.cos(thetaRot)
		const sinTheta = Math.sin(thetaRot)

		const x = rawX * cosTheta - rawY * sinTheta
		const y = rawX * sinTheta + rawY * cosTheta

		const tangentX = Math.cos(thetaCurve) * R_major
		const tangentY = -Math.sin(thetaCurve) * R_minor
		const rotatedTangentX = tangentX * cosTheta - tangentY * sinTheta
		const rotatedTangentY = tangentX * sinTheta + tangentY * cosTheta
		const tangentAngle = normalizeReadableAngle((Math.atan2(rotatedTangentY, rotatedTangentX) * 180) / Math.PI)

		// Calculate the focus factor F:
		// F ranges from 1 (active character on active line) to 0 (back side of the ring / far away)
		const lineDiffNormalized = lineDiffFromCenter
		const activeLineFactor = Math.max(0, 1 - lineDiffNormalized)

		const maxVisibleDist = currentRx * 0.48 // Focus width for active line
		const distRatio = Math.min(1, Math.abs(deltaDist) / maxVisibleDist)
		const F = activeLineFactor * Math.pow(1 - distRatio, 1.8)

		// Blend visual properties using depth factor D and focus factor F for a pseudo-3D look
		// Active character (D=1, F=1) is largest and sharpest.
		// Background characters (D=0, F=0) stay visible while still feeling distant.
		const distanceOpacity = 0.68 + 0.32 * Math.pow(D, 1.9)
		let finalOpacity = (0.35 + 0.65 * Math.pow(D, 1.5) * (0.35 + 0.65 * F)) * distanceOpacity

		// Hide the next line while it is still equivalent to the outgoing line's foreground turn.
		const lineWindowFade = clamp(2 - lineDiffNormalized, 0, 1)
		finalOpacity = finalOpacity * lineWindowFade

		// Hide past lines completely when the transition is done to prevent overlapping in the background
		if (lineIndex < centerLineIndex) {
			const pastFade = Math.max(0, 1 - lineDiffNormalized)
			finalOpacity = finalOpacity * pastFade
		}

		// Apply dynamic layout overlap mitigation factors based on sentence lengths
		finalOpacity = finalOpacity * lengthFadeFactor

		if (isUpcomingLine) {
			finalOpacity = finalOpacity * (0.18 + 0.82 * upcomingEntryProgress)
		}

		// Boundary fade to keep non-focused lines strictly in the back half of the ellipse
		let boundaryFade = 1.0
		if (lineDiffFromCenter > 0.02) {
			const progress = clamp((lineDiffFromCenter - 0.3) / 0.6, 0, 1)
			const cosThreshold = 1.0 - 1.2 * progress
			if (localCos > cosThreshold) {
				boundaryFade = clamp(1.0 - (localCos - cosThreshold) / 0.15, 0, 1)
			}
		}
		finalOpacity = finalOpacity * boundaryFade

		const scale = (0.22 + 0.98 * Math.pow(D, 1.5)) * (1.0 + (focusScaleRatio ?? 0.65) * F) * lengthScaleFactor * (item.scaleFactor ?? 1.0)
		const blur = 8.0 * (1 - D) * (1 - 0.5 * F)
		const tiltAngle = clamp(tangentAngle * (0.4 + 0.6 * D), -38, 38)

		el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0px) rotate(${tiltAngle.toFixed(2)}deg) scale(${scale.toFixed(3)})`
		el.style.opacity = finalOpacity.toFixed(3)
		el.style.filter = blur < 0.2 ? 'none' : `blur(${blur.toFixed(2)}px)`

		// Update text color and text shadow (glow) progressively based on character playback status
		writeCladdaghGraphemeColor(el, item, latestTime, { line, theme, power, F, baseColor, highlightColor })
	}
}
