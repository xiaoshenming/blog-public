import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { CARD_SPACING } from '@/consts'
import { useRouter } from 'next/navigation'
import { HomeDraggableLayer } from './home-draggable-layer'

export default function ArtCard() {
	const center = useCenterStore()
	const { styles, hiCardHeight, artImages, currentArtImageId, enableChristmas } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.artCard,
		hiCardHeight: s.cardStyles.hiCard.height,
		artImages: s.siteContent.artImages,
		currentArtImageId: s.siteContent.currentArtImageId,
		enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined,
	})))
	const router = useRouter()

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - hiCardHeight / 2 - styles.height - CARD_SPACING

	const images = artImages ?? []
	const currentArt = (currentArtImageId ? images.find(item => item.id === currentArtImageId) : undefined) ?? images[0]
	const artUrl = currentArt?.url || '/images/art/cat.png'

	return (
		<HomeDraggableLayer cardKey='artCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card className='p-2 max-sm:static max-sm:translate-0' order={styles.order} width={styles.width} height={styles.height} x={x} y={y}>
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-3.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 160, right: -8, top: -16, opacity: 0.9 }}
						/>
					</>
				)}

				<img onClick={() => router.push('/pictures')} src={artUrl} alt='wall art' className='h-full w-full rounded-[32px] object-cover' />
			</Card>
		</HomeDraggableLayer>
	)
}
