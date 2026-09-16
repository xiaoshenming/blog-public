import type { VisualizerMode } from './types'
import type { VisualizerRegistryEntry } from './definition'
import cadenzaEntry from './cadenza/entry'
import claddaghEntry from './claddagh/entry'
import classicEntry from './classic/entry'
import fumeEntry from './fume/entry'
import partitaEntry from './partita/entry'
import stillEntry from './still/entry'
import tiltEntry from './tilt/entry'

export type { VisualizerRegistryEntry, VisualizerSharedProps, VisualizerTuningKind } from './definition'

// src/app/music/visualizer/registry.ts
// Central mode registry. Upstream discovered `./*/entry.tsx` with import.meta.glob; Next.js has
// no equivalent, so the entries are imported here by hand and the list below is the authority.

export const BUILTIN_VISUALIZER_MODES = ['cadenza', 'claddagh', 'classic', 'fume', 'partita', 'still', 'tilt'] as const

export const DEFAULT_VISUALIZER_MODE: VisualizerMode = 'classic'

const buildVisualizerRegistry = (entries: VisualizerRegistryEntry[]) => {
	const byMode: Partial<Record<VisualizerMode, VisualizerRegistryEntry>> = {}

	entries.forEach(entry => {
		if (byMode[entry.mode]) {
			throw new Error(`[VisualizerRegistry] Duplicate visualizer mode "${entry.mode}"`)
		}

		byMode[entry.mode] = entry
	})

	return {
		entries: [...entries].sort((left, right) => left.order - right.order),
		byMode
	}
}

const { entries: VISUALIZER_REGISTRY, byMode: VISUALIZER_REGISTRY_BY_MODE } = buildVisualizerRegistry([
	cadenzaEntry,
	claddaghEntry,
	classicEntry,
	fumeEntry,
	partitaEntry,
	stillEntry,
	tiltEntry
])

export { VISUALIZER_REGISTRY }

export const isBuiltinVisualizerMode = (mode: unknown): mode is VisualizerMode =>
	typeof mode === 'string' && (BUILTIN_VISUALIZER_MODES as readonly string[]).includes(mode)

export const hasVisualizerMode = (mode: string | null | undefined): mode is VisualizerMode =>
	Boolean(mode && VISUALIZER_REGISTRY_BY_MODE[mode as VisualizerMode])

export const getVisualizerRegistryEntry = (mode: VisualizerMode) => VISUALIZER_REGISTRY_BY_MODE[mode] ?? VISUALIZER_REGISTRY_BY_MODE[DEFAULT_VISUALIZER_MODE]!

export const getVisualizerModeLabel = (mode: VisualizerMode) => getVisualizerRegistryEntry(mode).label

export const getVisualizerPreviewStartOffset = (mode: VisualizerMode, loopDuration: number) => {
	if (loopDuration <= 0) {
		return 0
	}

	return getVisualizerRegistryEntry(mode).previewStartOffset % loopDuration
}

export const getVisualizerScopedSeed = (mode: VisualizerMode, scope: string) => `${scope}-${getVisualizerRegistryEntry(mode).previewSeed}`
