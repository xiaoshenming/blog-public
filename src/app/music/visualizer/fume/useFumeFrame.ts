'use client'

import { useEffect, useRef, useState } from 'react'
import type { MotionValue } from 'motion/react'
import type { FumeBackgroundScene } from '../FumeBackground'
import type { AudioBands, FumeTuning, Line, Theme } from '../types'
import type { CameraRetargetState, CameraTarget, CameraViewTarget, FumeArticleLayout, StaticBlockSnapshot, ViewportSize } from './fumeTypes'
import { createFumeBackgroundAudioLevels, drawFumeBackgroundFallback, drawFumeBackgroundParallax } from './fumeBackgroundBridge'
import { integrateFumeCameraMotion } from './fumeCameraMotion'
import { paintFumeBlocks } from './fumeBlockPaint'
import { createInitialFumeCameraRetarget, createInitialFumeCameraTarget, planFumeCameraFrame, syncFumeCameraToArticle } from './fumeFrameCamera'
import { syncFumeCanvasSize } from './fumeDrawHelpers'
import { clamp } from './fumeUtils'

// src/app/music/visualizer/fume/useFumeFrame.ts
// The per-frame driver of the Fume renderer. Owns the camera/retarget refs, the print-state
// one-shot and the static-block snapshot cache, and runs one requestAnimationFrame loop that:
// sizes the canvas, plans + integrates the camera, draws background and article world space,
// then paints every block. Everything visual per frame funnels through here.

interface UseFumeFrameOptions {
	canvasRef: React.RefObject<HTMLCanvasElement | null>
	currentTime: MotionValue<number>
	currentLineIndex: number
	lines: Line[]
	theme: Theme
	viewport: ViewportSize
	article: FumeArticleLayout | null
	backgroundScene: FumeBackgroundScene
	overviewCamera: CameraViewTarget | null
	overviewStartTime: number
	audioPower: MotionValue<number>
	audioBands: AudioBands
	cameraTrackingMode: FumeTuning['cameraTrackingMode']
	cameraSpeed: number
	glowIntensity: number
	backgroundObjectOpacity: number
	showPrintStamp: boolean
	textHoldRatio: number
	passedFadeDuration: number
	showText: boolean
	staticMode: boolean
	paused: boolean
}

export const useFumeFrame = ({
	canvasRef,
	currentTime,
	currentLineIndex,
	lines,
	theme,
	viewport,
	article,
	backgroundScene,
	overviewCamera,
	overviewStartTime,
	audioPower,
	audioBands,
	cameraTrackingMode,
	cameraSpeed,
	glowIntensity,
	backgroundObjectOpacity,
	showPrintStamp,
	textHoldRatio,
	passedFadeDuration,
	showText,
	staticMode,
	paused
}: UseFumeFrameOptions) => {
	const [hasPrintedContent, setHasPrintedContent] = useState(false)
	const hasPrintedContentRef = useRef(false)
	const currentLineIndexRef = useRef(currentLineIndex)
	const cameraInitializedRef = useRef(false)
	const cameraRetargetRef = useRef<CameraRetargetState>(createInitialFumeCameraRetarget())
	const cameraRef = useRef<CameraTarget>(createInitialFumeCameraTarget())
	const staticBlockSnapshotCacheRef = useRef<Map<string, StaticBlockSnapshot>>(new Map())

	useEffect(() => {
		currentLineIndexRef.current = currentLineIndex
	}, [currentLineIndex])

	useEffect(() => {
		staticBlockSnapshotCacheRef.current.clear()
	}, [article, theme.name, theme.primaryColor, theme.secondaryColor, theme.accentColor, theme.fontStyle, theme.fontFamily, theme.fontFamilyStack])

	useEffect(() => {
		hasPrintedContentRef.current = false
		setHasPrintedContent(false)
	}, [article])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) {
			return
		}

		const context = canvas.getContext('2d')
		if (!context) {
			return
		}

		syncFumeCanvasSize(canvas, context, viewport)

		syncFumeCameraToArticle(cameraRef, cameraInitializedRef, article)

		let frameId = 0
		let lastFrameAt: number | null = null

		const draw = () => {
			const now = performance.now()
			const dt = lastFrameAt === null ? 1 / 60 : clamp((now - lastFrameAt) / 1000, 1 / 240, 0.05)
			lastFrameAt = now

			syncFumeCanvasSize(canvas, context, viewport)

			const time = currentTime.get()
			const viewportCenterX = viewport.width * 0.5
			const viewportCenterY = viewport.height * 0.5
			const fumeBackgroundAudioLevels = createFumeBackgroundAudioLevels(audioPower, audioBands)

			if (!article) {
				if (!staticMode) {
					drawFumeBackgroundFallback({
						context,
						scene: backgroundScene,
						theme,
						time,
						now,
						audioLevels: fumeBackgroundAudioLevels,
						objectOpacityMultiplier: backgroundObjectOpacity,
						viewport
					})
				}

				if (!paused) {
					frameId = window.requestAnimationFrame(draw)
				}
				return
			}

			// One-shot detection: once any block starts printing, flip hasPrintedContent
			if (!hasPrintedContentRef.current && time >= article.firstRenderableStartTime) {
				hasPrintedContentRef.current = true
				setHasPrintedContent(true)
			}

			const plan = planFumeCameraFrame({
				article,
				currentLineIndex: currentLineIndexRef.current,
				time,
				now,
				viewport,
				staticMode,
				overviewStartTime,
				overviewCamera,
				cameraTrackingMode,
				cameraSpeed,
				animationIntensity: theme.animationIntensity,
				cameraRef,
				retargetRef: cameraRetargetRef
			})
			const screenScale = integrateFumeCameraMotion({
				plan,
				dt,
				viewport,
				overviewCamera,
				cameraSpeed,
				cameraRef,
				retargetRef: cameraRetargetRef
			})

			if (!staticMode) {
				drawFumeBackgroundParallax({
					context,
					scene: backgroundScene,
					theme,
					time,
					audioLevels: fumeBackgroundAudioLevels,
					objectOpacityMultiplier: backgroundObjectOpacity,
					viewport,
					camera: cameraRef.current,
					screenScale
				})
			}

			context.save()
			context.translate(viewportCenterX, viewportCenterY)
			context.scale(screenScale, screenScale)
			context.translate(-cameraRef.current.x, -cameraRef.current.y)

			const activeGlowBoost = (theme.animationIntensity === 'chaotic' ? 1.15 : theme.animationIntensity === 'calm' ? 0.72 : 0.92) * glowIntensity
			const passedGlowBase = (theme.animationIntensity === 'chaotic' ? 0.95 : theme.animationIntensity === 'calm' ? 0.35 : 0.62) * glowIntensity

			if (showText) {
				paintFumeBlocks(
					{
						context,
						theme,
						lines,
						time,
						viewport,
						screenScale,
						cameraX: cameraRef.current.x,
						cameraY: cameraRef.current.y,
						glowIntensity,
						activeGlowBoost,
						passedGlowBase,
						textHoldRatio,
						showPrintStamp,
						passedFadeDuration,
						overviewTextRestoreProgress: plan.overviewTextRestoreProgress,
						snapshotCache: staticBlockSnapshotCacheRef.current
					},
					article
				)
			}

			context.restore()

			if (!paused) {
				frameId = window.requestAnimationFrame(draw)
			}
		}

		draw()
		return () => {
			window.cancelAnimationFrame(frameId)
			lastFrameAt = null
		}
		// Deps mirror the upstream renderer exactly: derived inputs (overviewCamera,
		// overviewStartTime, cameraTrackingMode) are covered by article/viewport/lines changing.
	}, [
		article,
		audioBands,
		audioPower,
		backgroundScene,
		backgroundObjectOpacity,
		cameraSpeed,
		currentTime,
		glowIntensity,
		passedFadeDuration,
		showPrintStamp,
		showText,
		paused,
		staticMode,
		textHoldRatio,
		theme,
		viewport.height,
		viewport.width
	])

	return hasPrintedContent
}
