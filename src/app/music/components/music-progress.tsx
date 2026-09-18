'use client'

import * as stylex from '@stylexjs/stylex'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '../music-store'
import { formatMusicTime } from '../music-utils'
import { colors } from '@/styles/tokens.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 进度滑条：品牌色强调，原纵向间隔落在其下边距 */
	range: {
		accentColor: colors.brand,
		width: '100%',
		cursor: 'pointer',
		marginBottom: 8
	},
	/** 时间行：两端对齐、等宽数字 */
	timeRow: {
		display: 'flex',
		justifyContent: 'space-between',
		color: colors.secondary,
		fontSize: 12,
		lineHeight: '16px',
		fontVariantNumeric: 'tabular-nums'
	}
})

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
		<div>
			<input
				type='range'
				min='0'
				max='100'
				step='0.1'
				value={progress}
				aria-label='播放进度'
				onChange={event => seek(Number(event.target.value))}
				{...stylex.props(styles.range)}
			/>
			<div {...stylex.props(styles.timeRow)}>
				<span>{formatMusicTime(currentTime)}</span>
				<span>{formatMusicTime(duration)}</span>
			</div>
		</div>
	)
}
