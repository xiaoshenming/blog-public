import { LEADING_LRC_TAGS_REGEX, LRC_LINE_TIME_REGEX, parseTimestamp, stripBom } from './parserTimestamps'

export interface BilingualLrcTracks {
	main: string
	translation: string
}

/**
 * Splits a single bilingual LRC source into the two tracks the upstream parsers expect.
 *
 * Many bilingual LRC files repeat a line's timestamp with its translation right after it:
 *
 *   [00:12.00]Hello world
 *   [00:12.00]你好世界
 *
 * The first line seen for a timestamp stays on the main track; every later line carrying exactly the
 * same (first) timestamp goes to the translation track. Both tracks then run through the upstream
 * parser and its translation alignment (`findTranslationsForSortedStartTimes`), which is what merges
 * the translation into `Line.translation`. A single-track file comes back unchanged with an empty
 * translation track, so plain files parse exactly as before.
 *
 * Only the first of several leading tags is used as the key, mirroring `parseSimpleTimedTextEntry`.
 */
export const splitBilingualLrcTracks = (source: string): BilingualLrcTracks => {
	const mainLines: string[] = []
	const translationLines: string[] = []
	const seenStartTimes = new Set<number>()

	for (const rawLine of stripBom(source).split(/\r?\n/)) {
		const tagsMatch = rawLine.trim().match(LEADING_LRC_TAGS_REGEX)
		const firstTag = tagsMatch?.[1].match(LRC_LINE_TIME_REGEX)
		if (!tagsMatch || !firstTag || !tagsMatch[2].trim()) {
			mainLines.push(rawLine)
			continue
		}

		const key = Math.round(parseTimestamp(firstTag[1], firstTag[2], firstTag[3]) * 1000)
		if (seenStartTimes.has(key)) {
			translationLines.push(rawLine)
			continue
		}

		seenStartTimes.add(key)
		mainLines.push(rawLine)
	}

	return {
		main: mainLines.join('\n'),
		translation: translationLines.join('\n')
	}
}
