import type { layoutWithLines, PreparedTextWithSegments } from '@chenglou/pretext'
import type { Line, Theme, Word as WordType } from '../types'
import type { GraphemeTiming } from '../lyrics/graphemeTiming'
import type { VisualizerSharedProps } from '../definition'

// src/app/music/visualizer/fume/fumeTypes.ts
// Shared data shapes of the Fume renderer: the article layout produced ahead of playback, the
// per-block render slices the frame loop paints from, and the camera state it integrates every frame.
//
// This mode is basically "turn the whole lyric into an article, then move a camera through it".
// So the pipeline is much bigger than the others: prebuild the article layout, split it into blocks/render lines/graphemes,
// resolve which block the camera should care about right now, then draw background + paper + typed text + passed text together every frame.
// If this mode breaks, it is usually not one tiny animation bug, it is some step in that whole pipeline drifting out of sync.
//
// For a single lyric line, the state handling is:
// waiting -> line already exists in the article, but the camera may not be on it yet and glyphs can stay unprinted.
// active -> line becomes the main reading target, camera focuses in, and glyphs print with stronger glow/presence.
// passed -> line becomes already-read text, keep some paper trace and fade it out with textHoldRatio instead of removing it instantly.
export type VisualizerProps = VisualizerSharedProps

export type FumeBlockVariant = 'body' | 'hero'

export type FumeTextHoldStyle = 'standard' | 'dimmed'

export interface ViewportSize {
	width: number
	height: number
}

// Upstream targets @chenglou/pretext ^0.0.8, where prepared text carries per-grapheme fit advances
// for breakable segments. The blog is pinned at 0.0.3, which has no such field, so the renderer reads
// it through this widened shape: present after the upgrade, undefined before it (the proportional
// width fallback below covers that case).
export type PreparedTextWithFitAdvances = PreparedTextWithSegments & {
	breakableFitAdvances?: (number[] | null)[]
}

export interface SegmentMeta {
	graphemeStart: number
	graphemeEnd: number
	graphemeCount: number
}

export interface WordRange {
	wordIndex: number
	word: WordType
	start: number
	end: number
	colorStart: number
	colorEnd: number
	graphemeTimings: GraphemeTiming[]
}

export interface RenderLineSlice {
	id: string
	text: string
	start: number
	end: number
	graphemes: string[]
	glyphOffsets: number[]
	segments: RenderSegmentSlice[]
	left: number
	top: number
	width: number
}

export interface RenderSegmentSlice {
	text: string
	start: number
	end: number
	localStart: number
	localEnd: number
	x: number
	width: number
	isFullSegment: boolean
	measuredGlyphOffsets: number[]
}

export interface FumeBlock {
	id: string
	sourceLineIndex: number
	line: Line
	variant: FumeBlockVariant
	x: number
	y: number
	width: number
	height: number
	innerWidth: number
	fontPx: number
	lineHeight: number
	prepared: PreparedTextWithFitAdvances
	layout: ReturnType<typeof layoutWithLines>
	graphemes: string[]
	segmentMetas: SegmentMeta[]
	wordRanges: WordRange[]
	wordRangeIndexByOffset: number[]
	colorRangeIndexByOffset: number[]
	renderLines: RenderLineSlice[]
}

export interface FumePaperBounds {
	left: number
	top: number
	right: number
	bottom: number
}

export interface FumeArticleLayout {
	width: number
	height: number
	viewportHeight: number
	columns: number
	gap: number
	paperBounds: FumePaperBounds
	blocks: FumeBlock[]
	blockBySourceLineIndex: Map<number, FumeBlock>
	chronologicalBlocks: FumeBlock[]
	firstRenderableStartTime: number
	lastChronologicalRenderEndTime: number
}

export interface FumeArticleLayoutMetrics {
	width: number
	height: number
	viewportHeight: number
	columns: number
	gap: number
	paperBounds: FumePaperBounds
}

export interface StaticBlockSnapshot {
	canvas: HTMLCanvasElement
	padding: number
}

export interface FumeLayoutAttemptOptions {
	paperWidth: number
	viewportHeight: number
	columns: number
	gap: number
	densityScale: number
	seedKey: string
	mode?: 'measure' | 'render'
	timing?: FumeLayoutAttemptTiming
}

export interface FumeLayoutAttemptTiming {
	lines: number
	prepareLayoutMs: number
	placementMs: number
	renderDetailsMs: number
}

export interface CameraTarget {
	x: number
	y: number
	velocityX: number
	velocityY: number
	focusX: number
	focusY: number
	scale: number
	velocityScale: number
	focusScale: number
}

export interface CameraRetargetState {
	sourceLineIndex: number
	startedAt: number
	duration: number
	fromX: number
	fromY: number
	fromScale: number
	bridgeMode: 'none' | 'direct' | 'overview'
	bridgeWaypointX: number
	bridgeWaypointY: number
	bridgeWaypointScale: number
	bridgeWaypointPhase: number
}

export interface CameraViewTarget {
	x: number
	y: number
	scale: number
}

// Only the geometry-affecting slice of the theme takes part in the article layout and its cache key.
export type FumeLayoutTheme = Pick<Theme, 'name' | 'fontStyle' | 'fontFamily' | 'fontFamilyStack' | 'fontWeight'>

// Everything the per-block painter needs for one frame. The upstream frame loop kept these as
// closure locals around its block loop; they travel together here so the painter can live in
// its own module.
export interface FumeBlockPaintState {
	context: CanvasRenderingContext2D
	theme: Theme
	lines: Line[]
	time: number
	viewport: ViewportSize
	screenScale: number
	cameraX: number
	cameraY: number
	glowIntensity: number
	activeGlowBoost: number
	passedGlowBase: number
	textHoldRatio: number
	showPrintStamp: boolean
	passedFadeDuration: number
	overviewTextRestoreProgress: number
	snapshotCache: Map<string, StaticBlockSnapshot>
}

// Per-block values the active (mid-reveal) painter derives once per block in the upstream loop.
export interface FumeBlockActivePaintContext {
	waitingOpacity: number
	activeOpacity: number
	transitionPassedStyle: {
		opacity: number
		glowMultiplier: number
		shadowAlphaBase: number
		shadowAlphaTrail: number
	}
	baselineOffset: number
	linePassCutoffTime: number
	lineDuration: number
	colorTrailDuration: number
	hasRevealCompleted: boolean
	hasPassCutoffReached: boolean
	printedCount: number
	totalGraphemeCount: number
}
