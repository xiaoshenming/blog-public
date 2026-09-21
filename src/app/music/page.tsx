'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Disc3, Loader2, Maximize2, Music2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import * as stylex from '@stylexjs/stylex'
import { useMusicStore } from './music-store'
import { useI18n } from '@/i18n/context'
import MusicProgress from './components/music-progress'
import MusicControls from './components/music-controls'
import LyricsPanel from './components/lyrics-panel'
import PlaylistPanel from './components/playlist-panel'
import { card } from '@/styles/shared/card.stylex'
import { util } from '@/styles/shared/util.stylex'
import { colors } from '@/styles/tokens.stylex'

// 沉浸歌词层只在客户端按需加载，避免把整套动效带进首屏
const LyricVisualizer = dynamic(() => import('./components/lyric-visualizer'), { ssr: false })

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；卡片系复用共享定义） */
const styles = stylex.create({
	/** 页面主容器：居中限宽，顶部给导航留高 */
	page: {
		marginInline: 'auto',
		minHeight: '100%',
		maxWidth: 1152,
		paddingInline: 16,
		paddingTop: 112,
		paddingBottom: 96,
		'@media (width >= 40rem)': {
			paddingInline: 24
		}
	},
	/** 主体两栏：大屏右侧固定 340px */
	shell: {
		display: 'grid',
		gap: 20,
		'@media (width >= 64rem)': {
			gridTemplateColumns: 'minmax(0, 1fr) 340px'
		}
	},
	/** 播放器卡片：相对定位覆盖卡片基底，内部两栏 */
	playerCard: {
		position: 'relative',
		display: 'grid',
		minHeight: 590,
		overflow: 'hidden',
		padding: 20,
		'@media (width >= 40rem)': {
			padding: 32
		},
		'@media (width >= 48rem)': {
			gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
		}
	},
	/** 左列：纵向居中 */
	stage: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center'
	},
	/** 唱片正方形外框 */
	discBox: {
		marginInline: 'auto',
		aspectRatio: '1 / 1',
		width: '100%',
		maxWidth: 330
	},
	/** 唱片本体：深色圆盘 + 大投影；播放中旋转，时长由内联样式覆盖 */
	disc: {
		position: 'relative',
		height: '100%',
		width: '100%',
		overflow: 'hidden',
		borderRadius: 9999,
		backgroundColor: 'rgb(0 0 0 / 85%)',
		padding: '12%',
		boxShadow: '0 25px 50px -12px rgb(0 0 0 / 25%)'
	},
	/** 唱片装饰环 */
	discRing: {
		position: 'absolute',
		inset: '8%',
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: 'rgb(255 255 255 / 10%)'
	},
	discRingInner: {
		position: 'absolute',
		inset: '18%',
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: 'rgb(255 255 255 / 10%)'
	},
	/** 唱片中心：品牌色光盘 */
	discCore: {
		position: 'relative',
		display: 'flex',
		height: '100%',
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		borderRadius: 9999,
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 20%, transparent)'
	},
	cover: {
		height: '100%',
		width: '100%',
		objectFit: 'cover'
	},
	discIcon: {
		height: 80,
		width: 80,
		color: colors.brand
	},
	/** 曲目信息 */
	meta: {
		marginTop: 28,
		textAlign: 'center'
	},
	title: {
		color: colors.primary,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 24,
		lineHeight: '32px',
		fontWeight: 600
	},
	artist: {
		color: colors.secondary,
		marginTop: 4,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 进度与播控 */
	controls: {
		marginTop: 28
	},
	fallbackNote: {
		color: colors.secondary,
		marginTop: 16,
		textAlign: 'center',
		fontSize: 12,
		lineHeight: '16px'
	},
	errorNote: {
		marginTop: 8,
		textAlign: 'center',
		fontSize: 12,
		lineHeight: '16px',
		color: '#fb2c36'
	},
	/** 右列歌词区：小屏上分隔线，大屏改左分隔线 */
	lyricsCol: {
		position: 'relative',
		marginTop: 32,
		borderTopWidth: 1,
		borderTopStyle: 'solid',
		borderColor: 'rgb(255 255 255 / 40%)',
		'@media (width >= 48rem)': {
			marginTop: 0,
			borderTopWidth: 0,
			borderLeftWidth: 1,
			borderLeftStyle: 'solid'
		}
	},
	/** 沉浸歌词入口：半透明白底胶囊 */
	immersiveBtn: {
		position: 'absolute',
		top: 8,
		right: 8,
		zIndex: 10,
		display: 'flex',
		alignItems: 'center',
		gap: 6,
		borderRadius: 9999,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary,
		backdropFilter: 'blur(8px)',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand
			}
		},
		':disabled': {
			cursor: 'not-allowed',
			opacity: 0.4
		},
		'@media (width >= 48rem)': {
			top: 12,
			right: 12
		}
	},
	btnIcon: {
		height: 14,
		width: 14
	},
	/** 加载占位 */
	loadingBox: {
		display: 'flex',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	loadIcon: {
		height: 16,
		width: 16
	},
	/** 歌单卡片 */
	playlistCard: {
		position: 'relative',
		overflow: 'hidden',
		padding: 0
	},
	playlistHeader: {
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		borderBottomWidth: 1,
		borderBottomStyle: 'solid',
		borderColor: 'rgb(255 255 255 / 40%)',
		paddingInline: 24,
		paddingBlock: 20
	},
	playlistIcon: {
		height: 20,
		width: 20,
		color: colors.brand
	},
	playlistTitle: {
		fontWeight: 500
	}
})

export default function MusicPage() {
	const { t } = useI18n()
	const { track, isPlaying, initialized, loading, usingFallback, error, hasLyrics, init, setVisualizerOpen } = useMusicStore(
		useShallow(s => ({
			track: s.playlist[s.currentIndex],
			isPlaying: s.isPlaying,
			initialized: s.initialized,
			loading: s.loading,
			usingFallback: s.usingFallback,
			error: s.error,
			hasLyrics: s.lyricLines.length > 0,
			init: s.init,
			setVisualizerOpen: s.setVisualizerOpen
		}))
	)

	useEffect(() => {
		if (!initialized) void init()
	}, [init, initialized])

	return (
		<div {...stylex.props(styles.page)}>
			<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} {...stylex.props(styles.shell)}>
				<section {...stylex.props(card.base, styles.playerCard)}>
					<div {...stylex.props(styles.stage)}>
						<div {...stylex.props(styles.discBox)}>
							<div {...stylex.props(styles.disc, isPlaying && util.spinner)} style={{ animationDuration: '24s' }}>
								<div {...stylex.props(styles.discRing)} />
								<div {...stylex.props(styles.discRingInner)} />
								<div {...stylex.props(styles.discCore)}>
									{track?.pic ? <img src={track.pic} alt={track.name} {...stylex.props(styles.cover)} /> : <Disc3 {...stylex.props(styles.discIcon)} />}
								</div>
							</div>
						</div>
						<div {...stylex.props(styles.meta)}>
							<h1 {...stylex.props(styles.title)}>{track?.name || (loading ? t('music.loadingPlaylist') : t('music.title'))}</h1>
							<p {...stylex.props(styles.artist)}>{track?.artist || t('music.loadingArtistHint')}</p>
						</div>
						<div {...stylex.props(styles.controls)}>
							<MusicProgress />
							<MusicControls />
						</div>
						{usingFallback && <p {...stylex.props(styles.fallbackNote)}>{t('music.fallbackNote')}</p>}
						{error && <p {...stylex.props(styles.errorNote)}>{error}</p>}
					</div>
					<div {...stylex.props(styles.lyricsCol)}>
						<button
							type='button'
							onClick={() => setVisualizerOpen(true)}
							disabled={!hasLyrics}
							title={hasLyrics ? t('music.immersiveLyricsTitle') : t('music.noLyricsTitle')}
							{...stylex.props(styles.immersiveBtn)}>
							<Maximize2 {...stylex.props(styles.btnIcon)} />
							{t('music.immersiveLyrics')}
						</button>
						{loading && !track ? (
							<div {...stylex.props(styles.loadingBox)}>
								<Loader2 {...stylex.props(styles.loadIcon, util.spinner)} /> {t('common.loading')}
							</div>
						) : (
							<LyricsPanel />
						)}
					</div>
				</section>
				<aside {...stylex.props(card.base, styles.playlistCard)}>
					<div {...stylex.props(styles.playlistHeader)}>
						<Music2 {...stylex.props(styles.playlistIcon)} />
						<h2 {...stylex.props(styles.playlistTitle)}>{t('music.myPlaylist')}</h2>
					</div>
					<PlaylistPanel />
				</aside>
			</motion.div>
			<LyricVisualizer />
		</div>
	)
}
