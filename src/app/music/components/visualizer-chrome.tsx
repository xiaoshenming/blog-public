'use client'

import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '../music-store'
import { VISUALIZER_REGISTRY } from '../visualizer/registry'
import type { VisualizerMode } from '../visualizer/types'

interface VisualizerChromeProps {
	visible: boolean
	mode: VisualizerMode
	onSelectMode: (mode: VisualizerMode) => void
	onClose: () => void
}

export function stepVisualizerMode(current: VisualizerMode, delta: 1 | -1): VisualizerMode {
	const modes = VISUALIZER_REGISTRY.map(entry => entry.mode)
	const index = Math.max(0, modes.indexOf(current))
	return modes[(index + delta + modes.length) % modes.length]
}

/**
 * 沉浸歌词的操作层：顶部关闭 + 动效切换，底部迷你播控。
 * 鼠标静止后整体淡出，把画面完全留给歌词。
 */
export default function VisualizerChrome({ visible, mode, onSelectMode, onClose }: VisualizerChromeProps) {
	const { track, isPlaying, togglePlay, playPrevious, playNext } = useMusicStore(
		useShallow(s => ({
			track: s.playlist[s.currentIndex],
			isPlaying: s.isPlaying,
			togglePlay: s.togglePlay,
			playPrevious: s.playPrevious,
			playNext: s.playNext
		}))
	)

	return (
		<motion.div
			initial={false}
			animate={{ opacity: visible ? 1 : 0 }}
			transition={{ duration: 0.3 }}
			className='pointer-events-none absolute inset-0 z-40 flex flex-col justify-between p-5 sm:p-7'>
			<div className='flex items-start justify-between gap-4'>
				<button
					type='button'
					aria-label='退出沉浸歌词'
					onClick={onClose}
					className={`${visible ? 'pointer-events-auto' : ''} flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-md transition hover:bg-white/20`}>
					<X className='h-5 w-5' />
				</button>
				<div className={`${visible ? 'pointer-events-auto' : ''} flex max-w-[70vw] items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-md`}>
					<button
						type='button'
						aria-label='上一个动效'
						onClick={() => onSelectMode(stepVisualizerMode(mode, -1))}
						className='rounded-full p-1.5 text-white/70 hover:text-white'>
						<ChevronLeft className='h-4 w-4' />
					</button>
					<div className='scrollbar-none flex items-center gap-1 overflow-x-auto'>
						{VISUALIZER_REGISTRY.map(entry => (
							<button
								key={entry.mode}
								type='button'
								aria-pressed={entry.mode === mode}
								onClick={() => onSelectMode(entry.mode)}
								className={`shrink-0 rounded-full px-3 py-1 text-xs transition ${entry.mode === mode ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
								{entry.label}
							</button>
						))}
					</div>
					<button
						type='button'
						aria-label='下一个动效'
						onClick={() => onSelectMode(stepVisualizerMode(mode, 1))}
						className='rounded-full p-1.5 text-white/70 hover:text-white'>
						<ChevronRight className='h-4 w-4' />
					</button>
				</div>
			</div>

			<div className='flex flex-col items-center gap-3'>
				<div className={`${visible ? 'pointer-events-auto' : ''} flex items-center gap-4 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur-md`}>
					<div className='hidden max-w-[200px] min-w-0 sm:block'>
						<div className='truncate text-sm font-medium text-white'>{track?.name || '音乐播放器'}</div>
						<div className='truncate text-xs text-white/60'>{track?.artist}</div>
					</div>
					<button type='button' aria-label='上一首' onClick={playPrevious} className='rounded-full p-1.5 text-white/80 hover:text-white'>
						<SkipBack className='h-5 w-5' fill='currentColor' />
					</button>
					<button
						type='button'
						aria-label={isPlaying ? '暂停' : '播放'}
						onClick={togglePlay}
						className='flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg'>
						{isPlaying ? <Pause className='h-5 w-5' fill='currentColor' /> : <Play className='ml-0.5 h-5 w-5' fill='currentColor' />}
					</button>
					<button type='button' aria-label='下一首' onClick={playNext} className='rounded-full p-1.5 text-white/80 hover:text-white'>
						<SkipForward className='h-5 w-5' fill='currentColor' />
					</button>
				</div>
				<p className='text-[11px] text-white/40'>Esc 退出 · ← / → 切换动效 · 歌词动效移植自 Folia</p>
			</div>
		</motion.div>
	)
}
