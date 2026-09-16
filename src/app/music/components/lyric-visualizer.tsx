'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useMotionValueEvent } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '../music-store'
import { audioBands, audioPower, playbackTime } from '../music-clock'
import VisualizerRenderer from '../visualizer/VisualizerRenderer'
import { DEFAULT_VISUALIZER_MODE, hasVisualizerMode } from '../visualizer/registry'
import type { Line, Theme, VisualizerMode } from '../visualizer/types'
import { buildVisualizerTheme } from './visualizer-theme'
import VisualizerChrome, { stepVisualizerMode } from './visualizer-chrome'

const MODE_STORAGE_KEY = 'music-visualizer-mode'
const CHROME_IDLE_MS = 2600

function readStoredMode(): VisualizerMode {
	try {
		const stored = window.localStorage.getItem(MODE_STORAGE_KEY)
		return hasVisualizerMode(stored) ? stored : DEFAULT_VISUALIZER_MODE
	} catch {
		return DEFAULT_VISUALIZER_MODE
	}
}

/** 最后一条 startTime <= time 的行；歌词按 startTime 有序，二分即可 */
function findLineIndex(lines: Line[], time: number) {
	let low = 0
	let high = lines.length - 1
	let found = -1
	while (low <= high) {
		const mid = (low + high) >> 1
		if (lines[mid].startTime <= time) {
			found = mid
			low = mid + 1
		} else high = mid - 1
	}
	return found
}

/**
 * /music 的沉浸歌词层：全屏挂载 Folia 移植的 visualizer，
 * 时间源是 rAF 驱动的 playbackTime，本组件只维护「当前行」「模式」「操作层可见」这些离散状态。
 */
export default function LyricVisualizer() {
	const { open, track, lyricLines, isPlaying, setVisualizerOpen, seekToTime } = useMusicStore(
		useShallow(s => ({
			open: s.visualizerOpen,
			track: s.playlist[s.currentIndex],
			lyricLines: s.lyricLines,
			isPlaying: s.isPlaying,
			setVisualizerOpen: s.setVisualizerOpen,
			seekToTime: s.seekToTime
		}))
	)
	const [mode, setMode] = useState<VisualizerMode>(DEFAULT_VISUALIZER_MODE)
	const [theme, setTheme] = useState<Theme | null>(null)
	const [lineIndex, setLineIndex] = useState(-1)
	const [chromeVisible, setChromeVisible] = useState(true)
	const idleTimer = useRef<number | null>(null)

	useEffect(() => {
		setMode(readStoredMode())
	}, [])

	const selectMode = useCallback((next: VisualizerMode) => {
		setMode(next)
		try {
			window.localStorage.setItem(MODE_STORAGE_KEY, next)
		} catch {}
	}, [])

	const close = useCallback(() => setVisualizerOpen(false), [setVisualizerOpen])

	const revealChrome = useCallback(() => {
		setChromeVisible(true)
		if (idleTimer.current !== null) window.clearTimeout(idleTimer.current)
		idleTimer.current = window.setTimeout(() => setChromeVisible(false), CHROME_IDLE_MS)
	}, [])

	useMotionValueEvent(playbackTime, 'change', time => {
		const next = findLineIndex(lyricLines, time)
		setLineIndex(previous => (previous === next ? previous : next))
	})

	useEffect(() => {
		setLineIndex(findLineIndex(lyricLines, playbackTime.get()))
	}, [lyricLines])

	useEffect(() => {
		if (!open) return
		setTheme(buildVisualizerTheme())
		revealChrome()
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') close()
			else if (event.key === 'ArrowRight') selectMode(stepVisualizerMode(mode, 1))
			else if (event.key === 'ArrowLeft') selectMode(stepVisualizerMode(mode, -1))
			else return
			event.preventDefault()
		}
		window.addEventListener('keydown', onKeyDown)
		return () => {
			document.body.style.overflow = previousOverflow
			window.removeEventListener('keydown', onKeyDown)
			if (idleTimer.current !== null) window.clearTimeout(idleTimer.current)
		}
	}, [open, mode, close, selectMode, revealChrome])

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence>
			{open && theme && (
				<motion.div
					key='lyric-visualizer'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.35 }}
					className='fixed inset-0 z-[100] bg-black text-white'
					style={{ cursor: chromeVisible ? 'auto' : 'none' }}
					onPointerMove={revealChrome}
					onPointerDown={revealChrome}>
					<VisualizerRenderer
						mode={mode}
						currentTime={playbackTime}
						currentLineIndex={lineIndex}
						lines={lyricLines}
						theme={theme}
						isDaylight={false}
						audioPower={audioPower}
						audioBands={audioBands}
						songTitle={track?.name}
						songArtist={track?.artist}
						coverUrl={track?.pic}
						seed={track?.url}
						paused={!isPlaying}
						isPlayerChromeHidden={!chromeVisible}
						showSubtitleTranslation
						onLyricLineSeek={seekToTime}
						background={{ mode: 'plain', common: { useCoverColorBg: true } }}
					/>
					<VisualizerChrome visible={chromeVisible} mode={mode} onSelectMode={selectMode} onClose={close} />
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	)
}
