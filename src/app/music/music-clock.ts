'use client'

import { motionValue } from 'motion/react'
import type { AudioBands } from './visualizer/types'

/**
 * 沉浸歌词的唯一时间源。动效模式只从这个 MotionValue 派生，
 * 所以这里用 rAF 逐帧同步 audio.currentTime，而不是靠 4Hz 左右的 timeupdate。
 */
export const playbackTime = motionValue(0)

/** 没有接 AnalyserNode（跨域音源拿不到频谱），音频响应保持静默，动效仍由时间驱动 */
export const audioPower = motionValue(0)
export const audioBands: AudioBands = {
	bass: motionValue(0),
	lowMid: motionValue(0),
	mid: motionValue(0),
	vocal: motionValue(0),
	treble: motionValue(0)
}

let frame: number | null = null

export function syncPlaybackClock(audio: HTMLAudioElement) {
	playbackTime.set(audio.currentTime)
}

export function startPlaybackClock(audio: HTMLAudioElement) {
	stopPlaybackClock()
	const tick = () => {
		playbackTime.set(audio.currentTime)
		frame = requestAnimationFrame(tick)
	}
	frame = requestAnimationFrame(tick)
}

export function stopPlaybackClock() {
	if (frame === null) return
	cancelAnimationFrame(frame)
	frame = null
}
