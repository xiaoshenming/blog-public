import type { Theme } from './types'
import { colorWithAlpha, mixColors } from './colorMix'
import {
	clamp,
	mix,
	type FumeBackgroundAudioLevels,
	type FumeBackgroundParallax,
	type FumeBackgroundScene,
	type FumeBackgroundShape
} from './fumeBackgroundScene'

// src/app/music/visualizer/FumeBackground.ts
// Per-frame painting of the Fume background scene: outline paths, gradient strokes, and the
// audio / parallax response of each shape. Scene construction lives in fumeBackgroundScene.ts;
// both are re-exported here so the Fume renderer keeps a single import.

export {
	buildFumeBackgroundScene,
	type FumeBackgroundAudioLevels,
	type FumeBackgroundBounds,
	type FumeBackgroundParallax,
	type FumeBackgroundScene,
	type FumeBackgroundShape
} from './fumeBackgroundScene'

const buildShapePath = (context: CanvasRenderingContext2D, shape: FumeBackgroundShape) => {
	context.beginPath()

	if (shape.kind === 'ring') {
		const gapStart = shape.ringGapStart ?? -Math.PI * 0.18
		const gapSize = clamp(shape.ringGapSize ?? Math.PI * 0.2, 0.18, Math.PI * 0.6)
		context.lineCap = 'round'
		context.ellipse(0, 0, shape.width * 0.5, shape.width * 0.5, 0, gapStart + gapSize, gapStart + Math.PI * 2)
	} else {
		const size = shape.width
		if (shape.kind === 'square') {
			context.rect(-size * 0.5, -size * 0.5, size, size)
		} else if (shape.kind === 'cross') {
			const arm = size * 0.3
			context.moveTo(-arm, -size * 0.5)
			context.lineTo(arm, -size * 0.5)
			context.lineTo(arm, -arm)
			context.lineTo(size * 0.5, -arm)
			context.lineTo(size * 0.5, arm)
			context.lineTo(arm, arm)
			context.lineTo(arm, size * 0.5)
			context.lineTo(-arm, size * 0.5)
			context.lineTo(-arm, arm)
			context.lineTo(-size * 0.5, arm)
			context.lineTo(-size * 0.5, -arm)
			context.lineTo(-arm, -arm)
			context.closePath()
		} else {
			const outer = size * 0.5
			const inner = size * 0.13
			context.moveTo(0, -outer)
			context.lineTo(inner, -inner)
			context.lineTo(outer, 0)
			context.lineTo(inner, inner)
			context.lineTo(0, outer)
			context.lineTo(-inner, inner)
			context.lineTo(-outer, 0)
			context.lineTo(-inner, -inner)
			context.closePath()
		}
	}
}

const traceShape = (context: CanvasRenderingContext2D, shape: FumeBackgroundShape) => {
	context.save()
	context.translate(shape.x, shape.y)
	context.rotate(shape.rotation)
	buildShapePath(context, shape)
	context.stroke()
	context.restore()
}

export const drawFumeBackground = ({
	context,
	scene,
	theme,
	time = 0,
	audioLevels,
	parallax,
	objectOpacityMultiplier = 1
}: {
	context: CanvasRenderingContext2D
	scene: FumeBackgroundScene
	theme: Theme
	time?: number
	audioLevels?: FumeBackgroundAudioLevels
	parallax?: FumeBackgroundParallax
	objectOpacityMultiplier?: number
}) => {
	const resolvedObjectOpacityMultiplier = clamp(objectOpacityMultiplier, 0, 2)
	const createLineGradient = (shape: FumeBackgroundShape, opacity: number) => {
		const gradient = context.createLinearGradient(-shape.width * 0.55, -shape.height * 0.28, shape.width * 0.55, shape.height * 0.28)
		gradient.addColorStop(0, colorWithAlpha(theme.secondaryColor, opacity * 0.18))
		gradient.addColorStop(0.28, colorWithAlpha(mixColors(theme.secondaryColor, theme.accentColor, 0.24), opacity * 0.58))
		gradient.addColorStop(0.54, colorWithAlpha(mixColors(theme.secondaryColor, theme.accentColor, 0.62), opacity * 0.92))
		gradient.addColorStop(1, colorWithAlpha(theme.accentColor, opacity * 0.7))
		return gradient
	}

	// Two passes per outline: a hairline base stroke and a wider top stroke, both gradient-filled,
	// so the geometry reads as a soft ink line instead of a flat vector stroke.
	const drawGradientGeometry = (shape: FumeBackgroundShape, opacity: number) => {
		const baseWidth = Math.max(shape.strokeWidth * 0.28, 0.14)
		const topWidth = Math.max(shape.strokeWidth * 0.92, 0.78)

		buildShapePath(context, shape)
		context.strokeStyle = createLineGradient(shape, opacity * 0.56)
		context.lineWidth = baseWidth
		context.shadowBlur = 0
		context.shadowColor = 'transparent'
		context.stroke()

		buildShapePath(context, shape)
		context.strokeStyle = createLineGradient(shape, opacity)
		context.lineWidth = topWidth
		context.shadowBlur = 0
		context.shadowColor = 'transparent'
		context.stroke()
	}

	for (const shape of scene.shapes) {
		const bandValue = shape.audioBand ? audioLevels?.[shape.audioBand] : undefined
		const audioScale = bandValue === undefined ? 1 : mix(0.95, 1.45, clamp((bandValue - 10) / 190, 0, 1))
		const audioOpacityBoost = bandValue === undefined ? 1 : mix(0.85, 1.55, clamp((bandValue - 10) / 190, 0, 1))

		context.save()
		context.lineWidth = shape.strokeWidth
		const shapeColor = shape.color === 'accent' ? theme.accentColor : theme.secondaryColor
		const layerResponse = mix(0.58, 1.16, shape.depth)
		const parallaxStrength = parallax?.strength ?? 1
		const parallaxOffsetX = parallax ? (parallax.cameraX - parallax.originX) * (1 - layerResponse) * parallaxStrength : 0
		const parallaxOffsetY = parallax ? (parallax.cameraY - parallax.originY) * (1 - layerResponse) * parallaxStrength : 0

		const renderedShape = {
			...shape,
			x: shape.x + parallaxOffsetX,
			y: shape.y + parallaxOffsetY,
			width: shape.width * audioScale,
			height: shape.height * audioScale,
			rotation: shape.rotation + time * shape.rotationSpeed
		}

		if (shape.kind === 'spark') {
			context.strokeStyle = colorWithAlpha(shapeColor, clamp(shape.opacity * audioOpacityBoost * resolvedObjectOpacityMultiplier, 0, 0.42))
			context.lineWidth = shape.strokeWidth
			context.shadowBlur = 10 * audioScale
			context.shadowColor = colorWithAlpha(shapeColor, shape.opacity * audioOpacityBoost * 0.75 * resolvedObjectOpacityMultiplier)
			traceShape(context, renderedShape)
		} else {
			context.translate(renderedShape.x, renderedShape.y)
			context.rotate(renderedShape.rotation)
			drawGradientGeometry(renderedShape, clamp(shape.opacity * audioOpacityBoost * resolvedObjectOpacityMultiplier, 0, 0.42))
		}
		context.restore()
	}
}
