'use client'

import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '../music-store'
import { formatMusicTime } from '../music-utils'

export default function MusicProgress() {
	const { progress, currentTime, duration, seek } = useMusicStore(
		useShallow(s => ({
			progress: s.progress,
			currentTime: s.currentTime,
			duration: s.duration,
			seek: s.seek
		}))
	)

	return (
		<div className='space-y-2'>
			<input
				type='range'
				min='0'
				max='100'
				step='0.1'
				value={progress}
				aria-label='播放进度'
				onChange={event => seek(Number(event.target.value))}
				className='accent-brand w-full cursor-pointer'
			/>
			<div className='text-secondary flex justify-between text-xs tabular-nums'>
				<span>{formatMusicTime(currentTime)}</span>
				<span>{formatMusicTime(duration)}</span>
			</div>
		</div>
	)
}
