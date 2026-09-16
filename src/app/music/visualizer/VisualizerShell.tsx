'use client'

import React, { forwardRef, useEffect, useRef, useState } from 'react'
import { motion, type MotionValue } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
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

		// Keep the tailwind font utility roughly aligned with the theme category,
		// but still let the real resolved font stack win through inline style.
		const fontClassName = theme.fontStyle === 'mono' ? 'font-mono' : theme.fontStyle === 'serif' ? 'font-serif' : 'font-sans'

		return (
			<div
				ref={ref}
				className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${fontClassName} transition-colors duration-1000 ${className}`.trim()}
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
						className='pointer-events-auto absolute top-6 left-6 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white/60 backdrop-blur-md transition-colors hover:bg-white/10'
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
