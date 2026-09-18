'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Pause } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import * as stylex from '@stylexjs/stylex'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { CARD_SPACING } from '@/consts'
import MusicSVG from '@/svgs/music.svg'
import PlaySVG from '@/svgs/play.svg'
import { HomeDraggableLayer } from '@/app/(home)/home-draggable-layer'
import { useMusicStore } from '@/app/music/music-store'
import { util } from '@/styles/shared/util.stylex'
import { colors } from '@/styles/tokens.stylex'

/** 原 Tailwind 对照：
    Card 容器 flex cursor-pointer items-center gap-3（Card 尚未迁移 → stylex 类名透传，tailwind-merge 保留未知类）
    整卡按钮 absolute inset-0 z-0 rounded-[inherit] / 雪图 pointer-events-none absolute（定位内联保留）
    图标 pointer-events-none z-10 h-8 w-8 shrink-0 / 文本区 pointer-events-none z-10 min-w-0 flex-1
    标题 text-secondary truncate text-sm / 轨道 mt-1 h-2 rounded-full bg-white/60
    填充 bg-linear h-full rounded-full transition-[width] duration-300（进度 width 内联保留）
    播放钮 z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80 */
const sx = stylex.create({
	cardBox: {
		display: 'flex',
		cursor: 'pointer',
		alignItems: 'center',
		gap: 12
	},
	fullLink: {
		position: 'absolute',
		inset: 0,
		zIndex: 0,
		borderRadius: 'inherit'
	},
	snow: {
		pointerEvents: 'none',
		position: 'absolute'
	},
	icon: {
		pointerEvents: 'none',
		zIndex: 10,
		height: 32,
		width: 32,
		flexShrink: 0
	},
	info: {
		pointerEvents: 'none',
		zIndex: 10,
		minWidth: 0,
		flex: '1'
	},
	title: {
		color: colors.secondary,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 14,
		lineHeight: '20px'
	},
	track: {
		marginTop: 4,
		height: 8,
		borderRadius: 9999,
		backgroundColor: 'rgb(255 255 255 / 60%)'
	},
	fill: {
		height: '100%',
		borderRadius: 9999,
		transitionProperty: 'width',
		transitionDuration: '300ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	playBtn: {
		zIndex: 20,
		display: 'flex',
		height: 40,
		width: 40,
		flexShrink: 0,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		backgroundColor: colors.white,
		transitionProperty: 'opacity',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				opacity: 0.8
			}
		}
	},
	iconSm: {
		color: colors.brand,
		height: 16,
		width: 16
	},
	iconPlay: {
		marginLeft: 4
	}
})

export default function MusicCard() {
	const router = useRouter()
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

	/** Card 尚未迁移：布局原子类以 className 字符串透传（其 cn/tailwind-merge 保留未知类） */
	const { className: sxCardBox } = stylex.props(sx.cardBox)

	const position = useMemo(
		() => ({
			x: styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardWidth / 2 - styles.offset,
			y: styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardOffset + CARD_SPACING + calendarCardHeight + CARD_SPACING
		}),
		[center, styles, hiCardWidth, clockCardOffset, calendarCardHeight]
	)

	return (
		<HomeDraggableLayer cardKey='musicCard' x={position.x} y={position.y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={position.x} y={position.y} className={sxCardBox}>
				<button type='button' aria-label='打开音乐播放器' {...stylex.props(sx.fullLink)} onClick={() => router.push('/music')} />
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-10.webp'
							alt=''
							{...stylex.props(sx.snow)}
							style={{ width: 120, left: -8, top: -12, opacity: 0.8 }}
						/>
						<img
							src='/images/christmas/snow-11.webp'
							alt=''
							{...stylex.props(sx.snow)}
							style={{ width: 80, right: -10, top: -12, opacity: 0.8 }}
						/>
					</>
				)}
				<MusicSVG {...stylex.props(sx.icon)} />
				<div {...stylex.props(sx.info)}>
					<div {...stylex.props(sx.title)}>{loading ? '正在加载歌单…' : currentTrack?.name || '音乐播放器'}</div>
					<div {...stylex.props(sx.track)}>
						<div {...stylex.props(util.bgLinear, sx.fill)} style={{ width: `${progress}%` }} />
					</div>
				</div>
				<button
					type='button'
					aria-label={isPlaying ? '暂停' : '播放'}
					onClick={event => {
						event.stopPropagation()
						togglePlay()
					}}
					{...stylex.props(sx.playBtn)}>
					{isPlaying ? <Pause {...stylex.props(sx.iconSm)} /> : <PlaySVG {...stylex.props(sx.iconSm, sx.iconPlay)} />}
				</button>
			</Card>
		</HomeDraggableLayer>
	)
}
