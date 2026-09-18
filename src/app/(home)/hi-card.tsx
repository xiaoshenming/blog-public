import { useCenterStore } from '@/hooks/use-center'
import Card from '@/components/card'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { HomeDraggableLayer } from './home-draggable-layer'
import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import { fonts } from '@/styles/tokens.stylex'
import { util } from '@/styles/shared/util.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 雪花装饰：绝对定位、不响应指针事件（定位数值保留内联 style） */
	snow: {
		position: 'absolute',
		pointerEvents: 'none'
	},
	/** Card 覆盖：相对定位、文字居中、小屏改静态并清除位移（同次 props 后写覆盖） */
	cardLayout: {
		position: 'relative',
		textAlign: 'center',
		'@media (width < 40rem)': {
			position: 'static',
			translate: '0px 0px'
		}
	},
	/** 头像：水平居中、圆形（尺寸与投影保留内联 style） */
	avatar: {
		marginInline: 'auto',
		borderRadius: 9999
	},
	/** 问候语：手写体、大号标题、上边距 12 */
	greeting: {
		fontFamily: fonts.averia,
		marginTop: 12,
		fontSize: 24,
		lineHeight: '32px'
	},
	/** 用户名：32px（渐变文字由 util.textLinear 承接） */
	username: {
		fontSize: 32
	}
})

function getGreeting() {
	const hour = new Date().getHours()

	if (hour >= 6 && hour < 12) {
		return 'Good Morning'
	} else if (hour >= 12 && hour < 18) {
		return 'Good Afternoon'
	} else if (hour >= 18 && hour < 22) {
		return 'Good Evening'
	} else {
		return 'Good Night'
	}
}

export default function HiCard() {
	const center = useCenterStore()
	const { styles, username, enableChristmas } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.hiCard,
		username: s.siteContent.meta.username || 'Suni',
		enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined,
	})))
	const greeting = getGreeting()

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - styles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - styles.height / 2

	return (
		<HomeDraggableLayer cardKey='hiCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} style={[sx.cardLayout]}>
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-1.webp'
							alt='Christmas decoration'
							className={stylex.props(sx.snow).className}
							style={{ width: 180, left: -20, top: -25, opacity: 0.9 }}
						/>
						<img
							src='/images/christmas/snow-2.webp'
							alt='Christmas decoration'
							className={stylex.props(sx.snow).className}
							style={{ width: 160, bottom: -12, right: -8, opacity: 0.9 }}
						/>
					</>
				)}
				<Link href='/live2d'>
					<img src='/images/avatar.png' className={stylex.props(sx.avatar).className} style={{ width: 120, height: 120, boxShadow: ' 0 16px 32px -5px #E2D9CE' }} />
				</Link>
				<h1 {...stylex.props(sx.greeting)}>
					{greeting} <br /> I'm <span {...stylex.props(util.textLinear, sx.username)}>{username}</span> , Nice to <br /> meet you!
				</h1>
			</Card>
		</HomeDraggableLayer>
	)
}
