'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import type { VisualizerSharedProps } from '../definition'
import { useVisualizerRuntime } from '../runtime'
import { getLineRenderEndTime } from '../lyrics/renderHints'
import { buildDisplayWordsFromLayoutUnits, buildPostLyricLayoutUnits } from '../lyrics/cjkSemanticLayout'
import { resolveWordColor } from '../wordColoring'
import VisualizerShell from '../VisualizerShell'
import VisualizerSubtitleOverlay from '../VisualizerSubtitleOverlay'
import ClassicWord from './ClassicWord'
import { getClassicLineContainerMotion, resolveClassicLineRenderProfile, resolveClassicTuning } from './classicLineProfile'
import { buildClassicLineLayout, type WordLayoutConfig } from './classicWordLayout'
import { buildClassicLyricContainerFloat, buildClassicWordVariants } from './classicWordVariants'

// src/app/music/visualizer/classic/Visualizer.tsx
// This mode is the most straightforward lyric pipeline in the folder.
// First we ask runtime which line is active right now, then read renderHints from that line,
// then build a loose per-word layout so every word can animate on its own without depending on parent rerenders.
// Nothing too fancy here, it is basically the "baseline" visualizer that the other modes keep borrowing timing ideas from.
type VisualizerProps = VisualizerSharedProps

// Upstream rendered t('ui.waitingForMusic') here, and every upstream locale (en / zh-CN / in) defines
// that key as an empty string: the empty-state block still mounts and fades, it just carries no text.
const WAITING_FOR_MUSIC_LABEL = ''

/** 模式样式（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 主歌词区：占 70vh、四向居中，供浮动动画驱动 */
	stage: {
		position: 'relative',
		zIndex: 10,
		display: 'flex',
		height: '70vh',
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32,
		willChange: 'transform',
		pointerEvents: 'none'
	},
	/** 行容器：可换行、内容整体居中（主轴/交叉轴由行配置决定） */
	lineBox: {
		display: 'flex',
		width: '100%',
		maxWidth: 1152,
		flexWrap: 'wrap',
		alignContent: 'center'
	},
	justifyStart: { justifyContent: 'flex-start' },
	justifyCenter: { justifyContent: 'center' },
	justifyEnd: { justifyContent: 'flex-end' },
	justifyAround: { justifyContent: 'space-around' },
	justifyBetween: { justifyContent: 'space-between' },
	alignItemsStart: { alignItems: 'flex-start' },
	alignItemsCenter: { alignItems: 'center' },
	alignItemsEnd: { alignItems: 'flex-end' },
	/** 空态提示：绝对定位、半透明（字号类值兜底，实际由内联样式覆盖） */
	empty: {
		position: 'absolute',
		fontSize: '1.5rem',
		lineHeight: 1.3333,
		opacity: 0.5
	}
})

type LayoutStyle = (typeof sx)[keyof typeof sx]
/** 行布局类名 → 样式（classicWordLayout 仍返回原类名；未知值不产出样式） */
const justifyByClass: Record<string, LayoutStyle> = {
	'justify-start': sx.justifyStart,
	'justify-center': sx.justifyCenter,
	'justify-end': sx.justifyEnd,
	'justify-around': sx.justifyAround,
	'justify-between': sx.justifyBetween
}
const alignItemsByClass: Record<string, LayoutStyle> = {
	'items-start': sx.alignItemsStart,
	'items-center': sx.alignItemsCenter,
	'items-end': sx.alignItemsEnd
}

const Visualizer: React.FC<VisualizerProps> = props => {
	const {
		currentTime,
		currentLineIndex,
		lines,
		theme,
		subtitleTheme,
		audioPower,
		audioBands,
		showText = true,
		lyricsFontScale = 1,
		subtitleFontScale = 1,
		subtitleOverlayOpacity,
		subtitleOverlayBackground,
		subtitleUpcomingLyricsBlur,
		isPlayerChromeHidden = false,
		hideTranslationSubtitle = false,
		showSubtitleTranslation = true,
		subtitleContentMode,
		classicTuning
	} = props
	const resolvedClassicTuning = useMemo(() => resolveClassicTuning(classicTuning), [classicTuning])
	const { activeLine, recentCompletedLine, nextLines } = useVisualizerRuntime({
		currentTime,
		currentLineIndex,
		lines,
		getLineEndTime: getLineRenderEndTime
	})
	const activeLineRenderProfile = activeLine ? resolveClassicLineRenderProfile(activeLine) : null
	const activeWordRenderProfile = activeLineRenderProfile ?? (activeLine ? resolveClassicLineRenderProfile(activeLine) : null)
	const activeLineContainerMotion = getClassicLineContainerMotion(activeLineRenderProfile)

	const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth))

	useEffect(() => {
		const handleResize = () => {
			setViewportWidth(window.innerWidth)
		}
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	const displayWords = useMemo(() => {
		if (!activeLine) return []
		if (resolvedClassicTuning.useLegacyLayout) {
			return activeLine.words
		}
		const layoutUnits = buildPostLyricLayoutUnits(activeLine, { semantic: true, sticky: true })
		return buildDisplayWordsFromLayoutUnits(layoutUnits)
	}, [activeLine, resolvedClassicTuning.useLegacyLayout])

	const mainFontSize = `clamp(${(2.25 * lyricsFontScale).toFixed(3)}rem, ${(6 * lyricsFontScale).toFixed(3)}vw, ${(4.5 * lyricsFontScale).toFixed(3)}rem)`
	const emptyFontSize = `clamp(${(1.5 * lyricsFontScale).toFixed(3)}rem, ${(3.5 * lyricsFontScale).toFixed(3)}vw, ${(2.25 * lyricsFontScale).toFixed(3)}rem)`
	const translationFontSize = `clamp(${(1.125 * lyricsFontScale).toFixed(3)}rem, ${(2.6 * lyricsFontScale).toFixed(3)}vw, ${(1.25 * lyricsFontScale).toFixed(3)}rem)`
	const upcomingFontSize = `clamp(${(0.875 * lyricsFontScale).toFixed(3)}rem, ${(2 * lyricsFontScale).toFixed(3)}vw, ${(1 * lyricsFontScale).toFixed(3)}rem)`

	// Generate a stable random layout configuration for the current line.
	// Use the line start time as seed so the same lyric does not reshuffle every rerender.
	const { wordConfigs, lineConfig } = useMemo(
		() =>
			buildClassicLineLayout({
				activeLine,
				displayWords,
				theme,
				lyricsFontScale,
				viewportWidth,
				enableWordRotation: resolvedClassicTuning.enableWordRotation,
				useLegacyLayout: resolvedClassicTuning.useLegacyLayout,
				wordSpacing: resolvedClassicTuning.wordSpacing
			}),
		[
			activeLine,
			displayWords,
			resolvedClassicTuning.enableWordRotation,
			resolvedClassicTuning.useLegacyLayout,
			resolvedClassicTuning.wordSpacing,
			theme,
			lyricsFontScale,
			viewportWidth
		]
	)

	// Container motion is the "body" of each word; body handles color/blur; glow is text-shadow only.
	const { layoutVariants, bodyVariants, glowVariants } = buildClassicWordVariants({
		enableWordRotation: resolvedClassicTuning.enableWordRotation,
		animationIntensity: theme.animationIntensity
	})

	const lyricContainerFloat = useMemo(
		() => buildClassicLyricContainerFloat(resolvedClassicTuning.breathingFloatMultiplier, theme.animationIntensity),
		[resolvedClassicTuning.breathingFloatMultiplier, theme.animationIntensity]
	)

	return (
		<VisualizerShell theme={theme} audioPower={audioPower} audioBands={audioBands} sharedProps={props}>
			{/* Main Container */}
			<motion.div
				{...stylex.props(sx.stage)}
				animate={lyricContainerFloat?.animate}
				transition={lyricContainerFloat?.transition}>
				<AnimatePresence mode='popLayout'>
					{showText && activeLine && (
						<motion.div
							key={activeLine.startTime}
							initial={activeLineContainerMotion.initial}
							animate={activeLineContainerMotion.animate}
							exit={activeLineContainerMotion.exit}
							className={stylex.props(sx.lineBox, justifyByClass[lineConfig.justifyContent], alignItemsByClass[lineConfig.alignItems]).className}
							style={{ perspective: `${lineConfig.perspective}px`, minHeight: '300px' }}>
							{displayWords.map((word, idx) => {
								const config: WordLayoutConfig = wordConfigs[idx] || {
									id: `fallback-${idx}`,
									x: 0,
									y: 0,
									rotate: 0,
									scale: 1,
									marginRight: '0.5rem',
									alignSelf: 'auto',
									passedRotate: 0
								}

								const activeColor = resolveWordColor(word.text, theme.wordColors, theme.accentColor)

								return (
									<ClassicWord
										key={`${word.text}-${idx}-${activeLine.startTime}`}
										word={word}
										config={config}
										currentTime={currentTime}
										theme={theme}
										isChaotic={theme.animationIntensity === 'chaotic'}
										layoutVariants={layoutVariants}
										bodyVariants={bodyVariants}
										glowVariants={glowVariants}
										baseColor={theme.primaryColor}
										activeColor={activeColor}
										renderProfile={activeWordRenderProfile!}
										isChorus={activeLine.isChorus}
										fontSize={mainFontSize}
									/>
								)
							})}
						</motion.div>
					)}

					{showText && !activeLine && (
						<motion.div
							key='empty'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className={stylex.props(sx.empty).className}
							style={{
								color: theme.secondaryColor,
								fontSize: emptyFontSize
							}}>
							{WAITING_FOR_MUSIC_LABEL}
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>

			<VisualizerSubtitleOverlay
				showText={showText}
				activeLine={activeLine}
				recentCompletedLine={recentCompletedLine}
				nextLines={nextLines}
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

export default Visualizer
