'use client'

import React from 'react'
import { defineVisualizer } from '../definition'

const Visualizer = React.lazy(() => import('./Visualizer'))

// src/app/music/visualizer/classic/entry.tsx
// Registers the classic visualizer mode.
export default defineVisualizer({
	mode: 'classic',
	order: 30,
	label: '流光',
	previewSeed: 'classic',
	previewStartOffset: 0,
	tuningKind: 'classic',
	usesWordSegmentation: true,
	render: props => <Visualizer {...props} />
})
