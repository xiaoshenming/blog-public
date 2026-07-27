import { musicConfig, type MusicTrack } from './music-config'

export interface LyricLine {
	time: number
	text: string
}

export function parseLyrics(source: string): LyricLine[] {
	if (!source) return []
	const result: LyricLine[] = []
	const timePattern = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]/g

	for (const line of source.split('\n')) {
		const matches = [...line.matchAll(timePattern)]
		const text = line.replace(timePattern, '').trim()
		if (!text) continue

		for (const match of matches) {
			const fraction = match[3] ? Number(match[3]) / (match[3].length === 3 ? 1000 : 100) : 0
			result.push({ time: Number(match[1]) * 60 + Number(match[2]) + fraction, text })
		}
	}

	return result.sort((a, b) => a.time - b.time)
}

export async function loadLyrics(track: MusicTrack): Promise<LyricLine[]> {
	if (!track.lrc) return []
	if (!/^(https?:)?\/\//.test(track.lrc) && !track.lrc.startsWith('/')) return parseLyrics(track.lrc)

	try {
		const response = await fetch(track.lrc, { signal: AbortSignal.timeout(8000) })
		if (!response.ok) return []
		return parseLyrics(await response.text())
	} catch {
		return []
	}
}

function normalizeTrack(item: Record<string, unknown>): MusicTrack | null {
	const url = String(item.url || '')
	if (!url) return null
	return {
		name: String(item.title || item.name || '未知歌曲'),
		artist: String(item.author || item.artist || '未知歌手'),
		url,
		pic: String(item.pic || item.cover || ''),
		lrc: String(item.lrc || '')
	}
}

export async function fetchRemotePlaylist(): Promise<MusicTrack[]> {
	for (const template of musicConfig.apiEndpoints) {
		const url = template.replace(':server', musicConfig.server).replace(':type', musicConfig.type).replace(':id', musicConfig.playlistId)
		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
			if (!response.ok) continue
			const data: unknown = await response.json()
			if (!Array.isArray(data)) continue
			const tracks = data.map(item => normalizeTrack(item as Record<string, unknown>)).filter((track): track is MusicTrack => Boolean(track))
			if (tracks.length) return tracks
		} catch {
			continue
		}
	}
	return []
}

export function formatMusicTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
	const minutes = Math.floor(seconds / 60)
	const rest = Math.floor(seconds % 60)
	return `${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
}
