import React from 'react'
import { defineVisualizerBackground } from '../definition'
import PlainBackground from './PlainBackground'

// src/app/music/visualizer/backgrounds/plain/entry.tsx
// Registers the plain background: theme gradient + blurred cover. The only background ported
// from upstream's set, and therefore the default.
export default defineVisualizerBackground({
	mode: 'plain',
	order: 10,
	label: '素净',
	render: props => <PlainBackground {...props} />
})
