import { ANIMATION_DELAY } from '@/consts'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { useCenterStore } from '@/hooks/use-center'
import { useSize } from '@/hooks/use-size'
import * as stylex from '@stylexjs/stylex'
import { card } from '@/styles/shared/card.stylex'
import { HomeDraggableLayer } from './home-draggable-layer'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 外壳：绝对定位、Flex 居中（悬停过渡/缩放由 card.hover 承接） */
	shell: {
		position: 'absolute',
		display: 'flex',
		height: '100%',
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center'
	},
	/** 帽子图：铺满容器、保持比例（尺寸覆盖保留内联 style） */
	hatImage: {
		height: '100%',
		width: '100%',
		objectFit: 'contain'
	},
	/** 堆叠帽：绝对定位 */
	hatImageStacked: {
		position: 'absolute'
	}
})

export default function HatCard() {
	const center = useCenterStore()
	const { styles, hatIndex, hatFlipped } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.hatCard,
		hatIndex: s.siteContent.currentHatIndex ?? 1,
		hatFlipped: s.siteContent.hatFlipped ?? false,
	})))
	const { maxSM } = useSize()

	const [show, setShow] = useState(false)
	const [number, setNumber] = useState(1)

	useEffect(() => {
		const timer = setTimeout(() => setShow(true), styles.order * ANIMATION_DELAY * 1000)
		return () => clearTimeout(timer)
	}, [styles.order])

	if (maxSM) return null

	if (!show) return null

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - styles.height

	return (
		<HomeDraggableLayer cardKey='hatCard' x={x} y={y} width={styles.width} height={styles.height}>
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				{...stylex.props(card.hover, sx.shell)}
				style={{ left: x, top: y, width: styles.width, height: styles.height }}
				onClick={() => setNumber(Math.min(number + 1, 20))}>
				{new Array(Math.min(number, 20))
					.fill(0)
					.map((_, index) =>
						index === 0 ? (
							<img
								key={index}
								src={`/images/hats/${hatIndex}.webp`}
								alt='hat'
								{...stylex.props(sx.hatImage)}
								style={{ width: styles.width, height: styles.height, transform: hatFlipped ? 'scaleX(-1)' : 'none' }}
							/>
						) : (
							<img
								key={index}
								src={`/images/hats/${hatIndex}.webp`}
								alt='hat'
								{...stylex.props(sx.hatImage, sx.hatImageStacked)}
								style={{ width: styles.width, height: styles.height, transform: hatFlipped ? 'scaleX(-1)' : 'none', bottom: index * 16 }}
							/>
						)
					)}
			</motion.div>
		</HomeDraggableLayer>
	)
}
