import { prepareWithSegments, walkLineRanges, type LayoutLineRange, type PreparedTextWithSegments } from '@chenglou/pretext'

// Text measurement adapter for the Claddagh ring layout.
//
// Upstream Folia (pretext ^0.0.8) calls `prepareWithSegments(text, font, { whiteSpace: 'pre-wrap', letterSpacing })`
// followed by `measureNaturalWidth(prepared)`. The blog pins pretext 0.0.3, which predates both the
// `measureNaturalWidth` export and the `letterSpacing` prepare option, so both are rebuilt here on the
// 0.0.3 API with the 0.0.8 semantics:
// - natural width == the widest line produced when wrapping against an infinite width (only hard
//   breaks can still split the text);
// - 0.0.8 letter spacing advances by `letterSpacing` once per rendered grapheme of a line: between
//   graphemes inside a segment, between adjacent segments and once more after the last grapheme
//   (`finalizeLinePaintWidth`), i.e. exactly CSS `letter-spacing`. Control segments (zero-width break,
//   soft hyphen, hard break) never carry spacing and a tab counts as a single grapheme.
// Base segment widths are measured identically on both versions, so the only delta this file bridges
// is the spacing bookkeeping. Once the package is upgraded these helpers can delegate to the native
// exports unchanged.

type SegmentKind = PreparedTextWithSegments['kinds'][number]

const NATURAL_WIDTH_MAX = Number.POSITIVE_INFINITY

const graphemeSegmenter = typeof Intl !== 'undefined' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

const splitGraphemes = (text: string): string[] => {
	if (!text) return []
	if (graphemeSegmenter) {
		return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment)
	}
	return Array.from(text)
}

// Mirrors pretext 0.0.8 `countRenderedSpacingGraphemes`.
const countRenderedSpacingGraphemes = (graphemes: string[], kind: SegmentKind): number => {
	if (kind === 'zero-width-break' || kind === 'soft-hyphen' || kind === 'hard-break') return 0
	if (kind === 'tab') return 1
	return graphemes.length
}

// Rendered graphemes of one laid-out line, honouring partial start/end cursors inside a segment.
const countLineSpacingGraphemes = (prepared: PreparedTextWithSegments, range: LayoutLineRange): number => {
	let count = 0
	for (let segmentIndex = range.start.segmentIndex; segmentIndex <= range.end.segmentIndex; segmentIndex++) {
		const isEndSegment = segmentIndex === range.end.segmentIndex
		if (isEndSegment && range.end.graphemeIndex === 0) break
		const segment = prepared.segments[segmentIndex]
		const kind = prepared.kinds[segmentIndex]
		if (segment === undefined || kind === undefined) break
		const graphemes = splitGraphemes(segment)
		const from = segmentIndex === range.start.segmentIndex ? range.start.graphemeIndex : 0
		const to = isEndSegment ? range.end.graphemeIndex : graphemes.length
		count += countRenderedSpacingGraphemes(graphemes.slice(from, to), kind)
	}
	return count
}

export const prepareCladdaghText = (text: string, fontSpec: string): PreparedTextWithSegments => prepareWithSegments(text, fontSpec, { whiteSpace: 'pre-wrap' })

export const measureNaturalTextWidth = (prepared: PreparedTextWithSegments, letterSpacingPx = 0): number => {
	const letterSpacing = Number.isFinite(letterSpacingPx) ? letterSpacingPx : 0
	let maxWidth = 0
	walkLineRanges(prepared, NATURAL_WIDTH_MAX, line => {
		const width = letterSpacing === 0 ? line.width : line.width + letterSpacing * countLineSpacingGraphemes(prepared, line)
		if (width > maxWidth) maxWidth = width
	})
	return maxWidth
}
