'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

interface SelectOption {
	value: string
	label: ReactNode
}

interface SelectProps {
	value: string
	onChange: (value: string) => void
	options: SelectOption[]
	className?: string
	disabled?: boolean
}

/** 原 Tailwind（trigger）：bg-card relative flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all
    active:scale-[0.98] / focus:ring-brand/20 focus:ring-2 focus:outline-none；dropdown：bg-card/95 fixed z-50 rounded-xl border backdrop-blur-xl
    option：w-full rounded-lg px-3 py-2 text-left text-xs transition-all active:scale-[0.98] / isSelected ? bg-brand/10 text-brand font-medium : hover:bg-gray-100/50 */
const styles = stylex.create({
	trigger: {
		position: 'relative',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: colors.card,
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 12,
		lineHeight: '16px',
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		':active': {
			scale: '0.98'
		},
		':focus': {
			outlineStyle: 'none',
			boxShadow: '0 0 0 2px color-mix(in oklab, var(--color-brand) 20%, transparent)'
		}
	},
	triggerDisabled: {
		cursor: 'not-allowed',
		opacity: 0.5
	},
	triggerHoverable: {
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, var(--color-card) 80%, transparent)'
			}
		}
	},
	label: {
		flex: '1',
		textAlign: 'left'
	},
	icon: {
		height: 14,
		width: 14,
		transitionProperty: 'transform, translate, scale, rotate',
		transitionDuration: '200ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	iconOpen: {
		rotate: '180deg'
	},
	dropdown: {
		position: 'fixed',
		zIndex: 50,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, var(--color-card) 95%, transparent)',
		backdropFilter: 'blur(24px)'
	},
	list: {
		maxHeight: 256,
		overflowY: 'auto',
		padding: 6
	},
	option: {
		width: '100%',
		borderRadius: 8,
		paddingInline: 12,
		paddingBlock: 8,
		textAlign: 'left',
		fontSize: 12,
		lineHeight: '16px',
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		':active': {
			scale: '0.98'
		}
	},
	optionSelected: {
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)',
		color: colors.brand,
		fontWeight: 500
	},
	/** 原 hover:bg-gray-100/50；dark:hover:bg-gray-800/50 为残留（项目无暗色模式），已删除 */
	optionHover: {
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, #f3f4f6 50%, transparent)'
			}
		}
	}
})

export function Select({ value, onChange, options, className, disabled }: SelectProps) {
	const [open, setOpen] = useState(false)
	const [mounted, setMounted] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

	const selectedOption = options.find(opt => opt.value === value) || options[0]

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		if (open && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect()
			setPosition({
				top: rect.bottom + 8,
				left: rect.left,
				width: rect.width
			})
		}
	}, [open])

	useEffect(() => {
		if (!open) return

		const updatePosition = () => {
			if (triggerRef.current) {
				const rect = triggerRef.current.getBoundingClientRect()
				setPosition({
					top: rect.bottom + 8,
					left: rect.left,
					width: rect.width
				})
			}
		}

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node
			if (triggerRef.current && !triggerRef.current.contains(target) && dropdownRef.current && !dropdownRef.current.contains(target)) {
				setOpen(false)
			}
		}

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setOpen(false)
			}
		}

		const handleScroll = () => {
			updatePosition()
		}

		const handleResize = () => {
			updatePosition()
		}

		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleEscape)
		window.addEventListener('scroll', handleScroll, true)
		window.addEventListener('resize', handleResize)

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleEscape)
			window.removeEventListener('scroll', handleScroll, true)
			window.removeEventListener('resize', handleResize)
		}
	}, [open])

	const handleSelect = (optionValue: string) => {
		onChange(optionValue)
		setOpen(false)
	}

	const { className: sx, style } = stylex.props(styles.trigger, disabled && styles.triggerDisabled, !disabled && styles.triggerHoverable)

	return (
		<>
			<button
				ref={triggerRef}
				type='button'
				onClick={() => !disabled && setOpen(!open)}
				disabled={disabled}
				className={cn(sx, className)}
				style={style}>
				<span className={stylex.props(styles.label).className}>{selectedOption?.label}</span>
				<svg
					className={stylex.props(styles.icon, open && styles.iconOpen).className}
					fill='none'
					viewBox='0 0 24 24'
					stroke='currentColor'
					strokeWidth={2}>
					<path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
				</svg>
			</button>

			{mounted &&
				createPortal(
					<AnimatePresence>
						{open && (
							<motion.div
								ref={dropdownRef}
								initial={{ opacity: 0, y: -8, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -8, scale: 0.95 }}
								transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
								className={stylex.props(styles.dropdown).className}
								style={{
									top: `${position.top}px`,
									left: `${position.left}px`,
									width: `${position.width}px`,
									boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
								}}>
								<div className={cn('scrollbar-none', stylex.props(styles.list).className)}>
									{options.map(option => {
										const isSelected = option.value === value
										return (
											<button
												key={option.value}
												type='button'
												onClick={() => handleSelect(option.value)}
												className={stylex.props(styles.option, isSelected ? styles.optionSelected : styles.optionHover).className}>
												{option.label}
											</button>
										)
									})}
								</div>
							</motion.div>
						)}
					</AnimatePresence>,
					document.body
				)}
		</>
	)
}
