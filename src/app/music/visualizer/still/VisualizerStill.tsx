'use client'

import React, { useEffect, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { resolveThemeFontStack, resolveThemeFontWeight, resolveThemeTranslationFontStack } from '../fontStacks'
import type { VisualizerSharedProps } from '../definition'
import VisualizerShell from '../VisualizerShell'

// src/app/music/visualizer/still/VisualizerStill.tsx
// Renders static lyrics inside the shared shell while leaving the background renderer unmounted.

/** 静止模式样式（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 暗角遮罩：径向压暗（白天叠加降低不透明度与乘法混合） */
	overlay: {
		position: 'absolute',
		inset: 0,
		zIndex: 0,
		backgroundImage: 'radial-gradient(transparent 0%, #000 100%)',
		pointerEvents: 'none'
	},
	overlayDaylight: {
		opacity: 0.3,
		mixBlendMode: 'multiply'
	},
	overlayNight: {
		opacity: 0.65
	},
	/** 歌词区：整屏纵向居中排布 */
	lyricsLayer: {
		position: 'absolute',
		inset: 0,
		zIndex: 0,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 32,
		paddingInline: 48,
		paddingBottom: 64,
		pointerEvents: 'none'
	},
	/** 空行占位高 80 */
	emptyLine: {
		height: 80
	},
	/** 单条歌词：纵向排布、水平居中 */
	lineBlock: {
		display: 'flex',
		width: '100%',
		maxWidth: 896,
		flexDirection: 'column',
		alignItems: 'center'
	},
	/** 原文行：字距与投影 */
	lyricText: {
		textAlign: 'center',
		letterSpacing: '.02em',
		filter: 'drop-shadow(0 3px 3px rgb(0 0 0 / 12%))'
	},
	/** 当前行：大号、收紧行高、全亮 */
	lyricCurrent: {
		fontSize: '2.5rem',
		lineHeight: 1.25,
		opacity: 1
	},
	/** 非当前行：中号、低亮 */
	lyricIdle: {
		fontSize: '1.875rem',
		lineHeight: 1.2,
		opacity: 0.3
	},
	/** 译文行：字距与轻投影 */
	translation: {
		textAlign: 'center',
		letterSpacing: '.025em',
		filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 15%))'
	},
	/** 当前行译文 */
	translationCurrent: {
		marginTop: 12,
		fontSize: '1.5rem',
		lineHeight: 1.3333,
		opacity: 0.8
	},
	/** 非当前行译文 */
	translationIdle: {
		marginTop: 8,
		fontSize: '1.25rem',
		lineHeight: 1.4,
		opacity: 0.3
	}
})

const VisualizerStill: React.FC<VisualizerSharedProps> = ({
	currentLineIndex,
	lines,
	theme,
	subtitleTheme,
	lyricsFontScale = 1,
	subtitleFontScale = 1,
	hideTranslationSubtitle = false,
	isDaylight = false,
	showText = true,
	audioPower,
	audioBands,
	...sharedProps
}) => {
	const [effectiveIndex, setEffectiveIndex] = useState(() => Math.max(0, currentLineIndex))

	useEffect(() => {
		if (currentLineIndex !== -1) {
			setEffectiveIndex(currentLineIndex)
		} else if (effectiveIndex >= lines.length) {
			setEffectiveIndex(0)
		}
	}, [currentLineIndex, effectiveIndex, lines.length])

	const resolvedSubtitleTheme = subtitleTheme ?? theme

	return (
		<VisualizerShell
			theme={theme}
			audioPower={audioPower}
			audioBands={audioBands}
			sharedProps={{
				...sharedProps,
				isDaylight
			}}
			renderBackground={false}
			className='visualizer-still'>
			<div {...stylex.props(sx.overlay, isDaylight ? sx.overlayDaylight : sx.overlayNight)} />

			{showText && (
				<div {...stylex.props(sx.lyricsLayer)}>
					{[-1, 0, 1].map(offset => {
						const lineIndex = effectiveIndex + offset
						const line = lines[lineIndex]
						if (!line) {
							return <div key={`empty-${offset}`} {...stylex.props(sx.emptyLine)} />
						}

						const isCurrent = offset === 0
						return (
							<div key={lineIndex} {...stylex.props(sx.lineBlock)}>
								{line.fullText && (
									<div
										className={stylex.props(sx.lyricText, isCurrent ? sx.lyricCurrent : sx.lyricIdle).className}
										style={{
											color: theme.primaryColor,
											fontFamily: resolveThemeFontStack(theme),
											scale: lyricsFontScale,
											fontWeight: resolveThemeFontWeight(theme, isCurrent ? 700 : 600)
										}}>
										{line.fullText}
									</div>
								)}
								{line.translation && !hideTranslationSubtitle && (
									<div
										className={stylex.props(sx.translation, isCurrent ? sx.translationCurrent : sx.translationIdle).className}
										style={{
											color: resolvedSubtitleTheme.secondaryColor,
											fontFamily: resolveThemeTranslationFontStack(resolvedSubtitleTheme),
											scale: lyricsFontScale * subtitleFontScale,
											fontWeight: resolveThemeFontWeight(resolvedSubtitleTheme, isCurrent ? 500 : 400)
										}}>
										{line.translation}
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}
		</VisualizerShell>
	)
}

export default VisualizerStill
