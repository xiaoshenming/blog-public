import LikeButton from '@/components/like-button'
import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { HomeDraggableLayer } from './home-draggable-layer'

export default function LikePosition() {
	const center = useCenterStore()
	const { styles, hiCardStyles, socialButtonsStyles, musicCardHeight, shareCardOrder, shareCardWidth, enableChristmas } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.likePosition,
		hiCardStyles: s.cardStyles.hiCard,
		socialButtonsStyles: s.cardStyles.socialButtons,
		musicCardHeight: s.cardStyles.musicCard.height,
		shareCardOrder: s.cardStyles.shareCard.order,
		shareCardWidth: s.cardStyles.shareCard.width,
		enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined,
	})))

	const x =
		styles.offsetX !== null ? center.x + styles.offsetX : center.x + hiCardStyles.width / 2 - socialButtonsStyles.width + shareCardWidth + CARD_SPACING
	const y =
		styles.offsetY !== null
			? center.y + styles.offsetY
			: center.y + hiCardStyles.height / 2 + CARD_SPACING + socialButtonsStyles.height + CARD_SPACING + musicCardHeight + CARD_SPACING

	return (
		<HomeDraggableLayer cardKey='likePosition' x={x} y={y} width={styles.width} height={styles.height}>
			<div className='absolute max-sm:static' style={{ left: x, top: y }}>
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-13.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 40, left: -4, top: -4, opacity: 0.9 }}
						/>
					</>
				)}

				<LikeButton delay={shareCardOrder * ANIMATION_DELAY * 1000} />
			</div>
		</HomeDraggableLayer>
	)
}
