import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
import PenSVG from '@/svgs/pen.svg'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { useCenterStore } from '@/hooks/use-center'
import { useRouter } from 'next/navigation'
import { useSize } from '@/hooks/use-size'
import DotsSVG from '@/svgs/dots.svg'
import { HomeDraggableLayer } from './home-draggable-layer'
import * as stylex from '@stylexjs/stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { card } from '@/styles/shared/card.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 工具栏：绝对定位、横向排列、间距 16（坐标保留内联 style） */
	toolbar: {
		position: 'absolute',
		display: 'flex',
		alignItems: 'center',
		gap: 16
	},
	/** 雪花装饰：绝对定位、不响应指针事件（定位数值保留内联 style） */
	snow: {
		position: 'absolute',
		pointerEvents: 'none'
	},
	/** 写文章按钮附加：文字不换行 */
	writeBtn: {
		whiteSpace: 'nowrap'
	},
	/** 更多按钮：内边距 8 */
	moreBtn: {
		padding: 8
	},
	/** 更多图标：24×24 */
	dotsIcon: {
		width: 24,
		height: 24
	}
})

export default function WriteButton() {
	const center = useCenterStore()
	const { styles, hiCardWidth, clockCardStyles, enableChristmas, setConfigDialogOpen } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.writeButtons,
		hiCardWidth: s.cardStyles.hiCard.width,
		clockCardStyles: s.cardStyles.clockCard,
		enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined,
		setConfigDialogOpen: s.setConfigDialogOpen,
	})))
	const { maxSM } = useSize()
	const router = useRouter()

	const [show, setShow] = useState(false)

	useEffect(() => {
		const timer = setTimeout(() => setShow(true), styles.order * ANIMATION_DELAY * 1000)
		return () => clearTimeout(timer)
	}, [styles.order])

	if (maxSM) return null

	if (!show) return null

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardWidth / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardStyles.offset - styles.height - CARD_SPACING / 2 - clockCardStyles.height

	return (
		<HomeDraggableLayer cardKey='writeButtons' x={x} y={y} width={styles.width} height={styles.height}>
			<div {...stylex.props(sx.toolbar)} style={{ left: x, top: y }}>
				<motion.button
					onClick={() => router.push('/write')}
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					{...stylex.props(brandBtn.base, card.hover, sx.writeBtn)}
					style={{ boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.4)' }}>
					{enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-8.webp'
								alt='Christmas decoration'
								{...stylex.props(sx.snow)}
								style={{ width: 60, left: -2, top: -4, opacity: 0.95 }}
							/>
						</>
					)}

					<PenSVG />
					<span>写文章</span>
				</motion.button>
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					onClick={() => setConfigDialogOpen(true)}
					{...stylex.props(card.hover, sx.moreBtn)}>
					<DotsSVG {...stylex.props(sx.dotsIcon)} />
				</motion.button>
			</div>
		</HomeDraggableLayer>
	)
}
