import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useLatestBlog } from '@/hooks/use-blog-index'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { CARD_SPACING } from '@/consts'
import dayjs from 'dayjs'
import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { HomeDraggableLayer } from './home-draggable-layer'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 雪花装饰：绝对定位、不响应指针事件（定位数值保留内联 style） */
	snow: {
		position: 'absolute',
		pointerEvents: 'none'
	},
	/** Card 覆盖：小屏改静态 */
	cardStatic: {
		'@media (width < 40rem)': {
			position: 'static'
		}
	},
	/** 标题：次级色、小号、下外边距 8（分摊原纵向间距；雪花绝对定位不参与布局） */
	title: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 占位块：固定高度 60、Flex 居中 */
	placeholder: {
		display: 'flex',
		height: 60,
		alignItems: 'center',
		justifyContent: 'center'
	},
	/** 提示文字：次级色、小号 */
	hint: {
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 文章链接：Flex、透明度过渡、悬停变淡（悬停变体包在指针设备媒体查询内） */
	articleLink: {
		display: 'flex',
		transitionProperty: 'opacity',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		transitionDuration: '150ms',
		'@media (hover: hover)': {
			':hover': {
				opacity: 0.8
			}
		}
	},
	/** 封面图：48×48、小圆角、描边、裁切填充、右外边距 12 */
	cover: {
		marginRight: 12,
		height: 48,
		width: 48,
		flexShrink: 0,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		objectFit: 'cover'
	},
	/** 无封面占位：次级色、网格居中、半透明白底、48×48、小圆角、右外边距 12 */
	coverFallback: {
		marginRight: 12,
		display: 'grid',
		height: 48,
		width: 48,
		flexShrink: 0,
		placeItems: 'center',
		borderRadius: 12,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		color: colors.secondary
	},
	/** 占满剩余宽度 */
	body: {
		flex: '1'
	},
	/** 文章标题：单行裁切、小号、中等字重 */
	articleTitle: {
		display: '-webkit-box',
		WebkitBoxOrient: 'vertical',
		WebkitLineClamp: 1,
		overflow: 'hidden',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 摘要：三行裁切、次级色、小号、上外边距 4 */
	summary: {
		marginTop: 4,
		display: '-webkit-box',
		WebkitBoxOrient: 'vertical',
		WebkitLineClamp: 3,
		overflow: 'hidden',
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 日期：次级色、小号、上外边距 12 */
	date: {
		marginTop: 12,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	}
})

export default function ArticleCard() {
	const center = useCenterStore()
	const { styles, hiCardStyles, socialButtonsStyles, enableChristmas } = useConfigStore(useShallow(s => ({
		styles: s.cardStyles.articleCard,
		hiCardStyles: s.cardStyles.hiCard,
		socialButtonsStyles: s.cardStyles.socialButtons,
		enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined,
	})))
	const { blog, loading } = useLatestBlog()

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + hiCardStyles.width / 2 - socialButtonsStyles.width - CARD_SPACING - styles.width
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 + CARD_SPACING

	return (
		<HomeDraggableLayer cardKey='articleCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} style={sx.cardStatic}>
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-9.webp'
							alt='Christmas decoration'
							className={stylex.props(sx.snow).className}
							style={{ width: 140, left: -12, top: -16, opacity: 0.8 }}
						/>
					</>
				)}

				<h2 {...stylex.props(sx.title)}>最新文章</h2>

				{loading ? (
					<div {...stylex.props(sx.placeholder)}>
						<span {...stylex.props(sx.hint)}>加载中...</span>
					</div>
				) : blog ? (
					<Link href={`/blog/${blog.slug}`} {...stylex.props(sx.articleLink)}>
						{blog.cover ? (
							<img src={blog.cover} alt='cover' {...stylex.props(sx.cover)} />
						) : (
							<div {...stylex.props(sx.coverFallback)}>+</div>
						)}
						<div {...stylex.props(sx.body)}>
							<h3 {...stylex.props(sx.articleTitle)}>{blog.title || blog.slug}</h3>
							{blog.summary && <p {...stylex.props(sx.summary)}>{blog.summary}</p>}
							<p {...stylex.props(sx.date)}>{dayjs(blog.date).format('YYYY/M/D')}</p>
						</div>
					</Link>
				) : (
					<div {...stylex.props(sx.placeholder)}>
						<span {...stylex.props(sx.hint)}>暂无文章</span>
					</div>
				)}
			</Card>
		</HomeDraggableLayer>
	)
}
