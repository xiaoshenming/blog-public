'use client'

import { useEffect, useState } from 'react'
import type { ViewportSize } from './fumeTypes'

// src/app/music/visualizer/fume/useFumeViewport.ts
// Tracks the renderer's content-box size through a ResizeObserver. The Fume article layout and
// canvas raster are both keyed on these two numbers.

export const useFumeViewport = (viewportRef: React.RefObject<HTMLDivElement | null>): ViewportSize => {
	const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 })

	useEffect(() => {
		const element = viewportRef.current
		if (!element) {
			return
		}

		const observer = new ResizeObserver(entries => {
			const entry = entries[0]
			if (!entry) return
			const nextWidth = entry.contentRect.width
			const nextHeight = entry.contentRect.height
			setViewport(previous => (previous.width === nextWidth && previous.height === nextHeight ? previous : { width: nextWidth, height: nextHeight }))
		})

		observer.observe(element)
		return () => observer.disconnect()
	}, [viewportRef])

	return viewport
}
