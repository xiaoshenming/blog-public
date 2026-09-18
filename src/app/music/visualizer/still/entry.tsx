'use client'

import React from 'react'
import { defineVisualizer } from '../definition'

const VisualizerStill = React.lazy(() => import('./VisualizerStill'))

// src/app/music/visualizer/still/entry.tsx
// Registers the static low-resource visualizer mode.
export default defineVisualizer({
	mode: 'still',
	order: 130,
	label: '静止',
	previewSeed: 'still',
	previewStartOffset: 0,
	tuningKind: 'none',
	render: props => <VisualizerStill {...props} />
})
