'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import TopSVG from '@/svgs/top.svg'
import { cn } from '@/lib/utils'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'

type ScrollTopButtonProps = {
	className?: string
	delay?: number
}

/** 原 Tailwind：card card-hover text-secondary static gap-2 rounded-full p-3 text-sm */
const styles = stylex.create({
	button: {
		position: 'static',
		gap: 8,
		padding: 12,
		borderRadius: 9999,
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	icon: {
		width: 28
	}
})

export function ScrollTopButton({ className, delay }: ScrollTopButtonProps) {
	const [show, setShow] = useState(false)
	const [active, setActive] = useState(false)
	useEffect(() => {
		setTimeout(() => setShow(true), delay || 1000)
	}, [delay])

	useEffect(() => {
		const handleScroll = () => {
			setActive(window.scrollY > 200)
		}
		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	if (!show || !active) return null

	const handleClick = useCallback(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' })
		setTimeout(() => setActive(false), 1000)
	}, [])

	const { className: sxClassName, style: sxStyle } = stylex.props(card.base, card.hover, styles.button)

	return (
		<motion.button
			initial={{ opacity: 0, scale: 0.4 }}
			animate={{ opacity: 1, scale: 1 }}
			onClick={handleClick}
			aria-label='Scroll to top'
			className={cn(sxClassName, className)}
			style={sxStyle}>
			<TopSVG {...stylex.props(styles.icon)} />
		</motion.button>
	)
}
