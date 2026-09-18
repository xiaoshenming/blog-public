'use client'

import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { INIT_DELAY } from '@/consts'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'

/** 原 animate-bounce（Tailwind v4 默认 keyframes）：bounce 1s infinite */
const bounce = stylex.keyframes({
	'0%': {
		transform: 'translateY(-25%)',
		animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
	},
	'50%': {
		transform: 'none',
		animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
	},
	'100%': {
		transform: 'translateY(-25%)',
		animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
	}
})

/** 原 Tailwind：flex flex-col items-center justify-center px-6 pt-32 pb-12 / w-full max-w-[600px] / card relative flex flex-col items-center gap-6 p-12 text-center / text-6xl / text-3xl font-bold / text-secondary text-lg leading-relaxed / mt-4 flex gap-2 / h-2 w-2 animate-bounce rounded-full bg-black/20 */
const styles = stylex.create({
	page: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		paddingInline: 24,
		paddingTop: 128,
		paddingBottom: 48
	},
	container: {
		width: '100%',
		maxWidth: 600
	},
	panel: {
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 24,
		padding: 48,
		textAlign: 'center'
	},
	emoji: {
		fontSize: 60,
		lineHeight: 1
	},
	title: {
		fontSize: 30,
		lineHeight: '36px',
		fontWeight: 700
	},
	desc: {
		fontSize: 18,
		lineHeight: 1.625,
		color: colors.secondary
	},
	dots: {
		display: 'flex',
		gap: 8,
		marginTop: 16
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 9999,
		backgroundColor: 'rgb(0 0 0 / 20%)',
		animationName: bounce,
		animationDuration: '1s',
		animationIterationCount: 'infinite'
	}
})

export default function WIP() {
	return (
		<div {...stylex.props(styles.page)}>
			<div {...stylex.props(styles.container)}>
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY }}
					{...stylex.props(card.base, styles.panel)}>
					<div {...stylex.props(styles.emoji)}>🚧</div>
					<h1 {...stylex.props(styles.title)}>开发中</h1>
					<p {...stylex.props(styles.desc)}>这个功能正在努力开发中，敬请期待！</p>
					<div {...stylex.props(styles.dots)}>
						<div {...stylex.props(styles.dot)} style={{ animationDelay: '0ms' }}></div>
						<div {...stylex.props(styles.dot)} style={{ animationDelay: '150ms' }}></div>
						<div {...stylex.props(styles.dot)} style={{ animationDelay: '300ms' }}></div>
					</div>
				</motion.div>
			</div>
		</div>
	)
}
