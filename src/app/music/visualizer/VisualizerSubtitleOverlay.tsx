'use client'

import React, { useEffect } from 'react'
import { AnimatePresence, motion, type MotionValue, useSpring, useTransform } from 'motion/react'
import type { Line, SubtitleContentMode, Theme } from './types'
import { resolveThemeFontWeight, resolveThemeTranslationFontStack } from './fontStacks'
import { resolveLyricAlternateText, resolveSubtitleContentMode } from './lyrics/alternateText'
import { colorWithAlpha } from './colorMix'

// src/app/music/visualizer/VisualizerSubtitleOverlay.tsx
// The shared bottom subtitle: the active line's translation / romanization, or, when there is
// none, a blurred preview of the next lines. Every mode mounts this inside its shell.

// Some songs' lyric data carries pure marker/separator lines ("//", "●●●", dashes, stray slashes from
// instrumental breaks or credits formatting). Those are timing placeholders, never display text: a
// string is only shown here if it contains at least one letter or digit (any script - CJK counts as
// \p{L}). Applies to BOTH the translation and the upcoming-line preview, so no placeholder can ever
// reach the shared bottom subtitle in any visualizer mode.
const hasReadableText = (text?: string | null): boolean => !!text && /[\p{L}\p{N}]/u.test(text)

export const getUpcomingLyricsClassName = (blur = true): string => `truncate max-w-2xl mx-auto transition-all duration-500${blur ? ' blur-[1px]' : ''}`

// Upstream read these from the player's bottom-bar layout (usePlayerSubtitleBottomPx): a shared
// baseline the user could raise, plus clearance for the control capsule. The blog has no such bar,
// so the geometry is fixed at upstream's defaults; only the "controls hidden" transition survives.
const SUBTITLE_BASE_BOTTOM_PX = 32
const SUBTITLE_CONTROL_BAR_CLEARANCE_PX = 80
const SUBTITLE_PRESENCE_SPRING = { stiffness: 280, damping: 28 } as const

const useSubtitleBottomPx = (isPlayerChromeHidden: boolean): MotionValue<number> => {
	const controlBarPresence = useSpring(isPlayerChromeHidden ? 0 : 1, SUBTITLE_PRESENCE_SPRING)

	useEffect(() => {
		// useSpring's set animates to the value rather than jumping, so this is the transition itself.
		controlBarPresence.set(isPlayerChromeHidden ? 0 : 1)
	}, [controlBarPresence, isPlayerChromeHidden])

	return useTransform(controlBarPresence, presence => SUBTITLE_BASE_BOTTOM_PX + presence * SUBTITLE_CONTROL_BAR_CLEARANCE_PX)
}

interface VisualizerSubtitleOverlayProps {
	showText: boolean
	activeLine: Line | null
	recentCompletedLine: Line | null
	nextLines: Line[]
	theme: Theme
	subtitleTheme?: Theme
	translationFontSize: string
	upcomingFontSize: string
	subtitleFontScale?: number
	opacity?: number
	subtitleOverlayOpacity?: number
	subtitleOverlayBackground?: boolean
	subtitleUpcomingLyricsBlur?: boolean
	isPlayerChromeHidden?: boolean
	hideTranslationSubtitle?: boolean
	showSubtitleTranslation?: boolean
	subtitleContentMode?: SubtitleContentMode
}

export const resolveVisualizerSubtitleOverlayContent = ({
	showText,
	activeLine,
	recentCompletedLine,
	nextLines,
	hideTranslationSubtitle = false,
	showSubtitleTranslation = true,
	subtitleContentMode
}: Pick<
	VisualizerSubtitleOverlayProps,
	'showText' | 'activeLine' | 'recentCompletedLine' | 'nextLines' | 'hideTranslationSubtitle' | 'showSubtitleTranslation' | 'subtitleContentMode'
>) => {
	if (!showText || hideTranslationSubtitle) {
		return {
			shouldRenderOverlay: false,
			subtitleText: null as string | null,
			upcomingLines: [] as Line[]
		}
	}

	const resolvedMode = resolveSubtitleContentMode(subtitleContentMode, showSubtitleTranslation)
	const subtitleText = [activeLine, recentCompletedLine].map(line => resolveLyricAlternateText(line, resolvedMode)).find(hasReadableText) ?? null
	const previewLines = nextLines.filter(line => hasReadableText(line.fullText))

	return {
		shouldRenderOverlay: true,
		subtitleText,
		upcomingLines: subtitleText ? [] : activeLine ? previewLines : []
	}
}

const VisualizerSubtitleOverlay: React.FC<VisualizerSubtitleOverlayProps> = ({
	showText,
	activeLine,
	recentCompletedLine,
	nextLines,
	theme,
	subtitleTheme,
	translationFontSize,
	upcomingFontSize,
	subtitleFontScale = 1,
	opacity = 0.6,
	subtitleOverlayOpacity,
	subtitleOverlayBackground = true,
	subtitleUpcomingLyricsBlur = true,
	isPlayerChromeHidden = false,
	hideTranslationSubtitle = false,
	showSubtitleTranslation = true,
	subtitleContentMode
}) => {
	const subtitleBottomPx = useSubtitleBottomPx(isPlayerChromeHidden)
	const { shouldRenderOverlay, subtitleText, upcomingLines } = resolveVisualizerSubtitleOverlayContent({
		showText,
		activeLine,
		recentCompletedLine,
		nextLines,
		hideTranslationSubtitle,
		showSubtitleTranslation,
		subtitleContentMode
	})
	const resolvedOpacity = subtitleOverlayOpacity ?? opacity
	const scaleFontSize = (fontSize: string) =>
		fontSize.replace(/(-?\d*\.?\d+)(rem|vw|px)/g, (_match, value, unit) => `${(Number(value) * subtitleFontScale).toFixed(3)}${unit}`)
	const contentClassName = subtitleOverlayBackground ? 'relative isolate inline-block px-1.5 py-0.5' : 'inline-block'
	// iOS Safari may drop a filtered negative layer when a nearby WebKit mask is recomposited.
	const subtitleGlowStyle = subtitleOverlayBackground
		? {
				background: `radial-gradient(ellipse 115% 130% at center, ${colorWithAlpha(theme.backgroundColor, 0.96)} 0%, ${colorWithAlpha(theme.backgroundColor, 0.78)} 62%, transparent 100%)`,
				transform: 'translateZ(0)',
				WebkitTransform: 'translateZ(0)',
				WebkitBackfaceVisibility: 'hidden' as const
			}
		: undefined
	const textShadow = `0 1px 2px ${colorWithAlpha(theme.backgroundColor, 0.24)}`

	return (
		<AnimatePresence>
			{shouldRenderOverlay && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: resolvedOpacity, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					transition={{
						opacity: { duration: 0.24, ease: 'easeOut' },
						y: { duration: 0.24, ease: 'easeOut' }
					}}
					// bottom 由 MotionValue 直接驱动，跟着底部基线走。
					// 不要改回 transform：这一层下面压着 blur 辉光，多一个合成层就会变色。
					style={{ bottom: subtitleBottomPx }}
					className='pointer-events-none absolute right-0 left-0 z-20 space-y-2 px-4 text-center'>
					{subtitleText ? (
						<div className={contentClassName}>
							{subtitleOverlayBackground && (
								<div aria-hidden='true' className='pointer-events-none absolute -inset-x-10 -inset-y-6 z-0 blur-2xl' style={subtitleGlowStyle} />
							)}
							<motion.div
								key={`trans-${activeLine?.startTime || recentCompletedLine?.startTime}`}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								data-font-debug-target='visualizer-translation'
								className='relative z-10 mx-auto max-w-4xl'
								style={{
									color: theme.secondaryColor,
									fontSize: scaleFontSize(translationFontSize),
									fontFamily: resolveThemeTranslationFontStack(subtitleTheme ?? theme),
									fontWeight: resolveThemeFontWeight(subtitleTheme ?? theme, 500),
									textShadow
								}}>
								{subtitleText}
							</motion.div>
						</div>
					) : activeLine && upcomingLines.length > 0 ? (
						<div className={`${contentClassName} space-y-2`}>
							{subtitleOverlayBackground && (
								<div aria-hidden='true' className='pointer-events-none absolute -inset-x-10 -inset-y-6 z-0 blur-2xl' style={subtitleGlowStyle} />
							)}
							<div className='relative z-10 space-y-2'>
								{upcomingLines.map((line, index) => (
									<p
										key={index}
										className={getUpcomingLyricsClassName(subtitleUpcomingLyricsBlur)}
										style={{
											color: theme.secondaryColor,
											fontSize: scaleFontSize(upcomingFontSize),
											fontWeight: resolveThemeFontWeight(subtitleTheme ?? theme, 400),
											textShadow
										}}>
										{line.fullText}
									</p>
								))}
							</div>
						</div>
					) : null}
				</motion.div>
			)}
		</AnimatePresence>
	)
}

export default VisualizerSubtitleOverlay
