'use client'

import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { useConfigStore, type CardStyles } from '../stores/config-store'
import { useLayoutEditStore } from '../stores/layout-edit-store'
import cardStylesDefault from '@/config/card-styles-default.json'
import { useI18n } from '@/i18n/context'
import type { TranslationKey } from '@/i18n/translate'
import { util } from '@/styles/shared/util.stylex'
import { colors } from '@/styles/tokens.stylex'

const CARD_LABEL_KEYS: Record<string, TranslationKey> = {
	artCard: 'config.cardArt',
	hiCard: 'config.cardHi',
	clockCard: 'config.cardClock',
	calendarCard: 'config.cardCalendar',
	musicCard: 'config.cardMusic',
	socialButtons: 'config.cardSocial',
	shareCard: 'config.cardShare',
	articleCard: 'config.cardArticle',
	writeButtons: 'config.cardWrite',
	navCard: 'config.cardNav',
	likePosition: 'config.cardLike',
	hatCard: 'config.cardHat',
	beianCard: 'config.cardBeian'
}

interface HomeLayoutProps {
	cardStylesData: CardStyles
	setCardStylesData: React.Dispatch<React.SetStateAction<CardStyles>>
	onClose?: () => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 横向滚动容器 */
	scrollWrap: {
		overflowX: 'auto'
	},
	/** 面板头部：两端对齐 */
	headerRow: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	/** 灰色小字提示 */
	hint: {
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 右侧操作组 */
	headerActions: {
		display: 'flex',
		flexShrink: 0,
		alignItems: 'center',
		gap: 8,
		whiteSpace: 'nowrap'
	},
	/** 卡片底色描边按钮 */
	cardButton: {
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px',
		fontWeight: 500
	},
	/** 编辑进行中的禁用态 */
	cardButtonDisabled: {
		':disabled': {
			cursor: 'not-allowed',
			opacity: 0.5
		}
	},
	/** 布局表格基础样式 */
	table: {
		marginTop: 12,
		width: '100%',
		borderCollapse: 'collapse',
		fontSize: 14,
		lineHeight: '20px',
		whiteSpace: 'nowrap'
	},
	/** 表头行（灰色小字 + 底边框） */
	headRow: {
		borderBottomWidth: 1,
		borderBottomStyle: 'solid',
		borderBottomColor: colors.border,
		fontSize: 12,
		lineHeight: '16px',
		color: '#6a7282'
	},
	/** 表头单元格 */
	headCell: {
		paddingInline: 12,
		paddingBlock: 8,
		textAlign: 'left',
		fontWeight: 500
	},
	/** 数据行：底边框，末行去掉 */
	bodyRow: {
		borderBottomWidth: 1,
		borderBottomStyle: 'solid',
		borderBottomColor: colors.border,
		':last-child': {
			borderBottomWidth: 0
		}
	},
	/** 数据单元格 */
	cell: {
		paddingInline: 12,
		paddingBlock: 8
	},
	/** 卡片名单元格（纵向居中） */
	nameCell: {
		paddingInline: 12,
		paddingBlock: 8,
		verticalAlign: 'middle',
		whiteSpace: 'nowrap'
	},
	/** 数字输入框：浅灰底、圆角描边（需隐藏步进箭头处配合 util.noSpinner） */
	numberInput: {
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)',
		width: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 不支持字段的占位符 */
	emptyText: {
		fontSize: 12,
		lineHeight: '16px',
		color: '#99a1af'
	},
	/** 启用勾选框（勾选色为品牌色） */
	checkbox: {
		accentColor: colors.brand,
		width: 16,
		height: 16,
		borderRadius: 4,
		borderColor: '#d1d5dc'
	}
})

export function HomeLayout({ cardStylesData, setCardStylesData, onClose }: HomeLayoutProps) {
	const { t } = useI18n()
	const { setCardStyles } = useConfigStore()
	const startEditing = useLayoutEditStore(state => state.startEditing)
	const editing = useLayoutEditStore(state => state.editing)

	const handleStartManualLayout = () => {
		setCardStyles(cardStylesData)
		startEditing()
		onClose?.()
	}

	const handleReset = () => {
		setCardStylesData(cardStylesDefault as CardStyles)
	}

	return (
		<div {...stylex.props(styles.scrollWrap)}>
			<div {...stylex.props(styles.headerRow)}>
				<div {...stylex.props(styles.hint)}>{t('config.layoutOffsetHint')}</div>
				<div {...stylex.props(styles.headerActions)}>
					<button type='button' onClick={handleReset} {...stylex.props(styles.cardButton)}>
						{t('config.reset')}
					</button>
					<button type='button' onClick={handleStartManualLayout} disabled={editing} {...stylex.props(styles.cardButton, styles.cardButtonDisabled)}>
						{editing ? t('config.homeEditing') : t('config.enterDragLayout')}
					</button>
				</div>
			</div>
			<table {...stylex.props(styles.table)}>
				<thead>
					<tr {...stylex.props(styles.headRow)}>
						<th {...stylex.props(styles.headCell)}>{t('config.thCard')}</th>
						<th {...stylex.props(styles.headCell)}>{t('config.thWidth')}</th>
						<th {...stylex.props(styles.headCell)}>{t('config.thHeight')}</th>
						<th {...stylex.props(styles.headCell)}>{t('config.thOrder')}</th>
						<th {...stylex.props(styles.headCell)}>{t('config.thOffsetX')}</th>
						<th {...stylex.props(styles.headCell)}>{t('config.thOffsetY')}</th>
						<th {...stylex.props(styles.headCell)}>{t('config.thEnabled')}</th>
					</tr>
				</thead>
				<tbody>
					{Object.entries(cardStylesData).map(([key, cardStyle]: [string, any]) => {
						const labelKey = CARD_LABEL_KEYS[key]
						return (
							<tr key={key} {...stylex.props(styles.bodyRow)}>
								<td {...stylex.props(styles.nameCell)}>{labelKey ? t(labelKey) : key.replace(/([A-Z])/g, ' $1').trim()}</td>

								<td {...stylex.props(styles.cell)}>
									{cardStyle.width !== undefined ? (
										<input
											type='number'
											value={cardStyle.width}
											onChange={e =>
												setCardStylesData(prev => ({
													...prev,
													[key]: {
														...prev[key as keyof CardStyles],
														width: parseInt(e.target.value) || 0
													}
												}))
											}
											{...stylex.props(util.noSpinner, styles.numberInput)}
										/>
									) : (
										<span {...stylex.props(styles.emptyText)}>-</span>
									)}
								</td>
								<td {...stylex.props(styles.cell)}>
									{cardStyle.height !== undefined ? (
										<input
											type='number'
											value={cardStyle.height}
											onChange={e =>
												setCardStylesData(prev => ({
													...prev,
													[key]: {
														...prev[key as keyof CardStyles],
														height: parseInt(e.target.value) || 0
													}
												}))
											}
											{...stylex.props(util.noSpinner, styles.numberInput)}
										/>
									) : (
										<span {...stylex.props(styles.emptyText)}>-</span>
									)}
								</td>
								<td {...stylex.props(styles.cell)}>
									<input
										type='number'
										value={cardStyle.order}
										onChange={e =>
											setCardStylesData(prev => ({
												...prev,
												[key]: {
													...prev[key as keyof CardStyles],
													order: parseInt(e.target.value) || 0
												}
											}))
										}
										{...stylex.props(styles.numberInput)}
									/>
								</td>
								<td {...stylex.props(styles.cell)}>
									<input
										type='number'
										value={cardStyle.offsetX ?? ''}
										placeholder='null'
										onChange={e => {
											const value = e.target.value === '' ? null : parseInt(e.target.value) || 0
											setCardStylesData(prev => ({
												...prev,
												[key]: {
													...prev[key as keyof CardStyles],
													offsetX: value
												}
											}))
										}}
										{...stylex.props(util.noSpinner, styles.numberInput)}
									/>
								</td>
								<td {...stylex.props(styles.cell)}>
									<input
										type='number'
										value={cardStyle.offsetY ?? ''}
										placeholder='null'
										onChange={e => {
											const value = e.target.value === '' ? null : parseInt(e.target.value) || 0
											setCardStylesData(prev => ({
												...prev,
												[key]: {
													...prev[key as keyof CardStyles],
													offsetY: value
												}
											}))
										}}
										{...stylex.props(util.noSpinner, styles.numberInput)}
									/>
								</td>
								<td {...stylex.props(styles.cell)}>
									<input
										type='checkbox'
										checked={cardStyle.enabled ?? true}
										onChange={e =>
											setCardStylesData(prev => ({
												...prev,
												[key]: {
													...prev[key as keyof CardStyles],
													enabled: e.target.checked
												}
											}))
										}
										{...stylex.props(styles.checkbox)}
									/>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
