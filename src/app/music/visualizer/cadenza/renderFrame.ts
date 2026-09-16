'use client'

import type { MotionValue } from 'motion/react'
import { colorWithAlpha, mixColors } from '../colorMix'
import type { CadenzaTuning, Line, Theme } from '../types'
import type { AnimatedPlacementState, OverlayWordNodes, PreparedState } from './types'
import { buildDomTextShadow, clearOverlayWordNodes, createOverlayWordNodes, syncOverlayGlyphSpans } from './overlayWord'
import { ACTIVE_PULSE_FREQUENCY, clamp, isCJK, mix, splitGraphemes } from './textUtils'
import {
	getClassicBodyMix,
	getClassicCharGlow,
	getClassicGlowEnvelope,
	getClassicLineEnvelope,
	getClassicPassedDrift,
	getWordProgress,
	getWordStatus,
	resolveLineRenderTiming
} from './wordTiming'

// src/app/music/visualizer/cadenza/renderFrame.ts
// The per-frame driver. Reads `currentTime` directly, eases every placement toward its target
// state, then mirrors the result into the DOM overlay (text + glow) and the canvas (chorus ripple).
// Nothing here touches React state: the component only hands over refs and the current inputs.

export interface CadenzaFrameLoopDeps {
	textCanvas: HTMLCanvasElement
	lineLayer: HTMLDivElement
	overlay: HTMLDivElement
	viewport: { width: number; height: number }
	showText: boolean
	preparedState: PreparedState | null
	activeLine: Line | null
	currentTime: MotionValue<number>
	audioPower: MotionValue<number>
	theme: Theme
	tuning: Pick<CadenzaTuning, 'glowIntensity' | 'motionAmount'>
	animatedPlacementRef: { current: Map<string, AnimatedPlacementState> }
	overlayNodesRef: { current: Map<string, OverlayWordNodes> }
	lastFrameTimeRef: { current: number | null }
}

// Starts the requestAnimationFrame loop and returns its cleanup. Mirrors the upstream effect body.
export const startCadenzaFrameLoop = (deps: CadenzaFrameLoopDeps): (() => void) => {
	const { textCanvas, lineLayer, overlay, viewport, showText, preparedState, activeLine, currentTime, audioPower, theme, tuning } = deps
	const { animatedPlacementRef, overlayNodesRef, lastFrameTimeRef } = deps

	let frameId = 0
	const textContext = textCanvas.getContext('2d')
	if (!textContext) return () => {}

	const draw = () => {
		const now = performance.now()
		const dt = lastFrameTimeRef.current === null ? 1 / 60 : clamp((now - lastFrameTimeRef.current) / 1000, 1 / 240, 0.05)
		lastFrameTimeRef.current = now
		const width = Math.max(Math.floor(viewport.width), 1)
		const height = Math.max(Math.floor(viewport.height), 1)
		const dpr = window.devicePixelRatio || 1

		if (textCanvas.width !== Math.floor(width * dpr) || textCanvas.height !== Math.floor(height * dpr)) {
			textCanvas.width = Math.floor(width * dpr)
			textCanvas.height = Math.floor(height * dpr)
			textCanvas.style.width = `${width}px`
			textCanvas.style.height = `${height}px`
		}

		textContext.setTransform(dpr, 0, 0, dpr, 0, 0)
		textContext.clearRect(0, 0, width, height)

		if (!showText || !preparedState || !activeLine) {
			lineLayer.style.opacity = '0'
			lineLayer.style.filter = 'none'
			lineLayer.style.transform = 'scale(1)'
			lineLayer.style.perspective = '1000px'
			clearOverlayWordNodes(overlayNodesRef.current)
			frameId = window.requestAnimationFrame(draw)
			return
		}

		const time = currentTime.get()
		const lineTiming = resolveLineRenderTiming(activeLine)
		const lineEnvelope = getClassicLineEnvelope(time, activeLine, lineTiming)
		const wordRevealMode = lineTiming.wordRevealMode
		const isInstantWordReveal = wordRevealMode === 'instant'
		const lineSeed = Math.abs(Math.sin(activeLine.startTime * 997.1))
		const linePerspective = theme.animationIntensity === 'chaotic' ? 500 + Math.round(lineSeed * 500) : 1000
		const energy = clamp(audioPower.get() / 255, 0, 1)
		const motionEnergy = energy * tuning.motionAmount
		const verticalLift = Math.sin(time * 2.3) * (3 + motionEnergy * 8)
		const focusY = height * 0.42 + verticalLift

		lineLayer.style.opacity = lineEnvelope.opacity.toString()
		lineLayer.style.filter = lineEnvelope.blur > 0.05 ? `blur(${lineEnvelope.blur.toFixed(2)}px)` : 'none'
		lineLayer.style.transform = `scale(${lineEnvelope.scale})`
		lineLayer.style.perspective = `${linePerspective}px`

		textContext.font = preparedState.font
		textContext.textBaseline = 'alphabetic'
		textContext.lineJoin = 'round'
		textContext.lineCap = 'round'

		const placements = [...preparedState.placements].sort((a, b) => {
			const order = { waiting: 0, passed: 1, active: 2 } as const
			return order[getWordStatus(time, lineTiming, a.word)] - order[getWordStatus(time, lineTiming, b.word)]
		})
		const placementIds = new Set(placements.map(placement => placement.id))
		const overlayNodes = overlayNodesRef.current
		const usedOverlayIds = new Set<string>()

		placements.forEach((placement, placementIndex) => {
			const status = getWordStatus(time, lineTiming, placement.word)
			const progress = getWordProgress(time, wordRevealMode, placement.word)
			const passedAlpha = isInstantWordReveal ? 0 : theme.animationIntensity === 'chaotic' ? 0.9 : 0.82
			const pulse =
				status === 'active' && !isInstantWordReveal
					? 1 + Math.sin(time * ACTIVE_PULSE_FREQUENCY + placement.word.startTime * 5) * 0.04 * tuning.motionAmount
					: 1
			const passedDriftProgress = isInstantWordReveal ? 0 : getClassicPassedDrift(time, placement.word)
			const targetScale =
				status === 'waiting'
					? isInstantWordReveal
						? placement.scale
						: Math.max(placement.scale * 0.5, 0.5)
					: status === 'active'
						? isInstantWordReveal
							? placement.scale
							: placement.scale * 1.3 * pulse
						: placement.scale
			const targetRotation =
				status === 'waiting'
					? isInstantWordReveal
						? placement.rotate
						: placement.rotate + 20
					: status === 'passed'
						? isInstantWordReveal
							? placement.rotate
							: placement.rotate + placement.passedRotate * passedDriftProgress
						: placement.rotate
			const localFloatX = Math.sin(time * 1.2 + placementIndex * 0.6) * motionEnergy * 4
			const localFloatY = Math.cos(time * 1.5 + placementIndex * 0.4) * motionEnergy * 2.5
			const passedDriftX = status === 'passed' ? placement.passedDriftX * passedDriftProgress : 0
			const passedDriftY = status === 'passed' ? placement.passedDriftY * passedDriftProgress : 0
			const targetX = width / 2 + placement.x + localFloatX + passedDriftX + (status === 'waiting' ? placement.entryOffsetX : 0)
			const targetY = focusY + placement.y + localFloatY + passedDriftY + (status === 'waiting' ? placement.entryOffsetY : 0)
			const targetBodyAlpha = status === 'waiting' ? 0 : status === 'active' ? 1 : passedAlpha
			const targetBlur = status === 'waiting' && !isInstantWordReveal ? 10 : 0
			const targetActiveMix = getClassicBodyMix(time, lineTiming, placement.word)
			const targetGlowAlpha = getClassicGlowEnvelope(time, lineTiming, placement.word)
			const transformTransitionAmount = 1 - Math.exp(-11 * dt)
			const visualTransitionAmount = 1 - Math.exp(-14 * dt)
			const stateMap = animatedPlacementRef.current
			const existingState = stateMap.get(placement.id)
			const shouldInitializeAsActive = isInstantWordReveal && time >= placement.word.startTime
			const animatedState = existingState ?? {
				x: width / 2 + placement.x + placement.entryOffsetX,
				y: focusY + placement.y + placement.entryOffsetY,
				rotation: shouldInitializeAsActive ? targetRotation : targetRotation + 16,
				scale: shouldInitializeAsActive ? targetScale : Math.max(placement.scale * 0.5, 0.5),
				bodyAlpha: shouldInitializeAsActive ? targetBodyAlpha : 0,
				blur: shouldInitializeAsActive ? targetBlur : 10,
				activeMix: shouldInitializeAsActive ? targetActiveMix : 0,
				glowAlpha: shouldInitializeAsActive ? targetGlowAlpha : 0
			}

			animatedState.x = mix(animatedState.x, targetX, transformTransitionAmount)
			animatedState.y = mix(animatedState.y, targetY, transformTransitionAmount)
			animatedState.rotation = mix(animatedState.rotation, targetRotation, transformTransitionAmount)
			animatedState.scale = mix(animatedState.scale, targetScale, transformTransitionAmount)
			animatedState.bodyAlpha = mix(animatedState.bodyAlpha, targetBodyAlpha, visualTransitionAmount)
			animatedState.blur = mix(animatedState.blur, targetBlur, visualTransitionAmount)
			animatedState.activeMix = mix(animatedState.activeMix, targetActiveMix, visualTransitionAmount)
			animatedState.glowAlpha = mix(animatedState.glowAlpha, targetGlowAlpha, 1 - Math.exp(-16 * dt))
			stateMap.set(placement.id, animatedState)

			if (animatedState.bodyAlpha < 0.015 && animatedState.glowAlpha < 0.015) {
				return
			}

			const drawX = animatedState.x
			const drawBaselineY = animatedState.y
			const visualWidth = placement.width * animatedState.scale
			const visualHeight = placement.height * animatedState.scale
			const highlightHeight = visualHeight * (status === 'active' ? 1.08 : 1)
			const scaledLeft = drawX - (visualWidth - placement.width) / 2
			if (status === 'active' && !placement.isInterlude) {
				if (activeLine.isChorus) {
					const rippleRadius = Math.max(visualWidth, highlightHeight) * (0.55 + progress * 0.45)
					textContext.strokeStyle = colorWithAlpha(placement.color, 0.45 * (1 - progress) * animatedState.bodyAlpha)
					textContext.lineWidth = 1.2
					textContext.beginPath()
					textContext.arc(scaledLeft + visualWidth / 2, drawBaselineY - visualHeight * 0.42, rippleRadius, 0, Math.PI * 2)
					textContext.stroke()
				}
			}

			const textX = -placement.width / 2
			const textY = placement.height * 0.42
			const textColor = mixColors(theme.primaryColor, placement.color, animatedState.activeMix)

			const overlayAnchorX = drawX + placement.width / 2
			const overlayAnchorY = drawBaselineY - placement.height * 0.42
			const overlayOffsetX = textX
			const textMetrics = textContext.measureText(placement.text)
			const measuredAscent = textMetrics.actualBoundingBoxAscent || preparedState.fontPx * 0.78
			const overlayOffsetY = textY - measuredAscent
			const glyphs = splitGraphemes(placement.text)
			const shouldSplitGlow = wordRevealMode === 'normal' && !isCJK(placement.text) && glyphs.length > 1
			const blurScale = 1 + energy * 0.22
			usedOverlayIds.add(placement.id)
			let overlayWord = overlayNodes.get(placement.id)
			if (!overlayWord) {
				overlayWord = createOverlayWordNodes()
				overlayNodes.set(placement.id, overlayWord)
				overlay.appendChild(overlayWord.outer)
			}

			overlayWord.outer.style.transform = `translate3d(${overlayAnchorX}px, ${overlayAnchorY}px, 0) rotate(${animatedState.rotation}deg) scale(${animatedState.scale})`
			overlayWord.outer.style.transformOrigin = '0 0'
			overlayWord.inner.style.font = preparedState.font
			overlayWord.inner.style.transform = `translate3d(${overlayOffsetX}px, ${overlayOffsetY}px, 0)`
			overlayWord.body.textContent = placement.text
			overlayWord.body.style.color = textColor
			overlayWord.body.style.opacity = animatedState.bodyAlpha.toString()
			overlayWord.body.style.filter = animatedState.blur > 0.05 ? `blur(${animatedState.blur.toFixed(2)}px)` : 'none'

			const glowTexts = shouldSplitGlow ? glyphs : [placement.text]
			syncOverlayGlyphSpans(overlayWord, glowTexts)

			if (shouldSplitGlow) {
				overlayWord.glyphSpans.forEach((glyphSpan, glyphIndex) => {
					const absoluteIndex = placement.fragmentStartInWord + glyphIndex
					const intensity =
						getClassicCharGlow(time, placement.word, absoluteIndex, Math.max(placement.wordGraphemeCount, glyphs.length), placement.wordGraphemeTimings) *
						clamp(animatedState.glowAlpha, 0, 1) *
						Math.max(tuning.glowIntensity, 0)

					glyphSpan.style.textShadow = buildDomTextShadow(placement.color, intensity, blurScale)
				})
			} else if (overlayWord.glyphSpans[0]) {
				const intensity = getClassicGlowEnvelope(time, lineTiming, placement.word) * clamp(animatedState.glowAlpha, 0, 1) * Math.max(tuning.glowIntensity, 0)
				overlayWord.glyphSpans[0].style.textShadow = buildDomTextShadow(placement.color, intensity, blurScale)
			}
		})

		animatedPlacementRef.current.forEach((_value, key) => {
			if (!placementIds.has(key)) {
				animatedPlacementRef.current.delete(key)
			}
		})

		overlayNodes.forEach((nodes, key) => {
			if (!usedOverlayIds.has(key)) {
				nodes.outer.remove()
				overlayNodes.delete(key)
			}
		})

		frameId = window.requestAnimationFrame(draw)
	}

	draw()
	return () => {
		window.cancelAnimationFrame(frameId)
		lastFrameTimeRef.current = null
		clearOverlayWordNodes(overlayNodesRef.current)
	}
}
