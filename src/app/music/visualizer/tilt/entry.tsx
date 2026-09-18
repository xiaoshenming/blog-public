'use client'

import React from 'react'
import { defineVisualizer } from '../definition'

const VisualizerTilt = React.lazy(() => import('./VisualizerTilt'))

// src/app/music/visualizer/tilt/entry.tsx
// Registers Tilt. Upstream also wired its settings panel here; the blog renders with the default tuning.
export default defineVisualizer({
	mode: 'tilt',
	order: 70,
	label: '倾诉',
	previewSeed: 'tilt',
	previewStartOffset: 0,
	tuningKind: 'tilt',
	render: props => <VisualizerTilt {...props} />
})
