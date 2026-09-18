'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useMotionValueEvent } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import * as stylex from '@stylexjs/stylex'
import { useMusicStore } from '../music-store'
import { audioBands, audioPower, playbackTime } from '../music-clock'
import VisualizerRenderer from '../visualizer/VisualizerRenderer'
import { DEFAULT_VISUALIZER_MODE, hasVisualizerMode } from '../visualizer/registry'
import type { Line, Theme, VisualizerMode } from '../visualizer/types'
import { buildVisualizerTheme } from './visualizer-theme'
import VisualizerChrome, { stepVisualizerMode } from './visualizer-chrome'
import { colors } from '@/styles/tokens.stylex'

const MODE_STORAGE_KEY = 'music-visualizer-mode'
const CHROME_IDLE_MS = 2600

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 全屏沉浸层：黑底白字，无焦点描边 */
	root: {
		position: 'fixed',
		inset: 0,
		zIndex: 100,
		backgroundColor: '#000',
		color: colors.white,
		outlineStyle: 'none'
	}
})

const FOCUSABLE_SELECTOR =
	'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 沉浸层内的可聚焦元素；操作层淡出时仍在 DOM 里，失焦可见性由 onFocusCapture 唤回 */
function focusableIn(root: HTMLElement | null) {
	return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []
}

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
	const dialogRef = useRef<HTMLDivElement>(null)
	const restoreFocusRef = useRef<HTMLElement | null>(null)
	const keyboardNav = useRef(false)

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
		idleTimer.current = window.setTimeout(() => {
			// 键盘导航途中不淡出，否则焦点会停在看不见的按钮上
			if (keyboardNav.current && dialogRef.current?.contains(document.activeElement)) return
			setChromeVisible(false)
		}, CHROME_IDLE_MS)
	}, [])

	const onPointerActivity = useCallback(() => {
		keyboardNav.current = false
		revealChrome()
	}, [revealChrome])

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

	// 打开时记下触发元素，关闭后把焦点还回去（对话框卸载后 activeElement 会落到 body）
	useEffect(() => {
		if (!open) return
		restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
		return () => {
			const target = restoreFocusRef.current
			restoreFocusRef.current = null
			if (target?.isConnected) target.focus()
		}
	}, [open])

	// 焦点移入对话框；切换模式会重建 theme，此时焦点已在层内，不再抢
	useEffect(() => {
		if (!open || !theme) return
		const dialog = dialogRef.current
		if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
	}, [open, theme])

	const onDialogKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Tab') return
		keyboardNav.current = true
		const dialog = dialogRef.current
		const items = focusableIn(dialog)
		if (!dialog || items.length === 0) {
			event.preventDefault()
			return
		}
		const first = items[0]
		const last = items[items.length - 1]
		const active = document.activeElement
		// 焦点跑到层外时先拉回来，其余交给浏览器按 DOM 顺序走
		if (!dialog.contains(active)) {
			event.preventDefault()
			first.focus()
			return
		}
		if (event.shiftKey ? active === first || active === dialog : active === last || active === dialog) {
			event.preventDefault()
			;(event.shiftKey ? last : first).focus()
		}
	}, [])

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence>
			{open && theme && (
				<motion.div
					key='lyric-visualizer'
					ref={dialogRef}
					role='dialog'
					aria-modal='true'
					aria-label='沉浸歌词'
					tabIndex={-1}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.35 }}
					{...stylex.props(styles.root)}
					style={{ cursor: chromeVisible ? 'auto' : 'none' }}
					onPointerMove={onPointerActivity}
					onPointerDown={onPointerActivity}
					onKeyDown={onDialogKeyDown}
					onFocusCapture={revealChrome}>
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
