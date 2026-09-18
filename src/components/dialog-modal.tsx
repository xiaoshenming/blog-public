'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { cn } from '@/lib/utils'
import { colors } from '@/styles/tokens.stylex'
import type { StyleXProp } from '@/styles/shared/types'

interface DialogModalProps {
	open: boolean
	onClose: () => void
	children: ReactNode
	className?: string
	/** 内容层样式（同一次 stylex.props() 合并，后写覆盖）——调用方优先使用 */
	style?: StyleXProp
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
	},
	/** 内容层：position static（压制 card.base 的 absolute） */
	contentStatic: {
		position: 'static'
	}
})

export function DialogModal({ open, onClose, children, className, style, disableCloseOnOverlay = false, lockScroll = true, closeOnEsc = true }: DialogModalProps) {
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

	// 注意顺序：contentStatic 恒在最后 → position:static 永远压制调用方 card.base 的 absolute
	// （还原旧 'static' 字符串的覆盖语义；实测见 pictures/upload-dialog 报告）
	const { className: contentSx } = stylex.props(style, styles.contentStatic)

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className={stylex.props(styles.overlay).className}
					onClick={disableCloseOnOverlay ? undefined : onClose}>
					{/* 内容层：static 基础样式 + 调用方 style 合并（后写覆盖）；className 保留兼容 */}
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8, y: 20 }}
						className={cn(contentSx, className)}
						onClick={e => e.stopPropagation()}>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	)
}
