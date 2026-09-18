'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import * as stylex from '@stylexjs/stylex'
import { ColorPickerPanel } from './color-picker-panel'

interface ColorPickerProps {
	value?: string
	onChange?: (color: string) => void
	className?: string
}

/** 触发色块：40×40、8 圆角、2px 半透明白边、小阴影、悬停微微放大；色值由内联样式动态提供 */
const styles = stylex.create({
	trigger: {
		width: 40,
		height: 40,
		borderRadius: 8,
		borderWidth: 2,
		borderStyle: 'solid',
		borderColor: 'rgb(255 255 255 / 20%)',
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)',
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				scale: '1.05'
			}
		}
	},
	/** 无障碍隐藏文本：视觉隐藏但保留读屏语义 */
	srOnly: {
		position: 'absolute',
		width: 1,
		height: 1,
		margin: -1,
		padding: 0,
		overflow: 'hidden',
		whiteSpace: 'nowrap',
		borderWidth: 0,
		clipPath: 'inset(50%)'
	}
})

export function ColorPicker({ value = '#000000', onChange, className }: ColorPickerProps) {
	const [open, setOpen] = useState(false)
	const [mounted, setMounted] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const [position, setPosition] = useState({ top: 0, left: 0 })

	useEffect(() => {
		setMounted(true)
	}, [])

	// Calculate position when opening
	useEffect(() => {
		if (open && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect()
			setPosition({
				top: rect.top - 240,
				left: rect.left
			})
		}
	}, [open])

	// Close on outside click
	useEffect(() => {
		if (!open) return

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node
			if (triggerRef.current && !triggerRef.current.contains(target)) {
				const panel = document.querySelector('[data-color-picker-panel]')
				if (panel && !panel.contains(target)) {
					setOpen(false)
				}
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [open])

	const { className: sx } = stylex.props(styles.trigger)

	return (
		<>
			<button
				ref={triggerRef}
				type='button'
				onClick={() => setOpen(!open)}
				className={cn(sx, className)}
				style={{ backgroundColor: value }}>
				<span {...stylex.props(styles.srOnly)}>Select color</span>
			</button>

			{mounted &&
				open &&
				position.top > 0 &&
				createPortal(
					<ColorPickerPanel
						value={value}
						onChange={onChange}
						style={{
							position: 'fixed',
							top: `${position.top}px`,
							left: `${position.left}px`,
							zIndex: 1000
						}}
					/>,
					document.body
				)}
		</>
	)
}
