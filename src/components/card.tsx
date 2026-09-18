'use client'

import { ANIMATION_DELAY } from '@/consts'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { useSize } from '@/hooks/use-size'

interface Props {
	className?: string
	order: number
	width: number
	height?: number
	x: number
	y: number
	children: React.ReactNode
}

export default function Card({ children, order, width, height, x, y, className }: Props) {
	const { maxSM, init } = useSize()
	const [show, setShow] = useState(false)
	const hasAnimated = useRef(false)
	if (maxSM && init) order = 0

	useEffect(() => {
		if (hasAnimated.current) return
		if (x === 0 && y === 0) return
		const timer = setTimeout(() => {
			hasAnimated.current = true
			setShow(true)
		}, order * ANIMATION_DELAY * 1000)
		return () => clearTimeout(timer)
	}, [x, y, order])

	if (show)
		return (
			<motion.div
				className={cn('card squircle card-hover', className)}
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				style={{ left: x, top: y, width, height }}>
				{children}
			</motion.div>
		)

	return null
}
