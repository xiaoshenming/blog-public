'use client'

import React, { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import type { VisualizerBackgroundRenderProps } from '../definition'
import { colorWithAlpha, mixColors } from '../../colorMix'

// src/app/music/visualizer/backgrounds/plain/PlainBackground.tsx
// A quiet field for every mode to sit on: theme-colour gradient, the cover blurred and enlarged
// over it, two soft glows that drift very slowly, and a vignette. No audio reaction. The drift
// stops for prefers-reduced-motion, staticMode and paused; the cover cross-fade is kept because
// an opacity change is not motion.

const DRIFT_DURATION_S = 28
const COVER_FADE_S = 1.1

/** 背景层样式（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 根层：铺满、不响应指针、隐藏溢出（透明度保留内联） */
	root: {
		position: 'absolute',
		inset: 0,
		zIndex: 0,
		overflow: 'hidden',
		pointerEvents: 'none'
	},
	/** 底色渐变层：铺满、背景过渡 1s */
	field: {
		position: 'absolute',
		inset: 0,
		transitionProperty: 'background',
		transitionDuration: '1s',
		transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)'
	},
	/** 封面模糊层 */
	cover: {
		position: 'absolute'
	},
	/** 漂移光斑：圆形 */
	glow: {
		position: 'absolute',
		borderRadius: 9999
	},
	/** 暗角层：铺满 */
	vignette: {
		position: 'absolute',
		inset: 0
	}
})

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const cssUrl = (url: string) => `url("${url.replace(/["\\]/g, '\\$&')}")`

interface PlainPalette {
	field: string
	glowA: string
	glowB: string
	vignette: string
	coverOpacity: number
}

const buildPalette = (theme: VisualizerBackgroundRenderProps['theme'], isDaylight: boolean): PlainPalette => {
	const base = theme.backgroundColor
	// Dark themes get a slightly lifted first stop so the field is not a flat slab; daylight
	// themes are pulled toward white instead so the lyrics keep their contrast on top.
	const lift = isDaylight ? mixColors(base, '#ffffff', 0.18) : mixColors(base, theme.primaryColor, 0.14)
	const shade = isDaylight ? mixColors(base, theme.primaryColor, 0.1) : mixColors(base, '#000000', 0.24)
	return {
		field: `linear-gradient(160deg, ${lift} 0%, ${base} 48%, ${shade} 100%)`,
		glowA: colorWithAlpha(theme.accentColor, isDaylight ? 0.2 : 0.28),
		glowB: colorWithAlpha(theme.secondaryColor, isDaylight ? 0.14 : 0.2),
		vignette: `radial-gradient(ellipse at center, transparent 40%, ${colorWithAlpha(shade, isDaylight ? 0.28 : 0.56)} 100%)`,
		coverOpacity: isDaylight ? 0.3 : 0.42
	}
}

const driftTransition = (delay: number) => ({
	duration: DRIFT_DURATION_S,
	delay,
	ease: 'easeInOut' as const,
	repeat: Infinity,
	repeatType: 'mirror' as const
})

const PlainBackground: React.FC<VisualizerBackgroundRenderProps> = ({ config, theme, isDaylight, coverUrl, staticMode, paused }) => {
	const prefersReducedMotion = useReducedMotion()
	const common = config?.common
	const showCover = Boolean(coverUrl) && (common?.useCoverColorBg ?? true)
	const showGlows = !(common?.disableGeometricBackground ?? false)
	const showVignette = !(common?.disableVignette ?? false)
	const layerOpacity = clamp01(common?.opacity ?? 1)
	const drifting = !(prefersReducedMotion || staticMode || paused)

	const palette = useMemo(() => buildPalette(theme, isDaylight), [theme, isDaylight])

	return (
		<div aria-hidden className={stylex.props(sx.root).className} style={{ opacity: layerOpacity }}>
			<div className={stylex.props(sx.field).className} style={{ background: palette.field }} />

			<AnimatePresence initial={false}>
				{showCover && coverUrl && (
					<motion.div
						key={coverUrl}
						className={stylex.props(sx.cover).className}
						initial={{ opacity: 0 }}
						animate={{ opacity: palette.coverOpacity }}
						exit={{ opacity: 0 }}
						transition={{ duration: COVER_FADE_S, ease: 'easeOut' }}
						style={{
							// Bleed past the edges so the blur never shows a transparent fringe.
							inset: '-14%',
							backgroundImage: cssUrl(coverUrl),
							backgroundSize: 'cover',
							backgroundPosition: 'center',
							filter: `blur(${isDaylight ? 64 : 72}px) saturate(${isDaylight ? 1.05 : 1.25})`,
							transform: 'scale(1.3) translateZ(0)',
							willChange: 'opacity'
						}}
					/>
				)}
			</AnimatePresence>

			{showGlows && (
				<>
					<motion.div
						className={stylex.props(sx.glow).className}
						style={{
							width: '72%',
							aspectRatio: '1',
							left: '-18%',
							top: '-26%',
							background: `radial-gradient(circle at center, ${palette.glowA} 0%, transparent 68%)`,
							filter: 'blur(48px)',
							mixBlendMode: isDaylight ? 'multiply' : 'screen'
						}}
						animate={drifting ? { x: ['0%', '9%', '-4%'], y: ['0%', '7%', '2%'], scale: [1, 1.08, 0.96] } : { x: '0%', y: '0%', scale: 1 }}
						transition={drifting ? driftTransition(0) : { duration: 0.8 }}
					/>
					<motion.div
						className={stylex.props(sx.glow).className}
						style={{
							width: '64%',
							aspectRatio: '1',
							right: '-20%',
							bottom: '-28%',
							background: `radial-gradient(circle at center, ${palette.glowB} 0%, transparent 70%)`,
							filter: 'blur(56px)',
							mixBlendMode: isDaylight ? 'multiply' : 'screen'
						}}
						animate={drifting ? { x: ['0%', '-8%', '3%'], y: ['0%', '-6%', '-1%'], scale: [1, 0.94, 1.06] } : { x: '0%', y: '0%', scale: 1 }}
						transition={drifting ? driftTransition(DRIFT_DURATION_S * 0.35) : { duration: 0.8 }}
					/>
				</>
			)}

			{showVignette && <div className={stylex.props(sx.vignette).className} style={{ background: palette.vignette }} />}
		</div>
	)
}

export default PlainBackground
