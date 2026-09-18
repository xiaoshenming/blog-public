'use client'

import { ListRestart, Pause, Play, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import * as stylex from '@stylexjs/stylex'
import { useMusicStore } from '../music-store'
import { colors } from '@/styles/tokens.stylex'

const modeMeta = {
	list: { label: '列表循环', Icon: ListRestart },
	one: { label: '单曲循环', Icon: Repeat1 },
	random: { label: '随机播放', Icon: Shuffle }
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 播控行：横向居中排布，原纵向间隔落在其下边距 */
	controlsRow: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 20,
		marginBottom: 20
	},
	/** 模式切换钮：次级色，悬停转品牌色 */
	modeBtn: {
		padding: 8,
		borderRadius: 9999,
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand
			}
		}
	},
	/** 切歌钮：主文字色，悬停转品牌色 */
	skipBtn: {
		padding: 8,
		borderRadius: 9999,
		color: colors.primary,
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand
			}
		}
	},
	/** 播放钮：品牌色实心圆 + 投影 */
	playBtn: {
		display: 'flex',
		height: 56,
		width: 56,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		backgroundColor: colors.brand,
		color: colors.white,
		boxShadow: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)'
	},
	/** 大号图标 */
	iconLg: {
		height: 24,
		width: 24
	},
	/** 中号图标 */
	iconMd: {
		height: 20,
		width: 20
	},
	/** 播放三角的视觉补偿 */
	playIcon: {
		marginLeft: 4
	},
	/** 模式简称占位 */
	modeHintBox: {
		width: 36
	},
	modeHintText: {
		color: colors.brand,
		fontSize: 10
	},
	/** 音量行：次级色限宽居中 */
	volumeLabel: {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		maxWidth: 320,
		marginInline: 'auto',
		color: colors.secondary
	},
	volumeIcon: {
		height: 16,
		width: 16,
		flexShrink: 0
	},
	volumeInput: {
		accentColor: colors.brand,
		width: '100%',
		cursor: 'pointer'
	}
})

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
		<div>
			<div {...stylex.props(styles.controlsRow)}>
				<button type='button' title={label} aria-label={label} onClick={cyclePlayMode} {...stylex.props(styles.modeBtn)}>
					<Icon {...stylex.props(styles.iconMd)} />
				</button>
				<button type='button' aria-label='上一首' onClick={playPrevious} {...stylex.props(styles.skipBtn)}>
					<SkipBack {...stylex.props(styles.iconLg)} fill='currentColor' />
				</button>
				<button
					type='button'
					aria-label={isPlaying ? '暂停' : '播放'}
					onClick={togglePlay}
					{...stylex.props(styles.playBtn)}>
					{isPlaying ? <Pause {...stylex.props(styles.iconLg)} fill='currentColor' /> : <Play {...stylex.props(styles.iconLg, styles.playIcon)} fill='currentColor' />}
				</button>
				<button type='button' aria-label='下一首' onClick={playNext} {...stylex.props(styles.skipBtn)}>
					<SkipForward {...stylex.props(styles.iconLg)} fill='currentColor' />
				</button>
				<div {...stylex.props(styles.modeHintBox)} title={label}>
					<span {...stylex.props(styles.modeHintText)}>{label.slice(0, 2)}</span>
				</div>
			</div>
			<label {...stylex.props(styles.volumeLabel)}>
				<Volume2 {...stylex.props(styles.volumeIcon)} />
				<input
					type='range'
					min='0'
					max='1'
					step='0.01'
					value={volume}
					aria-label='音量'
					onChange={event => setVolume(Number(event.target.value))}
					{...stylex.props(styles.volumeInput)}
				/>
			</label>
		</div>
	)
}
