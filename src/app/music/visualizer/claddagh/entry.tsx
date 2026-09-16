'use client'

import React from 'react'
import { defineVisualizer } from '../definition'

const VisualizerCladdagh = React.lazy(() => import('./VisualizerCladdagh'))

// src/app/music/visualizer/claddagh/entry.tsx

export default defineVisualizer({
	mode: 'claddagh',
	order: 80,
	label: '回环',
	previewSeed: 'claddagh',
	previewStartOffset: 0,
	tuningKind: 'claddagh',
	render: props => <VisualizerCladdagh {...props} />
})
