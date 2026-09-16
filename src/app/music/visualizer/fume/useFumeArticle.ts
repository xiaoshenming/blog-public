'use client'

import { useEffect, useRef, useState } from 'react'
import type { FumeTuning, Line } from '../types'
import type { FumeArticleLayout, FumeLayoutTheme, ViewportSize } from './fumeTypes'
import { buildArticleLayout, buildLayoutCacheKey, LAYOUT_REBUILD_DEBOUNCE_MS, readLastFumeLayoutCache, writeLastFumeLayoutCache } from './fumeArticleLayout'

// src/app/music/visualizer/fume/useFumeArticle.ts
// Builds (or reuses from cache) the whole article layout whenever a geometry-affecting input
// changes. The first build runs immediately; rebuilds debounce by LAYOUT_REBUILD_DEBOUNCE_MS so
// window resizes do not thrash the expensive search, and superseded builds bail via a version ref.

interface UseFumeArticleOptions {
	lines: Line[]
	viewport: ViewportSize
	layoutTheme: FumeLayoutTheme
	layoutFumeTuning: FumeTuning
	lyricsFontScale: number
}

export const useFumeArticle = ({ lines, viewport, layoutTheme, layoutFumeTuning, lyricsFontScale }: UseFumeArticleOptions) => {
	const [article, setArticle] = useState<FumeArticleLayout | null>(null)
	const [isLayoutPending, setIsLayoutPending] = useState(false)
	const layoutBuildVersionRef = useRef(0)
	const hasResolvedArticleRef = useRef(false)

	useEffect(() => {
		const requestVersion = layoutBuildVersionRef.current + 1
		layoutBuildVersionRef.current = requestVersion

		if (viewport.width <= 0 || viewport.height <= 0 || lines.length === 0) {
			hasResolvedArticleRef.current = false
			setArticle(null)
			setIsLayoutPending(false)
			return
		}

		setIsLayoutPending(true)

		let rafId = 0
		let timeoutId = 0
		const delay = hasResolvedArticleRef.current ? LAYOUT_REBUILD_DEBOUNCE_MS : 0

		rafId = window.requestAnimationFrame(() => {
			timeoutId = window.setTimeout(() => {
				if (layoutBuildVersionRef.current !== requestVersion) {
					return
				}

				const layoutCacheKey = buildLayoutCacheKey(lines, viewport, layoutTheme, lyricsFontScale, layoutFumeTuning)
				const lastCache = readLastFumeLayoutCache()
				const nextArticle =
					lastCache?.key === layoutCacheKey ? lastCache.article : buildArticleLayout(lines, viewport, layoutTheme, lyricsFontScale, layoutFumeTuning)
				if (layoutBuildVersionRef.current !== requestVersion) {
					return
				}

				writeLastFumeLayoutCache({ key: layoutCacheKey, article: nextArticle })
				hasResolvedArticleRef.current = nextArticle !== null
				setArticle(nextArticle)
				setIsLayoutPending(false)
			}, delay)
		})

		return () => {
			window.cancelAnimationFrame(rafId)
			window.clearTimeout(timeoutId)
		}
	}, [layoutFumeTuning, layoutTheme, lines, lyricsFontScale, viewport])

	return { article, isLayoutPending }
}
