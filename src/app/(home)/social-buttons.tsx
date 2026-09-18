import { useCenterStore } from '@/hooks/use-center'
import GithubSVG from '@/svgs/github.svg'
import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import JuejinSVG from '@/svgs/juejin.svg'
import EmailSVG from '@/svgs/email.svg'
import XSVG from '@/svgs/x.svg'
import TgSVG from '@/svgs/tg.svg'
import WechatSVG from '@/svgs/wechat.svg'
import FacebookSVG from '@/svgs/facebook.svg'
import TiktokSVG from '@/svgs/tiktok.svg'
import InstagramSVG from '@/svgs/instagram.svg'
import WeiboSVG from '@/svgs/weibo.svg'
import XiaohongshuSVG from '@/svgs/小红书.svg'
import ZhihuSVG from '@/svgs/知乎.svg'
import BilibiliSVG from '@/svgs/哔哩哔哩.svg'
import QqSVG from '@/svgs/qq.svg'
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState, useMemo, useRef } from 'react'
import type React from 'react'
import { toast } from 'sonner'
import { useSize } from '@/hooks/use-size'
import { HomeDraggableLayer } from './home-draggable-layer'
import { createPortal } from 'react-dom'
import * as stylex from '@stylexjs/stylex'
import { colors, fonts } from '@/styles/tokens.stylex'
import { card } from '@/styles/shared/card.stylex'

type SocialButtonType =
	| 'github'
	| 'juejin'
	| 'email'
	| 'link'
	| 'x'
	| 'tg'
	| 'wechat'
	| 'facebook'
	| 'tiktok'
	| 'instagram'
	| 'weibo'
	| 'xiaohongshu'
	| 'zhihu'
	| 'bilibili'
	| 'qq'

interface SocialButtonConfig {
	id: string
	type: SocialButtonType
	value: string
	label?: string
	order: number
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 外层定位容器：绝对定位；小屏改静态（坐标保留内联 style） */
	outer: {
		position: 'absolute',
		'@media (width < 40rem)': {
			position: 'static'
		}
	},
	/** 按钮行：绝对定位在左上、反向排列、垂直居中、间距 12；小屏改静态（宽度保留内联 style） */
	listRow: {
		position: 'absolute',
		top: 0,
		left: 0,
		display: 'flex',
		flexDirection: 'row-reverse',
		alignItems: 'center',
		gap: 12,
		'@media (width < 40rem)': {
			position: 'static'
		}
	},
	/** GitHub 按钮底：手写体、横向排列、间距 8、小圆角、描边、纯黑背景、大号白色文字 */
	githubBase: {
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: '#070707',
		fontFamily: fonts.averia,
		fontSize: 20,
		lineHeight: '28px',
		color: colors.white
	},
	/** GitHub 按钮（仅图标）：内边距 6 */
	githubIconOnly: {
		padding: 6
	},
	/** GitHub 按钮（带标签）：横 12 纵 6 */
	githubWithLabel: {
		paddingInline: 12,
		paddingBlock: 6
	},
	/** 图标按钮：卡片底、相对定位、小圆角、内边距 6 */
	iconButton: {
		position: 'relative',
		borderRadius: 12,
		padding: 6
	},
	/** 图标包裹层：相对定位 */
	wrapper: {
		position: 'relative'
	},
	/** 下拉遮罩：固定全屏、层级 40 */
	backdrop: {
		position: 'fixed',
		inset: 0,
		zIndex: 40
	},
	/** 下拉面板：卡片色、固定定位、层级 50、大圆角、描边、内边距 16、背景模糊（位置与投影保留内联 style） */
	dropdown: {
		backgroundColor: colors.card,
		position: 'fixed',
		zIndex: 50,
		borderRadius: 16,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		padding: 16,
		backdropFilter: 'blur(24px)'
	},
	/** 二维码图片：192×192、小圆角、裁切填充 */
	qrImg: {
		width: 192,
		height: 192,
		borderRadius: 8,
		objectFit: 'cover'
	},
	/** 链接按钮：卡片底、横向排列、间距 8、小圆角、内边距、中等字重、不换行 */
	linkButton: {
		position: 'relative',
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		borderRadius: 12,
		paddingInline: 12,
		paddingBlock: 10,
		fontWeight: 500,
		whiteSpace: 'nowrap'
	},
	/** 社交按钮底：卡片底、相对定位、小圆角、中等字重、不换行 */
	socialBase: {
		position: 'relative',
		borderRadius: 12,
		fontWeight: 500,
		whiteSpace: 'nowrap'
	},
	/** 社交按钮（带标签）：横向排列、间距 8、内边距 12/10 */
	socialWithLabel: {
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		paddingInline: 12,
		paddingBlock: 10
	},
	/** 社交按钮（仅图标）：内边距 6 */
	socialIconOnly: {
		padding: 6
	},
	/** 图标 24×24 */
	iconMd: {
		width: 24,
		height: 24
	},
	/** 图标 32×32 */
	iconLg: {
		width: 32,
		height: 32
	}
})

const iconMap: Record<SocialButtonType, React.ComponentType<{ className?: string }>> = {
	github: GithubSVG,
	juejin: JuejinSVG,
	email: EmailSVG,
	wechat: WechatSVG,
	x: XSVG,
	tg: TgSVG,
	facebook: FacebookSVG,
	tiktok: TiktokSVG,
	instagram: InstagramSVG,
	weibo: WeiboSVG,
	xiaohongshu: XiaohongshuSVG,
	zhihu: ZhihuSVG,
	bilibili: BilibiliSVG,
	qq: QqSVG,
	link: () => null
}

export default function SocialButtons() {
	const center = useCenterStore()
	const { styles, hiCardStyles, socialButtonsContent } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.socialButtons,
		hiCardStyles: s.cardStyles.hiCard,
		socialButtonsContent: s.siteContent.socialButtons,
	})))
	const { maxSM, init } = useSize()
	const order = maxSM && init ? 0 : styles.order
	const delay = maxSM && init ? 0 : 100

	const sortedButtons = useMemo(() => {
		const buttons = (socialButtonsContent || []) as SocialButtonConfig[]
		return [...buttons].sort((a, b) => a.order - b.order)
	}, [socialButtonsContent])

	const [showStates, setShowStates] = useState<Record<string, boolean>>({})
	const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})
	const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
	const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

	useEffect(() => {
		const baseDelay = order * ANIMATION_DELAY * 1000
		const timers: ReturnType<typeof setTimeout>[] = []

		sortedButtons.forEach((button, index) => {
			const showDelay = baseDelay + index * delay
			timers.push(setTimeout(() => {
				setShowStates(prev => ({ ...prev, [button.id]: true }))
			}, showDelay))
		})

		timers.push(setTimeout(() => {
			setShowStates(prev => ({ ...prev, container: true }))
		}, baseDelay))

		return () => timers.forEach(t => clearTimeout(t))
	}, [order, delay, sortedButtons])

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node
			Object.keys(openDropdowns).forEach(buttonId => {
				if (openDropdowns[buttonId]) {
					const buttonRef = buttonRefs.current[buttonId]
					const dropdownRef = dropdownRefs.current[buttonId]
					if (buttonRef && !buttonRef.contains(target) && dropdownRef && !dropdownRef.contains(target)) {
						setOpenDropdowns(prev => ({ ...prev, [buttonId]: false }))
					}
				}
			})
		}

		if (Object.values(openDropdowns).some(Boolean)) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => {
				document.removeEventListener('mousedown', handleClickOutside)
			}
		}
	}, [openDropdowns])

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + hiCardStyles.width / 2 - styles.width
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 + CARD_SPACING

	if (!showStates.container) return null

	const renderButton = (button: SocialButtonConfig) => {
		if (!showStates[button.id]) return null

		const commonProps = {
			initial: { opacity: 0, scale: 0.6 } as const,
			animate: { opacity: 1, scale: 1 } as const
		}

		const Icon = iconMap[button.type]
		const hasLabel = Boolean(button.label)
		const iconSize = hasLabel ? sx.iconMd : sx.iconLg

		if (button.type === 'github') {
			return (
				<motion.a
					key={button.id}
					href={button.value}
					target='_blank'
					{...commonProps}
					{...stylex.props(sx.githubBase, !hasLabel ? sx.githubIconOnly : sx.githubWithLabel)}
					style={{ boxShadow: ' inset 0 0 12px rgba(255, 255, 255, 0.4)' }}>
					<Icon {...stylex.props(sx.iconLg)} />
					{hasLabel && button.label}
				</motion.a>
			)
		}

		if (button.type === 'email' || button.type === 'wechat' || button.type === 'qq') {
			const messageMap: Record<'email' | 'wechat' | 'qq', string> = {
				email: '邮箱已复制到剪贴板',
				wechat: '微信号已复制到剪贴板',
				qq: 'QQ号已复制到剪贴板'
			}

			const isImagePath = button.value.startsWith('/images/social-buttons/')
			const isOpen = openDropdowns[button.id] || false

			if (isImagePath && (button.type === 'wechat' || button.type === 'qq')) {
				return (
					<div key={button.id} {...stylex.props(sx.wrapper)}>
						<motion.button
							ref={el => {
								buttonRefs.current[button.id] = el
							}}
							onClick={() => {
								setOpenDropdowns(prev => ({ ...prev, [button.id]: !prev[button.id] }))
							}}
							{...commonProps}
							{...stylex.props(card.base, sx.iconButton)}>
							<Icon {...stylex.props(sx.iconLg)} />
						</motion.button>
						{typeof window !== 'undefined' &&
							createPortal(
								<AnimatePresence>
									{isOpen && (
										<>
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												onClick={() => setOpenDropdowns(prev => ({ ...prev, [button.id]: false }))}
												{...stylex.props(sx.backdrop)}
											/>
											<motion.div
												ref={el => {
													dropdownRefs.current[button.id] = el
												}}
												initial={{ opacity: 0, y: -8, scale: 0.95 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, y: -8, scale: 0.95 }}
												transition={{ duration: 0.2 }}
												{...stylex.props(sx.dropdown)}
												style={{
													top: buttonRefs.current[button.id] ? `${buttonRefs.current[button.id]!.getBoundingClientRect().bottom + 8}px` : '0px',
													left: buttonRefs.current[button.id] ? `${buttonRefs.current[button.id]!.getBoundingClientRect().left}px` : '0px',
													boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
												}}>
													<img src={button.value} alt='QR Code' {...stylex.props(sx.qrImg)} />
											</motion.div>
										</>
									)}
								</AnimatePresence>,
								document.body
							)}
					</div>
				)
			}

			return (
				<motion.button
					key={button.id}
					onClick={() => {
						navigator.clipboard.writeText(button.value).then(() => {
							toast.success(messageMap[button.type as 'email' | 'wechat' | 'qq'])
						})
					}}
					{...commonProps}
					{...stylex.props(card.base, sx.iconButton)}>
					<Icon {...stylex.props(sx.iconLg)} />
				</motion.button>
			)
		}

		if (button.type === 'link') {
			return (
				<motion.a
					key={button.id}
					href={button.value}
					target='_blank'
					{...commonProps}
					{...stylex.props(card.base, sx.linkButton)}>
					{hasLabel ? button.label : button.value}
				</motion.a>
			)
		}

		return (
			<motion.a
				key={button.id}
				href={button.value}
				target='_blank'
				{...commonProps}
				{...stylex.props(card.base, sx.socialBase, hasLabel ? sx.socialWithLabel : sx.socialIconOnly)}>
				<Icon {...stylex.props(iconSize)} />
				{hasLabel && button.label}
			</motion.a>
		)
	}

	return (
		<HomeDraggableLayer cardKey='socialButtons' x={x} y={y} width={styles.width} height={styles.height}>
			<div {...stylex.props(sx.outer)} style={{ left: x, top: y }}>
				<div {...stylex.props(sx.listRow)} style={{ width: styles.width }}>
					{sortedButtons.map(button => renderButton(button))}
				</div>
			</div>
		</HomeDraggableLayer>
	)
}
