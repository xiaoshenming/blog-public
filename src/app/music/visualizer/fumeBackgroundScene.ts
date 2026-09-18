// src/app/music/visualizer/fumeBackgroundScene.ts
// Seeded construction of the Fume background: which outline shapes and sparks exist, where they
// sit relative to the paper, and how they respond. Drawing them per frame lives in FumeBackground.ts.

interface ViewportSize {
	width: number
	height: number
}

interface WorldSize {
	width: number
	height: number
}

export interface FumeBackgroundBounds {
	left: number
	top: number
	right: number
	bottom: number
}

export type FumeBackgroundShapeKind = 'ring' | 'square' | 'cross' | 'spark'
export type FumeBackgroundAudioBand = 'bass' | 'lowMid' | 'mid' | 'vocal' | 'treble'
export type FumeBackgroundShapeColor = 'secondary' | 'accent'

export interface FumeBackgroundShape {
	id: string
	kind: FumeBackgroundShapeKind
	x: number
	y: number
	width: number
	height: number
	rotation: number
	rotationSpeed: number
	strokeWidth: number
	opacity: number
	color: FumeBackgroundShapeColor
	depth: number
	audioBand?: FumeBackgroundAudioBand
	ringGapStart?: number
	ringGapSize?: number
}

export interface FumeBackgroundScene {
	width: number
	height: number
	shapes: FumeBackgroundShape[]
}

export type FumeBackgroundAudioLevels = Partial<Record<FumeBackgroundAudioBand, number>> & {
	power?: number
}

export interface FumeBackgroundParallax {
	cameraX: number
	cameraY: number
	originX: number
	originY: number
	strength?: number
}

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const mix = (from: number, to: number, amount: number) => from + (to - from) * amount

const hashString = (input: string) => {
	let hash = 2166136261
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}
	return hash >>> 0
}

const seeded = (seed: string) => {
	const hash = hashString(seed)
	return (hash % 10000) / 10000
}

const normalizeBounds = (bounds: FumeBackgroundBounds, worldWidth: number, worldHeight: number): FumeBackgroundBounds => ({
	left: clamp(Math.min(bounds.left, bounds.right), 0, worldWidth),
	top: clamp(Math.min(bounds.top, bounds.bottom), 0, worldHeight),
	right: clamp(Math.max(bounds.left, bounds.right), 0, worldWidth),
	bottom: clamp(Math.max(bounds.top, bounds.bottom), 0, worldHeight)
})

// Large outlines hug the paper: a few sit inside it, most hang just past one of its four edges so
// the composition reads as a halo around the text rather than confetti over it.
const choosePaperHaloAnchor = ({
	paperBounds,
	worldWidth,
	worldHeight,
	width,
	height,
	seedKey
}: {
	paperBounds: FumeBackgroundBounds
	worldWidth: number
	worldHeight: number
	width: number
	height: number
	seedKey: string
}) => {
	const insideChance = seeded(`${seedKey}:inside-chance`)
	if (insideChance < 0.22) {
		return {
			x: clamp(mix(paperBounds.left + width * 0.12, paperBounds.right - width * 0.12, seeded(`${seedKey}:inside-x`)), 0, worldWidth),
			y: clamp(mix(paperBounds.top + height * 0.12, paperBounds.bottom - height * 0.12, seeded(`${seedKey}:inside-y`)), 0, worldHeight)
		}
	}

	const side = Math.floor(seeded(`${seedKey}:side`) * 4) % 4
	const overflowX = width * mix(0.16, 0.24, seeded(`${seedKey}:overflow-x`))
	const overflowY = height * mix(0.16, 0.24, seeded(`${seedKey}:overflow-y`))
	const spanJitterX = width * mix(-0.18, 0.18, seeded(`${seedKey}:span-jitter-x`))
	const spanJitterY = height * mix(-0.18, 0.18, seeded(`${seedKey}:span-jitter-y`))
	const spanY = mix(paperBounds.top - height * 0.12, paperBounds.bottom + height * 0.12, seeded(`${seedKey}:y`)) + spanJitterY
	const spanX = mix(paperBounds.left - width * 0.12, paperBounds.right + width * 0.12, seeded(`${seedKey}:x`)) + spanJitterX

	if (side === 0) {
		return { x: clamp(paperBounds.left - overflowX, 0, worldWidth), y: clamp(spanY, 0, worldHeight) }
	}

	if (side === 1) {
		return { x: clamp(paperBounds.right + overflowX, 0, worldWidth), y: clamp(spanY, 0, worldHeight) }
	}

	if (side === 2) {
		return { x: clamp(spanX, 0, worldWidth), y: clamp(paperBounds.top - overflowY, 0, worldHeight) }
	}

	return { x: clamp(spanX, 0, worldWidth), y: clamp(paperBounds.bottom + overflowY, 0, worldHeight) }
}

export const buildFumeBackgroundScene = ({
	viewport,
	world,
	paperBounds,
	seed
}: {
	viewport: ViewportSize
	world: WorldSize
	paperBounds?: FumeBackgroundBounds
	seed?: string | number
}): FumeBackgroundScene => {
	if (viewport.width <= 0 || viewport.height <= 0 || world.width <= 0 || world.height <= 0) {
		return {
			width: Math.max(world.width, viewport.width, 1),
			height: Math.max(world.height, viewport.height, 1),
			shapes: []
		}
	}

	const worldWidth = Math.max(world.width, viewport.width * 1.2)
	const worldHeight = Math.max(world.height, viewport.height * 1.2)
	const baseUnit = clamp(Math.min(viewport.width, viewport.height) * 0.72, 320, 760)
	const defaultPaperBounds = {
		left: worldWidth * 0.24,
		top: worldHeight * 0.18,
		right: worldWidth * 0.76,
		bottom: worldHeight * 0.82
	}
	const resolvedPaperBounds = normalizeBounds(paperBounds ?? defaultPaperBounds, worldWidth, worldHeight)
	const shapeKinds: FumeBackgroundShapeKind[] = ['ring', 'square', 'cross', 'ring', 'square', 'cross']
	const shapeCount = worldWidth > worldHeight ? 8 : 7
	const sparkBands: FumeBackgroundAudioBand[] = ['treble', 'vocal', 'mid', 'treble', 'lowMid']
	const sparkCount = worldWidth > worldHeight ? 12 : 9
	const sparkAreaLeft = worldWidth * 0.2
	const sparkAreaRight = worldWidth * 0.8
	const sparkAreaTop = worldHeight * 0.18
	const sparkAreaBottom = worldHeight * 0.82
	const sparkAreaWidth = sparkAreaRight - sparkAreaLeft
	const sparkAreaHeight = sparkAreaBottom - sparkAreaTop
	const sparkColumns = Math.ceil(Math.sqrt(sparkCount * (worldWidth / Math.max(worldHeight, 1))))
	const sparkRows = Math.ceil(sparkCount / sparkColumns)
	const sparkCellWidth = sparkAreaWidth / sparkColumns
	const sparkCellHeight = sparkAreaHeight / sparkRows

	const baseShapes = Array.from({ length: shapeCount }).map((_, index): FumeBackgroundShape => {
		const localSeed = `${seed ?? 'fume'}:${worldWidth}:${worldHeight}:${index}`
		const kind = shapeKinds[index % shapeKinds.length]!
		const width = baseUnit * mix(0.82, 1.36, seeded(`${localSeed}:size`))
		const height = width
		const anchor = choosePaperHaloAnchor({
			paperBounds: resolvedPaperBounds,
			worldWidth,
			worldHeight,
			width,
			height,
			seedKey: localSeed
		})

		return {
			id: `fume-bg-${index}`,
			kind,
			x: anchor.x,
			y: anchor.y,
			width,
			height,
			rotation: mix(-Math.PI * 0.2, Math.PI * 0.2, seeded(`${localSeed}:rotation`)),
			rotationSpeed: mix(-0.045, 0.045, seeded(`${localSeed}:rotation-speed`)),
			strokeWidth: mix(0.25, 2.1, seeded(`${localSeed}:stroke-width`)),
			opacity: mix(0.01, 0.16, seeded(`${localSeed}:opacity`)),
			color: seeded(`${localSeed}:color`) > 0.5 ? 'accent' : 'secondary',
			depth: seeded(`${localSeed}:depth`),
			ringGapStart: kind === 'ring' ? mix(-Math.PI, Math.PI, seeded(`${localSeed}:gap-start`)) : undefined,
			ringGapSize: kind === 'ring' ? mix(Math.PI * 0.12, Math.PI * 0.24, seeded(`${localSeed}:gap-size`)) : undefined
		}
	})

	const sparkShapes = Array.from({ length: sparkCount }).map((_, index): FumeBackgroundShape => {
		const localSeed = `${seed ?? 'fume'}:${worldWidth}:${worldHeight}:spark:${index}`
		const width = baseUnit * mix(0.1, 0.24, seeded(`${localSeed}:size`))
		const column = index % sparkColumns
		const row = Math.floor(index / sparkColumns)
		const jitterX = mix(-0.32, 0.32, seeded(`${localSeed}:jitter-x`)) * sparkCellWidth
		const jitterY = mix(-0.32, 0.32, seeded(`${localSeed}:jitter-y`)) * sparkCellHeight
		const x = clamp(sparkAreaLeft + (column + 0.5) * sparkCellWidth + jitterX, sparkAreaLeft, sparkAreaRight)
		const y = clamp(sparkAreaTop + (row + 0.5) * sparkCellHeight + jitterY, sparkAreaTop, sparkAreaBottom)

		return {
			id: `fume-spark-${index}`,
			kind: 'spark',
			x,
			y,
			width,
			height: width,
			rotation: mix(-Math.PI, Math.PI, seeded(`${localSeed}:rotation`)),
			rotationSpeed: mix(-0.18, 0.18, seeded(`${localSeed}:rotation-speed`)),
			strokeWidth: mix(0.75, 1.7, seeded(`${localSeed}:stroke-width`)),
			opacity: mix(0.08, 0.22, seeded(`${localSeed}:opacity`)),
			color: seeded(`${localSeed}:color`) > 0.5 ? 'accent' : 'secondary',
			depth: seeded(`${localSeed}:depth`),
			audioBand: sparkBands[index % sparkBands.length]
		}
	})

	const shapes = [...baseShapes, ...sparkShapes].sort((left, right) => left.depth - right.depth)

	return {
		width: worldWidth,
		height: worldHeight,
		shapes
	}
}
