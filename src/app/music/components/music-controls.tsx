'use client'

import { ListRestart, Pause, Play, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '../music-store'

const modeMeta = {
	list: { label: '列表循环', Icon: ListRestart },
	one: { label: '单曲循环', Icon: Repeat1 },
	random: { label: '随机播放', Icon: Shuffle }
}

export default function MusicControls() {
	const { isPlaying, playMode, volume, togglePlay, playPrevious, playNext, cyclePlayMode, setVolume } = useMusicStore(
		useShallow(s => ({
			isPlaying: s.isPlaying,
			playMode: s.playMode,
			volume: s.volume,
			togglePlay: s.togglePlay,
			playPrevious: s.playPrevious,
			playNext: s.playNext,
			cyclePlayMode: s.cyclePlayMode,
			setVolume: s.setVolume
		}))
	)
	const { label, Icon } = modeMeta[playMode]

	return (
		<div className='space-y-5'>
			<div className='flex items-center justify-center gap-5'>
				<button type='button' title={label} aria-label={label} onClick={cyclePlayMode} className='text-secondary hover:text-brand rounded-full p-2'>
					<Icon className='h-5 w-5' />
				</button>
				<button type='button' aria-label='上一首' onClick={playPrevious} className='text-primary hover:text-brand rounded-full p-2'>
					<SkipBack className='h-6 w-6' fill='currentColor' />
				</button>
				<button
					type='button'
					aria-label={isPlaying ? '暂停' : '播放'}
					onClick={togglePlay}
					className='bg-brand flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg'>
					{isPlaying ? <Pause className='h-6 w-6' fill='currentColor' /> : <Play className='ml-1 h-6 w-6' fill='currentColor' />}
				</button>
				<button type='button' aria-label='下一首' onClick={playNext} className='text-primary hover:text-brand rounded-full p-2'>
					<SkipForward className='h-6 w-6' fill='currentColor' />
				</button>
				<div className='w-9' title={label}>
					<span className='text-brand text-[10px]'>{label.slice(0, 2)}</span>
				</div>
			</div>
			<label className='text-secondary mx-auto flex max-w-xs items-center gap-3'>
				<Volume2 className='h-4 w-4 shrink-0' />
				<input
					type='range'
					min='0'
					max='1'
					step='0.01'
					value={volume}
					aria-label='音量'
					onChange={event => setVolume(Number(event.target.value))}
					className='accent-brand w-full cursor-pointer'
				/>
			</label>
		</div>
	)
}
