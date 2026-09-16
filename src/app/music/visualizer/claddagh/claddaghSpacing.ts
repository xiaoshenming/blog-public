import { measureNaturalTextWidth, prepareCladdaghText } from './claddaghTextMeasure'
import { isCJKChar } from './claddaghTiming'

// Measured ring spacing for the Claddagh layout: places every grapheme center at its rendered
// advance position (pretext's canvas-backed font measurement) and maps those widths onto the
// ellipse arc as nominal angles.

export const CLADDAGH_MAX_ARC_SPAN = 4.25
export const CLADDAGH_LETTER_SPACING_EM = 0.04
export const CLADDAGH_BASE_TRACKING_EM = 0.18
const CLADDAGH_SPACING_CACHE_LIMIT = 240
const claddaghSpacingCache = new Map<string, number[]>()

const getFallbackGraphemeWidth = (char: string, fontPx: number): number => {
	if (/^\s+$/.test(char)) return fontPx * 0.36
	if (isCJKChar(char)) return fontPx
	return fontPx * 0.62
}

const rememberSpacingOffsets = (key: string, offsets: number[]) => {
	if (claddaghSpacingCache.size >= CLADDAGH_SPACING_CACHE_LIMIT) {
		const oldestKey = claddaghSpacingCache.keys().next().value
		if (oldestKey) {
			claddaghSpacingCache.delete(oldestKey)
		}
	}
	claddaghSpacingCache.set(key, offsets)
	return offsets
}

const measureCladdaghTextWidth = (text: string, fontSpec: string, fontPx: number, fallbackWidth: number): number => {
	if (!text) return 0
	const prepared = prepareCladdaghText(text, fontSpec)
	const measuredWidth = measureNaturalTextWidth(prepared, fontPx * CLADDAGH_LETTER_SPACING_EM)
	return Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : fallbackWidth
}

// Uses pretext's canvas-backed font measurement to place grapheme centers at their rendered advance positions.
const measureCladdaghGraphemeOffsets = (graphemes: string[], fontSpec: string, fontPx: number, letterSpacingOffsetPx = 0): number[] => {
	const text = graphemes.join('')
	const cacheKey = `${fontPx}|${fontSpec}|${CLADDAGH_BASE_TRACKING_EM}|${letterSpacingOffsetPx}|${text}`
	const cached = claddaghSpacingCache.get(cacheKey)
	if (cached) return cached

	const offsets = new Array<number>(graphemes.length + 1).fill(0)
	let fallbackWidth = 0
	for (let index = 1; index <= graphemes.length; index += 1) {
		fallbackWidth += getFallbackGraphemeWidth(graphemes[index - 1], fontPx)
		const baseTracking = Math.max(0, index - 1) * fontPx * CLADDAGH_BASE_TRACKING_EM
		// 每个字符间隙累加 letterSpacingOffsetPx，增大字符之间的距离
		const extraOffset = Math.max(0, index - 1) * letterSpacingOffsetPx
		offsets[index] = Math.max(
			offsets[index - 1],
			measureCladdaghTextWidth(graphemes.slice(0, index).join(''), fontSpec, fontPx, fallbackWidth) + baseTracking + extraOffset
		)
	}
	return rememberSpacingOffsets(cacheKey, offsets)
}

export interface CladdaghAngleFields {
	startAngle: number
	nominalAngle: number
	scaleFactor: number
}

// One grapheme of a rendered ring line: timing + word-color override + its measured arc angles.
export interface CladdaghRingSpacingItem extends CladdaghAngleFields {
	char: string
	startTime: number
	endTime: number
	charColor: string | null
}

// The active line's spacing as the other ring lines see it: only timing and angles are needed to
// follow its playback offset.
export type CladdaghActiveSpacingItem = CladdaghAngleFields & { startTime: number; endTime: number }

export const buildMeasuredSpacingInfo = <T extends { char: string }>(
	items: T[],
	fontSpec: string,
	fontPx: number,
	radiusPx: number,
	spacingScale = 1,
	letterSpacingOffsetPx = 0
): Array<T & CladdaghAngleFields> => {
	if (items.length === 0) return []
	const graphemes = items.map(item => item.char)
	const offsets = measureCladdaghGraphemeOffsets(graphemes, fontSpec, fontPx, letterSpacingOffsetPx)
	const safeSpacingScale = Number.isFinite(spacingScale) ? Math.max(0.1, spacingScale) : 1
	const totalWidth = (offsets[offsets.length - 1] ?? 0) * safeSpacingScale
	const safeRadius = Math.max(radiusPx, fontPx * 2, 1)
	const totalSpan = totalWidth / safeRadius
	const scaleFactor = totalSpan > CLADDAGH_MAX_ARC_SPAN ? CLADDAGH_MAX_ARC_SPAN / totalSpan : 1.0

	return items.map((item, index) => {
		const centerPx = (((offsets[index] ?? 0) + (offsets[index + 1] ?? offsets[index] ?? 0)) / 2) * safeSpacingScale
		const startAngle = centerPx / safeRadius
		return {
			...item,
			startAngle,
			nominalAngle: (startAngle - totalSpan / 2) * scaleFactor,
			scaleFactor
		}
	})
}
