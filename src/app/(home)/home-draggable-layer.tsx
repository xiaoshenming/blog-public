'use client'

import { useRef, useCallback } from 'react'
import { useCenterStore } from '@/hooks/use-center'
import { useLayoutEditStore } from './stores/layout-edit-store'
import type { CardStyles } from './stores/config-store'
import DraggerSVG from '@/svgs/dragger.svg'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

type CardKey = keyof CardStyles

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 编辑遮罩：绝对定位、层级 40、虚线描边、品牌色淡染、可响应指针、拖拽光标、大圆角（坐标尺寸保留内联 style） */
	editOverlay: {
		position: 'absolute',
		zIndex: 40,
		pointerEvents: 'auto',
		cursor: 'move',
		borderRadius: 40,
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: 'color-mix(in oklab, var(--color-brand) 70%, transparent)',
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 5%, transparent)'
	},
	/** 遮罩内层：不响应指针、撑满容器 */
	overlayInner: {
		pointerEvents: 'none',
		width: '100%',
		height: '100%'
	},
	/** 缩放手柄：绝对定位右下、层级 50、右下各移 4、斜向缩放光标、悬停放大 */
	resizeHandle: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		zIndex: 50,
		translate: '4px 4px',
		cursor: 'nwse-resize',
		'@media (hover: hover)': {
			':hover': {
				scale: '1.1'
			}
		}
	},
	/** 拖拽图标：品牌色、20×20 */
	draggerIcon: {
		width: 20,
		height: 20,
		color: colors.brand
	}
})

interface HomeDraggableLayerProps {
	cardKey: CardKey
	x: number
	y: number
	width?: number
	height?: number
	children: React.ReactNode
}

interface DragState {
	dragging: boolean
	startX: number
	startY: number
	initialOffsetX: number
	initialOffsetY: number
}

interface ResizeState {
	resizing: boolean
	startX: number
	startY: number
	initialWidth: number
	initialHeight: number
}

export function HomeDraggableLayer({ cardKey, x, y, width, height, children }: HomeDraggableLayerProps) {
	const editing = useLayoutEditStore(state => state.editing)
	const setOffset = useLayoutEditStore(state => state.setOffset)
	const setSize = useLayoutEditStore(state => state.setSize)
	const center = useCenterStore()
	const dragStateRef = useRef<DragState>({
		dragging: false,
		startX: 0,
		startY: 0,
		initialOffsetX: 0,
		initialOffsetY: 0
	})
	const resizeStateRef = useRef<ResizeState>({
		resizing: false,
		startX: 0,
		startY: 0,
		initialWidth: 0,
		initialHeight: 0
	})

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			const state = dragStateRef.current
			if (!state.dragging) return

			const dx = event.clientX - state.startX
			const dy = event.clientY - state.startY

			const nextOffsetX = Math.round(state.initialOffsetX + dx)
			const nextOffsetY = Math.round(state.initialOffsetY + dy)

			setOffset(cardKey, nextOffsetX, nextOffsetY)
		},
		[cardKey, setOffset]
	)

	const handleTouchMove = useCallback(
		(event: TouchEvent) => {
			const touch = event.touches[0]
			if (!touch) return

			const state = dragStateRef.current
			if (!state.dragging) return

			const dx = touch.clientX - state.startX
			const dy = touch.clientY - state.startY

			const nextOffsetX = Math.round(state.initialOffsetX + dx)
			const nextOffsetY = Math.round(state.initialOffsetY + dy)

			setOffset(cardKey, nextOffsetX, nextOffsetY)
		},
		[cardKey, setOffset]
	)

	const handleEnd = useCallback(() => {
		dragStateRef.current.dragging = false
		window.removeEventListener('mousemove', handleMouseMove)
		window.removeEventListener('mouseup', handleEnd)
		window.removeEventListener('touchmove', handleTouchMove)
		window.removeEventListener('touchend', handleEnd)
		window.removeEventListener('touchcancel', handleEnd)
	}, [handleMouseMove, handleTouchMove])

	const handleResizeMouseMove = useCallback(
		(event: MouseEvent) => {
			const state = resizeStateRef.current
			if (!state.resizing) return

			const dx = event.clientX - state.startX
			const dy = event.clientY - state.startY

			const nextWidth = Math.max(50, Math.round(state.initialWidth + dx))
			const nextHeight = Math.max(50, Math.round(state.initialHeight + dy))

			setSize(cardKey, nextWidth, nextHeight)
		},
		[cardKey, setSize]
	)

	const handleResizeTouchMove = useCallback(
		(event: TouchEvent) => {
			const touch = event.touches[0]
			if (!touch) return

			const state = resizeStateRef.current
			if (!state.resizing) return

			const dx = touch.clientX - state.startX
			const dy = touch.clientY - state.startY

			const nextWidth = Math.max(50, Math.round(state.initialWidth + dx))
			const nextHeight = Math.max(50, Math.round(state.initialHeight + dy))

			setSize(cardKey, nextWidth, nextHeight)
		},
		[cardKey, setSize]
	)

	const handleResizeEnd = useCallback(() => {
		resizeStateRef.current.resizing = false
		window.removeEventListener('mousemove', handleResizeMouseMove)
		window.removeEventListener('mouseup', handleResizeEnd)
		window.removeEventListener('touchmove', handleResizeTouchMove)
		window.removeEventListener('touchend', handleResizeEnd)
		window.removeEventListener('touchcancel', handleResizeEnd)
	}, [handleResizeMouseMove, handleResizeTouchMove])

	const startResize = useCallback(
		(clientX: number, clientY: number) => {
			if (!editing || width === undefined || height === undefined) return

			resizeStateRef.current = {
				resizing: true,
				startX: clientX,
				startY: clientY,
				initialWidth: width,
				initialHeight: height
			}

			window.addEventListener('mousemove', handleResizeMouseMove)
			window.addEventListener('mouseup', handleResizeEnd)
			window.addEventListener('touchmove', handleResizeTouchMove)
			window.addEventListener('touchend', handleResizeEnd)
			window.addEventListener('touchcancel', handleResizeEnd)
		},
		[editing, width, height, handleResizeMouseMove, handleResizeEnd, handleResizeTouchMove]
	)

	const handleResizeMouseDown: React.MouseEventHandler<HTMLDivElement> = event => {
		event.preventDefault()
		event.stopPropagation()
		startResize(event.clientX, event.clientY)
	}

	const handleResizeTouchStart: React.TouchEventHandler<HTMLDivElement> = event => {
		const touch = event.touches[0]
		if (!touch) return
		event.preventDefault()
		event.stopPropagation()
		startResize(touch.clientX, touch.clientY)
	}

	const startDrag = useCallback(
		(clientX: number, clientY: number) => {
			if (!editing) return

			const initialOffsetX = x - center.x
			const initialOffsetY = y - center.y

			dragStateRef.current = {
				dragging: true,
				startX: clientX,
				startY: clientY,
				initialOffsetX,
				initialOffsetY
			}

			window.addEventListener('mousemove', handleMouseMove)
			window.addEventListener('mouseup', handleEnd)
			window.addEventListener('touchmove', handleTouchMove)
			window.addEventListener('touchend', handleEnd)
			window.addEventListener('touchcancel', handleEnd)
		},
		[editing, x, y, center.x, center.y, handleMouseMove, handleEnd, handleTouchMove]
	)

	const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = event => {
		event.preventDefault()
		startDrag(event.clientX, event.clientY)
	}

	const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = event => {
		const touch = event.touches[0]
		if (!touch) return
		startDrag(touch.clientX, touch.clientY)
	}

	const canResize = editing && width !== undefined && height !== undefined

	return (
		<>
			{editing && (
				<div
					{...stylex.props(sx.editOverlay)}
					style={{ left: x, top: y, width, height }}
					onMouseDown={handleMouseDown}
					onTouchStart={handleTouchStart}>
					<div {...stylex.props(sx.overlayInner)} />
					{canResize && (
						<div
							{...stylex.props(sx.resizeHandle)}
							onMouseDown={handleResizeMouseDown}
							onTouchStart={handleResizeTouchStart}>
							<DraggerSVG {...stylex.props(sx.draggerIcon)} />
						</div>
					)}
				</div>
			)}
			{children}
		</>
	)
}
