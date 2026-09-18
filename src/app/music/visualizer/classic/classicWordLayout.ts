import type { Line, Theme, Word } from '../types'
import { resolveThemeFontStack, resolveThemeFontWeight } from '../fontStacks'

// src/app/music/visualizer/classic/classicWordLayout.ts
// Deterministic per-line geometry for Classic. Word layouts stay deterministic for a given line:
// the line start time seeds every offset, so time changes the animation state, not the base
// geometry. Also owns the canvas measurement that keeps scaled words from visually overlapping.

export interface WordLayoutConfig {
	id: string
	x: number
	y: number
	rotate: number
	scale: number
	marginRight: string
	alignSelf: string
	passedRotate: number
}

export interface LineLayoutConfig {
	justifyContent: string
	alignItems: string
	perspective: number
}

export interface ClassicLineLayout {
	wordConfigs: WordLayoutConfig[]
	lineConfig: LineLayoutConfig
}

interface BuildClassicLineLayoutOptions {
	activeLine: Line | null
	displayWords: Word[]
	theme: Theme
	lyricsFontScale: number
	viewportWidth: number
	enableWordRotation: boolean
	useLegacyLayout: boolean | undefined
	wordSpacing: number | undefined
}

// Helper to determine if text contains CJK characters
export const isCJK = (text: string) => /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(text)

let classicMeasureCanvas: HTMLCanvasElement | null = null

/**
 * Measures the width of a given word text using a 2D canvas context.
 */
export const measureWordWidth = (text: string, pxSize: number, fontStack: string, fontWeight: number): number => {
	if (typeof document === 'undefined') {
		return text.length * pxSize * 0.65
	}
	if (!classicMeasureCanvas) {
		classicMeasureCanvas = document.createElement('canvas')
	}
	const context = classicMeasureCanvas.getContext('2d')
	if (!context) {
		return text.length * pxSize * 0.65
	}
	context.font = `${fontWeight} ${pxSize}px ${fontStack}`
	return context.measureText(text).width
}

// Generate a stable random layout configuration for the current line.
// Use the line start time as seed so the same lyric does not reshuffle every rerender.
export const buildClassicLineLayout = ({
	activeLine,
	displayWords,
	theme,
	lyricsFontScale,
	viewportWidth,
	enableWordRotation,
	useLegacyLayout,
	wordSpacing
}: BuildClassicLineLayoutOptions): ClassicLineLayout => {
	if (!activeLine) return { wordConfigs: [], lineConfig: { justifyContent: 'center', alignItems: 'center', perspective: 1000 } }

	const seed = activeLine.startTime
	const intensity = theme.animationIntensity

	// Intensity mostly controls how wild the random spread is allowed to become.
	const isChaotic = intensity === 'chaotic'
	const isCalm = intensity === 'calm'

	// Container layout decides how the whole line sits in the visual field before word offsets kick in.
	const justifyOptions = isCalm ? ['justify-center'] : ['justify-start', 'justify-center', 'justify-end', 'justify-around', 'justify-between']
	const alignOptions = isCalm ? ['items-center'] : ['items-start', 'items-center', 'items-end']

	const isInterlude = activeLine.fullText === '......'

	const lineConfig: LineLayoutConfig = {
		justifyContent: isInterlude ? 'justify-center' : justifyOptions[Math.floor(seed % justifyOptions.length)], // deterministic random
		alignItems: alignOptions[Math.floor((seed * 2) % alignOptions.length)],
		perspective: isChaotic ? 500 + (seed % 500) : 1000
	}

	// Word layouts stay deterministic for a given line.
	// That is important because time should change the animation state, not the base geometry.
	const fontStack = resolveThemeFontStack(theme)
	const fontWeight = resolveThemeFontWeight(theme, 700)
	const getPixelFontSize = (fontScale: number, width: number): number => {
		const rem = 16
		const minPx = 2.25 * fontScale * rem
		const valPx = (6 * fontScale * width) / 100
		const maxPx = 4.5 * fontScale * rem
		return Math.max(minPx, Math.min(valPx, maxPx))
	}
	const pxFontSize = getPixelFontSize(lyricsFontScale, viewportWidth)
	const wordWidths = displayWords.map(w => measureWordWidth(w.text, pxFontSize, fontStack, fontWeight))

	const baseSpread = isChaotic ? 60 : isCalm ? 0 : 20
	const baseRotate = isChaotic ? 30 : isCalm ? 0 : 5

	const wordConfigs: WordLayoutConfig[] = displayWords.map((w, i) => {
		const wordSeed = seed + i

		// Tiny deterministic RNG so every word gets its own reproducible offsets.
		const random = (offset: number) => {
			const x = Math.sin(wordSeed + offset) * 10000
			return x - Math.floor(x)
		}

		if (isInterlude) {
			return {
				id: `${w.text}-${i}-${seed}`,
				x: 0,
				y: (random(2) - 0.5) * 15, // Slight vertical randomness
				rotate: 0,
				scale: 1.5,
				marginRight: '3rem',
				alignSelf: 'center',
				passedRotate: 0
			}
		}

		const wordConfigScale = isChaotic ? 0.8 + random(4) * 0.6 : 1.1 + random(4) * 0.2
		const xVal = (random(1) - 0.5) * baseSpread * 2
		const yVal = (random(2) - 0.5) * baseSpread * 2

		let marginRight = isChaotic ? `${random(5) * 1.5}rem` : '0.8rem'

		if (!useLegacyLayout) {
			// Calculate precise margin right to avoid visual overlap during scaling and translation
			const w_i = wordWidths[i] ?? 0
			const s_i = wordConfigScale * 1.4 // active scale max multiplier

			let w_next = 0
			let s_next = 1.0
			let x_next = 0

			if (i + 1 < displayWords.length) {
				const nextSeed = seed + (i + 1)
				const nextRandom = (offset: number) => {
					const x = Math.sin(nextSeed + offset) * 10000
					return x - Math.floor(x)
				}
				const nextConfigScale = isChaotic ? 0.8 + nextRandom(4) * 0.6 : 1.1 + nextRandom(4) * 0.2
				s_next = nextConfigScale * 1.4
				x_next = (nextRandom(1) - 0.5) * baseSpread * 2
				w_next = wordWidths[i + 1] ?? 0
			}

			const spacingMultiplier = wordSpacing ?? 0.7
			const gap = 0.05 * pxFontSize
			const halfOverflow_i = (w_i * (s_i - 1)) / 2
			const halfOverflow_next = (w_next * (s_next - 1)) / 2
			const xOffsetDiff = xVal - x_next

			const calculatedMargin = (halfOverflow_i + halfOverflow_next + xOffsetDiff + gap) * spacingMultiplier
			const minMargin = (isChaotic ? 0.08 * pxFontSize : 0.12 * pxFontSize) * spacingMultiplier
			const finalMargin = Math.max(minMargin, calculatedMargin)
			marginRight = `${finalMargin.toFixed(1)}px`
		}

		return {
			id: `${w.text}-${i}-${seed}`,
			x: xVal,
			y: yVal,
			rotate: enableWordRotation ? (random(3) - 0.5) * baseRotate * 2 : 0,
			scale: wordConfigScale,
			marginRight,
			alignSelf: isChaotic && random(6) > 0.7 ? (random(7) > 0.5 ? 'flex-start' : 'flex-end') : 'auto',
			passedRotate: enableWordRotation ? (random(8) - 0.5) * 45 : 0
		}
	})

	return { wordConfigs, lineConfig }
}
