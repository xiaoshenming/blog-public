'use client'

import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { INIT_DELAY } from '@/consts'
import { useMarkdownRender } from '@/hooks/use-markdown-render'
import { useSize } from '@/hooks/use-size'
import { cn } from '@/lib/utils'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { BlogSidebar } from '@/components/blog-sidebar'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { useI18n } from '@/i18n/context'

type BlogPreviewProps = {
	markdown: string
	title: string
	tags: string[]
	date: string
	summary?: string
	cover?: string
	slug?: string
	proseRef?: React.RefObject<HTMLDivElement | null>
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；card 用共享 card.base） */
const styles = stylex.create({
	/** text-secondary flex h-full items-center justify-center text-sm */
	loading: {
		display: 'flex',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** mx-auto flex max-w-[1140px] justify-center gap-6 px-6 pt-28 pb-12 max-sm:px-0 */
	container: {
		marginInline: 'auto',
		display: 'flex',
		maxWidth: 1140,
		justifyContent: 'center',
		gap: 24,
		paddingInline: 24,
		paddingTop: 112,
		paddingBottom: 48,
		'@media (width < 40rem)': {
			paddingInline: 0
		}
	},
	/** card 之外的差异部分：bg-article static flex-1 overflow-auto rounded-xl p-8 */
	article: {
		position: 'static',
		flex: 1,
		overflow: 'auto',
		borderRadius: 12,
		padding: 32,
		backgroundColor: colors.article
	},
	/** text-center text-2xl font-semibold */
	title: {
		textAlign: 'center',
		fontSize: 24,
		lineHeight: '32px',
		fontWeight: 600
	},
	/** text-secondary mt-4 flex flex-wrap items-center justify-center gap-3 px-8 text-center text-sm */
	tags: {
		marginTop: 16,
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingInline: 32,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** text-secondary mt-3 text-center text-sm */
	date: {
		marginTop: 12,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** text-secondary mt-6 cursor-text text-center text-sm */
	summary: {
		marginTop: 24,
		cursor: 'text',
		textAlign: 'center',
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** mt-6 max-w-none cursor-text（prose 为 article.css 全局类，保留为 className） */
	proseBody: {
		marginTop: 24,
		maxWidth: 'none',
		cursor: 'text'
	}
})

export function BlogPreview({ markdown, title, tags, date, summary, cover, slug, proseRef }: BlogPreviewProps) {
	const { maxSM: isMobile } = useSize()
	const { content, toc, loading } = useMarkdownRender(markdown)
	const { siteContent } = useConfigStore()
	const { t } = useI18n()
	const summaryInContent = siteContent.summaryInContent ?? false
	const { className: proseClassName } = stylex.props(styles.proseBody)

	if (loading) {
		return <div {...stylex.props(styles.loading)}>{t('blog.rendering')}</div>
	}

	return (
		<div {...stylex.props(styles.container)}>
			<motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: INIT_DELAY }} {...stylex.props(card.base, styles.article)}>
				<div>
					<div {...stylex.props(styles.title)}>{title}</div>

					<div {...stylex.props(styles.tags)}>
						{tags.map(t => (
							<span key={t}>#{t}</span>
						))}
					</div>

					<div {...stylex.props(styles.date)}>{date}</div>

					{summary && summaryInContent && <div {...stylex.props(styles.summary)}>“{summary}”</div>}

					<div ref={proseRef} className={cn(proseClassName, 'prose')}>
						{content}
					</div>
				</div>
			</motion.article>

			{!isMobile && <BlogSidebar cover={cover} summary={summary} toc={toc} slug={slug} />}
		</div>
	)
}
