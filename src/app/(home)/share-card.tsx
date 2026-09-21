'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { CARD_SPACING } from '@/consts'
import shareListZh from '@/app/share/list.json'
import shareListEn from '@/app/share/list.en.json'
import Link from 'next/link'
import { HomeDraggableLayer } from './home-draggable-layer'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LOCALE } from '@/i18n/config'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 雪花装饰：绝对定位、不响应指针事件（定位数值保留内联 style） */
	snow: {
		position: 'absolute',
		pointerEvents: 'none'
	},
	/** 标题：次级色、小号文字 */
	title: {
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 推荐链接：块级、上边距 8 */
	recLink: {
		marginTop: 8,
		display: 'block'
	},
	/** 推荐条目：横向排列；原列表项间距 8 分摊到本非末项 */
	recItem: {
		display: 'flex',
		alignItems: 'center',
		marginBottom: 8
	},
	/** 站点图标容器：相对定位、48×48、不收缩、裁切、小圆角 */
	logoBox: {
		position: 'relative',
		marginRight: 12,
		width: 48,
		height: 48,
		flexShrink: 0,
		overflow: 'hidden',
		borderRadius: 12
	},
	/** 站点图标：撑满容器、等比完整显示 */
	logoImg: {
		width: '100%',
		height: '100%',
		objectFit: 'contain'
	},
	/** 站点名称：小号文字、中等字重 */
	name: {
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 简介：最多三行、次级色、小号文字 */
	description: {
		display: '-webkit-box',
		WebkitBoxOrient: 'vertical',
		WebkitLineClamp: 3,
		overflow: 'hidden',
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	}
})

type ShareItem = {
	name: string
	url: string
	logo: string
	description: string
	tags: string[]
	stars: number
}

export default function ShareCard() {
	const center = useCenterStore()
	const { styles, hiCardStyles, socialButtonsStyles, enableChristmas } = useConfigStore(
		useShallow(s => ({
			styles: s.cardStyles.shareCard,
			hiCardStyles: s.cardStyles.hiCard,
			socialButtonsStyles: s.cardStyles.socialButtons,
			enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined
		}))
	)
	const [randomItem, setRandomItem] = useState<ShareItem | null>(null)
	const { locale, t } = useI18n()

	useEffect(() => {
		const shareList = locale !== DEFAULT_LOCALE ? shareListEn : shareListZh
		const randomIndex = Math.floor(Math.random() * shareList.length)
		setRandomItem(shareList[randomIndex])
	}, [locale])

	if (!randomItem) {
		return null
	}

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + hiCardStyles.width / 2 - socialButtonsStyles.width
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 + CARD_SPACING + socialButtonsStyles.height + CARD_SPACING

	return (
		<HomeDraggableLayer cardKey='shareCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y}>
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-12.webp'
							alt='Christmas decoration'
							{...stylex.props(sx.snow)}
							style={{ width: 120, left: -12, top: -12, opacity: 0.8 }}
						/>
					</>
				)}

				<h2 {...stylex.props(sx.title)}>{t('home.randomPick')}</h2>

				<Link href='/share' {...stylex.props(sx.recLink)}>
					<div {...stylex.props(sx.recItem)}>
						<div {...stylex.props(sx.logoBox)}>
							<img src={randomItem.logo} alt={randomItem.name} {...stylex.props(sx.logoImg)} />
						</div>
						<h3 {...stylex.props(sx.name)}>{randomItem.name}</h3>
					</div>

					<p {...stylex.props(sx.description)}>{randomItem.description}</p>
				</Link>
			</Card>
		</HomeDraggableLayer>
	)
}
