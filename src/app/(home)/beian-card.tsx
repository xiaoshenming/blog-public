import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { CARD_SPACING } from '@/consts'
import Link from 'next/link'
import { HomeDraggableLayer } from './home-draggable-layer'

export default function BeianCard() {
	const center = useCenterStore()
	const { styles, hiCardStyles, beian } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.beianCard,
		hiCardStyles: s.cardStyles.hiCard,
		beian: (s.siteContent as any).beian as { text?: string; link?: string } | undefined,
	})))

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + hiCardStyles.width / 2 - styles.width + 200
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 + CARD_SPACING + 180

	if (!beian?.text) {
		return null
	}

	return (
		<HomeDraggableLayer cardKey='beianCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='flex items-center justify-center max-sm:static'>
				{beian.link ? (
					<Link href={beian.link} target='_blank' rel='noopener noreferrer' className='text-secondary text-xs transition-opacity hover:opacity-80'>
						{beian.text}
					</Link>
				) : (
					<span className='text-secondary text-xs'>{beian.text}</span>
				)}
			</Card>
		</HomeDraggableLayer>
	)
}
