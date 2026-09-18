'use client'

import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMusicStore } from '../music-store'

export default function LyricsPanel() {
	const containerRef = useRef<HTMLDivElement>(null)
	const { lyrics, activeIndex } = useMusicStore(useShallow(s => ({ lyrics: s.lyrics, activeIndex: s.activeLyricIndex })))

	useEffect(() => {
		if (activeIndex < 0) return
		containerRef.current?.querySelector(`[data-lyric-index="${activeIndex}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
	}, [activeIndex])

	return (
		<div ref={containerRef} className='scrollbar-none h-72 space-y-4 overflow-y-auto px-4 py-28 text-center'>
			{lyrics.length ? (
				lyrics.map((line, index) => (
					<p
						key={`${line.time}-${index}`}
						data-lyric-index={index}
						className={`transition-all duration-300 ${index === activeIndex ? 'text-brand scale-105 font-semibold' : 'text-secondary text-sm opacity-60'}`}>
						{line.text}
					</p>
				))
			) : (
				<p className='text-secondary text-sm'>这首歌暂时没有歌词</p>
			)}
		</div>
	)
}
