'use client'

import { colorWithAlpha } from '../colorMix'
import type { WordPlacement } from './types'
import { clamp, isCJK, splitGraphemes } from './textUtils'

// src/app/music/visualizer/cadenza/canvasPaint.ts
// Canvas glow/beam painters. Upstream 0.5.27 renders word glow through the DOM overlay and only
// strokes the chorus ripple on canvas, so the frame driver does not call the beam/trail painters
// today; they are kept verbatim so the canvas path (and `tuning.beamIntensity`) stays available.

export const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
	const r = Math.min(radius, width / 2, height / 2)
	ctx.beginPath()
	ctx.moveTo(x + r, y)
	ctx.arcTo(x + width, y, x + width, y + height, r)
	ctx.arcTo(x + width, y + height, x, y + height, r)
	ctx.arcTo(x, y + height, x, y, r)
	ctx.arcTo(x, y, x + width, y, r)
	ctx.closePath()
}

export const drawActiveBeam = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	color: string,
	energy: number,
	beamIntensity: number
) => {
	if (beamIntensity <= 0.01) {
		return
	}

	const intensity = clamp(beamIntensity, 0, 1.2)
	const beamHeight = Math.max(2, height * (0.05 + energy * 0.03) * Math.max(intensity, 0.12))
	const beamY = y + height * 0.78
	const gradient = ctx.createLinearGradient(x, beamY, x + width, beamY)
	gradient.addColorStop(0, colorWithAlpha(color, 0))
	gradient.addColorStop(0.2, colorWithAlpha(color, (0.16 + energy * 0.06) * intensity))
	gradient.addColorStop(0.8, colorWithAlpha(color, (0.16 + energy * 0.06) * intensity))
	gradient.addColorStop(1, colorWithAlpha(color, 0))
	ctx.fillStyle = gradient
	drawRoundedRect(ctx, x, beamY, width, beamHeight, beamHeight / 2)
	ctx.fill()

	if (intensity > 0.42) {
		ctx.fillStyle = colorWithAlpha(color, 0.22 * intensity)
		ctx.beginPath()
		ctx.arc(x + 2, beamY + beamHeight / 2, beamHeight / 1.8, 0, Math.PI * 2)
		ctx.arc(x + width - 2, beamY + beamHeight / 2, beamHeight / 1.8, 0, Math.PI * 2)
		ctx.fill()
	}
}

export const drawShadowGlowText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, blur: number, intensity: number) => {
	if (intensity <= 0 || blur <= 0 || !text) {
		return
	}

	const glowStrength = clamp(intensity, 0, 2.6)
	const blurScale = Math.max(blur / 20, 0.85)
	const innerBlur = 20 * blurScale
	const outerBlur = 40 * blurScale

	ctx.save()
	ctx.globalCompositeOperation = 'lighter'

	// Approximate classic: text-shadow: 0 0 20px color, 0 0 40px color
	ctx.shadowColor = colorWithAlpha(color, Math.min(0.98, 0.76 + glowStrength * 0.1))
	ctx.shadowBlur = innerBlur
	ctx.fillStyle = colorWithAlpha(color, 0.11 * glowStrength)
	ctx.fillText(text, x, y)

	ctx.shadowColor = colorWithAlpha(color, Math.min(0.88, 0.42 + glowStrength * 0.1))
	ctx.shadowBlur = outerBlur
	ctx.fillStyle = colorWithAlpha(color, 0.075 * glowStrength)
	ctx.fillText(text, x, y)

	// A faint outer air layer so the 40px glow does not end abruptly.
	ctx.shadowColor = colorWithAlpha(color, Math.min(0.42, 0.18 + glowStrength * 0.06))
	ctx.shadowBlur = outerBlur * 1.45
	ctx.fillStyle = colorWithAlpha(color, 0.018 * glowStrength)
	ctx.fillText(text, x, y)
	ctx.restore()
}

export const chosenAngleForEntry = (first: number, second: number, seed: number) => first * 0.015 + second * 0.008 + seed * 0.13

export const drawGlowTrailText = (
	ctx: CanvasRenderingContext2D,
	placement: WordPlacement,
	x: number,
	y: number,
	progress: number,
	color: string,
	energy: number,
	glowAlpha: number,
	glowIntensity: number
) => {
	if (glowAlpha <= 0.01 || glowIntensity <= 0.01 || !placement.text) {
		return
	}

	const graphemes = splitGraphemes(placement.text)
	if (graphemes.length <= 1 || isCJK(placement.text)) {
		const wordGlow = (0.95 + Math.min(progress, 0.4) * 0.35) * glowIntensity
		drawShadowGlowText(ctx, placement.text, x, y, color, (24 + energy * 16) * Math.max(glowIntensity, 0.45), wordGlow)
		return
	}

	const totalGraphemeCount = Math.max(placement.wordGraphemeCount, graphemes.length)
	const head = clamp(progress, 0, 1) * (totalGraphemeCount + 0.35)
	let cursorX = x

	graphemes.forEach((grapheme, graphemeIndex) => {
		const absoluteIndex = placement.fragmentStartInWord + graphemeIndex
		const distanceFromHead = head - absoluteIndex
		const measure = ctx.measureText(grapheme)

		if (distanceFromHead > -0.75 && distanceFromHead < 5.2) {
			const lead = clamp(1 - Math.abs(distanceFromHead - 0.2) / 0.9, 0, 1)
			const tail = distanceFromHead >= 0 ? clamp(1 - distanceFromHead / 4.4, 0, 1) : 0
			const shimmer = clamp(0.18 + lead * 0.92 + tail * 0.45, 0, 1.35)
			const blur = (18 + energy * 16) * (0.75 + lead * 0.9 + tail * 0.45) * Math.max(glowIntensity, 0.45)

			drawShadowGlowText(ctx, grapheme, cursorX, y, color, blur, shimmer * glowIntensity)
		}

		cursorX += measure.width
	})
}
