'use client'

import { create } from 'zustand'
import { musicConfig, type MusicTrack, type PlayMode } from './music-config'
import { fetchRemotePlaylist, loadLyrics, toPanelLyrics, type LyricLine } from './music-utils'
import { playbackTime, startPlaybackClock, stopPlaybackClock, syncPlaybackClock } from './music-clock'
import type { Line } from './visualizer/types'

interface MusicState {
	playlist: MusicTrack[]
	currentIndex: number
	isPlaying: boolean
	progress: number
	currentTime: number
	duration: number
	volume: number
	playMode: PlayMode
	lyrics: LyricLine[]
	/** 逐词歌词，沉浸歌词动效的数据源；`lyrics` 是它的行级派生 */
	lyricLines: Line[]
	activeLyricIndex: number
	visualizerOpen: boolean
	initialized: boolean
	loading: boolean
	usingFallback: boolean
	error: string | null
	init: () => Promise<void>
	togglePlay: () => void
	playTrack: (index: number) => void
	playNext: () => void
	playPrevious: () => void
	seek: (percent: number) => void
	seekToTime: (seconds: number) => void
	setVolume: (volume: number) => void
	cyclePlayMode: () => void
	setVisualizerOpen: (open: boolean) => void
}

let audio: HTMLAudioElement | null = null
let listenersReady = false

function normalizedUrl(url: string) {
	try {
		return new URL(url, window.location.href).href
	} catch {
		return url
	}
}

function getAudio() {
	if (!audio) {
		audio = new Audio()
		audio.preload = 'metadata'
		audio.volume = musicConfig.volume
	}
	return audio
}

function chooseNextIndex(state: MusicState) {
	if (state.playlist.length <= 1) return 0
	if (state.playMode === 'random') {
		let index = state.currentIndex
		while (index === state.currentIndex) index = Math.floor(Math.random() * state.playlist.length)
		return index
	}
	return (state.currentIndex + 1) % state.playlist.length
}

async function loadTrack(index: number, autoPlay: boolean) {
	const state = useMusicStore.getState()
	const track = state.playlist[index]
	if (!track) return
	const player = getAudio()
	const isSameTrack = player.src && normalizedUrl(player.src) === normalizedUrl(track.url)

	useMusicStore.setState({ currentIndex: index, error: null })
	if (!isSameTrack) {
		player.src = track.url
		player.load()
		playbackTime.set(0)
		useMusicStore.setState({ currentTime: 0, duration: 0, progress: 0, lyrics: [], lyricLines: [], activeLyricIndex: -1 })
		loadLyrics(track).then(lyricLines => {
			// 歌词是异步到的，切歌快时要丢掉上一首的结果
			if (useMusicStore.getState().currentIndex !== index) return
			useMusicStore.setState({ lyricLines, lyrics: toPanelLyrics(lyricLines) })
		})
	}
	if (autoPlay) player.play().catch(() => useMusicStore.setState({ error: '歌曲暂时无法播放' }))
}

function setupListeners() {
	if (listenersReady) return
	const player = getAudio()
	listenersReady = true
	if (process.env.NODE_ENV !== 'production') (window as unknown as { __musicAudio?: HTMLAudioElement }).__musicAudio = player

	player.addEventListener('timeupdate', () => {
		const duration = Number.isFinite(player.duration) ? player.duration : 0
		const currentTime = player.currentTime
		// rAF 时钟只在标签页可见时运行（后台标签/内嵌环境会停），timeupdate 恒定兜底，
		// 保证暂停态 seek 和后台播放时歌词行索引依然推进
		syncPlaybackClock(player)
		const { lyrics, activeLyricIndex } = useMusicStore.getState()
		let nextLyricIndex = -1
		for (let index = 0; index < lyrics.length; index++) {
			if (currentTime >= lyrics[index].time) nextLyricIndex = index
			else break
		}
		useMusicStore.setState({
			currentTime,
			duration,
			progress: duration ? (currentTime / duration) * 100 : 0,
			...(nextLyricIndex !== activeLyricIndex ? { activeLyricIndex: nextLyricIndex } : {})
		})
	})
	player.addEventListener('seeking', () => syncPlaybackClock(player))
	player.addEventListener('play', () => {
		startPlaybackClock(player)
		useMusicStore.setState({ isPlaying: true, error: null })
	})
	player.addEventListener('pause', () => {
		stopPlaybackClock()
		syncPlaybackClock(player)
		useMusicStore.setState({ isPlaying: false })
	})
	player.addEventListener('error', () => {
		stopPlaybackClock()
		useMusicStore.setState({ isPlaying: false, error: '歌曲加载失败，请切换下一首' })
	})
	player.addEventListener('ended', () => {
		stopPlaybackClock()
		const state = useMusicStore.getState()
		if (state.playMode === 'one') {
			player.currentTime = 0
			player.play().catch(() => {})
			return
		}
		loadTrack(chooseNextIndex(state), true)
	})
}

export const useMusicStore = create<MusicState>((set, get) => ({
	playlist: [],
	currentIndex: 0,
	isPlaying: false,
	progress: 0,
	currentTime: 0,
	duration: 0,
	volume: musicConfig.volume,
	playMode: musicConfig.playMode,
	lyrics: [],
	lyricLines: [],
	activeLyricIndex: -1,
	visualizerOpen: false,
	initialized: false,
	loading: false,
	usingFallback: false,
	error: null,
	init: async () => {
		if (get().initialized || get().loading || typeof window === 'undefined') return
		set({ loading: true })
		setupListeners()
		const remotePlaylist = await fetchRemotePlaylist()
		const playlist = remotePlaylist.length ? remotePlaylist : musicConfig.localPlaylist
		set({ playlist, initialized: true, loading: false, usingFallback: !remotePlaylist.length })
		await loadTrack(0, false)
	},
	togglePlay: () => {
		if (!get().initialized) {
			get()
				.init()
				.then(() =>
					getAudio()
						.play()
						.catch(() => set({ error: '浏览器阻止了自动播放，请再点一次' }))
				)
			return
		}
		const player = getAudio()
		if (player.paused) player.play().catch(() => set({ error: '歌曲暂时无法播放' }))
		else player.pause()
	},
	playTrack: index => loadTrack(index, true),
	playNext: () => loadTrack(chooseNextIndex(get()), true),
	playPrevious: () => {
		const { playlist, currentIndex } = get()
		if (!playlist.length) return
		loadTrack((currentIndex - 1 + playlist.length) % playlist.length, true)
	},
	seek: percent => {
		const player = getAudio()
		if (!Number.isFinite(player.duration)) return
		player.currentTime = (Math.max(0, Math.min(100, percent)) / 100) * player.duration
	},
	seekToTime: seconds => {
		const player = getAudio()
		if (!Number.isFinite(player.duration)) return
		player.currentTime = Math.max(0, Math.min(player.duration, seconds))
		syncPlaybackClock(player)
	},
	setVolume: volume => {
		const nextVolume = Math.max(0, Math.min(1, volume))
		getAudio().volume = nextVolume
		set({ volume: nextVolume })
	},
	cyclePlayMode: () => {
		const modes: PlayMode[] = ['list', 'one', 'random']
		const nextMode = modes[(modes.indexOf(get().playMode) + 1) % modes.length]
		set({ playMode: nextMode })
	},
	setVisualizerOpen: open => set({ visualizerOpen: open })
}))
