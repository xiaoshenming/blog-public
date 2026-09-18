import type React from 'react'
import type { MotionValue } from 'motion/react'
import type { AudioBands, Theme, VisualizerBackgroundMode } from '../types'

// src/app/music/visualizer/backgrounds/definition.ts
// Shared contracts for discoverable visualizer background modes. Only the `common` block of the
// upstream config survives: the per-background tuning groups (monet / nomand / latent / url)
// belonged to backgrounds that are not ported.

export interface VisualizerBackgroundConfig {
	mode?: VisualizerBackgroundMode | null
	/** Skip the background entirely; the shell then shows whatever sits behind it. */
	transparent?: boolean
	common?: {
		/** Tint the background with the cover instead of the theme colours alone. */
		useCoverColorBg?: boolean
		opacity?: number
		/** Drop the decorative (animated) geometry and keep only the flat colour field. */
		disableGeometricBackground?: boolean
		disableVignette?: boolean
	}
}

export interface VisualizerBackgroundRenderProps {
	config?: VisualizerBackgroundConfig
	theme: Theme
	isDaylight: boolean
	coverUrl?: string | null
	audioPower: MotionValue<number>
	audioBands: AudioBands
	seed?: string | number
	staticMode: boolean
	paused: boolean
}

export interface VisualizerBackgroundRegistryEntry {
	mode: VisualizerBackgroundMode
	order: number
	/** Chinese display name. */
	label: string
	render: (props: VisualizerBackgroundRenderProps) => React.ReactNode
}

export interface VisualizerBackgroundEntryModule {
	default: VisualizerBackgroundRegistryEntry
}

export const defineVisualizerBackground = (entry: VisualizerBackgroundRegistryEntry) => entry
