'use client'

import React from 'react'
import { defineVisualizer, type VisualizerSharedProps } from '../definition'
import { DEFAULT_CADENZA_TUNING } from '../types'

const VisualizerCadenza = React.lazy(() => import('./Visualizer'))

// src/app/music/visualizer/cadenza/entry.tsx
// Registers Cadenza and keeps its font-scale adaptation local to the mode.
const renderCadenza = ({ cadenzaTuning = DEFAULT_CADENZA_TUNING, lyricsFontScale = 1, ...props }: VisualizerSharedProps) => (
	<VisualizerCadenza
		{...props}
		lyricsFontScale={lyricsFontScale}
		cadenzaTuning={{
			...cadenzaTuning,
			fontScale: cadenzaTuning.fontScale * lyricsFontScale
		}}
	/>
)

export default defineVisualizer({
	mode: 'cadenza',
	order: 40,
	label: '心象',
	previewSeed: 'cadenza',
	previewStartOffset: 0,
	tuningKind: 'cadenza',
	render: renderCadenza
})
