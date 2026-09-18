import { ANIMATION_DELAY } from '@/consts'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { useCenterStore } from '@/hooks/use-center'
import { useSize } from '@/hooks/use-size'
import { HomeDraggableLayer } from './home-draggable-layer'

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
				style={{ left: x, top: y, width: styles.width, height: styles.height }}
				onClick={() => setNumber(Math.min(number + 1, 20))}
				className='card-hover absolute flex h-full w-full items-center justify-center'>
				{new Array(Math.min(number, 20))
					.fill(0)
					.map((_, index) =>
						index === 0 ? (
							<img
								key={index}
								src={`/images/hats/${hatIndex}.webp`}
								alt='hat'
								className='h-full w-full object-contain'
								style={{ width: styles.width, height: styles.height, transform: hatFlipped ? 'scaleX(-1)' : 'none' }}
							/>
						) : (
							<img
								key={index}
								src={`/images/hats/${hatIndex}.webp`}
								alt='hat'
								className='absolute h-full w-full object-contain'
								style={{ width: styles.width, height: styles.height, transform: hatFlipped ? 'scaleX(-1)' : 'none', bottom: index * 16 }}
							/>
						)
					)}
			</motion.div>
		</HomeDraggableLayer>
	)
}
