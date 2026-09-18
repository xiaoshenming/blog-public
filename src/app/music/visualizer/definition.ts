import type React from 'react'
import type { MotionValue } from 'motion/react'
import type {
	AudioBands,
	CadenzaTuning,
	ClassicTuning,
	CladdaghTuning,
	FumeTuning,
	Line,
	PartitaTuning,
	SubtitleContentMode,
	Theme,
	TiltTuning,
	VisualizerMode
} from './types'
import type { VisualizerTuningBundle } from './tuningRegistry'
import type { VisualizerBackgroundConfig } from './backgrounds/definition'

// src/app/music/visualizer/definition.ts
// Shared contracts for discoverable visualizer modes.
export type VisualizerTuningKind = 'none' | 'classic' | 'cadenza' | 'partita' | 'fume' | 'claddagh' | 'tilt'

// `currentTime` is the single time source. Modes derive everything from it (useTransform /
// useMotionValueEvent) instead of writing React state every frame.
export interface VisualizerSharedProps {
	currentTime: MotionValue<number>
	currentLineIndex: number
	lines: Line[]
	theme: Theme
	subtitleTheme?: Theme
	isDaylight?: boolean
	audioPower: MotionValue<number>
	audioBands: AudioBands
	showText?: boolean
	songTitle?: string | null
	songArtist?: string | null
	songAlbum?: string | null
	coverUrl?: string | null
	seed?: string | number
	staticMode?: boolean
	backgroundStaticMode?: boolean
	visualizerOpacity?: number
	background?: VisualizerBackgroundConfig
	lyricsFontScale?: number
	subtitleFontScale?: number
	subtitleOverlayOpacity?: number
	subtitleOverlayBackground?: boolean
	subtitleUpcomingLyricsBlur?: boolean
	showHarmonySubtitle?: boolean
	harmonySubtitleBackground?: boolean
	isPlayerChromeHidden?: boolean
	hideTranslationSubtitle?: boolean
	showSubtitleTranslation?: boolean
	subtitleContentMode?: SubtitleContentMode
	paused?: boolean
	onBack?: () => void
	isPanelOpen?: boolean
	alwaysShowBackButton?: boolean
	onPlayerPanelGuideHotspotChange?: (isActive: boolean) => void
	onLyricLineSeek?: (lyricTimeSec: number) => void
	isPreviewMode?: boolean
	// Tuning reaches a mode two ways: the host may hand down a whole bundle, which
	// applyVisualizerTuning unpacks into the matching per-mode prop below, or a mode's entry
	// falls back to its DEFAULT_*_TUNING. The upstream onChange callbacks belonged to the
	// settings panels and are not part of this contract.
	visualizerTunings?: VisualizerTuningBundle
	classicTuning?: ClassicTuning
	cadenzaTuning?: CadenzaTuning
	partitaTuning?: PartitaTuning
	fumeTuning?: FumeTuning
	claddaghTuning?: CladdaghTuning
	tiltTuning?: TiltTuning
}

export interface VisualizerRegistryEntry {
	mode: VisualizerMode
	order: number
	/** Chinese display name shown wherever the host lists modes. */
	label: string
	previewSeed: string
	previewStartOffset: number
	tuningKind: VisualizerTuningKind
	/*
	 * 各模式的 entry.tsx 把真正的 renderer 包成 React.lazy —— registry 静态 import 每个 entry，
	 * 如果 entry 再静态 import renderer，任何碰 visualizer 的模块都会连带拉进全部 renderer。
	 * 契约不变：这里仍然是 props => ReactElement，lazy 组件照样满足。代价是调用方必须提供
	 * Suspense 边界（VisualizerRenderer 已经给了）。
	 */
	render: (props: VisualizerSharedProps) => React.ReactElement
	/*
	 * True when this mode's layout atoms come from whole-line word segmentation
	 * (lyrics/wordSegmentation), so a different split of a line changes what it draws.
	 * Grapheme-level modes leave it unset — a word split would not affect them.
	 */
	usesWordSegmentation?: boolean
}

export interface VisualizerEntryModule {
	default: VisualizerRegistryEntry
}

export const defineVisualizer = (entry: VisualizerRegistryEntry) => entry
