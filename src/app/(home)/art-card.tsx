import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { CARD_SPACING } from '@/consts'
import { useRouter } from 'next/navigation'
import * as stylex from '@stylexjs/stylex'
import { HomeDraggableLayer } from './home-draggable-layer'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 雪花装饰：绝对定位、不响应指针事件（定位数值保留内联 style） */
	snow: {
		position: 'absolute',
		pointerEvents: 'none'
	},
	/** Card 覆盖：收紧内边距、小屏改静态并清除位移（内边距覆盖 card.base） */
	cardLayout: {
		padding: 8,
		'@media (width < 40rem)': {
			position: 'static',
			translate: '0px 0px'
		}
	},
	/** 艺术图：铺满容器、32px 圆角、裁切填充 */
	art: {
		height: '100%',
		width: '100%',
		borderRadius: 32,
		objectFit: 'cover'
	}
})

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
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} style={[sx.cardLayout]}>
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-3.webp'
							alt='Christmas decoration'
							className={stylex.props(sx.snow).className}
							style={{ width: 160, right: -8, top: -16, opacity: 0.9 }}
						/>
					</>
				)}

				<img onClick={() => router.push('/pictures')} src={artUrl} alt='wall art' {...stylex.props(sx.art)} />
			</Card>
		</HomeDraggableLayer>
	)
}
