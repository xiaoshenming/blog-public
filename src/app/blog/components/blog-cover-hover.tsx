'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

const COVER_HOVER_DELAY_MS = 1500
const PREVIEW_OFFSET_PX = 16

/** 悬停预览卡样式（数值取自 Tailwind v4 编译产物；left/top 仍由内联 style 动态提供） */
const styles = stylex.create({
	/** 预览卡：固定定位、毛玻璃底、软阴影 */
	preview: {
		position: 'fixed',
		zIndex: 100,
		pointerEvents: 'none',
		width: 160,
		minHeight: 80,
		overflow: 'hidden',
		borderRadius: 24,
		padding: 16,
		backgroundColor: colors.card,
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)',
		backdropFilter: 'blur(8px)'
	},
	/** 预览图 */
	image: {
		width: '100%',
		borderRadius: 12,
		objectFit: 'cover'
	}
})

export type BlogCoverPreviewState = { src: string } | null

export function useBlogCoverHover(editMode: boolean) {
	const [hoverCoverPreview, setHoverCoverPreview] = useState<BlogCoverPreviewState>(null)
	const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
	const coverHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const clearCoverHoverSchedule = useCallback(() => {
		if (coverHoverTimerRef.current !== null) {
			clearTimeout(coverHoverTimerRef.current)
			coverHoverTimerRef.current = null
		}
	}, [])

	const cancelCoverPreview = useCallback(() => {
		clearCoverHoverSchedule()
		setHoverCoverPreview(null)
	}, [clearCoverHoverSchedule])

	useEffect(() => () => clearCoverHoverSchedule(), [clearCoverHoverSchedule])

	useEffect(() => {
		if (editMode) cancelCoverPreview()
	}, [editMode, cancelCoverPreview])

	useEffect(() => {
		let rafId = 0
		const latest = { x: 0, y: 0 }
		const flush = () => {
			rafId = 0
			setMousePosition({ x: latest.x, y: latest.y })
		}
		const handleMouseMove = (event: MouseEvent) => {
			latest.x = event.clientX
			latest.y = event.clientY
			if (rafId === 0) rafId = requestAnimationFrame(flush)
		}
		window.addEventListener('mousemove', handleMouseMove, { passive: true })
		return () => {
			window.removeEventListener('mousemove', handleMouseMove)
			if (rafId !== 0) cancelAnimationFrame(rafId)
		}
	}, [])

	const onCoverLinkMouseEnter = useCallback(
		(cover?: string) => {
			if (editMode || !cover) return
			clearCoverHoverSchedule()
			coverHoverTimerRef.current = setTimeout(() => {
				coverHoverTimerRef.current = null
				setHoverCoverPreview({ src: cover })
			}, COVER_HOVER_DELAY_MS)
		},
		[editMode, clearCoverHoverSchedule]
	)

	return { cancelCoverPreview, onCoverLinkMouseEnter, hoverCoverPreview, mousePosition }
}

type BlogCoverHoverPreviewProps = {
	preview: BlogCoverPreviewState
	position: { x: number; y: number } | null
}

export function BlogCoverHoverPreview({ preview, position }: BlogCoverHoverPreviewProps) {
	return (
		<AnimatePresence>
			{preview && position && (
				<motion.div
					key={preview.src}
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.6 }}
					{...stylex.props(styles.preview)}
					style={{ left: position.x + PREVIEW_OFFSET_PX, top: position.y + PREVIEW_OFFSET_PX }}>
					<img src={preview.src} alt='' {...stylex.props(styles.image)} draggable={false} />
				</motion.div>
			)}
		</AnimatePresence>
	)
}
