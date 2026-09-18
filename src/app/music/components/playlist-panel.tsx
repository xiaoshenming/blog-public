'use client'

import { Music } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '../music-store'

export default function PlaylistPanel() {
	const { playlist, currentIndex, playTrack } = useMusicStore(
		useShallow(s => ({
			playlist: s.playlist,
			currentIndex: s.currentIndex,
			playTrack: s.playTrack
		}))
	)

	return (
		<div className='scrollbar-none max-h-[560px] space-y-1 overflow-y-auto p-3'>
			<div className='text-secondary px-3 py-2 text-xs'>播放列表 · {playlist.length} 首</div>
			{playlist.map((track, index) => (
				<button
					type='button'
					key={`${track.url}-${index}`}
					onClick={() => playTrack(index)}
					className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors ${index === currentIndex ? 'bg-brand/10 text-brand' : 'hover:bg-white/50'}`}>
					<div className='bg-brand/10 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl'>
						{track.pic ? <img src={track.pic} alt='' className='h-full w-full object-cover' /> : <Music className='h-4 w-4' />}
					</div>
					<div className='min-w-0'>
						<div className='truncate text-sm font-medium'>{track.name}</div>
						<div className='text-secondary truncate text-xs'>{track.artist}</div>
					</div>
				</button>
			))}
		</div>
	)
}
