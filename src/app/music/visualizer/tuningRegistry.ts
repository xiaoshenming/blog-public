import type { CadenzaTuning, ClassicTuning, CladdaghTuning, FumeTuning, PartitaTuning, TiltTuning, VisualizerMode } from './types'
import type { VisualizerSharedProps } from './definition'
import cadenzaTuning from './cadenza/tuning'
import claddaghTuning from './claddagh/tuning'
import classicTuning from './classic/tuning'
import fumeTuning from './fume/tuning'
import partitaTuning from './partita/tuning'
import tiltTuning from './tilt/tuning'

// src/app/music/visualizer/tuningRegistry.ts
// Pure-data registry for transporting heterogeneous visualizer tuning without importing renderers.
export interface VisualizerTuningMap {
	classic: ClassicTuning
	cadenza: CadenzaTuning
	partita: PartitaTuning
	fume: FumeTuning
	claddagh: CladdaghTuning
	tilt: TiltTuning
}

export type VisualizerTuningMode = keyof VisualizerTuningMap
export type VisualizerTuningBundle = Partial<VisualizerTuningMap>

export interface VisualizerTuningAdapter<M extends VisualizerTuningMode = VisualizerTuningMode> {
	mode: M
	settingsKey: string
	settingsSetterKey: string
	// Method syntax on purpose: it keeps the parameter bivariant, so the narrowly typed adapter
	// each mode exports can sit in the heterogeneous list below without a cast.
	apply(props: VisualizerSharedProps, tuning: VisualizerTuningMap[M]): VisualizerSharedProps
}

export function defineVisualizerTuning<M extends VisualizerTuningMode>(adapter: VisualizerTuningAdapter<M>) {
	return adapter
}

// Upstream discovered `./*/tuning.ts` with import.meta.glob; Next.js has no equivalent, so the
// adapters are listed here. `still` has no tuning and therefore no adapter.
const adapters: VisualizerTuningAdapter[] = [cadenzaTuning, claddaghTuning, classicTuning, fumeTuning, partitaTuning, tiltTuning]
const adaptersByMode = new Map<VisualizerTuningMode, VisualizerTuningAdapter>()

adapters.forEach(adapter => {
	if (adaptersByMode.has(adapter.mode)) {
		throw new Error(`[VisualizerTuningRegistry] Duplicate adapter for "${adapter.mode}"`)
	}
	adaptersByMode.set(adapter.mode, adapter)
})

export const applyVisualizerTuning = (mode: VisualizerMode, props: VisualizerSharedProps, bundle?: VisualizerTuningBundle): VisualizerSharedProps => {
	const adapter = adaptersByMode.get(mode as VisualizerTuningMode)
	const tuning = bundle?.[mode as VisualizerTuningMode]
	return adapter && tuning ? adapter.apply(props, tuning as never) : props
}

export const getVisualizerTuningModes = (): VisualizerTuningMode[] => [...adaptersByMode.keys()]
