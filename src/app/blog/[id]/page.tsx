'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { BlogPreview } from '@/components/blog-preview'
import { loadBlog, type BlogConfig } from '@/lib/load-blog'
import { useReadArticles } from '@/hooks/use-read-articles'
import LiquidGrass from '@/components/liquid-grass'
import PretextDemo, { type PretextDemoHandle } from '@/components/pretext-demo'
import DragonEscape from '@/components/pretext-demo/dragon-escape'
import type { Creature } from '@/components/pretext-demo/creature'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import '@/styles/dragon-burn.css'

/** 状态提示 / 游戏化容器 / 编辑按钮样式（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 居中状态提示（次要色） */
	stateBox: {
		display: 'flex',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 错误提示色（red-500 固化为实测值） */
	stateError: {
		color: '#fb2c36'
	},
	/** 游戏化组件外层容器（移动端收窄左右内边距） */
	pretextWrap: {
		marginInline: 'auto',
		maxWidth: 1140,
		paddingInline: 24,
		paddingTop: 112,
		'@media (width < 40rem)': {
			paddingInline: 8
		}
	},
	/** 编辑按钮（半透明白底、悬停加深；原 transition-colors 压过 card-hover 的 transform 过渡，故后写覆盖保持原计算值） */
	editButton: {
		position: 'absolute',
		top: 16,
		right: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		backdropFilter: 'blur(8px)',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		},
		'@media (width < 40rem)': {
			display: 'none'
		}
	}
})

export default function Page() {
	const params = useParams() as { id?: string | string[] }
	const slug = Array.isArray(params?.id) ? params.id[0] : params?.id || ''
	const router = useRouter()
	const { markAsRead } = useReadArticles()
	const pretextRef = useRef<PretextDemoHandle>(null)
	const proseRef = useRef<HTMLDivElement>(null)
	const [escapedDragon, setEscapedDragon] = useState<{ dragon: Creature; rect: DOMRect } | null>(null)
	const [dragonCaptured, setDragonCaptured] = useState(false)

	const isPretext = slug === 'pretext-text-layout-magic'

	// 5 minute timer to trigger dragon escape (change to 5000 for dev testing)
	const ESCAPE_DELAY = 5000
	useEffect(() => {
		if (!isPretext) return
		const timer = setTimeout(() => {
			pretextRef.current?.triggerEscape()
		}, ESCAPE_DELAY)
		return () => clearTimeout(timer)
	}, [isPretext])

	const handleEscape = useCallback((dragon: Creature, canvasRect: DOMRect) => {
		setEscapedDragon({ dragon, rect: canvasRect })
	}, [])

	const handleCaptured = useCallback(() => {
		setEscapedDragon(null)
		setDragonCaptured(true)
	}, [])

	const [blog, setBlog] = useState<{ config: BlogConfig; markdown: string; cover?: string } | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState<boolean>(true)

	useEffect(() => {
		let cancelled = false
		async function run() {
			if (!slug) return
			try {
				setLoading(true)
				const blogData = await loadBlog(slug)

				if (!cancelled) {
					setBlog(blogData)
					setError(null)
					markAsRead(slug)
				}
			} catch (e: any) {
				if (!cancelled) setError(e?.message || '加载失败')
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		run()
		return () => {
			cancelled = true
		}
	}, [slug, markAsRead])

	const title = useMemo(() => (blog?.config.title ? blog.config.title : slug), [blog?.config.title, slug])
	const date = useMemo(() => dayjs(blog?.config.date).format('YYYY年 M月 D日'), [blog?.config.date])
	const tags = blog?.config.tags || []

	const handleEdit = () => {
		router.push(`/write/${slug}`)
	}

	if (!slug) {
		return <div {...stylex.props(styles.stateBox)}>无效的链接</div>
	}

	if (loading) {
		return <div {...stylex.props(styles.stateBox)}>加载中...</div>
	}

	if (error) {
		return <div {...stylex.props(styles.stateBox, styles.stateError)}>{error}</div>
	}

	if (!blog) {
		return <div {...stylex.props(styles.stateBox)}>文章不存在</div>
	}

	return (
		<>
			{isPretext && (
				<div {...stylex.props(styles.pretextWrap)}>
					<PretextDemo ref={pretextRef} onEscape={handleEscape} captured={dragonCaptured} />
				</div>
			)}

			<BlogPreview
				markdown={blog.markdown}
				title={title}
				tags={tags}
				date={date}
				summary={blog.config.summary}
				cover={blog.cover ? (blog.cover.startsWith('http') ? blog.cover : `${origin}${blog.cover}`) : undefined}
				slug={slug}
				proseRef={isPretext ? proseRef : undefined}
			/>

			<motion.button
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				onClick={handleEdit}
				{...stylex.props(card.hover, styles.editButton)}>
				编辑
			</motion.button>

			{slug === 'liquid-grass' && <LiquidGrass />}

			{escapedDragon && (
				<DragonEscape
					dragon={escapedDragon.dragon}
					startPos={escapedDragon.rect}
					proseRef={proseRef}
					onCaptured={handleCaptured}
				/>
			)}
		</>
	)
}
