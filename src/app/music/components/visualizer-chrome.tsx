'use client'

import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '../music-store'
import { VISUALIZER_REGISTRY } from '../visualizer/registry'
import type { VisualizerMode } from '../visualizer/types'
import { cn } from '@/lib/utils'
import { colors } from '@/styles/tokens.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 操作层：铺满全屏、上下分布；默认整体不挡指针，可见时由 interactive 打开 */
	root: {
		position: 'absolute',
		inset: 0,
		zIndex: 40,
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'space-between',
		padding: 20,
		pointerEvents: 'none',
		'@media (width >= 40rem)': {
			padding: 28
		}
	},
	/** 可见时恢复可交互 */
	interactive: {
		pointerEvents: 'auto'
	},
	/** 顶行：关闭与模式选择分居两端 */
	topRow: {
		display: 'flex',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 16
	},
	/** 圆形毛玻璃钮（关闭） */
	closeBtn: {
		display: 'flex',
		height: 40,
		width: 40,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		backgroundColor: 'rgb(255 255 255 / 10%)',
		color: 'rgb(255 255 255 / 80%)',
		backdropFilter: 'blur(12px)',
		transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 20%)'
			}
		}
	},
	/** 中号图标 */
	iconMd: {
		height: 20,
		width: 20
	},
	/** 模式选择胶囊 */
	modeBar: {
		display: 'flex',
		maxWidth: '70vw',
		alignItems: 'center',
		gap: 4,
		borderRadius: 9999,
		backgroundColor: 'rgb(255 255 255 / 10%)',
		padding: 4,
		backdropFilter: 'blur(12px)'
	},
	/** 左右箭头钮 */
	arrowBtn: {
		padding: 6,
		borderRadius: 9999,
		color: 'rgb(255 255 255 / 70%)',
		'@media (hover: hover)': {
			':hover': {
				color: colors.white
			}
		}
	},
	/** 小号图标 */
	iconSm: {
		height: 16,
		width: 16
	},
	/** 模式列表：横向滚动（scrollbar-none 保留全局类） */
	modeScroll: {
		display: 'flex',
		alignItems: 'center',
		gap: 4,
		overflowX: 'auto'
	},
	/** 模式钮：小胶囊，全属性过渡 */
	modeBtn: {
		flexShrink: 0,
		borderRadius: 9999,
		paddingInline: 12,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		transitionProperty: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 当前模式：白底黑字 */
	modeActive: {
		backgroundColor: colors.white,
		color: '#000'
	},
	/** 其他模式：浅字，悬停提亮 */
	modeIdle: {
		color: 'rgb(255 255 255 / 70%)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 10%)',
				color: colors.white
			}
		}
	},
	/** 底列 */
	bottomRow: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 12
	},
	/** 迷你播控胶囊 */
	playBar: {
		display: 'flex',
		alignItems: 'center',
		gap: 16,
		borderRadius: 9999,
		backgroundColor: 'rgb(255 255 255 / 10%)',
		paddingInline: 20,
		paddingBlock: 10,
		backdropFilter: 'blur(12px)'
	},
	/** 曲目信息（小屏隐藏） */
	trackInfo: {
		display: 'none',
		maxWidth: 200,
		minWidth: 0,
		'@media (width >= 40rem)': {
			display: 'block'
		}
	},
	trackName: {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		color: colors.white
	},
	trackArtist: {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 12,
		lineHeight: '16px',
		color: 'rgb(255 255 255 / 60%)'
	},
	/** 切歌钮 */
	skipBtn: {
		padding: 6,
		borderRadius: 9999,
		color: 'rgb(255 255 255 / 80%)',
		'@media (hover: hover)': {
			':hover': {
				color: colors.white
			}
		}
	},
	/** 播放钮：白色实心圆 */
	playBtn: {
		display: 'flex',
		height: 44,
		width: 44,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		backgroundColor: colors.white,
		color: '#000',
		boxShadow: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)'
	},
	/** 播放三角的视觉补偿 */
	playIcon: {
		marginLeft: 2
	},
	/** 底部提示 */
	hint: {
		fontSize: 11,
		color: 'rgb(255 255 255 / 40%)'
	}
})

interface VisualizerChromeProps {
	visible: boolean
	mode: VisualizerMode
	onSelectMode: (mode: VisualizerMode) => void
	onClose: () => void
}

export function stepVisualizerMode(current: VisualizerMode, delta: 1 | -1): VisualizerMode {
	const modes = VISUALIZER_REGISTRY.map(entry => entry.mode)
	const index = Math.max(0, modes.indexOf(current))
	return modes[(index + delta + modes.length) % modes.length]
}

/**
 * 沉浸歌词的操作层：顶部关闭 + 动效切换，底部迷你播控。
 * 鼠标静止后整体淡出，把画面完全留给歌词。
 */
export default function VisualizerChrome({ visible, mode, onSelectMode, onClose }: VisualizerChromeProps) {
	const { track, isPlaying, togglePlay, playPrevious, playNext } = useMusicStore(
		useShallow(s => ({
			track: s.playlist[s.currentIndex],
			isPlaying: s.isPlaying,
			togglePlay: s.togglePlay,
			playPrevious: s.playPrevious,
			playNext: s.playNext
		}))
	)

	const { className: modeScrollClassName } = stylex.props(styles.modeScroll)

	return (
		<motion.div
			initial={false}
			animate={{ opacity: visible ? 1 : 0 }}
			transition={{ duration: 0.3 }}
			{...stylex.props(styles.root)}>
			<div {...stylex.props(styles.topRow)}>
				<button
					type='button'
					aria-label='退出沉浸歌词'
					onClick={onClose}
					{...stylex.props(styles.closeBtn, visible && styles.interactive)}>
					<X {...stylex.props(styles.iconMd)} />
				</button>
				<div {...stylex.props(styles.modeBar, visible && styles.interactive)}>
					<button
						type='button'
						aria-label='上一个动效'
						onClick={() => onSelectMode(stepVisualizerMode(mode, -1))}
						{...stylex.props(styles.arrowBtn)}>
						<ChevronLeft {...stylex.props(styles.iconSm)} />
					</button>
					<div className={cn(modeScrollClassName, 'scrollbar-none')}>
						{VISUALIZER_REGISTRY.map(entry => (
							<button
								key={entry.mode}
								type='button'
								aria-pressed={entry.mode === mode}
								onClick={() => onSelectMode(entry.mode)}
								{...stylex.props(styles.modeBtn, entry.mode === mode ? styles.modeActive : styles.modeIdle)}>
								{entry.label}
							</button>
						))}
					</div>
					<button
						type='button'
						aria-label='下一个动效'
						onClick={() => onSelectMode(stepVisualizerMode(mode, 1))}
						{...stylex.props(styles.arrowBtn)}>
						<ChevronRight {...stylex.props(styles.iconSm)} />
					</button>
				</div>
			</div>

			<div {...stylex.props(styles.bottomRow)}>
				<div {...stylex.props(styles.playBar, visible && styles.interactive)}>
					<div {...stylex.props(styles.trackInfo)}>
						<div {...stylex.props(styles.trackName)}>{track?.name || '音乐播放器'}</div>
						<div {...stylex.props(styles.trackArtist)}>{track?.artist}</div>
					</div>
					<button type='button' aria-label='上一首' onClick={playPrevious} {...stylex.props(styles.skipBtn)}>
						<SkipBack {...stylex.props(styles.iconMd)} fill='currentColor' />
					</button>
					<button
						type='button'
						aria-label={isPlaying ? '暂停' : '播放'}
						onClick={togglePlay}
						{...stylex.props(styles.playBtn)}>
						{isPlaying ? <Pause {...stylex.props(styles.iconMd)} fill='currentColor' /> : <Play {...stylex.props(styles.iconMd, styles.playIcon)} fill='currentColor' />}
					</button>
					<button type='button' aria-label='下一首' onClick={playNext} {...stylex.props(styles.skipBtn)}>
						<SkipForward {...stylex.props(styles.iconMd)} fill='currentColor' />
					</button>
				</div>
				<p {...stylex.props(styles.hint)}>Esc 退出 · ← / → 切换动效 · 歌词动效移植自 Folia</p>
			</div>
		</motion.div>
	)
}
