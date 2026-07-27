'use client'

import { useEffect } from 'react'
import { Disc3, Loader2, Music2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from './music-store'
import MusicProgress from './components/music-progress'
import MusicControls from './components/music-controls'
import LyricsPanel from './components/lyrics-panel'
import PlaylistPanel from './components/playlist-panel'

export default function MusicPage() {
	const { track, isPlaying, initialized, loading, usingFallback, error, init } = useMusicStore(
		useShallow(s => ({
			track: s.playlist[s.currentIndex],
			isPlaying: s.isPlaying,
			initialized: s.initialized,
			loading: s.loading,
			usingFallback: s.usingFallback,
			error: s.error,
			init: s.init
		}))
	)

	useEffect(() => {
		if (!initialized) void init()
	}, [init, initialized])

	return (
		<div className='mx-auto min-h-full max-w-6xl px-4 pt-28 pb-24 sm:px-6'>
			<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]'>
				<section className='card relative grid min-h-[590px] overflow-hidden p-5 sm:p-8 md:grid-cols-2'>
					<div className='flex flex-col justify-center'>
						<div className='mx-auto aspect-square w-full max-w-[330px]'>
							<div
								className={`relative h-full w-full overflow-hidden rounded-full bg-black/85 p-[12%] shadow-2xl ${isPlaying ? 'animate-spin' : ''}`}
								style={{ animationDuration: '24s' }}>
								<div className='absolute inset-[8%] rounded-full border border-white/10' />
								<div className='absolute inset-[18%] rounded-full border border-white/10' />
								<div className='bg-brand/20 relative flex h-full w-full items-center justify-center overflow-hidden rounded-full'>
									{track?.pic ? <img src={track.pic} alt={track.name} className='h-full w-full object-cover' /> : <Disc3 className='text-brand h-20 w-20' />}
								</div>
							</div>
						</div>
						<div className='mt-7 text-center'>
							<h1 className='text-primary truncate text-2xl font-semibold'>{track?.name || (loading ? '正在加载歌单…' : '音乐播放器')}</h1>
							<p className='text-secondary mt-1 truncate text-sm'>{track?.artist || '稍等一下，音乐马上就来'}</p>
						</div>
						<div className='mt-7'>
							<MusicProgress />
							<MusicControls />
						</div>
						{usingFallback && <p className='text-secondary mt-4 text-center text-xs'>在线歌单暂不可用，已切换到本地音乐</p>}
						{error && <p className='mt-2 text-center text-xs text-red-500'>{error}</p>}
					</div>
					<div className='mt-8 border-t border-white/40 md:mt-0 md:border-t-0 md:border-l'>
						{loading && !track ? (
							<div className='text-secondary flex h-full items-center justify-center gap-2 text-sm'>
								<Loader2 className='h-4 w-4 animate-spin' /> 正在加载
							</div>
						) : (
							<LyricsPanel />
						)}
					</div>
				</section>
				<aside className='card relative overflow-hidden p-0'>
					<div className='flex items-center gap-2 border-b border-white/40 px-6 py-5'>
						<Music2 className='text-brand h-5 w-5' />
						<h2 className='font-medium'>我的歌单</h2>
					</div>
					<PlaylistPanel />
				</aside>
			</motion.div>
		</div>
	)
}
