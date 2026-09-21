'use client'

import { Music } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import * as stylex from '@stylexjs/stylex'
import { useMusicStore } from '../music-store'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { colors } from '@/styles/tokens.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 列表容器：限高滚动，条目间距由弹性间隔承担（scrollbar-none 保留全局类） */
	root: {
		display: 'flex',
		flexDirection: 'column',
		gap: 4,
		maxHeight: 560,
		overflowY: 'auto',
		padding: 12
	},
	/** 列表头 */
	header: {
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 条目：整行按钮，颜色过渡 */
	row: {
		display: 'flex',
		width: '100%',
		alignItems: 'center',
		gap: 12,
		paddingInline: 12,
		paddingBlock: 8,
		borderRadius: 16,
		textAlign: 'left',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 当前曲目：品牌色浅底与文字 */
	rowActive: {
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)',
		color: colors.brand
	},
	/** 其他曲目：悬停浅色底 */
	rowIdle: {
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 50%)'
			}
		}
	},
	/** 封面框 */
	thumb: {
		display: 'flex',
		height: 40,
		width: 40,
		flexShrink: 0,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		borderRadius: 12,
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)'
	},
	cover: {
		height: '100%',
		width: '100%',
		objectFit: 'cover'
	},
	thumbIcon: {
		height: 16,
		width: 16
	},
	info: {
		minWidth: 0
	},
	name: {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	artist: {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	}
})

export default function PlaylistPanel() {
	const { t } = useI18n()
	const { playlist, currentIndex, playTrack } = useMusicStore(
		useShallow(s => ({
			playlist: s.playlist,
			currentIndex: s.currentIndex,
			playTrack: s.playTrack
		}))
	)

	const { className: rootClassName } = stylex.props(styles.root)

	return (
		<div className={cn(rootClassName, 'scrollbar-none')}>
			<div {...stylex.props(styles.header)}>{t('music.playlistCount', { count: playlist.length })}</div>
			{playlist.map((track, index) => (
				<button
					type='button'
					key={`${track.url}-${index}`}
					onClick={() => playTrack(index)}
					{...stylex.props(styles.row, index === currentIndex ? styles.rowActive : styles.rowIdle)}>
					<div {...stylex.props(styles.thumb)}>
						{track.pic ? <img src={track.pic} alt='' {...stylex.props(styles.cover)} /> : <Music {...stylex.props(styles.thumbIcon)} />}
					</div>
					<div {...stylex.props(styles.info)}>
						<div {...stylex.props(styles.name)}>{track.name}</div>
						<div {...stylex.props(styles.artist)}>{track.artist}</div>
					</div>
				</button>
			))}
		</div>
	)
}
