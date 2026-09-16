import type { VisualizerBackgroundMode } from '../types'
import type { VisualizerBackgroundRegistryEntry } from './definition'
import plainEntry from './plain/entry'

// src/app/music/visualizer/backgrounds/registry.ts
// Shell-level background modes. Upstream discovered `./*/entry.tsx` with import.meta.glob;
// here the entries are imported by hand. Only `plain` is ported, and it is the default.

export const BUILTIN_VISUALIZER_BACKGROUND_MODES = ['plain'] as const

export const DEFAULT_VISUALIZER_BACKGROUND_MODE: VisualizerBackgroundMode = 'plain'

const buildBackgroundRegistry = (entries: VisualizerBackgroundRegistryEntry[]) => {
	const byMode: Partial<Record<string, VisualizerBackgroundRegistryEntry>> = {}

	entries.forEach(entry => {
		if (byMode[entry.mode]) {
			throw new Error(`[VisualizerBackgroundRegistry] Duplicate background mode "${entry.mode}"`)
		}
		byMode[entry.mode] = entry
	})

	return {
		entries: [...entries].sort((left, right) => left.order - right.order),
		byMode
	}
}

const { entries: VISUALIZER_BACKGROUND_REGISTRY, byMode: VISUALIZER_BACKGROUND_REGISTRY_BY_MODE } = buildBackgroundRegistry([plainEntry])

export { VISUALIZER_BACKGROUND_REGISTRY }

export const hasVisualizerBackgroundMode = (mode: unknown): mode is VisualizerBackgroundMode =>
	typeof mode === 'string' && Boolean(VISUALIZER_BACKGROUND_REGISTRY_BY_MODE[mode])

export const getVisualizerBackgroundRegistryEntry = (mode: VisualizerBackgroundMode) =>
	VISUALIZER_BACKGROUND_REGISTRY_BY_MODE[mode] ?? VISUALIZER_BACKGROUND_REGISTRY_BY_MODE[DEFAULT_VISUALIZER_BACKGROUND_MODE]!

export const getVisualizerBackgroundModeLabel = (mode: VisualizerBackgroundMode) => getVisualizerBackgroundRegistryEntry(mode).label
