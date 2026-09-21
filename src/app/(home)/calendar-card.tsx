import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { CARD_SPACING } from '@/consts'
import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { util } from '@/styles/shared/util.stylex'
import { HomeDraggableLayer } from './home-draggable-layer'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LOCALE } from '@/i18n/config'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 雪花装饰：绝对定位、不响应指针事件（定位数值保留内联 style） */
	snow: {
		position: 'absolute',
		pointerEvents: 'none'
	},
	/** Card 覆盖：纵向弹性布局 */
	cardColumn: {
		display: 'flex',
		flexDirection: 'column'
	},
	/** 日期标题：次级色、小号文字 */
	dateLabel: {
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 月历网格：次级色、小号文字、7 列、高 206、上边距 12、间距 8、占满剩余空间 */
	monthGrid: {
		marginTop: 12,
		display: 'grid',
		height: 206,
		flex: '1',
		gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
		gap: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 小尺寸形态：更小字号（同次 props 后写覆盖） */
	monthGridCompact: {
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 星期单元格：居中、中等字重 */
	cell: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontWeight: 500
	},
	/** 当前星期：品牌色 */
	weekdayActive: {
		color: colors.brand
	},
	/** 日期单元格：居中、小圆角 */
	dayCell: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 8
	},
	/** 今天：描边加粗 + 中等字重（渐变背景由 util.bgLinear 承接） */
	dayToday: {
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		fontWeight: 500
	}
})

export default function CalendarCard() {
	const { locale, t } = useI18n()
	const center = useCenterStore()
	const { styles, hiCardWidth, clockCardOffset, enableChristmas } = useConfigStore(
		useShallow(s => ({
			styles: s.cardStyles.calendarCard,
			hiCardWidth: s.cardStyles.hiCard.width,
			clockCardOffset: s.cardStyles.clockCard.offset,
			enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined
		}))
	)
	const now = dayjs().locale(locale === DEFAULT_LOCALE ? 'zh-cn' : locale)
	/** 星期表头（周一在前），单字随语言切换 */
	const weekdayLabels = [t('home.weekMon'), t('home.weekTue'), t('home.weekWed'), t('home.weekThu'), t('home.weekFri'), t('home.weekSat'), t('home.weekSun')]
	const currentDate = now.date()
	const firstDayOfMonth = now.startOf('month')
	const firstDayWeekday = (firstDayOfMonth.day() + 6) % 7
	const daysInMonth = now.daysInMonth()
	const currentWeekday = (now.day() + 6) % 7

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardWidth / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardOffset + CARD_SPACING

	return (
		<HomeDraggableLayer cardKey='calendarCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} style={[sx.cardColumn]}>
				{enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-7.webp'
							alt='Christmas decoration'
							className={stylex.props(sx.snow).className}
							style={{ width: 150, right: -12, top: -12, opacity: 0.8 }}
						/>
					</>
				)}

				<h3 {...stylex.props(sx.dateLabel)}>
					{now.format('YYYY/M/D')} {now.format('ddd')}
				</h3>
				<ul {...stylex.props(sx.monthGrid, (styles.height < 240 || styles.width < 240) && sx.monthGridCompact)}>
					{new Array(7).fill(0).map((_, index) => {
						const isCurrentWeekday = index === currentWeekday
						return (
							<li key={index} {...stylex.props(sx.cell, isCurrentWeekday && sx.weekdayActive)}>
								{weekdayLabels[index]}
							</li>
						)
					})}

					{new Array(firstDayWeekday).fill(0).map((_, index) => (
						<li key={`empty-${index}`} />
					))}

					{new Array(daysInMonth).fill(0).map((_, index) => {
						const day = index + 1
						const isToday = day === currentDate
						return (
							<li key={day} {...stylex.props(sx.dayCell, isToday && util.bgLinear, isToday && sx.dayToday)}>
								{day}
							</li>
						)
					})}
				</ul>
			</Card>
		</HomeDraggableLayer>
	)
}
