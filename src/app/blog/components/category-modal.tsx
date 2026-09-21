'use client'

import { useCallback, useMemo, useState, type DragEvent } from 'react'
import dayjs from 'dayjs'
import * as stylex from '@stylexjs/stylex'
import type { BlogIndexItem } from '@/hooks/use-blog-index'
import { DialogModal } from '@/components/dialog-modal'
import { Select } from '@/components/select'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import { X } from 'lucide-react'

interface CategoryModalProps {
	open: boolean
	onClose: () => void
	categoryList: string[]
	newCategory: string
	onNewCategoryChange: (value: string) => void
	onAddCategory: () => void
	onRemoveCategory: (category: string) => void
	onReorderCategories: (nextList: string[]) => void
	editableItems: BlogIndexItem[]
	onAssignCategory: (slug: string, category?: string) => void
}

/** 分类弹窗样式（数值取自 Tailwind v4 编译产物；space-y-4 分摊到非末项子块，动态列表间距同 blog-toc 先例） */
const styles = stylex.create({
	/** 弹窗内容：宽 720、最宽 90vw、圆角 16、内边距 24 */
	dialogBox: {
		width: 720,
		maxWidth: '90vw',
		borderRadius: 16,
		padding: 24
	},
	/** 分类选择器：满宽小字，宽屏固定 180 */
	rowSelect: {
		width: '100%',
		fontSize: 14,
		lineHeight: '20px',
		'@media (width >= 40rem)': {
			width: 180
		}
	},
	/** 标题行 */
	header: {
		marginBottom: 16,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	title: {
		fontSize: 18,
		lineHeight: '28px',
		fontWeight: 600
	},
	closeButton: {
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand
			}
		}
	},
	/** 新分类输入行（space-y-4 首项） */
	inputRow: {
		marginBottom: 16,
		display: 'flex',
		flexDirection: 'column',
		gap: 12,
		'@media (width >= 40rem)': {
			flexDirection: 'row',
			alignItems: 'center'
		}
	},
	input: {
		width: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		outlineStyle: 'none',
		':focus': {
			borderColor: colors.brand
		}
	},
	/** 新增分类按钮（仅补充不换行，其余沿用品牌按钮） */
	addButton: {
		whiteSpace: 'nowrap'
	},
	/** 分类标签区（space-y-4 次项） */
	chipsBox: {
		marginBottom: 16,
		display: 'flex',
		flexWrap: 'wrap',
		gap: 8,
		borderRadius: 8,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		padding: 12,
		fontSize: 14,
		lineHeight: '20px'
	},
	emptyText: {
		color: colors.secondary
	},
	/** 可拖拽分类标签（10% 品牌色底） */
	chip: {
		display: 'flex',
		cursor: 'move',
		alignItems: 'center',
		gap: 8,
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)',
		paddingBlock: 4,
		paddingRight: 6,
		paddingLeft: 12
	},
	/** 拖拽中的标签：品牌色细描边 + 降透明度（同次 props 合并，后写覆盖） */
	chipDragging: {
		opacity: 0.6,
		boxShadow: '0 0 0 1px color-mix(in oklab, var(--color-brand) 60%, transparent)'
	},
	chipLabel: {
		userSelect: 'none'
	},
	removeButton: {
		display: 'inline-flex',
		width: 16,
		height: 16,
		alignItems: 'center',
		justifyContent: 'center',
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand
			}
		}
	},
	removeIcon: {
		width: 12,
		height: 12
	},
	/** 文章列表滚动区（间距为 flex 列 + 间隙） */
	itemsBox: {
		display: 'flex',
		flexDirection: 'column',
		gap: 8,
		maxHeight: 360,
		overflowY: 'auto',
		borderRadius: 12,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		padding: 12
	},
	/** 文章行 */
	itemRow: {
		display: 'flex',
		flexDirection: 'column',
		gap: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 80%)',
		paddingInline: 12,
		paddingBlock: 8,
		'@media (width >= 40rem)': {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between'
		}
	},
	itemTitle: {
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	itemDate: {
		marginLeft: 8,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	emptyItems: {
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	}
})

export function CategoryModal({
	open,
	onClose,
	categoryList,
	newCategory,
	onNewCategoryChange,
	onAddCategory,
	onRemoveCategory,
	onReorderCategories,
	editableItems,
	onAssignCategory
}: CategoryModalProps) {
	const { t } = useI18n()
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
	const categoryOptions = useMemo(
		() => [{ value: '', label: t('blog.uncategorized') }, ...categoryList.map(cat => ({ value: cat, label: cat }))],
		[categoryList, t]
	)

	const handleDragStart = useCallback((index: number) => {
		return () => {
			setDraggingIndex(index)
		}
	}, [])

	const handleDragOver = useCallback((index: number) => {
		return (event: DragEvent<HTMLSpanElement>) => {
			event.preventDefault()
			event.dataTransfer.dropEffect = 'move'
		}
	}, [])

	const handleDrop = useCallback(
		(index: number) => {
			return (event: DragEvent<HTMLSpanElement>) => {
				event.preventDefault()
				if (draggingIndex === null || draggingIndex === index) return

				const next = [...categoryList]
				const [moved] = next.splice(draggingIndex, 1)
				next.splice(index, 0, moved)
				onReorderCategories(next)
				setDraggingIndex(null)
			}
		},
		[categoryList, draggingIndex, onReorderCategories]
	)

	const handleDragEnd = useCallback(() => {
		setDraggingIndex(null)
	}, [])

	return (
		<DialogModal open={open} onClose={onClose} style={[card.base, styles.dialogBox]}>
			<div {...stylex.props(styles.header)}>
				<div {...stylex.props(styles.title)}>{t('admin.articleCategories')}</div>
				<button onClick={onClose} {...stylex.props(styles.closeButton)}>
					{t('admin.close')}
				</button>
			</div>
			<div>
				<div {...stylex.props(styles.inputRow)}>
					<input
						value={newCategory}
						onChange={e => onNewCategoryChange(e.target.value)}
						placeholder={t('admin.categoryNamePlaceholder')}
						{...stylex.props(styles.input)}
					/>
					<button onClick={onAddCategory} {...stylex.props(brandBtn.base, styles.addButton)}>
						{t('admin.addCategory')}
					</button>
				</div>
				<div {...stylex.props(styles.chipsBox)}>
					{categoryList.length === 0 ? (
						<span {...stylex.props(styles.emptyText)}>{t('admin.noCategories')}</span>
					) : (
						categoryList.map((cat, index) => (
							<span
								key={cat}
								draggable
								onDragStart={handleDragStart(index)}
								onDragOver={handleDragOver(index)}
								onDrop={handleDrop(index)}
								onDragEnd={handleDragEnd}
								{...stylex.props(styles.chip, draggingIndex === index && styles.chipDragging)}>
								<span {...stylex.props(styles.chipLabel)}>{cat}</span>
								<button type='button' onClick={() => onRemoveCategory(cat)} {...stylex.props(styles.removeButton)} aria-label='Remove category'>
									<X {...stylex.props(styles.removeIcon)} />
								</button>
							</span>
						))
					)}
				</div>
				<div {...stylex.props(styles.itemsBox)}>
					{editableItems.map(item => (
						<div key={item.slug} {...stylex.props(styles.itemRow)}>
							<div {...stylex.props(styles.itemTitle)}>
								{item.title || item.slug}
								<span {...stylex.props(styles.itemDate)}>{dayjs(item.date).format('YYYY-MM-DD')}</span>
							</div>
							<Select value={item.category || ''} onChange={value => onAssignCategory(item.slug, value)} options={categoryOptions} style={styles.rowSelect} />
						</div>
					))}
					{editableItems.length === 0 && <div {...stylex.props(styles.emptyItems)}>{t('blog.noArticles')}</div>}
				</div>
			</div>
		</DialogModal>
	)
}
