'use client'

import React from 'react'
import { defineVisualizer } from '../definition'

const VisualizerFume = React.lazy(() => import('./VisualizerFume'))

// src/app/music/visualizer/fume/entry.tsx
// Registers Fume and its preview tuning.
export default defineVisualizer({
	mode: 'fume',
	order: 60,
	label: '浮名',
	previewSeed: 'fume',
	previewStartOffset: 18.4,
	tuningKind: 'fume',
	render: props => <VisualizerFume {...props} />
})
