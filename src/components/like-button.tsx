import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'motion/react'
import { Heart } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { BLOG_SLUG_KEY } from '@/consts'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

type LikeButtonProps = {
	slug?: string
	className?: string
	delay?: number
}

const ENDPOINT = 'https://like.zmark.top/api/like'

/** 原 Tailwind：card card-hover heartbeat-container relative overflow-visible rounded-full p-3
    粒子容器：pointer-events-none absolute inset-0 flex items-center justify-center
    图标：fill-rose-400 text-rose-400 / fill-rose-200 text-rose-200（heartbeat 为全局类，保留字符串）
    徽章：absolute -top-2 left-9 min-w-6 rounded-full px-1.5 py-1 text-center text-xs text-white tabular-nums（liked ? bg-rose-400 : bg-gray-300） */
const styles = stylex.create({
	/** relative 覆盖 card.base 的 absolute（同一次 stylex.props 内后写覆盖先写） */
	button: {
		position: 'relative',
		overflow: 'visible',
		borderRadius: 9999,
		padding: 12
	},
	particle: {
		pointerEvents: 'none',
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center'
	},
	/** fill-rose-400 / text-rose-400（色板固化：--color-rose-400 = #ff667f） */
	heartRose: {
		fill: '#ff667f',
		color: '#ff667f'
	},
	/** fill-rose-200 / text-rose-200（色板固化：--color-rose-200 = #ffccd3） */
	heartSoft: {
		fill: '#ffccd3',
		color: '#ffccd3'
	},
	badge: {
		position: 'absolute',
		top: -8,
		left: 36,
		minWidth: 24,
		borderRadius: 9999,
		paddingInline: 6,
		paddingBlock: 4,
		textAlign: 'center',
		fontSize: 12,
		lineHeight: '16px',
		color: colors.white,
		fontVariantNumeric: 'tabular-nums'
	},
	/** bg-rose-400（色板固化：--color-rose-400 = #ff667f） */
	badgeLiked: {
		backgroundColor: '#ff667f'
	},
	/** bg-gray-300（色板固化：--color-gray-300 = #d1d5dc） */
	badgeIdle: {
		backgroundColor: '#d1d5dc'
	}
})

export default function LikeButton({ slug = 'xiaoshenming', delay, className }: LikeButtonProps) {
	slug = BLOG_SLUG_KEY + slug
	const { t } = useI18n()
	const [liked, setLiked] = useState(false)
	const [show, setShow] = useState(false)
	const [justLiked, setJustLiked] = useState(false)
	const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])
	const particleTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
	useEffect(() => {
		const timer = setTimeout(() => {
			setShow(true)
		}, delay || 1000)
		return () => clearTimeout(timer)
	}, [])

	useEffect(() => {
		if (justLiked) {
			const timer = setTimeout(() => setJustLiked(false), 600)
			return () => clearTimeout(timer)
		}
	}, [justLiked])

	const fetcher = useCallback(async (url: string): Promise<number | null> => {
		const res = await fetch(url, { method: 'GET', cache: 'no-store' })
		if (!res.ok) return null
		const data = await res.json().catch(() => ({}))
		return typeof data?.count === 'number' ? data.count : null
	}, [])

	const { data: fetchedCount, mutate } = useSWR(slug ? `${ENDPOINT}?slug=${encodeURIComponent(slug)}` : null, fetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 1000 * 10
	})

	const handleLike = useCallback(async () => {
		if (!slug) return
		setLiked(true)
		setJustLiked(true)

		// Create particle effects
		const newParticles = Array.from({ length: 6 }, (_, i) => ({
			id: Date.now() + i,
			x: Math.random() * 60 - 30,
			y: Math.random() * 60 - 30
		}))
		setParticles(newParticles)

		// Clear particles after animation
		if (particleTimerRef.current) clearTimeout(particleTimerRef.current)
		particleTimerRef.current = setTimeout(() => setParticles([]), 1000)

		try {
			const url = `${ENDPOINT}?slug=${encodeURIComponent(slug)}`
			const res = await fetch(url, { method: 'POST' })
			const data = await res.json().catch(() => ({}))
			if (data.reason == 'rate_limited') toast(t('blog.likeLimited'))
			const value = typeof data?.count === 'number' ? data.count : (fetchedCount ?? 0) + 1
			await mutate(value, { revalidate: false })
		} catch {
			// ignore
		}
	}, [slug, fetchedCount, mutate, t])

	const count = typeof fetchedCount === 'number' ? fetchedCount : null

	const { className: buttonClassName, style: buttonStyle } = stylex.props(card.base, card.hover, styles.button)
	const { className: particleClassName } = stylex.props(styles.particle)
	const { className: heartRoseClassName, style: heartRoseStyle } = stylex.props(styles.heartRose)
	const { className: heartClassName, style: heartStyle } = stylex.props(liked ? styles.heartRose : styles.heartSoft)
	const { className: badgeClassName } = stylex.props(styles.badge, liked ? styles.badgeLiked : styles.badgeIdle)

	if (show)
		return (
			<motion.button
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				aria-label='Like this post'
				onClick={handleLike}
				className={cn(buttonClassName, 'heartbeat-container', className)}
				style={buttonStyle}>
				<AnimatePresence>
					{particles.map(particle => (
						<motion.div
							key={particle.id}
							className={particleClassName}
							initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
							animate={{
								opacity: [1, 1, 0],
								scale: [0, 1.2, 0.8],
								x: particle.x,
								y: particle.y
							}}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.8, ease: 'easeOut' }}>
							<Heart className={heartRoseClassName} style={heartRoseStyle} size={12} />
						</motion.div>
					))}
				</AnimatePresence>

				{typeof count === 'number' && (
					<motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} className={badgeClassName}>
						{count}
					</motion.span>
				)}
				<motion.div animate={justLiked ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}} transition={{ duration: 0.6, ease: 'easeOut' }}>
					<Heart className={cn('heartbeat', heartClassName)} style={heartStyle} size={28} />
				</motion.div>
			</motion.button>
		)
}
