import type { MotionValue } from 'motion/react'
import type { LineRenderHints } from './lyrics/renderHints'

// src/app/music/visualizer/types.ts
// Shared data model of the visualizer layer, pruned from upstream src/types.ts to what the
// shell, the overlays, the lyric parsing layer and the seven ported modes actually reference.

export interface LyricRuby {
	text: string
	startTime: number // Seconds
	endTime: number // Seconds
}

export interface LyricSyllable {
	text: string
	startTime: number // Seconds
	endTime: number // Seconds
	endsWithSpace?: boolean
	ruby?: LyricRuby[]
	obscene?: boolean
	emptyBeat?: number
}

export interface LyricAlternateText {
	role: 'translation' | 'romanization' | string
	language?: string
	text: string
	syllables?: LyricSyllable[]
}

export interface Word {
	text: string
	startTime: number // Seconds
	endTime: number // Seconds
	syllables?: LyricSyllable[]
}

export interface LyricBackgroundVocal {
	text: string
	startTime: number // Seconds
	endTime: number // Seconds
	words: Word[]
	agentId?: string
	translation?: string
	romanization?: string
	alternateTexts?: LyricAlternateText[]
}

export type SubtitleContentMode = 'translation' | 'romanization' | 'none'

export interface LyricAgent {
	id: string
	name?: string
	type?: string
}

export interface Line {
	words: Word[]
	startTime: number
	endTime: number
	fullText: string
	translation?: string
	id?: string
	agentId?: string
	songPart?: string
	blockIndex?: number
	romanization?: string
	alternateTexts?: LyricAlternateText[]
	backgroundVocal?: LyricBackgroundVocal
	backgroundVocals?: LyricBackgroundVocal[]
	renderHints?: LineRenderHints
	isChorus?: boolean
	chorusEffect?: 'bars' | 'circles' | 'beams'
	// Fine word boundaries for fullText, baked in upstream by the lyric setter.
	// join('') must equal fullText. When present it wins over Intl.Segmenter word segmentation.
	wordSegments?: string[]
}

export interface LyricData {
	lines: Line[]
	title?: string
	artist?: string
	isWordByWord?: boolean
	ttml?: {
		timingMode?: 'Word' | 'Line'
		agents?: Record<string, LyricAgent>
	}
}

export interface Theme {
	name: string
	backgroundColor: string
	primaryColor: string
	accentColor: string
	secondaryColor: string
	fontStyle: 'sans' | 'serif' | 'mono'
	fontFamily?: string
	fontFamilyStack?: string[]
	fontWeight?: number
	animationIntensity: 'calm' | 'normal' | 'chaotic'
	wordColors?: { word: string; color: string }[]
	lyricsIcons?: string[]
	provider?: string
	description?: string
}

export type BuiltinVisualizerMode = 'classic' | 'cadenza' | 'partita' | 'fume' | 'claddagh' | 'tilt' | 'still'
export type VisualizerMode = BuiltinVisualizerMode | (string & {})

export type BuiltinVisualizerBackgroundMode = 'plain'
export type VisualizerBackgroundMode = BuiltinVisualizerBackgroundMode | (string & {})

// Per-mode tuning. Only the defaults are consumed here: the settings panels that edited them
// upstream are not ported, so every mode renders with these values unless the host injects a bundle.

export interface ClassicTuning {
	enableWordRotation: boolean
	breathingFloatMultiplier: number
	useLegacyLayout?: boolean
	wordSpacing?: number
}

export const DEFAULT_CLASSIC_TUNING: ClassicTuning = {
	enableWordRotation: true,
	breathingFloatMultiplier: 1,
	useLegacyLayout: false,
	wordSpacing: 0.7
}

export interface CadenzaTuning {
	fontScale: number
	widthRatio: number
	motionAmount: number
	glowIntensity: number
	beamIntensity: number
}

export const DEFAULT_CADENZA_TUNING: CadenzaTuning = {
	fontScale: 1.12,
	widthRatio: 0.72,
	motionAmount: 1,
	glowIntensity: 1,
	beamIntensity: 0
}

export interface PartitaTuning {
	showGuideLines: boolean
	useSemanticLayout: boolean
	staggerMin: number
	staggerMax: number
}

export const DEFAULT_PARTITA_TUNING: PartitaTuning = {
	showGuideLines: true,
	useSemanticLayout: true,
	staggerMin: 20,
	staggerMax: 100
}

export interface FumeTuning {
	hidePrintSymbols: boolean
	disableGeometricBackground: boolean
	backgroundObjectOpacity: number
	textHoldRatio: number
	cameraTrackingMode: 'stepped' | 'smooth'
	cameraSpeed: number
	glowIntensity: number
	heroScale: number
}

export const DEFAULT_FUME_TUNING: FumeTuning = {
	hidePrintSymbols: false,
	disableGeometricBackground: true,
	backgroundObjectOpacity: 0.5,
	textHoldRatio: 1,
	cameraTrackingMode: 'smooth',
	cameraSpeed: 1,
	glowIntensity: 1,
	heroScale: 1
}

export interface CladdaghTuning {
	focusScaleRatio: number
	radiusScale: number
	ellipseTiltDeg: number
	showAxisLine: boolean
	letterSpacingOffset: number
}

export const DEFAULT_CLADDAGH_TUNING: CladdaghTuning = {
	focusScaleRatio: 0.65,
	radiusScale: 1.0,
	ellipseTiltDeg: 45,
	showAxisLine: true,
	letterSpacingOffset: 0
}

export type TiltColorScheme = 'default' | 'swap' | 'accentAll' | 'primaryAll'

export interface TiltTuning {
	splitProbability: number
	tiltStyleProbability: number
	colorScheme?: TiltColorScheme
}

export const DEFAULT_TILT_TUNING: TiltTuning = {
	splitProbability: 0.75,
	tiltStyleProbability: 0.35,
	colorScheme: 'default'
}

// Audio analysis. The blog does not run an analyser: the host supplies constant-zero MotionValues
// and modes only ever read them, so the shape stays identical to upstream.
export interface AudioBands {
	bass: MotionValue<number> // 20-150Hz (Circles)
	lowMid: MotionValue<number> // 150-400Hz (Squares)
	mid: MotionValue<number> // 400-1200Hz (Triangles)
	vocal: MotionValue<number> // 1000-3500Hz (Icons)
	treble: MotionValue<number> // 3500Hz+ (Crosses)
	spectrum?: MotionValue<Uint8Array<ArrayBuffer>> // Raw analyser FFT magnitude bins for full-spectrum visualizers
}
