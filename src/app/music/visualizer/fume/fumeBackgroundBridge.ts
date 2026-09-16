import type { MotionValue } from 'motion/react'
import { drawFumeBackground, type FumeBackgroundAudioLevels, type FumeBackgroundScene } from '../FumeBackground'
import type { AudioBands, Theme } from '../types'
import type { CameraTarget, ViewportSize } from './fumeTypes'
import {
	CAMERA_SCALE_MAX,
	CAMERA_SCALE_MIN,
	FUME_BACKGROUND_PARALLAX_X,
	FUME_BACKGROUND_PARALLAX_Y,
	FUME_BACKGROUND_SCALE_FACTOR,
	FUME_BACKGROUND_VERTICAL_OFFSET_RATIO
} from './fumeCamera'
import { clamp, mix } from './fumeUtils'

// src/app/music/visualizer/fume/fumeBackgroundBridge.ts
// Canvas bridge to the shared Fume background: the per-frame audio level snapshot, the centered
// fallback used while the article layout is still building, and the parallax-following draw used
// once the camera exists.

export const createFumeBackgroundAudioLevels = (audioPower: MotionValue<number>, audioBands: AudioBands): FumeBackgroundAudioLevels => ({
	power: audioPower.get(),
	bass: audioBands.bass.get(),
	lowMid: audioBands.lowMid.get(),
	mid: audioBands.mid.get(),
	vocal: audioBands.vocal.get(),
	treble: audioBands.treble.get()
})

// While there is no article yet the scene just sits centered on screen, drifting on a wall-clock
// offset so the wait is not visually dead.
export const drawFumeBackgroundFallback = ({
	context,
	scene,
	theme,
	time,
	now,
	audioLevels,
	objectOpacityMultiplier,
	viewport
}: {
	context: CanvasRenderingContext2D
	scene: FumeBackgroundScene
	theme: Theme
	time: number
	now: number
	audioLevels: FumeBackgroundAudioLevels
	objectOpacityMultiplier: number
	viewport: ViewportSize
}) => {
	context.save()
	context.translate(viewport.width * 0.5, viewport.height * 0.5)
	context.translate(-scene.width * 0.5, -scene.height * 0.5)
	drawFumeBackground({
		context,
		scene,
		theme,
		time: time + now * 0.00018,
		audioLevels,
		objectOpacityMultiplier: objectOpacityMultiplier * 2
	})
	context.restore()
}

export const drawFumeBackgroundParallax = ({
	context,
	scene,
	theme,
	time,
	audioLevels,
	objectOpacityMultiplier,
	viewport,
	camera,
	screenScale
}: {
	context: CanvasRenderingContext2D
	scene: FumeBackgroundScene
	theme: Theme
	time: number
	audioLevels: FumeBackgroundAudioLevels
	objectOpacityMultiplier: number
	viewport: ViewportSize
	camera: CameraTarget
	screenScale: number
}) => {
	const viewportCenterX = viewport.width * 0.5
	const viewportCenterY = viewport.height * 0.5
	const backgroundCenterX = scene.width * 0.5
	const backgroundCenterY = scene.height * 0.5
	const backgroundVerticalOffset = clamp((viewport.height * FUME_BACKGROUND_VERTICAL_OFFSET_RATIO) / Math.max(screenScale, 0.001), 48, 180)
	const backgroundCameraX = mix(backgroundCenterX, camera.x, FUME_BACKGROUND_PARALLAX_X)
	const backgroundCameraY = mix(backgroundCenterY, camera.y, FUME_BACKGROUND_PARALLAX_Y) - backgroundVerticalOffset
	const backgroundScale = clamp(screenScale * FUME_BACKGROUND_SCALE_FACTOR, CAMERA_SCALE_MIN, CAMERA_SCALE_MAX)

	context.save()
	context.translate(viewportCenterX, viewportCenterY)
	context.scale(backgroundScale, backgroundScale)
	context.translate(-backgroundCameraX, -backgroundCameraY)
	drawFumeBackground({
		context,
		scene,
		theme,
		time,
		audioLevels,
		objectOpacityMultiplier: objectOpacityMultiplier * 2,
		parallax: {
			cameraX: backgroundCameraX,
			cameraY: backgroundCameraY,
			originX: backgroundCenterX,
			originY: backgroundCenterY,
			strength: 0.72
		}
	})
	context.restore()
}
