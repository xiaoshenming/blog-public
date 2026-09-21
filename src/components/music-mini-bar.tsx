'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Pause, Play } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import * as stylex from '@stylexjs/stylex'
import { useMusicStore } from '@/app/music/music-store'
import { useI18n } from '@/i18n/context'
import { colors } from '@/styles/tokens.stylex'

/** 原 animate-spin（Tailwind v4 默认 keyframes 为 rotate(360deg)）→ stylex.keyframes 自建；时长仍由原 20s 内联 animationDuration 提供 */
const spin = stylex.keyframes({
	'0%': { transform: 'rotate(0deg)' },
	'100%': { transform: 'rotate(360deg)' }
})

/** 原 Tailwind 对照：
    根容器 fixed right-3 bottom-3 left-3 z-50 flex items-center gap-3 rounded-2xl border bg-white/80 px-4 py-2.5 shadow-lg backdrop-blur-xl
    头像框 bg-brand/10 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full
    封面 h-full w-full object-cover（animate-spin → 条件 stylex；20s 内联保留）
    标题 text-primary truncate text-xs font-medium / 轨道 mt-1 h-1 rounded-full bg-black/10
    填充 bg-brand h-full rounded-full transition-[width] duration-300（进度 width 内联保留）
    播放钮 bg-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white */
const styles = stylex.create({
	bar: {
		position: 'fixed',
		right: 12,
		bottom: 12,
		left: 12,
		zIndex: 50,
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		borderRadius: 16,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 80%)',
		paddingInline: 16,
		paddingBlock: 10,
		boxShadow: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)',
		backdropFilter: 'blur(24px)'
	},
	avatar: {
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)',
		display: 'flex',
		height: 36,
		width: 36,
		flexShrink: 0,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		borderRadius: 9999
	},
	cover: {
		height: '100%',
		width: '100%',
		objectFit: 'cover'
	},
	coverSpin: {
		animationName: spin,
		animationDuration: '1s',
		animationTimingFunction: 'linear',
		animationIterationCount: 'infinite'
	},
	info: {
		minWidth: 0,
		flex: '1'
	},
	name: {
		color: colors.primary,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 12,
		lineHeight: '16px',
		fontWeight: 500
	},
	track: {
		marginTop: 4,
		height: 4,
		borderRadius: 9999,
		backgroundColor: 'rgb(0 0 0 / 10%)'
	},
	fill: {
		backgroundColor: colors.brand,
		height: '100%',
		borderRadius: 9999,
		transitionProperty: 'width',
		transitionDuration: '300ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	playBtn: {
		backgroundColor: colors.brand,
		display: 'flex',
		height: 32,
		width: 32,
		flexShrink: 0,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		color: colors.white
	},
	icon: {
		height: 16,
		width: 16
	},
	iconBrand: {
		color: colors.brand
	},
	playIcon: {
		marginLeft: 2
	}
})

export default function MusicMiniBar() {
	const router = useRouter()
	const { t } = useI18n()
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
			{...stylex.props(styles.bar)}>
			<div {...stylex.props(styles.avatar)}>
				{track?.pic ? (
					<img src={track.pic} alt='' {...stylex.props(styles.cover, isPlaying && styles.coverSpin)} style={{ animationDuration: '20s' }} />
				) : (
					<Music {...stylex.props(styles.icon, styles.iconBrand)} />
				)}
			</div>
			<div {...stylex.props(styles.info)}>
				<div {...stylex.props(styles.name)}>{track?.name || t('music.title')}</div>
				<div {...stylex.props(styles.track)}>
					<div {...stylex.props(styles.fill)} style={{ width: `${progress}%` }} />
				</div>
			</div>
			<button
				type='button'
				aria-label={isPlaying ? t('music.pause') : t('music.play')}
				onClick={event => {
					event.stopPropagation()
					togglePlay()
				}}
				{...stylex.props(styles.playBtn)}>
				{isPlaying ? <Pause {...stylex.props(styles.icon)} /> : <Play {...stylex.props(styles.icon, styles.playIcon)} />}
			</button>
		</div>
	)
}
