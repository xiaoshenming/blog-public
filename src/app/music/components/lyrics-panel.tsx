'use client'

import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import * as stylex from '@stylexjs/stylex'
import { useMusicStore } from '../music-store'
import { cn } from '@/lib/utils'
import { colors } from '@/styles/tokens.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 歌词滚动区：居中列，行距由弹性间隔承担（scrollbar-none 保留全局类） */
	root: {
		display: 'flex',
		flexDirection: 'column',
		gap: 16,
		height: 288,
		overflowY: 'auto',
		paddingInline: 16,
		paddingBlock: 112,
		textAlign: 'center'
	},
	/** 歌词行：全属性过渡，激活时放大加粗 */
	line: {
		transitionProperty: 'all',
		transitionDuration: '300ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 当前行 */
	lineActive: {
		color: colors.brand,
		scale: '1.05',
		fontWeight: 600
	},
	/** 其他行 */
	lineIdle: {
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px',
		opacity: 0.6
	},
	/** 无歌词提示 */
	empty: {
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px'
	}
})

export default function LyricsPanel() {
	const containerRef = useRef<HTMLDivElement>(null)
	const { lyrics, activeIndex } = useMusicStore(useShallow(s => ({ lyrics: s.lyrics, activeIndex: s.activeLyricIndex })))

	useEffect(() => {
		if (activeIndex < 0) return
		containerRef.current?.querySelector(`[data-lyric-index="${activeIndex}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
	}, [activeIndex])

	const { className: rootClassName } = stylex.props(styles.root)

	return (
		<div ref={containerRef} className={cn(rootClassName, 'scrollbar-none')}>
			{lyrics.length ? (
				lyrics.map((line, index) => (
					<p
						key={`${line.time}-${index}`}
						data-lyric-index={index}
						{...stylex.props(styles.line, index === activeIndex ? styles.lineActive : styles.lineIdle)}>
						{line.text}
					</p>
				))
			) : (
				<p {...stylex.props(styles.empty)}>这首歌暂时没有歌词</p>
			)}
		</div>
	)
}
