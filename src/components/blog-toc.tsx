'use client'

import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

type TocItem = {
	id: string
	text: string
	level: number
}

type BlogTocProps = {
	toc: TocItem[]
	delay?: number
}

/** 原 Tailwind：bg-card w-full rounded-xl border p-3 text-sm
    标题：text-secondary mb-2 font-medium
    列表：relative max-h-[300px] space-y-2 overflow-auto
    链接：hover:text-brand relative block pl-3 transition-colors（激活态 text-brand，动态 paddingLeft 保留内联） */
const styles = stylex.create({
	box: {
		backgroundColor: colors.card,
		width: '100%',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		padding: 12,
		fontSize: 14,
		lineHeight: '20px'
	},
	title: {
		color: colors.secondary,
		marginBottom: 8,
		fontWeight: 500
	},
	/** space-y-2 的等效：flex 列 + gap 8（StyleX 不支持选中子元素的 > :not(:last-child) 选择器） */
	list: {
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		gap: 8,
		maxHeight: 300,
		overflow: 'auto'
	},
	empty: {
		color: colors.secondary
	},
	link: {
		position: 'relative',
		display: 'block',
		paddingLeft: 12,
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand
			}
		}
	},
	linkActive: {
		color: colors.brand
	}
})

export function BlogToc({ toc, delay = 0 }: BlogTocProps) {
	const { t } = useI18n()
	const [activeIds, setActiveIds] = useState<Set<string>>(new Set())
	const minActiveId = useMemo(() => {
		return Array.from(activeIds).sort((a, b) => toc.findIndex(item => item.id === a) - toc.findIndex(item => item.id === b))[0]
	}, [activeIds, toc])

	useEffect(() => {
		if (toc.length === 0) return

		const observers = new Map<string, IntersectionObserver>()

		// Create observers for each heading
		toc.forEach(item => {
			const element = document.getElementById(item.id)
			if (!element) return

			const observer = new IntersectionObserver(
				entries => {
					entries.forEach(entry => {
						setActiveIds(prev => {
							const newSet = new Set(prev)
							if (entry.isIntersecting) newSet.add(entry.target.id)
							else newSet.delete(entry.target.id)

							return newSet
						})
					})
				},
				{
					rootMargin: '-100px 0px -100px 0px',
					threshold: 0
				}
			)

			observer.observe(element)
			observers.set(item.id, observer)
		})

		return () => {
			observers.forEach(observer => observer.disconnect())
		}
	}, [toc])

	return (
		<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} {...stylex.props(styles.box)}>
			<h2 {...stylex.props(styles.title)}>{t('blog.tableOfContents')}</h2>
			<div {...stylex.props(styles.list)}>
				{toc.length === 0 && <div {...stylex.props(styles.empty)}>{t('blog.tocEmpty')}</div>}
				{toc.map(item => (
					<a
						key={item.id + item.level}
						href={`#${item.id}`}
						{...stylex.props(styles.link, item.id === minActiveId && styles.linkActive)}
						style={{ paddingLeft: (item.level - 1) * 8 }}>
						{item.text}
					</a>
				))}
			</div>
		</motion.div>
	)
}
