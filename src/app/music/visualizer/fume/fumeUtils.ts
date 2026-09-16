// src/app/music/visualizer/fume/fumeUtils.ts
// Pure helpers shared across the Fume pipeline: grapheme splitting, easing curves, the deterministic
// hash/seed pair that keeps the article composition stable for a given song, and a monotonic clock.

const graphemeSegmenter = typeof Intl !== 'undefined' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

export const splitGraphemes = (text: string) => {
	if (!text) return [] as string[]
	if (graphemeSegmenter) {
		return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment)
	}
	return Array.from(text)
}

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const mix = (from: number, to: number, amount: number) => from + (to - from) * amount
export const quadraticBezier = (from: number, control: number, to: number, amount: number) => {
	const normalized = clamp(amount, 0, 1)
	const inverse = 1 - normalized
	return inverse * inverse * from + 2 * inverse * normalized * control + normalized * normalized * to
}
export const easeOutCubic = (value: number) => 1 - Math.pow(1 - clamp(value, 0, 1), 3)
export const easeInCubic = (value: number) => Math.pow(clamp(value, 0, 1), 3)
export const easeInOutCubic = (value: number) => {
	const normalized = clamp(value, 0, 1)
	return normalized < 0.5 ? 4 * normalized * normalized * normalized : 1 - Math.pow(-2 * normalized + 2, 3) / 2
}
export const resolveDelayedGlowEnvelope = (progress: number, peakProgress = 0.8) => {
	const normalized = clamp(progress, 0, 1)
	const clampedPeak = clamp(peakProgress, 0.05, 0.95)

	if (normalized <= clampedPeak) {
		return easeOutCubic(normalized / clampedPeak)
	}

	return 1 - easeInCubic((normalized - clampedPeak) / (1 - clampedPeak))
}

export const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export const roundMs = (value: number) => Number(value.toFixed(2))

export const isCJK = (text: string) => /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text)

export const hashString = (input: string) => {
	let hash = 2166136261
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}
	return hash >>> 0
}

export const seeded = (seed: string) => {
	const hash = hashString(seed)
	return (hash % 10000) / 10000
}

export const countRenderableGraphemes = (text: string) => splitGraphemes(text).filter(value => value.trim().length > 0).length
