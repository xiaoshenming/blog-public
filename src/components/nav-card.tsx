'use client'

import Card from '@/components/card'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { useCenterStore } from '@/hooks/use-center'
import { CARD_SPACING } from '@/consts'
import ScrollOutlineSVG from '@/svgs/scroll-outline.svg'
import ScrollFilledSVG from '@/svgs/scroll-filled.svg'
import ProjectsFilledSVG from '@/svgs/projects-filled.svg'
import ProjectsOutlineSVG from '@/svgs/projects-outline.svg'
import AboutFilledSVG from '@/svgs/about-filled.svg'
import AboutOutlineSVG from '@/svgs/about-outline.svg'
import ShareFilledSVG from '@/svgs/share-filled.svg'
import ShareOutlineSVG from '@/svgs/share-outline.svg'
import WebsiteFilledSVG from '@/svgs/website-filled.svg'
import WebsiteOutlineSVG from '@/svgs/website-outline.svg'
import { usePathname } from 'next/navigation'
import { colors, fonts } from '@/styles/tokens.stylex'
import { useSize } from '@/hooks/use-size'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { HomeDraggableLayer } from '@/app/(home)/home-draggable-layer'

const list = [
	{
		icon: ScrollOutlineSVG,
		iconActive: ScrollFilledSVG,
		label: '近期文章',
		href: '/blog'
	},
	{
		icon: ProjectsOutlineSVG,
		iconActive: ProjectsFilledSVG,
		label: '我的项目',
		href: '/projects'
	},
	{
		icon: AboutOutlineSVG,
		iconActive: AboutFilledSVG,
		label: '关于网站',
		href: '/about'
	},
	{
		icon: ShareOutlineSVG,
		iconActive: ShareFilledSVG,
		label: '推荐分享',
		href: '/share'
	},
	{
		icon: WebsiteOutlineSVG,
		iconActive: WebsiteFilledSVG,
		label: '优秀博客',
		href: '/bloggers'
	}
]

const extraSize = 8

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物）；const styles 已被配置 store 占用，故取名 sx */
const sx = stylex.create({
	/** absolute pointer-events-none（定位数值保留内联 style） */
	snow: {
		position: 'absolute',
		pointerEvents: 'none'
	},
	/** flex items-center gap-3 */
	logoLink: {
		display: 'flex',
		alignItems: 'center',
		gap: 12
	},
	/** rounded-full */
	avatar: {
		borderRadius: 9999
	},
	/** flex flex-col */
	logoText: {
		display: 'flex',
		flexDirection: 'column'
	},
	/** font-averia mt-1 text-2xl leading-none font-medium */
	title: {
		marginTop: 4,
		fontFamily: fonts.averia,
		fontSize: 24,
		lineHeight: 1,
		fontWeight: 500
	},
	/** text-brand mt-1 text-xs font-medium */
	status: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: '16px',
		fontWeight: 500,
		color: colors.brand
	},
	/** text-secondary mt-6 text-sm uppercase */
	groupLabel: {
		marginTop: 24,
		fontSize: 14,
		lineHeight: '20px',
		textTransform: 'uppercase',
		color: colors.secondary
	},
	/** relative mt-2 */
	navList: {
		position: 'relative',
		marginTop: 8
	},
	/** mt-0 flex items-center gap-6（space-y-0 由 navItemGap 条件承接） */
	navListIcons: {
		marginTop: 0,
		display: 'flex',
		alignItems: 'center',
		gap: 24
	},
	/** absolute max-w-[230px] rounded-full border（渐变背景保留内联 style；border 色同全局 * 规则 = colors.border） */
	hoverPill: {
		position: 'absolute',
		maxWidth: 230,
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border
	},
	/** text-secondary relative z-10 flex items-center gap-3 rounded-full px-5 py-3（原 text-md 未产出任何样式，略去） */
	navLink: {
		position: 'relative',
		zIndex: 10,
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		borderRadius: 9999,
		paddingInline: 20,
		paddingBlock: 12,
		color: colors.secondary
	},
	/** p-0（icons 形态覆盖 px-5 py-3；同一 props() 内后写覆盖） */
	navLinkIcons: {
		paddingInline: 0,
		paddingBlock: 0
	},
	/** 原 space-y-2：v4 = 子项 :not(:last-child) margin-block-end 8px；分摊到非末项列表项（首个子元素为绝对定位胶囊，margin 不参与布局） */
	navItemGap: {
		marginBottom: 8
	},
	/** flex h-7 w-7 items-center justify-center */
	iconBox: {
		display: 'flex',
		width: 28,
		height: 28,
		alignItems: 'center',
		justifyContent: 'center'
	},
	/** absolute h-7 w-7 */
	icon: {
		position: 'absolute',
		width: 28,
		height: 28
	},
	/** text-brand */
	iconActive: {
		color: colors.brand
	},
	/** text-primary font-medium */
	labelActive: {
		color: colors.primary,
		fontWeight: 500
	},
	/** Card 覆盖：overflow-hidden（mini/icons 形态） */
	cardOverflow: {
		overflow: 'hidden'
	},
	/** Card 覆盖：p-3（mini 形态）——stylex 合并后写覆盖 card.base 的 padding 24 */
	cardMini: {
		padding: 12
	},
	/** Card 覆盖：flex items-center gap-6 p-3（icons 形态） */
	cardIcons: {
		display: 'flex',
		alignItems: 'center',
		gap: 24,
		padding: 12
	}
})

export default function NavCard() {
	const pathname = usePathname()
	const center = useCenterStore()
	const [show, setShow] = useState(false)
	const { maxSM } = useSize()
	const [hoveredIndex, setHoveredIndex] = useState<number>(0)
	const { styles, hiCardStyles, enableChristmas, metaTitle } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.navCard,
		hiCardStyles: s.cardStyles.hiCard,
		enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined,
		metaTitle: s.siteContent.meta.title,
	})))

	const activeIndex = useMemo(() => {
		const index = list.findIndex(item => pathname === item.href)
		return index >= 0 ? index : undefined
	}, [pathname])

	useEffect(() => {
		setShow(true)
	}, [])

	const [activityStatus, setActivityStatus] = useState('开发中')

	useEffect(() => {
		const fetchStatus = () => {
			if (document.hidden) return
			fetch('https://activity.zmark.top')
				.then(res => res.json())
				.then(data => {
					const newStatus = data.status || '离线'
					setActivityStatus(prev => prev === newStatus ? prev : newStatus)
				})
				.catch(() => setActivityStatus('开发中'))
		}
		fetchStatus()
		const timer = setInterval(fetchStatus, 30000)
		return () => clearInterval(timer)
	}, [])

	let form = useMemo(() => {
		if (pathname == '/') return 'full'
		else if (pathname == '/write') return 'mini'
		else return 'icons'
	}, [pathname])
	if (maxSM) form = 'icons'

	const itemHeight = form === 'full' ? 52 : 28

	let position = useMemo(() => {
		if (form === 'full') {
			const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - hiCardStyles.width / 2 - styles.width - CARD_SPACING
			const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 - styles.height
			return { x, y }
		}

		return {
			x: 24,
			y: 16
		}
	}, [form, center, styles, hiCardStyles])

	const size = useMemo(() => {
		if (form === 'mini') return { width: 64, height: 64 }
		else if (form === 'icons') return { width: 340, height: 64 }
		else return { width: styles.width, height: styles.height }
	}, [form, styles])

	useEffect(() => {
		if (form === 'icons' && activeIndex !== undefined && hoveredIndex !== activeIndex) {
			const timer = setTimeout(() => {
				setHoveredIndex(activeIndex)
			}, 1500)
			return () => clearTimeout(timer)
		}
	}, [hoveredIndex, activeIndex, form])

	if (maxSM) position = { x: center.x - size.width / 2, y: 16 }

	if (show)
		return (
			<HomeDraggableLayer cardKey='navCard' x={position.x} y={position.y} width={styles.width} height={styles.height}>
				<Card
					order={styles.order}
					width={size.width}
					height={size.height}
					x={position.x}
					y={position.y}
					style={
						form === 'mini'
							? [sx.cardOverflow, sx.cardMini]
							: form === 'icons'
								? [sx.cardOverflow, sx.cardIcons]
								: undefined
					}>
					{form === 'full' && enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-4.webp'
								alt='Christmas decoration'
								className={stylex.props(sx.snow).className}
								style={{ width: 160, left: -18, top: -20, opacity: 0.9 }}
							/>
						</>
					)}

					<Link {...stylex.props(sx.logoLink)} href='/'>
						<Image src='/images/avatar.png' alt='avatar' width={40} height={40} style={{ boxShadow: ' 0 12px 20px -5px #E2D9CE' }} className={stylex.props(sx.avatar).className} />
						{form === 'full' && (
							<div {...stylex.props(sx.logoText)}>
								<span {...stylex.props(sx.title)}>{metaTitle}</span>
								<span {...stylex.props(sx.status)}>({activityStatus})</span>
							</div>
						)}
					</Link>

					{(form === 'full' || form === 'icons') && (
						<>
							{form !== 'icons' && <div {...stylex.props(sx.groupLabel)}>General</div>}

							<div {...stylex.props(sx.navList, form === 'icons' && sx.navListIcons)}>
								<motion.div
									className={stylex.props(sx.hoverPill).className}
									layoutId='nav-hover'
									initial={false}
									animate={
										form === 'icons'
											? {
													left: hoveredIndex * (itemHeight + 24) - extraSize,
													top: -extraSize,
													width: itemHeight + extraSize * 2,
													height: itemHeight + extraSize * 2
												}
											: { top: hoveredIndex * (itemHeight + 8), left: 0, width: '100%', height: itemHeight }
									}
									transition={{
										type: 'spring',
										stiffness: 400,
										damping: 30
									}}
									style={{ backgroundImage: 'linear-gradient(to right bottom, var(--color-border) 60%, var(--color-card) 100%)' }}
								/>

								{list.map((item, index) => (
									<Link
										key={item.href}
										href={item.href}
										{...stylex.props(sx.navLink, form === 'icons' && sx.navLinkIcons, form !== 'icons' && index < list.length - 1 && sx.navItemGap)}
										onMouseEnter={() => setHoveredIndex(index)}>
										<div {...stylex.props(sx.iconBox)}>
											{hoveredIndex == index ? <item.iconActive {...stylex.props(sx.icon, sx.iconActive)} /> : <item.icon {...stylex.props(sx.icon)} />}
										</div>
										{form !== 'icons' && <span {...stylex.props(index === hoveredIndex && sx.labelActive)}>{item.label}</span>}
									</Link>
								))}
							</div>
						</>
					)}
				</Card>
			</HomeDraggableLayer>
		)
}
