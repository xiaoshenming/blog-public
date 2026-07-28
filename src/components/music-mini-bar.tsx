'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Pause, Play } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '@/app/music/music-store'

export default function MusicMiniBar() {
	const router = useRouter()
	const { track, isPlaying, progress, initialized, init, togglePlay } = useMusicStore(
		useShallow(s => ({
			track: s.playlist[s.currentIndex],
			isPlaying: s.isPlaying,
			progress: s.progress,
			initialized: s.initialized,
			init: s.init,
			togglePlay: s.togglePlay
		}))
	)

	useEffect(() => {
		if (!initialized) void init()
	}, [init, initialized])

	return (
		<div
			role='button'
			tabIndex={0}
			onClick={() => router.push('/music')}
			onKeyDown={event => event.key === 'Enter' && router.push('/music')}
			className='fixed right-3 bottom-3 left-3 z-50 flex items-center gap-3 rounded-2xl border bg-white/80 px-4 py-2.5 shadow-lg backdrop-blur-xl'>
			<div className='bg-brand/10 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full'>
				{track?.pic ? (
					<img src={track.pic} alt='' className={`h-full w-full object-cover ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '20s' }} />
				) : (
					<Music className='text-brand h-4 w-4' />
				)}
			</div>
			<div className='min-w-0 flex-1'>
				<div className='text-primary truncate text-xs font-medium'>{track?.name || '音乐播放器'}</div>
				<div className='mt-1 h-1 rounded-full bg-black/10'>
					<div className='bg-brand h-full rounded-full transition-[width] duration-300' style={{ width: `${progress}%` }} />
				</div>
			</div>
			<button
				type='button'
				aria-label={isPlaying ? '暂停' : '播放'}
				onClick={event => {
					event.stopPropagation()
					togglePlay()
				}}
				className='bg-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white'>
				{isPlaying ? <Pause className='h-4 w-4' /> : <Play className='ml-0.5 h-4 w-4' />}
			</button>
		</div>
	)
}
