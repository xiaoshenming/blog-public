import { DEFAULT_PARTITA_TUNING, type Line, type PartitaTuning, type Word as WordType } from '../types'
import type { LyricLayoutUnit } from '../lyrics/cjkSemanticLayout'
import type { LineTransitionMode, WordRevealMode } from '../lyrics/renderHints'
import type { VisualizerPreheatWindow } from '../runtime'

// src/app/music/visualizer/partita/partitaTypes.ts
// Shared shapes and constants of the Partita renderer: the chunk/column structure the words
// animate inside, the per-line render profile derived from renderHints, and the clamped tuning
// every layout helper reads. Nothing here touches Line.words - layout units and display words are
// renderer-side derived data only.

export type PartitaWordStatus = 'waiting' | 'active' | 'passed'

export interface WordLayoutConfig {
	id: string
	x: number
	y: number
	rotate: number
	scale: number
	marginBottom: string
	alignSelf: string
	passedRotate: number
}

export interface LineLayoutConfig {
	perspective: number
	justifyContent: string
	alignItems: string
	columnGap: string
}

export interface PartitaLineRenderProfile {
	renderHints: NonNullable<Line['renderHints']> | null
	lineRenderEndTime: number
	lineTransitionMode: LineTransitionMode
	wordRevealMode: WordRevealMode
	wordLookahead: number
}

export interface PartitaColumn {
	id: string
	words: Array<{
		chunkUnits: LyricLayoutUnit[]
		chunkWords: WordType[]
		displayWords: WordType[]
		config: WordLayoutConfig
		order: number
		rowIndex: number
	}>
}

export interface PartitaSequentialLayout {
	columns: PartitaColumn[]
	totalGraphemes: number
	lineConfig: LineLayoutConfig
}

export const EMPTY_PARTITA_LAYOUT: PartitaSequentialLayout = {
	columns: [],
	totalGraphemes: 0,
	lineConfig: {
		perspective: 1000,
		justifyContent: 'justify-center',
		alignItems: 'items-center',
		columnGap: '1.6rem'
	}
}

export const PARTITA_LAYOUT_CACHE_LIMIT = 48
export const PARTITA_PREHEAT_WINDOW: VisualizerPreheatWindow = {
	minLead: 0.18,
	maxLead: 1.2
}

export const isCJK = (text: string) => /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(text)
const graphemeSegmenter = typeof Intl !== 'undefined' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null
export const splitGraphemes = (text: string) => {
	if (!text) return [] as string[]
	if (graphemeSegmenter) {
		return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment)
	}
	return Array.from(text)
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const clampPartitaStagger = (value: number, fallback: number) => (Number.isFinite(value) ? clamp(value, 0, 180) : fallback)

export const resolvePartitaTuning = (tuning?: PartitaTuning): PartitaTuning => {
	const rawMin = clampPartitaStagger(tuning?.staggerMin ?? DEFAULT_PARTITA_TUNING.staggerMin, DEFAULT_PARTITA_TUNING.staggerMin)
	const rawMax = clampPartitaStagger(tuning?.staggerMax ?? DEFAULT_PARTITA_TUNING.staggerMax, DEFAULT_PARTITA_TUNING.staggerMax)

	return {
		showGuideLines: tuning?.showGuideLines ?? DEFAULT_PARTITA_TUNING.showGuideLines,
		useSemanticLayout: tuning?.useSemanticLayout ?? DEFAULT_PARTITA_TUNING.useSemanticLayout,
		staggerMin: Math.min(rawMin, rawMax),
		staggerMax: Math.max(rawMin, rawMax)
	}
}
