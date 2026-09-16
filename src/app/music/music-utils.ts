import { musicConfig, type MusicTrack } from './music-config'
import type { Line } from './visualizer/types'

/** 侧栏歌词面板用的行级视图，由逐词 Line 派生 */
export interface LyricLine {
	time: number
	text: string
}

export function toPanelLyrics(lines: Line[]): LyricLine[] {
	return lines.map(line => ({ time: line.startTime, text: line.fullText }))
}

/**
 * 解析走 Folia 移植的歌词管线（LRC / 增强 LRC / YRC / QRC / TTML 自动识别），
 * 纯行级 LRC 也会按 grapheme 生成逐词伪时间轴，沉浸歌词的逐词动效才成立。
 * 解析器体积不小，按需动态加载，避免进首页 bundle。
 * 网络失败静默降级为无歌词；解析器本身出错属于 bug，必须进控制台。
 */
async function parseLyricText(source: string): Promise<Line[]> {
	if (!source.trim()) return []
	try {
		const { parseLyricSource } = await import('./visualizer/lyrics')
		return parseLyricSource(source)
	} catch (error) {
		console.error('[music] 歌词解析失败', error)
		return []
	}
}

export async function loadLyrics(track: MusicTrack): Promise<Line[]> {
	if (!track.lrc) return []
	if (!/^(https?:)?\/\//.test(track.lrc) && !track.lrc.startsWith('/')) return parseLyricText(track.lrc)

	let source: string
	try {
		const response = await fetch(track.lrc, { signal: AbortSignal.timeout(8000) })
		if (!response.ok) return []
		source = await response.text()
	} catch {
		return []
	}
	return parseLyricText(source)
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
