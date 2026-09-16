import type { Line, LyricData } from '../types'
import { buildTimedWords } from './buildTimedWords'
import { finalizeParsedLyricLines } from './interludes'
import { findTranslationsForSortedStartTimes, stripBom } from './parserTimestamps'
import type { LyricProcessingOptions, TimedTextEntry } from './types'

const parseVttTimestamp = (value: string): number => {
	const normalized = value.trim()
	const parts = normalized.split(':')

	let hours = 0
	let minutes = 0
	let seconds = 0

	if (parts.length === 3) {
		hours = parseInt(parts[0], 10)
		minutes = parseInt(parts[1], 10)
		seconds = parseFloat(parts[2])
	} else if (parts.length === 2) {
		minutes = parseInt(parts[0], 10)
		seconds = parseFloat(parts[1])
	} else {
		seconds = parseFloat(parts[0])
	}

	return hours * 3600 + minutes * 60 + seconds
}

const stripVttCueText = (text: string): string => {
	return text
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ')
		.trim()
}

const parseVTTEntries = (vttString: string): TimedTextEntry[] => {
	const normalized = stripBom(vttString).replace(/\r\n/g, '\n').trim()
	if (!normalized) {
		return []
	}

	const blocks = normalized.split(/\n{2,}/)
	const entries: TimedTextEntry[] = []
	const timingLineRegex = /^((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}\.\d{3})(?:\s+.*)?$/

	for (const block of blocks) {
		const lines = block
			.split('\n')
			.map(line => line.trim())
			.filter(Boolean)

		if (lines.length === 0 || lines[0] === 'WEBVTT' || lines[0].startsWith('NOTE') || lines[0] === 'STYLE' || lines[0] === 'REGION') {
			continue
		}

		const timingLineIndex = lines.findIndex(line => timingLineRegex.test(line))
		if (timingLineIndex === -1) {
			continue
		}

		const timingMatch = lines[timingLineIndex].match(timingLineRegex)
		if (!timingMatch) {
			continue
		}

		const text = stripVttCueText(lines.slice(timingLineIndex + 1).join(' '))
		if (!text) {
			continue
		}

		entries.push({
			startTime: parseVttTimestamp(timingMatch[1]),
			endTime: parseVttTimestamp(timingMatch[2]),
			text
		})
	}

	return entries.sort((left, right) => left.startTime - right.startTime)
}

export const parseVTT = (
	vttString: string,
	translationString: string = '',
	options: LyricProcessingOptions = {},
	romanizationString: string = ''
): LyricData => {
	const entries = parseVTTEntries(vttString)
	const translationEntries = parseVTTEntries(translationString)
	const romanizationEntries = parseVTTEntries(romanizationString)
	const translations = findTranslationsForSortedStartTimes(
		entries.map(entry => entry.startTime),
		translationEntries
	)
	const romanizations = findTranslationsForSortedStartTimes(
		entries.map(entry => entry.startTime),
		romanizationEntries
	)
	const lines: Line[] = []

	for (let index = 0; index < entries.length; index += 1) {
		const current = entries[index]
		const next = entries[index + 1]
		const fallbackEndTime = next ? next.startTime : current.startTime + 5
		const endTime = Math.max(current.endTime || fallbackEndTime, current.startTime + 0.1)

		lines.push({
			words: buildTimedWords(current.text, current.startTime, endTime),
			startTime: current.startTime,
			endTime,
			fullText: current.text,
			translation: translations[index],
			romanization: romanizations[index]
		})
	}

	return { lines: finalizeParsedLyricLines(lines, options) }
}
