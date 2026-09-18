import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { CARD_SPACING } from '@/consts'
import Link from 'next/link'
import { HomeDraggableLayer } from './home-draggable-layer'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 卡片内容：水平垂直居中；小屏改为静态定位 */
	cardLayout: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		'@media (width < 40rem)': {
			position: 'static'
		}
	},
	/** 备案链接：次级色、小号文字、透明度过渡、悬停变淡 */
	link: {
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary,
		transitionProperty: 'opacity',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				opacity: 0.8
			}
		}
	},
	/** 备案文字：次级色、小号文字 */
	text: {
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	}
})

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
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} style={sx.cardLayout}>
				{beian.link ? (
					<Link href={beian.link} target='_blank' rel='noopener noreferrer' {...stylex.props(sx.link)}>
						{beian.text}
					</Link>
				) : (
					<span {...stylex.props(sx.text)}>{beian.text}</span>
				)}
			</Card>
		</HomeDraggableLayer>
	)
}
