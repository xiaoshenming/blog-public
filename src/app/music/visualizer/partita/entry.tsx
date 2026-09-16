import React from 'react'
import { defineVisualizer } from '../definition'

const VisualizerPartita = React.lazy(() => import('./VisualizerPartita'))

// src/app/music/visualizer/partita/entry.tsx
// Registers Partita. The upstream preview tuning panel is not ported; the renderer falls back to
// DEFAULT_PARTITA_TUNING unless the host injects a tuning bundle.
export default defineVisualizer({
	mode: 'partita',
	order: 50,
	label: '云阶',
	previewSeed: 'partita',
	previewStartOffset: 0,
	tuningKind: 'partita',
	usesWordSegmentation: true,
	render: props => <VisualizerPartita {...props} />
})
