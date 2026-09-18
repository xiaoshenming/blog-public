'use client'

import React, { useMemo, useRef } from 'react'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { Hourglass } from 'lucide-react'
import { colors } from '@/styles/tokens.stylex'
import { buildFumeBackgroundScene } from '../FumeBackground'
import { getRecentCompletedLine, getUpcomingLines } from '../runtime'
import VisualizerShell from '../VisualizerShell'
import VisualizerSubtitleOverlay from '../VisualizerSubtitleOverlay'
import { colorWithAlpha } from '../colorMix'
import type { VisualizerSharedProps } from '../definition'
import { getLineRenderEndTime } from '../lyrics/renderHints'
import { DEFAULT_FUME_TUNING, type FumeTuning } from '../types'
import { resolveArticleOverviewCamera } from './fumeCamera'
import { resolveFumePassedFadeDuration } from './fumeTimeline'
import type { FumeLayoutTheme, VisualizerProps } from './fumeTypes'
import { clamp } from './fumeUtils'
import { useFumeArticle } from './useFumeArticle'
import { useFumeFrame } from './useFumeFrame'
import { useFumeViewport } from './useFumeViewport'

// src/app/music/visualizer/fume/VisualizerFume.tsx
// "Turn the whole lyric into an article, then move a camera through it." This component wires the
// pipeline together: it derives the tuning/layout inputs, builds the article layout, hands the
// canvas + camera + painting to useFumeFrame, and renders the shell, the layout-pending card and
// the shared subtitle overlay around it.

/** 脉冲关键帧：2s 无限循环、中点淡出 */
const pulse = stylex.keyframes({
	'50%': { opacity: 0.5 }
})

/** 迁移自 Tailwind 的静态样式（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 视口容器：铺满舞台、不拦截指针 */
	viewport: {
		pointerEvents: 'none',
		position: 'relative',
		zIndex: 10,
		height: '100%',
		width: '100%'
	},
	/** 文章画布包裹层：顶部居中（尺寸保留内联） */
	articleWrap: {
		position: 'absolute',
		top: 0,
		left: '50%',
		translate: '-50%'
	},
	/** 文章画布：铺满包裹层 */
	canvas: {
		position: 'absolute',
		inset: 0,
		height: '100%',
		width: '100%'
	},
	/** 排版等待遮罩：居中铺满 */
	pendingOverlay: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center'
	},
	/** 等待卡片：纵向居中、圆角描边（配色保留内联） */
	pendingCard: {
		display: 'flex',
		minWidth: 160,
		flexDirection: 'column',
		alignItems: 'center',
		gap: 16,
		borderRadius: 24,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 24,
		paddingBlock: 20
	},
	/** 脉冲动画：2s 无限循环、中点淡出 */
	pulse: {
		animationName: pulse,
		animationDuration: '2s',
		animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
		animationIterationCount: 'infinite'
	},
	/** 骨架条容器：固定宽度纵向排列 */
	barColumn: {
		display: 'flex',
		width: 112,
		flexDirection: 'column',
		gap: 10
	},
	/** 骨架条：短圆条 */
	bar: {
		height: 8,
		borderRadius: 9999
	},
	/** 骨架条宽度变体 */
	barWide: {
		width: '78%'
	},
	barNarrow: {
		width: '56%'
	}
})

const VisualizerFume: React.FC<VisualizerProps> = props => {
	const {
		currentTime,
		currentLineIndex,
		lines,
		theme,
		subtitleTheme,
		audioPower,
		audioBands,
		showText = true,
		seed,
		staticMode = false,
		lyricsFontScale = 1,
		subtitleFontScale = 1,
		fumeTuning,
		subtitleOverlayOpacity,
		subtitleOverlayBackground,
		subtitleUpcomingLyricsBlur,
		isPlayerChromeHidden = false,
		hideTranslationSubtitle = false,
		showSubtitleTranslation = true,
		subtitleContentMode,
		paused = false
	} = props
	const viewportRef = useRef<HTMLDivElement | null>(null)
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const viewport = useFumeViewport(viewportRef)

	const runtime = useMemo(() => {
		const activeLine = lines[currentLineIndex] ?? null
		const timeNow = currentTime.get()
		return {
			activeLine,
			recentCompletedLine: getRecentCompletedLine({
				lines,
				currentLineIndex,
				currentTime: timeNow,
				getLineEndTime: getLineRenderEndTime
			}),
			nextLines: getUpcomingLines(lines, currentLineIndex, 2)
		}
	}, [currentLineIndex, lines])
	const resolvedFumeTuning = useMemo<FumeTuning>(
		() => ({
			hidePrintSymbols: fumeTuning?.hidePrintSymbols ?? DEFAULT_FUME_TUNING.hidePrintSymbols,
			disableGeometricBackground: fumeTuning?.disableGeometricBackground ?? DEFAULT_FUME_TUNING.disableGeometricBackground,
			backgroundObjectOpacity: clamp(fumeTuning?.backgroundObjectOpacity ?? DEFAULT_FUME_TUNING.backgroundObjectOpacity, 0, 1),
			textHoldRatio: clamp(fumeTuning?.textHoldRatio ?? DEFAULT_FUME_TUNING.textHoldRatio, 0, 1),
			cameraTrackingMode:
				fumeTuning?.cameraTrackingMode === 'stepped' || fumeTuning?.cameraTrackingMode === 'smooth'
					? fumeTuning.cameraTrackingMode
					: DEFAULT_FUME_TUNING.cameraTrackingMode,
			cameraSpeed: clamp(fumeTuning?.cameraSpeed ?? DEFAULT_FUME_TUNING.cameraSpeed, 0.55, 1.85),
			glowIntensity: clamp(fumeTuning?.glowIntensity ?? DEFAULT_FUME_TUNING.glowIntensity, 0, 1.8),
			heroScale: clamp(fumeTuning?.heroScale ?? DEFAULT_FUME_TUNING.heroScale, 0.82, 1.32)
		}),
		[fumeTuning]
	)
	const layoutTheme = useMemo<FumeLayoutTheme>(
		() => ({
			name: theme.name,
			fontStyle: theme.fontStyle,
			fontFamily: theme.fontFamily,
			fontFamilyStack: theme.fontFamilyStack,
			fontWeight: theme.fontWeight
		}),
		[theme.fontFamily, theme.fontFamilyStack, theme.fontStyle, theme.fontWeight, theme.name]
	)
	const layoutFumeTuning = useMemo<FumeTuning>(
		() => ({
			...DEFAULT_FUME_TUNING,
			heroScale: resolvedFumeTuning.heroScale
		}),
		[resolvedFumeTuning.heroScale]
	)
	const { article, isLayoutPending } = useFumeArticle({ lines, viewport, layoutTheme, layoutFumeTuning, lyricsFontScale })
	const lastRenderableLine = useMemo(() => {
		for (let index = lines.length - 1; index >= 0; index -= 1) {
			const line = lines[index]
			if (line?.fullText.trim().length) {
				return line
			}
		}
		return null
	}, [lines])
	const overviewStartTime = useMemo(() => {
		if (!lastRenderableLine) {
			return Number.POSITIVE_INFINITY
		}

		const lineStartTime = lastRenderableLine.startTime
		const lineRenderEndTime = getLineRenderEndTime(lastRenderableLine)
		return lineStartTime + Math.max(lineRenderEndTime - lineStartTime, 0) * 0.5
	}, [lastRenderableLine])
	const backgroundScene = useMemo(
		() =>
			buildFumeBackgroundScene({
				viewport,
				world: {
					width: article?.width ?? Math.max(viewport.width * 1.8, viewport.width),
					height: article?.height ?? Math.max(viewport.height * 1.8, viewport.height)
				},
				paperBounds: article?.paperBounds,
				seed: `${seed ?? 'fume'}:${theme.name}`
			}),
		[article?.height, article?.paperBounds, article?.width, seed, theme.name, viewport]
	)
	const overviewCamera = useMemo(() => (article ? resolveArticleOverviewCamera(article, viewport) : null), [article, viewport])
	const cameraSpeed = resolvedFumeTuning.cameraSpeed
	const glowIntensity = resolvedFumeTuning.glowIntensity
	const backgroundObjectOpacity = resolvedFumeTuning.backgroundObjectOpacity
	const showPrintStamp = !resolvedFumeTuning.hidePrintSymbols
	const textHoldRatio = resolvedFumeTuning.textHoldRatio
	const passedFadeDuration = useMemo(() => resolveFumePassedFadeDuration(lines, textHoldRatio), [lines, textHoldRatio])
	const translationFontSize = `clamp(${(1.05 * lyricsFontScale).toFixed(3)}rem, ${(2.2 * lyricsFontScale).toFixed(3)}vw, ${(1.2 * lyricsFontScale).toFixed(3)}rem)`
	const upcomingFontSize = `clamp(${(0.875 * lyricsFontScale).toFixed(3)}rem, ${(1.8 * lyricsFontScale).toFixed(3)}vw, ${(1 * lyricsFontScale).toFixed(3)}rem)`
	const hasPrintedContent = useFumeFrame({
		canvasRef,
		currentTime,
		currentLineIndex,
		lines,
		theme,
		viewport,
		article,
		backgroundScene,
		overviewCamera,
		overviewStartTime,
		audioPower,
		audioBands,
		cameraTrackingMode: resolvedFumeTuning.cameraTrackingMode,
		cameraSpeed,
		glowIntensity,
		backgroundObjectOpacity,
		showPrintStamp,
		textHoldRatio,
		passedFadeDuration,
		showText,
		staticMode,
		paused
	})

	return (
		<VisualizerShell
			theme={theme}
			audioPower={audioPower}
			audioBands={audioBands}
			sharedProps={{
				...props,
				background: {
					...props.background,
					common: {
						...props.background?.common,
						disableGeometricBackground: Boolean(props.background?.common?.disableGeometricBackground) || resolvedFumeTuning.disableGeometricBackground
					}
				}
			}}>
			<div ref={viewportRef} {...stylex.props(styles.viewport)}>
				{(article || lines.length === 0) && (
					<motion.div
						initial={false}
						animate={{
							opacity: 1,
							scale: article && showText ? (hasPrintedContent ? 1 : 0.985) : 1
						}}
						transition={{ duration: 0.45, ease: 'easeOut' }}
						{...stylex.props(styles.articleWrap)}
						style={{
							width: viewport.width,
							height: viewport.height
						}}>
						<canvas ref={canvasRef} {...stylex.props(styles.canvas)} />
					</motion.div>
				)}

				{isLayoutPending && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} {...stylex.props(styles.pendingOverlay)}>
						<div
							{...stylex.props(styles.pendingCard)}
							style={{
								backgroundColor: theme.backgroundColor,
								borderColor: colorWithAlpha(theme.secondaryColor, 0.24),
								boxShadow: `0 18px 60px ${colorWithAlpha(theme.backgroundColor, 0.52)}`
							}}>
							<Hourglass size={24} {...stylex.props(styles.pulse)} style={{ color: colorWithAlpha(theme.primaryColor, 0.78) }} />
							<div {...stylex.props(styles.barColumn)}>
								<div {...stylex.props(styles.bar, styles.pulse)} style={{ backgroundColor: colorWithAlpha(theme.primaryColor, 0.32) }} />
								<div {...stylex.props(styles.bar, styles.pulse, styles.barWide)} style={{ backgroundColor: colorWithAlpha(theme.primaryColor, 0.22) }} />
								<div {...stylex.props(styles.bar, styles.pulse, styles.barNarrow)} style={{ backgroundColor: colorWithAlpha(theme.secondaryColor, 0.2) }} />
							</div>
						</div>
					</motion.div>
				)}
			</div>

			<VisualizerSubtitleOverlay
				showText={showText}
				activeLine={runtime.activeLine}
				recentCompletedLine={runtime.recentCompletedLine}
				nextLines={runtime.nextLines}
				theme={theme}
				subtitleTheme={subtitleTheme}
				translationFontSize={translationFontSize}
				upcomingFontSize={upcomingFontSize}
				subtitleOverlayOpacity={subtitleOverlayOpacity}
				subtitleOverlayBackground={subtitleOverlayBackground}
				subtitleUpcomingLyricsBlur={subtitleUpcomingLyricsBlur}
				subtitleFontScale={subtitleFontScale}
				isPlayerChromeHidden={isPlayerChromeHidden}
				hideTranslationSubtitle={hideTranslationSubtitle}
				showSubtitleTranslation={showSubtitleTranslation}
				subtitleContentMode={subtitleContentMode}
			/>
		</VisualizerShell>
	)
}

export default VisualizerFume
