'use client'

import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'
import { cn } from '@/lib/utils'
import { colors } from '@/styles/tokens.stylex'
import LikeButton from '@/components/like-button'
import { BlogToc } from '@/components/blog-toc'
import { ScrollTopButton } from '@/components/scroll-top-button'
import { useConfigStore } from '@/app/(home)/stores/config-store'

type TocItem = {
	id: string
	text: string
	level: number
}

type BlogSidebarProps = {
	cover?: string
	summary?: string
	toc: TocItem[]
	slug?: string
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** sticky flex w-[200px] shrink-0 flex-col items-start gap-4 self-start max-sm:hidden（top 保持内联） */
	aside: {
		position: 'sticky',
		display: 'flex',
		width: 200,
		flexShrink: 0,
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: 16,
		alignSelf: 'flex-start',
		'@media (width < 40rem)': {
			display: 'none'
		}
	},
	/** bg-card w-full rounded-xl border p-3 */
	coverBox: {
		width: '100%',
		backgroundColor: colors.card,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: 12,
		padding: 12
	},
	/** h-auto w-full rounded-xl border object-cover */
	coverImg: {
		height: 'auto',
		width: '100%',
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: 12,
		objectFit: 'cover'
	},
	/** bg-card w-full rounded-xl border p-3 text-sm */
	summaryBox: {
		width: '100%',
		backgroundColor: colors.card,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: 12,
		padding: 12,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** text-secondary mb-2 font-medium */
	summaryTitle: {
		marginBottom: 8,
		fontWeight: 500,
		color: colors.secondary
	},
	/** text-secondary scrollbar-none max-h-[240px] cursor-text overflow-auto（scrollbar-none 保留全局类） */
	summaryBody: {
		maxHeight: 240,
		cursor: 'text',
		overflow: 'auto',
		color: colors.secondary
	}
})

export function BlogSidebar({ cover, summary, toc, slug }: BlogSidebarProps) {
	const { siteContent } = useConfigStore()
	const summaryInContent = siteContent.summaryInContent ?? false
	const { className: asideClassName, style: asideStyle } = stylex.props(styles.aside)
	const { className: summaryBodyClassName } = stylex.props(styles.summaryBody)

	return (
		<div className={asideClassName} style={{ top: 24, ...asideStyle }}>
			{cover && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY + ANIMATION_DELAY * 1 }}
					{...stylex.props(styles.coverBox)}>
					<img src={cover} alt='cover' {...stylex.props(styles.coverImg)} />
				</motion.div>
			)}

			{summary && !summaryInContent && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: INIT_DELAY + ANIMATION_DELAY * 2 }}
					{...stylex.props(styles.summaryBox)}>
					<h2 {...stylex.props(styles.summaryTitle)}>摘要</h2>
					<div className={cn(summaryBodyClassName, 'scrollbar-none')}>{summary}</div>
				</motion.div>
			)}

			<BlogToc toc={toc} delay={INIT_DELAY + ANIMATION_DELAY * 3} />

			<LikeButton slug={slug} delay={(INIT_DELAY + ANIMATION_DELAY * 4) * 1000} />

			<ScrollTopButton delay={INIT_DELAY + ANIMATION_DELAY * 5} />
		</div>
	)
}
