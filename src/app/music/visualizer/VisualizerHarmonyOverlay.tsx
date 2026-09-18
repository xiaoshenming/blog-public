'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, type MotionValue, useMotionValueEvent } from 'motion/react'
import type { Line, SubtitleContentMode, Theme } from './types'
import { resolveThemeFontWeight, resolveThemeTranslationFontStack } from './fontStacks'
import { colorWithAlpha } from './colorMix'
import { getLyricsBackgroundVocals, resolveHarmonyAlternateText, resolveHarmonySnapshotFromVocals, type HarmonySnapshot } from './harmonyRuntime'
import HarmonyGlowText from './HarmonyGlowText'

// src/app/music/visualizer/VisualizerHarmonyOverlay.tsx
// Renders TTML background vocals in one shared top safe-area without changing mode-specific main lyrics.

interface VisualizerHarmonyOverlayProps {
	currentTime: MotionValue<number>
	lines: Line[]
	showText: boolean
	theme: Theme
	subtitleTheme?: Theme
	isPlayerChromeHidden?: boolean
	hideTranslationSubtitle?: boolean
	showSubtitleTranslation?: boolean
	subtitleContentMode?: SubtitleContentMode
	showHarmonySubtitle?: boolean
	harmonySubtitleBackground?: boolean
	subtitleFontScale?: number
}

const EMPTY_HARMONY_SNAPSHOT: HarmonySnapshot = { signature: '', lines: [] }
const HARMONY_TOP_PX = 76

const VisualizerHarmonyOverlay: React.FC<VisualizerHarmonyOverlayProps> = ({
	currentTime,
	lines,
	showText,
	theme,
	subtitleTheme,
	hideTranslationSubtitle = false,
	showSubtitleTranslation = true,
	subtitleContentMode,
	showHarmonySubtitle = true,
	harmonySubtitleBackground = true,
	subtitleFontScale = 1
}) => {
	const backgroundVocals = useMemo(() => getLyricsBackgroundVocals(lines), [lines])
	const buildSnapshot = useCallback(
		(time: number) => (showText && showHarmonySubtitle ? resolveHarmonySnapshotFromVocals(backgroundVocals, time) : EMPTY_HARMONY_SNAPSHOT),
		[backgroundVocals, showHarmonySubtitle, showText]
	)
	const initialSnapshot = buildSnapshot(currentTime.get())
	// Discrete state only: the snapshot changes when a token flips status, not every frame.
	const [snapshot, setSnapshot] = useState<HarmonySnapshot>(initialSnapshot)
	const signatureRef = useRef(initialSnapshot.signature)

	const updateSnapshot = useCallback(
		(time: number) => {
			const next = buildSnapshot(time)
			if (signatureRef.current === next.signature) {
				return
			}
			signatureRef.current = next.signature
			setSnapshot(next)
		},
		[buildSnapshot]
	)

	useEffect(() => {
		updateSnapshot(currentTime.get())
	}, [currentTime, updateSnapshot])

	useMotionValueEvent(currentTime, 'change', updateSnapshot)

	const resolvedSubtitleTheme = subtitleTheme ?? theme

	return (
		<AnimatePresence>
			{snapshot.lines.length > 0 && (
				<motion.div
					key='visualizer-harmony-overlay'
					initial={{ opacity: 0, y: -12 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -12 }}
					transition={{
						opacity: { duration: 0.2, ease: 'easeOut' },
						y: { duration: 0.2, ease: 'easeOut' }
					}}
					className='pointer-events-none absolute right-0 left-0 z-30 flex flex-col items-center gap-1.5 px-5 text-center'
					style={{ top: HARMONY_TOP_PX }}>
					<div className={`relative isolate flex max-w-full flex-col items-center gap-1.5 ${harmonySubtitleBackground ? 'px-4 py-2' : ''}`}>
						{harmonySubtitleBackground && (
							// Keep the glow out of the masked text's negative/filter compositing path on iOS Safari.
							<div
								aria-hidden='true'
								className='pointer-events-none absolute -inset-x-10 -inset-y-6 z-0 blur-2xl'
								style={{
									background: `radial-gradient(ellipse at center, ${colorWithAlpha(theme.backgroundColor, 0.7)} 0%, ${colorWithAlpha(theme.backgroundColor, 0.42)} 48%, transparent 78%)`,
									transform: 'translateZ(0)',
									WebkitTransform: 'translateZ(0)',
									WebkitBackfaceVisibility: 'hidden'
								}}
							/>
						)}
						{snapshot.lines.map(entry => {
							const alternateText = hideTranslationSubtitle ? null : resolveHarmonyAlternateText(entry.vocal, subtitleContentMode, showSubtitleTranslation)

							return (
								<motion.div
									key={entry.key}
									initial={{ opacity: 0, scale: 0.97 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.97 }}
									className='relative z-10 max-w-4xl overflow-visible break-words whitespace-pre-wrap'>
									<HarmonyGlowText vocal={entry.vocal} currentTime={currentTime} theme={resolvedSubtitleTheme} subtitleFontScale={subtitleFontScale} />
									{alternateText && (
										<motion.div
											initial={{ opacity: 0, y: -4 }}
											animate={{ opacity: 0.82, y: 0 }}
											className='mt-0.5'
											style={{
												color: resolvedSubtitleTheme.secondaryColor,
												fontFamily: resolveThemeTranslationFontStack(resolvedSubtitleTheme),
												fontSize: `clamp(${(0.72 * subtitleFontScale).toFixed(3)}rem, ${(1.2 * subtitleFontScale).toFixed(3)}vw, ${(0.9 * subtitleFontScale).toFixed(3)}rem)`,
												fontWeight: resolveThemeFontWeight(resolvedSubtitleTheme, 400),
												lineHeight: 1.3
											}}>
											{alternateText}
										</motion.div>
									)}
								</motion.div>
							)
						})}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

export default VisualizerHarmonyOverlay
