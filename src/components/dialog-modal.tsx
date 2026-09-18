'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { cn } from '@/lib/utils'
import { colors } from '@/styles/tokens.stylex'

interface DialogModalProps {
	open: boolean
	onClose: () => void
	children: ReactNode
	className?: string
	overlayClassName?: string
	disableCloseOnOverlay?: boolean
	lockScroll?: boolean
	closeOnEsc?: boolean
}

/** 原 Tailwind（遮罩）：fixed inset-0 z-50 flex items-center justify-center bg-card p-4 backdrop-blur-xl */
const styles = stylex.create({
	overlay: {
		position: 'fixed',
		inset: 0,
		zIndex: 50,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.card,
		padding: 16,
		backdropFilter: 'blur(24px)'
	}
})

export function DialogModal({ open, onClose, children, className, disableCloseOnOverlay = false, lockScroll = true, closeOnEsc = true }: DialogModalProps) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		if (!lockScroll || !open) return
		const previous = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = previous
		}
	}, [lockScroll, open])

	useEffect(() => {
		if (!closeOnEsc || !open) return
		const handler = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose()
			}
		}
		window.addEventListener('keydown', handler)
		return () => {
			window.removeEventListener('keydown', handler)
		}
	}, [closeOnEsc, onClose, open])

	if (!mounted) return null

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className={stylex.props(styles.overlay).className}
					onClick={disableCloseOnOverlay ? undefined : onClose}>
					{/* 'static' 保留为 className 字符串：需压制调用方传入的 card（absolute）；utilities 层序高于 StyleX 原子层，迁为原子类会反转覆盖方向 */}
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8, y: 20 }}
						className={cn('static', className)}
						onClick={e => e.stopPropagation()}>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	)
}
