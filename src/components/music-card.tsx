'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Pause } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { CARD_SPACING } from '@/consts'
import MusicSVG from '@/svgs/music.svg'
import PlaySVG from '@/svgs/play.svg'
import { HomeDraggableLayer } from '@/app/(home)/home-draggable-layer'
import { useMusicStore } from '@/app/music/music-store'

export default function MusicCard() {
	const router = useRouter()
	const pathname = usePathname()
	const center = useCenterStore()
	const { styles, hiCardWidth, clockCardOffset, calendarCardHeight, enableChristmas } = useConfigStore(
		useShallow(s => ({
			styles: s.cardStyles.musicCard,
			hiCardWidth: s.cardStyles.hiCard.width,
			clockCardOffset: s.cardStyles.clockCard.offset,
			calendarCardHeight: s.cardStyles.calendarCard.height,
			enableChristmas: (s.siteContent as { enableChristmas?: boolean }).enableChristmas
		}))
	)
	const { currentTrack, isPlaying, progress, initialized, loading, init, togglePlay } = useMusicStore(
		useShallow(s => ({
			currentTrack: s.playlist[s.currentIndex],
			isPlaying: s.isPlaying,
			progress: s.progress,
			initialized: s.initialized,
			loading: s.loading,
			init: s.init,
			togglePlay: s.togglePlay
		}))
	)

	useEffect(() => {
		if (!initialized) void init()
	}, [init, initialized])

	const position = useMemo(
		() => ({
			x: styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardWidth / 2 - styles.offset,
			y: styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardOffset + CARD_SPACING + calendarCardHeight + CARD_SPACING
		}),
		[center, styles, hiCardWidth, clockCardOffset, calendarCardHeight]
	)

	if (pathname.startsWith('/music')) return null

	return (
		<HomeDraggableLayer cardKey='musicCard' x={position.x} y={position.y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={position.x} y={position.y} className='flex cursor-pointer items-center gap-3'>
				<button type='button' aria-label='打开音乐播放器' className='absolute inset-0 z-0 rounded-[inherit]' onClick={() => router.push('/music')} />
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-10.webp'
							alt=''
							className='pointer-events-none absolute'
							style={{ width: 120, left: -8, top: -12, opacity: 0.8 }}
						/>
						<img
							src='/images/christmas/snow-11.webp'
							alt=''
							className='pointer-events-none absolute'
							style={{ width: 80, right: -10, top: -12, opacity: 0.8 }}
						/>
					</>
				)}
				<MusicSVG className='pointer-events-none z-10 h-8 w-8 shrink-0' />
				<div className='pointer-events-none z-10 min-w-0 flex-1'>
					<div className='text-secondary truncate text-sm'>{loading ? '正在加载歌单…' : currentTrack?.name || '音乐播放器'}</div>
					<div className='mt-1 h-2 rounded-full bg-white/60'>
						<div className='bg-linear h-full rounded-full transition-[width] duration-300' style={{ width: `${progress}%` }} />
					</div>
				</div>
				<button
					type='button'
					aria-label={isPlaying ? '暂停' : '播放'}
					onClick={event => {
						event.stopPropagation()
						togglePlay()
					}}
					className='z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80'>
					{isPlaying ? <Pause className='text-brand h-4 w-4' /> : <PlaySVG className='text-brand ml-1 h-4 w-4' />}
				</button>
			</Card>
		</HomeDraggableLayer>
	)
}
