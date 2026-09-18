'use client'

import React, { forwardRef, useEffect, useRef, useState } from 'react'
import { motion, type MotionValue } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import { cn } from '@/lib/utils'
import type { AudioBands, Theme } from './types'
import { resolveThemeFontStack, resolveThemeFontWeight } from './fontStacks'
import type { VisualizerSharedProps } from './definition'
import VisualizerBackgroundRenderer from './backgrounds/VisualizerBackgroundRenderer'

// Shared outer shell for all visualizers.
// This is where we keep background layering, font injection, and the hover-only back button
// so each renderer can stay focused on lyric timing/layout instead of rebuilding the same frame.
type VisualizerShellSharedProps = Pick<
	VisualizerSharedProps,
	| 'coverUrl'
	| 'isDaylight'
	| 'seed'
	| 'visualizerOpacity'
	| 'background'
	| 'staticMode'
	| 'backgroundStaticMode'
	| 'paused'
	| 'onBack'
	| 'isPanelOpen'
	| 'alwaysShowBackButton'
	| 'onPlayerPanelGuideHotspotChange'
>

interface VisualizerShellProps {
	theme: Theme
	audioPower: MotionValue<number>
	audioBands: AudioBands
	sharedProps?: VisualizerShellSharedProps
	visualizerOpacity?: number
	renderBackground?: boolean
	children: React.ReactNode
	className?: string
}

const PLAYER_CHROME_HOTSPOT_SIZE = 120
const TOUCH_GUIDE_DISPLAY_MS = 1400
const BACK_BUTTON_LABEL = '返回'

/** 外壳样式（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 根容器：铺满、纵向居中、隐藏溢出；颜色过渡 1s */
	shell: {
		position: 'relative',
		display: 'flex',
		height: '100%',
		width: '100%',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '1s',
		transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)'
	},
	/** 字体类别兜底（真实字体栈由内联样式注入） */
	fontSans: {
		fontFamily: 'var(--font-sans)'
	},
	fontSerif: {
		fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
	},
	fontMono: {
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
	},
	/** 左上角返回按钮：圆形毛玻璃、悬停提亮（可见性由内联样式控制） */
	backButton: {
		position: 'absolute',
		top: 24,
		left: 24,
		zIndex: 30,
		display: 'flex',
		height: 40,
		width: 40,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		backgroundColor: 'rgb(0 0 0 / 20%)',
		color: 'rgb(255 255 255 / 60%)',
		backdropFilter: 'blur(12px)',
		pointerEvents: 'auto',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '.15s',
		transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 10%)'
			}
		}
	}
})

// Upstream resolved a sized cover variant here (getSizedCoverUrl). The blog serves one cover
// per song, so the URL is used as-is.
const resolveShellCoverUrl = (coverUrl: string | null | undefined) => coverUrl || undefined

const isNearPlayerPanelHotspot = (clientX: number, clientY: number) =>
	typeof window !== 'undefined' && clientX >= window.innerWidth - PLAYER_CHROME_HOTSPOT_SIZE && clientY >= window.innerHeight - PLAYER_CHROME_HOTSPOT_SIZE

const VisualizerShell = forwardRef<HTMLDivElement, VisualizerShellProps>(
	({ theme, audioPower, audioBands, sharedProps, visualizerOpacity = 1, renderBackground = true, children, className = '' }, ref) => {
		const [showBackButton, setShowBackButton] = useState(false)
		const playerPanelGuideHotspotRef = useRef(false)
		const touchGuideHideTimeoutRef = useRef<number | null>(null)
		const resolvedCoverUrl = resolveShellCoverUrl(sharedProps?.coverUrl)
		const resolvedIsDaylight = sharedProps?.isDaylight ?? false
		const resolvedVisualizerOpacity = sharedProps?.visualizerOpacity ?? visualizerOpacity
		const resolvedStaticMode = sharedProps?.staticMode ?? false
		const resolvedBackgroundStaticMode = sharedProps?.backgroundStaticMode ?? false
		const resolvedPaused = sharedProps?.paused ?? false
		const resolvedOnBack = sharedProps?.onBack
		const resolvedIsPanelOpen = sharedProps?.isPanelOpen ?? false
		const onPlayerPanelGuideHotspotChange = sharedProps?.onPlayerPanelGuideHotspotChange
		const isBackButtonVisible = sharedProps?.alwaysShowBackButton || showBackButton

		const updatePlayerPanelGuideHotspot = (isActive: boolean) => {
			if (playerPanelGuideHotspotRef.current === isActive) {
				return
			}

			playerPanelGuideHotspotRef.current = isActive
			onPlayerPanelGuideHotspotChange?.(isActive)
		}

		const clearTouchGuideHideTimeout = () => {
			if (touchGuideHideTimeoutRef.current === null) {
				return
			}

			window.clearTimeout(touchGuideHideTimeoutRef.current)
			touchGuideHideTimeoutRef.current = null
		}

		const showTouchPanelGuide = () => {
			clearTouchGuideHideTimeout()
			updatePlayerPanelGuideHotspot(true)
			touchGuideHideTimeoutRef.current = window.setTimeout(() => {
				touchGuideHideTimeoutRef.current = null
				updatePlayerPanelGuideHotspot(false)
			}, TOUCH_GUIDE_DISPLAY_MS)
		}

		useEffect(
			() => () => {
				clearTouchGuideHideTimeout()
				if (playerPanelGuideHotspotRef.current) {
					onPlayerPanelGuideHotspotChange?.(false)
				}
			},
			[onPlayerPanelGuideHotspotChange]
		)

		// 字体类别样式仅作兜底，真实字体栈仍由内联样式决定。
		const fontStyle = theme.fontStyle === 'mono' ? sx.fontMono : theme.fontStyle === 'serif' ? sx.fontSerif : sx.fontSans
		const { className: shellClass } = stylex.props(sx.shell, fontStyle)

		return (
			<div
				ref={ref}
				className={cn(shellClass, className)}
				style={{
					backgroundColor: 'transparent',
					fontFamily: resolveThemeFontStack(theme),
					fontWeight: resolveThemeFontWeight(theme, 400),
					opacity: resolvedVisualizerOpacity
				}}
				onMouseMove={event => {
					// Back button is intentionally hidden most of the time.
					// Only reveal it near the top-left hot area so it does not pollute the visual field.
					const nearBackArea = event.clientX <= PLAYER_CHROME_HOTSPOT_SIZE && event.clientY <= PLAYER_CHROME_HOTSPOT_SIZE
					if (nearBackArea !== showBackButton) {
						setShowBackButton(nearBackArea)
					}

					updatePlayerPanelGuideHotspot(!resolvedIsPanelOpen && isNearPlayerPanelHotspot(event.clientX, event.clientY))
				}}
				onMouseLeave={() => {
					if (showBackButton) {
						setShowBackButton(false)
					}
					updatePlayerPanelGuideHotspot(false)
				}}
				onPointerDown={event => {
					if (resolvedIsPanelOpen || event.pointerType !== 'touch' || !isNearPlayerPanelHotspot(event.clientX, event.clientY)) {
						return
					}

					showTouchPanelGuide()
				}}
				onPointerCancel={() => {
					clearTouchGuideHideTimeout()
					updatePlayerPanelGuideHotspot(false)
				}}>
				{resolvedOnBack && (
					<motion.button
						type='button'
						aria-label={BACK_BUTTON_LABEL}
						initial={false}
						animate={{
							opacity: isBackButtonVisible ? 1 : 0,
							scale: isBackButtonVisible ? 1 : 0.92,
							x: isBackButtonVisible ? 0 : -6
						}}
						transition={{ duration: 0.2, ease: 'easeOut' }}
						onClick={event => {
							event.stopPropagation()
							resolvedOnBack()
						}}
						className={stylex.props(sx.backButton).className}
						style={{ pointerEvents: isBackButtonVisible ? 'auto' : 'none' }}>
						<ChevronLeft size={20} />
					</motion.button>
				)}

				{renderBackground && (
					<VisualizerBackgroundRenderer
						config={sharedProps?.background}
						theme={theme}
						isDaylight={resolvedIsDaylight}
						coverUrl={resolvedCoverUrl}
						audioPower={audioPower}
						audioBands={audioBands}
						seed={sharedProps?.seed}
						staticMode={resolvedStaticMode || resolvedBackgroundStaticMode}
						paused={resolvedPaused}
					/>
				)}

				{children}
			</div>
		)
	}
)

VisualizerShell.displayName = 'VisualizerShell'

export default VisualizerShell
