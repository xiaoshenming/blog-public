import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'
import type { Theme, TiltTuning } from '../types'
import { resolveThemeFontStack, resolveThemeFontWeight } from '../fontStacks'
import { SentenceLayout } from '../lyrics/sentenceLayout'

// Probabilistic multi-line layout for the Tilt visualizer: decides how many lines a lyric line
// splits into (seeded), which one becomes the large italic "tilt" line, and how much the whole
// block must scale down so the widest line fits the viewport.

export interface TiltSegment {
	text: string
	isTilt: boolean
	isShortLastLine: boolean
	charOffset: number
}

export interface TiltLayout {
	segments: TiltSegment[]
	scaleMultiplier: number
}

const CHAR_REF_LENGTH = 20
const LOG_OFFSET = 4
const LINE_THRESHOLDS = [0.45, 1.05, 1.7]

const RESPLIT_THRESHOLD = 1.6
const SCALE_FLOOR_NORMAL = 0.55
const SCALE_FLOOR_TILT = 0.5

// Shared with the renderer so component font math uses the same rem base.
export const REM_PX = 16

const getAvailableWidth = (): number => {
	if (typeof window === 'undefined') return 1200
	return Math.max(320, window.innerWidth) * 0.85
}

const seededRandom = (seed: number, offset: number): number => {
	const x = Math.sin(seed * 1000 + offset) * 10000
	return x - Math.floor(x)
}

const determineLineCount = (charCount: number, seed: number, splitProbability: number): number => {
	const normalized = Math.log(charCount + LOG_OFFSET) / Math.log(CHAR_REF_LENGTH + LOG_OFFSET)
	const jitter = seededRandom(seed, 1) * 0.6 + 0.7
	const score = normalized * jitter * splitProbability
	if (score < LINE_THRESHOLDS[0]) return 1
	if (score < LINE_THRESHOLDS[1]) return 2
	if (score < LINE_THRESHOLDS[2]) return 3
	return 4
}

const measureAtSize = (text: string, pxSize: number, fontSpec: string): number => {
	const prepared = prepareWithSegments(text, fontSpec)
	const layout = layoutWithLines(prepared, 99999, pxSize * 1.4)
	return layout.lines[0]?.width ?? text.length * pxSize * 0.6
}

export const buildTiltLayout = (fullText: string, lineSeed: number, tuning: TiltTuning, theme: Theme, fontScale: number): TiltLayout => {
	const fontStack = resolveThemeFontStack(theme)
	const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
	const measureMaxPx = Math.max(viewportWidth * 0.06875, 5.625 * REM_PX * fontScale)
	const normalBasePx = measureMaxPx
	const tiltBasePx = measureMaxPx
	const normalFontSpec = `${resolveThemeFontWeight(theme, 400)} ${normalBasePx}px ${fontStack}`
	const tiltFontSpec = `${resolveThemeFontWeight(theme, 300)} ${tiltBasePx}px ${fontStack} italic`
	const availableWidth = getAvailableWidth()

	const charCount = fullText.trim().length
	const isEllipsisOnly = /^[\s.…·。]+$/.test(fullText.trim())
	let mergedSegments: string[]

	if (isEllipsisOnly) {
		mergedSegments = [fullText]
	} else {
		const numLines = determineLineCount(charCount, lineSeed, tuning.splitProbability)
		const layoutUnits = SentenceLayout.splitIntoSentences(fullText, numLines, lineSeed)
		mergedSegments = layoutUnits.map(u => u.text)
	}

	const candidates: number[] = []
	mergedSegments.forEach((_, i) => {
		const lineRoll = seededRandom(lineSeed, 100 + i)
		if (lineRoll < tuning.tiltStyleProbability) candidates.push(i)
	})

	let finalTiltIndex = -1
	if (candidates.length > 0) {
		finalTiltIndex = candidates[Math.floor(seededRandom(lineSeed, 200) * candidates.length)]
	}

	let offsetAccum = 0
	const segments: TiltSegment[] = mergedSegments.map((text, i) => {
		const trimmed = text.trimStart().trimEnd()
		const leadingSpaces = text.length - text.trimStart().length
		const seg = {
			text: trimmed,
			isTilt: i === finalTiltIndex,
			isShortLastLine: false,
			charOffset: offsetAccum + leadingSpaces
		}
		offsetAccum += text.length
		return seg
	})

	let scaleMultiplier = 1
	const tiltWithWidth = segments.filter(s => s.isTilt).map(s => ({ text: s.text, width: measureAtSize(s.text, tiltBasePx, tiltFontSpec) }))
	const normalWithWidth = segments.filter(s => !s.isTilt).map(s => ({ text: s.text, width: measureAtSize(s.text, normalBasePx, normalFontSpec) }))

	const widestTiltEntry = tiltWithWidth.sort((a, b) => b.width - a.width)[0]
	const widestNormalEntry = normalWithWidth.sort((a, b) => b.width - a.width)[0]

	const tiltWidth = widestTiltEntry?.width ?? 0
	const normalWidth = widestNormalEntry?.width ?? 0

	const tiltOverflow = tiltWidth > 0 ? tiltWidth / availableWidth : 0
	const normalOverflow = normalWidth > 0 ? normalWidth / availableWidth : 0
	const maxOverflow = Math.max(tiltOverflow, normalOverflow)

	const markShortLastLine = (segs: TiltSegment[]): TiltSegment[] => {
		if (segs.length < 2) return segs
		const last = segs[segs.length - 1]
		if (last.isTilt || last.text.trim().length > 2) return segs
		const prev = segs[segs.length - 2]
		if (last.text.trim().length * 2 <= prev.text.length) {
			segs[segs.length - 1] = { ...last, isShortLastLine: true }
		}
		return segs
	}

	if (maxOverflow > 1) {
		if (maxOverflow >= RESPLIT_THRESHOLD) {
			const targetWidth = availableWidth * (RESPLIT_THRESHOLD - 0.15)
			const totalEstWidth = measureAtSize(fullText, normalBasePx, normalFontSpec)
			const extraSplitsNeeded = Math.min(4, Math.max(segments.length + 1, Math.ceil(totalEstWidth / targetWidth)))
			if (extraSplitsNeeded > segments.length) {
				const reSplitUnits = SentenceLayout.splitIntoSentences(fullText, extraSplitsNeeded, lineSeed)
				let reSplitOffset = 0
				const newSegments: TiltSegment[] = reSplitUnits.map(u => {
					const trimmed = u.text.trimStart().trimEnd()
					const leadingSpaces = u.text.length - u.text.trimStart().length
					const seg = { text: trimmed, isTilt: false, isShortLastLine: false, charOffset: reSplitOffset + leadingSpaces }
					reSplitOffset += u.text.length
					return seg
				})
				if (newSegments.length > 0) {
					const resplitTiltRoll = seededRandom(lineSeed, 300)
					if (resplitTiltRoll < tuning.tiltStyleProbability) {
						const picked = Math.floor(seededRandom(lineSeed, 301) * newSegments.length)
						newSegments[picked].isTilt = true
					}
				}

				const postWidestTilt = newSegments.filter(s => s.isTilt)[0]
				const postNormalWithWidth = newSegments.filter(s => !s.isTilt).map(s => ({ text: s.text, width: measureAtSize(s.text, normalBasePx, normalFontSpec) }))
				const postWidestNormal = postNormalWithWidth.sort((a, b) => b.width - a.width)[0]

				let postScale = 1
				if (postWidestTilt) {
					const w = measureAtSize(postWidestTilt.text, tiltBasePx, tiltFontSpec)
					if (w > availableWidth) postScale = Math.max(SCALE_FLOOR_TILT, availableWidth / w)
				} else if (postWidestNormal) {
					const w = measureAtSize(postWidestNormal.text, normalBasePx, normalFontSpec)
					if (w > availableWidth) postScale = Math.max(SCALE_FLOOR_NORMAL, availableWidth / w)
				}

				return { segments: markShortLastLine(newSegments), scaleMultiplier: postScale }
			}
		}

		if (tiltOverflow >= normalOverflow && widestTiltEntry) {
			scaleMultiplier = Math.max(SCALE_FLOOR_TILT, availableWidth / tiltWidth)
		} else if (widestNormalEntry) {
			scaleMultiplier = Math.max(SCALE_FLOOR_NORMAL, availableWidth / normalWidth)
		}
	}

	return { segments: markShortLastLine(segments), scaleMultiplier }
}
