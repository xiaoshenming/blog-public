import type { LayoutLine, LayoutLinesResult, PreparedTextWithSegments } from '@chenglou/pretext'
import type { GraphemeTiming } from '../lyrics/graphemeTiming'
import type { LineTransitionTiming } from '../lyrics/renderHints'
import type { CadenzaTuning, Line, Theme, Word as WordType } from '../types'

// src/app/music/visualizer/cadenza/types.ts
// Mode-local data shapes shared by the Cadenza layout pipeline and its frame driver.
//
// This is the heavy layout mode.
// The line does not just show up and animate; we first prebuild the active/upcoming lines,
// run them through pretext, split them into fragments/placements, then mirror those placements into DOM + canvas layers.
// So when something looks weird here, the bug is usually either in the prepare step or in the placement-to-render sync step.
//
// For a single lyric line, the state flow is:
// waiting -> placements are ready, but keep them dim / offset so the line still feels "not entered".
// active -> this is the main event, drive beam, glow, emphasis, and body color here.
// passed -> line already sang, keep some drift and residue so it fades out gracefully instead of snapping away.

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
	color: string
	graphemeTimings: GraphemeTiming[]
}

export interface WordFragment {
	wordIndex: number
	lineIndex: number
	word: WordType
	text: string
	color: string
	startX: number
	endX: number
	fragmentStartInWord: number
	fragmentEndInWord: number
	wordGraphemeCount: number
	wordGraphemeTimings: GraphemeTiming[]
	fragmentIndexInWord: number
	fragmentCountInWord: number
	isPrimaryFragment: boolean
	isSplitAcrossLines: boolean
}

// One wrapped pretext layout line together with the word fragments that fell onto it.
export interface LineFragmentView {
	line: LayoutLine
	lineStart: number
	lineEnd: number
	fragments: WordFragment[]
}

export interface WordPlacement {
	id: string
	wordIndex: number
	word: WordType
	text: string
	color: string
	x: number
	y: number
	width: number
	height: number
	rotate: number
	scale: number
	passedRotate: number
	passedDriftX: number
	passedDriftY: number
	entryOffsetX: number
	entryOffsetY: number
	fragmentStartInWord: number
	fragmentEndInWord: number
	wordGraphemeCount: number
	wordGraphemeTimings: GraphemeTiming[]
	emphasis: number
	isInterlude: boolean
}

export interface AnimatedPlacementState {
	x: number
	y: number
	rotation: number
	scale: number
	bodyAlpha: number
	blur: number
	activeMix: number
	glowAlpha: number
}

export interface OverlayWordNodes {
	outer: HTMLDivElement
	inner: HTMLDivElement
	body: HTMLSpanElement
	glow: HTMLSpanElement
	glyphSpans: HTMLSpanElement[]
	glyphSignature: string
}

export interface PreparedState {
	prepared: PreparedTextWithSegments
	text: string
	font: string
	fontPx: number
	lineHeight: number
	maxWidth: number
	layout: LayoutLinesResult
	segmentMetas: SegmentMeta[]
	graphemes: string[]
	placements: WordPlacement[]
}

export interface PreparedStateCacheContext {
	showText: boolean
	viewport: { width: number; height: number }
	theme: Theme
	tuning: Pick<CadenzaTuning, 'fontScale' | 'widthRatio'>
}

export interface ResolvedLineRenderTiming {
	renderHints: NonNullable<Line['renderHints']> | null
	lineRenderEndTime: number
	wordRevealMode: 'normal' | 'fast' | 'instant'
	lastWordEndTime: number
	linePassHold: number
	transitionTiming: LineTransitionTiming
}
