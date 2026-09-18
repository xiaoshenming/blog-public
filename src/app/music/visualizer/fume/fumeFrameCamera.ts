import type { FumeTuning, Theme } from '../types'
import type { CameraRetargetState, CameraTarget, CameraViewTarget, FumeArticleLayout, ViewportSize } from './fumeTypes'
import {
	CAMERA_SCALE_MAX,
	CAMERA_SCALE_MIN,
	OVERVIEW_CAMERA_SOURCE,
	resolveCameraScaleForBlock,
	resolveCameraRetargetDuration,
	resolveFocusBlock,
	resolveOverviewRetargetDuration
} from './fumeCamera'
import { resolveBlockEntryFocusPoint, resolveSmoothBlockFocusPoint, resolveSteppedBlockFocusPoint } from './fumeCameraFocus'
import { resolvePrintedGraphemeCount, resolvePrintedGraphemeProgress } from './fumeTimeline'
import { clamp, easeInOutCubic, easeOutCubic, mix } from './fumeUtils'

// src/app/music/visualizer/fume/fumeFrameCamera.ts
// First half of the per-frame camera pipeline: pick what the camera should look at (overview
// framing vs the currently printed block), open a retarget whenever the reading target changes,
// blend toward the block's entry point right after a retarget, and add the idle screen-space
// float. Pure planning - it never touches the camera position itself.

export const createInitialFumeCameraRetarget = (): CameraRetargetState => ({
	sourceLineIndex: -1,
	startedAt: 0,
	duration: 0.18,
	fromX: 0,
	fromY: 0,
	fromScale: 1,
	bridgeMode: 'none',
	bridgeWaypointX: 0,
	bridgeWaypointY: 0,
	bridgeWaypointScale: 1,
	bridgeWaypointPhase: 0.36
})

export const createInitialFumeCameraTarget = (): CameraTarget => ({
	x: 0,
	y: 0,
	velocityX: 0,
	velocityY: 0,
	focusX: 0,
	focusY: 0,
	scale: 1,
	velocityScale: 0,
	focusScale: 1
})

// Runs once per effect pass: the very first article teleports the camera to the paper center,
// later passes just re-clamp the roaming camera into the (possibly resized) article bounds, and
// a missing article re-arms initialization for the next one.
export const syncFumeCameraToArticle = (
	cameraRef: { current: CameraTarget },
	cameraInitializedRef: { current: boolean },
	article: FumeArticleLayout | null
) => {
	if (article && !cameraInitializedRef.current) {
		cameraRef.current = {
			x: article.width * 0.5,
			y: article.height * 0.5,
			velocityX: 0,
			velocityY: 0,
			focusX: article.width * 0.5,
			focusY: article.height * 0.5,
			scale: 1.18,
			velocityScale: 0,
			focusScale: 1.18
		}
		cameraInitializedRef.current = true
	} else if (article) {
		cameraRef.current.x = clamp(cameraRef.current.x, 0, article.width)
		cameraRef.current.y = clamp(cameraRef.current.y, 0, article.height)
		cameraRef.current.focusX = clamp(cameraRef.current.focusX, 0, article.width)
		cameraRef.current.focusY = clamp(cameraRef.current.focusY, 0, article.height)
		cameraRef.current.scale = clamp(cameraRef.current.scale, CAMERA_SCALE_MIN, CAMERA_SCALE_MAX)
		cameraRef.current.focusScale = clamp(cameraRef.current.focusScale, CAMERA_SCALE_MIN, CAMERA_SCALE_MAX)
	} else {
		cameraInitializedRef.current = false
	}
}

export interface FumeCameraFrameContext {
	article: FumeArticleLayout
	currentLineIndex: number
	time: number
	now: number
	viewport: ViewportSize
	staticMode: boolean
	overviewStartTime: number
	overviewCamera: CameraViewTarget | null
	cameraTrackingMode: FumeTuning['cameraTrackingMode']
	cameraSpeed: number
	animationIntensity: Theme['animationIntensity']
	cameraRef: { current: CameraTarget }
	retargetRef: { current: CameraRetargetState }
}

export interface FumeCameraFramePlan {
	targetX: number
	targetY: number
	targetScale: number
	didRetargetThisFrame: boolean
	retargetPhase: number
	retargetBoost: number
	overviewTextRestoreProgress: number
}

export const planFumeCameraFrame = ({
	article,
	currentLineIndex,
	time,
	now,
	viewport,
	staticMode,
	overviewStartTime,
	overviewCamera,
	cameraTrackingMode,
	cameraSpeed,
	animationIntensity,
	cameraRef,
	retargetRef
}: FumeCameraFrameContext): FumeCameraFramePlan => {
	const shouldShowOverview = overviewCamera !== null && time >= overviewStartTime
	let targetCameraX = article.width * 0.5
	let targetCameraY = article.height * 0.5
	let targetCameraScale = 1.18
	let entryFocusPoint: { x: number; y: number } | null = null
	let didRetargetThisFrame = false

	if (shouldShowOverview && overviewCamera) {
		targetCameraX = overviewCamera.x
		targetCameraY = overviewCamera.y
		targetCameraScale = overviewCamera.scale

		if (retargetRef.current.sourceLineIndex !== OVERVIEW_CAMERA_SOURCE) {
			retargetRef.current = {
				sourceLineIndex: OVERVIEW_CAMERA_SOURCE,
				startedAt: time,
				duration: clamp(resolveOverviewRetargetDuration(viewport) / cameraSpeed, 0.12, 1.2),
				fromX: cameraRef.current.x,
				fromY: cameraRef.current.y,
				fromScale: cameraRef.current.scale,
				bridgeMode: 'none',
				bridgeWaypointX: 0,
				bridgeWaypointY: 0,
				bridgeWaypointScale: 1,
				bridgeWaypointPhase: 0.36
			}
			didRetargetThisFrame = true
		}
	} else {
		const focusBlock = resolveFocusBlock(article, currentLineIndex, time)

		if (focusBlock) {
			const focusPoint =
				cameraTrackingMode === 'stepped'
					? resolveSteppedBlockFocusPoint(focusBlock, resolvePrintedGraphemeCount(focusBlock.line, focusBlock.wordRanges, focusBlock.graphemes.length, time))
					: resolveSmoothBlockFocusPoint(focusBlock, resolvePrintedGraphemeProgress(focusBlock.line, focusBlock.wordRanges, focusBlock.graphemes.length, time))
			entryFocusPoint = resolveBlockEntryFocusPoint(focusBlock)
			targetCameraX = focusPoint.x
			targetCameraY = focusPoint.y
			targetCameraScale = resolveCameraScaleForBlock(focusBlock, viewport)

			if (retargetRef.current.sourceLineIndex !== focusBlock.sourceLineIndex) {
				retargetRef.current = {
					sourceLineIndex: focusBlock.sourceLineIndex,
					startedAt: time,
					duration: clamp(resolveCameraRetargetDuration(focusBlock.line) / cameraSpeed, 0.03, 0.3),
					fromX: cameraRef.current.x,
					fromY: cameraRef.current.y,
					fromScale: cameraRef.current.scale,
					bridgeMode: 'none',
					bridgeWaypointX: 0,
					bridgeWaypointY: 0,
					bridgeWaypointScale: 1,
					bridgeWaypointPhase: 0.36
				}
				didRetargetThisFrame = true
			}
		} else if (retargetRef.current.sourceLineIndex !== -1) {
			retargetRef.current = {
				sourceLineIndex: -1,
				startedAt: time,
				duration: clamp(0.18 / cameraSpeed, 0.05, 0.4),
				fromX: cameraRef.current.x,
				fromY: cameraRef.current.y,
				fromScale: cameraRef.current.scale,
				bridgeMode: 'none',
				bridgeWaypointX: 0,
				bridgeWaypointY: 0,
				bridgeWaypointScale: 1,
				bridgeWaypointPhase: 0.36
			}
			didRetargetThisFrame = true
		}
	}

	const retargetElapsed = Math.max(time - retargetRef.current.startedAt, 0)
	const overviewTextRestoreProgress =
		shouldShowOverview && retargetRef.current.sourceLineIndex === OVERVIEW_CAMERA_SOURCE
			? easeInOutCubic(clamp(retargetElapsed / Math.max(retargetRef.current.duration, 0.001), 0, 1))
			: 0
	const retargetPhase = clamp(retargetElapsed / Math.max(retargetRef.current.duration, 0.001), 0, 1)
	const retargetBoost = 1 - easeOutCubic(retargetPhase)
	const entryFocusBias = Math.pow(retargetBoost, 0.58)

	if (entryFocusPoint) {
		targetCameraX = mix(targetCameraX, entryFocusPoint.x, entryFocusBias)
		targetCameraY = mix(targetCameraY, entryFocusPoint.y, entryFocusBias)
	}

	if (!staticMode) {
		const floatConfig =
			animationIntensity === 'chaotic'
				? { distance: 24, duration: 5.8, scaleAmplitude: 0.014 }
				: animationIntensity === 'calm'
					? { distance: 14, duration: 8.5, scaleAmplitude: 0.008 }
					: { distance: 18, duration: 7, scaleAmplitude: 0.011 }
		const floatPhase = (now / 1000 / floatConfig.duration) * Math.PI * 2
		const overviewAttenuation = shouldShowOverview ? 0.36 : 1
		const screenFloatX = Math.sin(floatPhase * 0.74 + 0.8) * floatConfig.distance * 0.34
		const screenFloatY = (Math.sin(floatPhase) * floatConfig.distance + Math.sin(floatPhase * 0.5 + 1.1) * floatConfig.distance * 0.22) * overviewAttenuation
		const worldFloatDivisor = Math.max(targetCameraScale, 0.001)

		targetCameraX -= screenFloatX / worldFloatDivisor
		targetCameraY -= screenFloatY / worldFloatDivisor
		targetCameraScale = clamp(
			targetCameraScale * (1 + Math.sin(floatPhase + 0.9) * floatConfig.scaleAmplitude * overviewAttenuation),
			CAMERA_SCALE_MIN,
			CAMERA_SCALE_MAX
		)
	}

	return {
		targetX: targetCameraX,
		targetY: targetCameraY,
		targetScale: targetCameraScale,
		didRetargetThisFrame,
		retargetPhase,
		retargetBoost,
		overviewTextRestoreProgress
	}
}
