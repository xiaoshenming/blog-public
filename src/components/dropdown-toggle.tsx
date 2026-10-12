'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { Check } from 'lucide-react'
import { card } from '@/styles/shared/card.stylex'
import { buttonTokens, colors } from '@/styles/tokens.stylex'
import { useSize } from '@/hooks/use-size'

/**
 * 左下角工具栏三个切换按钮（语言 / 皮肤 / 字体）的公共骨架。
 *
 * 抽出来的原因：三者除了「图标 + 菜单项数据」之外逐字相同 ——
 * 定位约定、按钮样式、点外部关闭、入场动画、菜单容器与选中态共约 80 行 × 3 份，
 * 且已经出现过并行漂移（菜单 minWidth 三处各不相同、aria-label 一处用动作词一处用名词）。
 *
 * 定位约定：本组件不自带 position:fixed —— 由布局层的共享 fixed 容器负责
 * left/bottom、移动端上移与 zIndex，wrap 只做 relative 供菜单锚定。
 */
const styles = stylex.create({
	wrap: {
		position: 'relative'
	},
	toggle: {
		/** card.base 是给绝对定位卡片用的，按钮必须显式回到文档流 */
		position: 'static',
		/**
		 * 去掉 card.base 的墨线描边：那是给方形卡片用的四条直边，
		 * 落到这里的胶囊按钮（radius 9999px）上会被圆角切出四个缺口。
		 */
		backgroundImage: 'none',
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: 9999,
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px',
		cursor: 'pointer'
	},
	icon: {
		width: 20,
		height: 20
	},
	/**
	 * 菜单向右侧展开：按钮竖排在左下角，向上弹会压住上面那个按钮。
	 * 圆角走按钮令牌（默认皮肤 12px，与原先三处硬编码一致；水墨下收成方角）。
	 * 底色取 surfaceStrong 而非 card.base 的 card：浮层压在正文上，
	 * 半透明的卡片底（水墨下 88%）会让底下的字透上来，读不清。
	 */
	menu: {
		position: 'absolute',
		left: '100%',
		bottom: 0,
		marginLeft: 8,
		display: 'flex',
		flexDirection: 'column',
		padding: 8,
		backgroundColor: colors.surfaceStrong,
		borderRadius: buttonTokens.radius,
		overflow: 'hidden',
		boxShadow: '0 8px 24px rgb(0 0 0 / 12%)'
	},
	menuItem: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingInline: 12,
		paddingBlock: 8,
		borderRadius: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary,
		borderWidth: 0,
		backgroundColor: 'transparent',
		cursor: 'pointer',
		textAlign: 'left'
	},
	menuItemActive: {
		color: colors.brand,
		fontWeight: 500
	},
	check: {
		width: 14,
		height: 14
	},
	/** 「跟随站点设置」与选项列表之间的分隔线 */
	separator: {
		height: 1,
		marginBlock: 6,
		marginInline: 4,
		backgroundColor: colors.line
	}
})

/** 三个切换按钮的图标尺寸一致，导出供调用方复用，不必各写一份 */
export const dropdownIcon = styles.icon

type DropdownItem = {
	key: string
	/** 菜单项左侧内容；皮肤项会传入「色块 + 名称」的组合 */
	label: ReactNode
	active: boolean
	onSelect: () => void
}

type Props = {
	icon: ReactNode
	/** 按钮上的文字；窄屏传 null 只留图标 */
	label: ReactNode
	/** 按钮的 aria-label 与 title（动作语义，如「切换皮肤」） */
	ariaLabel: string
	/** 菜单容器的 aria-label（名词语义，如「皮肤」） */
	menuLabel: string
	menuMinWidth: number
	items: DropdownItem[]
	/** 清除覆盖的「跟随站点设置」项；不传则不渲染 */
	footerItem?: { label: string; onSelect: () => void }
	/** 菜单打开时回调（字体菜单用它按需加载候选字体样式表） */
	onOpen?: () => void
}

export default function DropdownToggle({ icon, label, ariaLabel, menuLabel, menuMinWidth, items, footerItem, onOpen }: Props) {
	const { maxSM } = useSize()
	const [open, setOpen] = useState(false)
	const wrapRef = useRef<HTMLDivElement>(null)
	/** onOpen 只在「打开」这一刻需要执行；用 ref 取最新值，避免它进依赖数组导致每次渲染都重挂监听 */
	const onOpenRef = useRef(onOpen)
	onOpenRef.current = onOpen

	useEffect(() => {
		if (!open) return
		onOpenRef.current?.()
		const onPointerDown = (event: PointerEvent) => {
			if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) setOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		return () => document.removeEventListener('pointerdown', onPointerDown)
	}, [open])

	const select = (action: () => void) => {
		action()
		setOpen(false)
	}

	return (
		<div ref={wrapRef} {...stylex.props(styles.wrap)}>
			<motion.button
				type='button'
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay: 0.4 }}
				onClick={() => setOpen(value => !value)}
				aria-label={ariaLabel}
				aria-expanded={open}
				title={ariaLabel}
				{...stylex.props(card.base, card.hover, styles.toggle)}>
				{icon}
				{!maxSM && label}
			</motion.button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 6, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, scale: 0.96 }}
						transition={{ duration: 0.16 }}
						role='menu'
						aria-label={menuLabel}
						{...stylex.props(card.base, styles.menu)}
						style={{ minWidth: menuMinWidth }}>
						{items.map(item => (
							<button
								key={item.key}
								type='button'
								role='menuitemradio'
								aria-checked={item.active}
								onClick={() => select(item.onSelect)}
								{...stylex.props(styles.menuItem, item.active && styles.menuItemActive)}>
								{item.label}
								{item.active && <Check {...stylex.props(styles.check)} />}
							</button>
						))}

						{/* 「跟随站点设置」是清除覆盖的动作而非选项，故用 menuitem（选项才用 menuitemradio） */}
						{footerItem && (
							<>
								<div role='separator' {...stylex.props(styles.separator)} />
								<button
									type='button'
									role='menuitem'
									onClick={() => select(footerItem.onSelect)}
									{...stylex.props(styles.menuItem)}>
									<span>{footerItem.label}</span>
								</button>
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
