'use client'

import Link from 'next/link'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'

dayjs.extend(weekOfYear)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'
import ShortLineSVG from '@/svgs/short-line.svg'
import { useBlogIndex, type BlogIndexItem } from '@/hooks/use-blog-index'
import { useCategories } from '@/hooks/use-categories'
import { useReadArticles } from '@/hooks/use-read-articles'
import GithubSVG from '@/svgs/github.svg'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { readFileAsText } from '@/lib/file-utils'
import { saveBlogEdits } from './services/save-blog-edits'
import { Check } from 'lucide-react'
import { BlogCoverHoverPreview, useBlogCoverHover } from './components/blog-cover-hover'
import { CategoryModal } from './components/category-modal'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn, btnRounded } from '@/styles/shared/button.stylex'
import { hoverGroup } from '@/styles/shared/markers.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import { formatDate } from '@/i18n/dates'

type DisplayMode = 'day' | 'week' | 'month' | 'year' | 'category'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；卡片系样式复用共享定义） */
const styles = stylex.create({
	/** 隐藏的密钥文件输入框 */
	fileInput: {
		display: 'none'
	},
	/** 页面主容器：纵向居中列 */
	page: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 24,
		paddingInline: 24,
		paddingTop: 96
	},
	/** 时间维度切换条：在卡片基底上改相对定位并收窄内边距，小屏隐藏 */
	filterBar: {
		position: 'relative',
		marginInline: 'auto',
		display: 'flex',
		alignItems: 'center',
		gap: 4,
		padding: 4,
		'@media (width < 40rem)': {
			display: 'none'
		}
	},
	/** 切换按钮：胶囊形态与统一过渡 */
	modeBtn: {
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px',
		fontWeight: 500,
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 切换按钮·选中：品牌色底白字 + 轻投影 */
	modeActive: {
		backgroundColor: colors.brand,
		color: colors.white,
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)'
	},
	/** 切换按钮·未选中：灰字，悬停转品牌色并浮白 */
	modeIdle: {
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand,
				backgroundColor: 'rgb(255 255 255 / 60%)'
			}
		}
	},
	/** 分组卡：相对定位覆盖卡片基底，限宽铺满 */
	groupCard: {
		position: 'relative',
		width: '100%',
		maxWidth: 840
	},
	/** 分组头行（纵向间隔由下边距承担） */
	groupHeader: {
		marginBottom: 12,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		fontSize: 16,
		lineHeight: '24px'
	},
	groupHeaderLeft: {
		display: 'flex',
		alignItems: 'center',
		gap: 12
	},
	groupTitle: {
		fontWeight: 500
	},
	/** 分组标题后的装饰圆点 */
	groupDot: {
		width: 8,
		height: 8,
		borderRadius: 9999,
		backgroundColor: '#D9D9D9'
	},
	groupCount: {
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 分组全选按钮 */
	selectGroupBtn: {
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		paddingInline: 12,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 分组全选按钮·已全选 */
	selectGroupOn: {
		borderColor: 'color-mix(in oklab, var(--color-brand) 40%, transparent)',
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 10%, transparent)',
		color: colors.brand,
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, var(--color-brand) 20%, transparent)'
			}
		}
	},
	/** 分组全选按钮·未全选（悬停出品牌描边与浅底） */
	selectGroupOff: {
		borderColor: 'transparent',
		backgroundColor: 'rgb(255 255 255 / 60%)',
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				borderColor: 'color-mix(in oklab, var(--color-brand) 40%, transparent)',
				backgroundColor: 'rgb(255 255 255 / 80%)',
				color: colors.brand
			}
		}
	},
	/** 文章行基础：横排、最小高度与整体过渡 */
	rowBase: {
		display: 'flex',
		minHeight: 40,
		alignItems: 'center',
		gap: 12,
		paddingBlock: 12,
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 文章行·编辑态外框 */
	rowEdit: {
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12
	},
	/** 文章行·已选中 */
	rowSelected: {
		borderColor: 'color-mix(in oklab, var(--color-brand) 60%, transparent)',
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 5%, transparent)'
	},
	/** 文章行·未选中（悬停出描边与浮白） */
	rowUnselected: {
		borderColor: 'transparent',
		'@media (hover: hover)': {
			':hover': {
				borderColor: 'color-mix(in oklab, var(--color-brand) 40%, transparent)',
				backgroundColor: 'rgb(255 255 255 / 60%)'
			}
		}
	},
	/** 文章行·浏览态指针 */
	rowPointer: {
		cursor: 'pointer'
	},
	/** 行内选择框 */
	checkBox: {
		display: 'flex',
		width: 16,
		height: 16,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		fontSize: 10,
		fontWeight: 600
	},
	checkBoxOn: {
		borderColor: colors.brand,
		backgroundColor: colors.brand,
		color: colors.white
	},
	checkBoxOff: {
		borderColor: '#D9D9D9',
		color: 'transparent'
	},
	/** 日期列 */
	dateLabel: {
		width: 44,
		flexShrink: 0,
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		color: colors.secondary
	},
	/** 时间轴列：圆点与连接线 */
	dotColumn: {
		position: 'relative',
		display: 'flex',
		width: 8,
		height: 8,
		alignItems: 'center',
		justifyContent: 'center'
	},
	/** 时间轴圆点（悬停行容器时变大并转品牌色） */
	dot: {
		width: 5,
		height: {
			default: 5,
			[stylex.when.ancestor(':hover', hoverGroup)]: 16
		},
		borderRadius: 9999,
		backgroundColor: {
			default: colors.secondary,
			[stylex.when.ancestor(':hover', hoverGroup)]: colors.brand
		},
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 时间轴短竖线 */
	shortLine: {
		position: 'absolute',
		bottom: 16
	},
	/** 文章标题 */
	itemTitle: {
		flex: '1',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 文章标题·浏览态悬停联动（悬停行容器时变色并右移） */
	titleHover: {
		[stylex.when.ancestor(':hover', hoverGroup)]: {
			color: colors.brand,
			transform: 'translateX(8px)'
		}
	},
	/** 已阅读标记 */
	readTag: {
		marginLeft: 8,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 标签行（小屏隐藏） */
	tagList: {
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 8,
		'@media (width < 40rem)': {
			display: 'none'
		}
	},
	tagItem: {
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 底部留白与状态文案 */
	bottomArea: {
		paddingTop: 48
	},
	statusText: {
		paddingBlock: 24,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 「更多」行容器 */
	moreRow: {
		textAlign: 'center'
	},
	/** 「更多」入口图标尺寸 */
	githubIcon: {
		width: 16,
		height: 16
	},
	/** 「更多」入口：在卡片基底上去绝对定位、改行内弹性排布 */
	moreLink: {
		position: 'static',
		display: 'inline-flex',
		alignItems: 'center',
		gap: 8,
		borderRadius: 12,
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 右上角工具栏（小屏隐藏） */
	toolbar: {
		position: 'absolute',
		top: 16,
		right: 24,
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		'@media (width < 40rem)': {
			display: 'none'
		}
	},
	/** 工具栏白底按钮（悬停更白） */
	toolBtn: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		}
	},
	/** 工具栏取消按钮（更宽留白、无悬停变化） */
	cancelBtn: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 工具栏删除按钮（红系，禁用时降透明度） */
	deleteBtn: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#ffcaca',
		backgroundColor: '#fef2f2',
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: '#e40014',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		':disabled': {
			opacity: 0.6
		}
	},
	/** 工具栏保存按钮的横向留白（覆盖品牌按钮默认值） */
	saveBtn: {
		paddingInline: 24
	},
	/** 工具栏编辑按钮（毛玻璃白卡，悬停更白） */
	editBtn: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backdropFilter: 'blur(8px)',
		backgroundColor: colors.card,
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		}
	}
})

export default function BlogPage() {
	const { items, baseItems, loading } = useBlogIndex()
	// 展示端分类用当前语言；编辑链路（categoryList/保存）固定中文源，避免译文写回数据
	const { categories: localizedCategories } = useCategories({ localeAware: true })
	const { categories: categoriesFromServer } = useCategories()
	const { isRead } = useReadArticles()
	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const { locale, t } = useI18n()
	const hideEditButton = siteContent.hideEditButton ?? false
	const enableCategories = siteContent.enableCategories ?? false

	const keyInputRef = useRef<HTMLInputElement>(null)
	const [editMode, setEditMode] = useState(false)
	const [editableItems, setEditableItems] = useState<BlogIndexItem[]>([])
	const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
	const [saving, setSaving] = useState(false)
	const [displayMode, setDisplayMode] = useState<DisplayMode>('year')
	const [categoryModalOpen, setCategoryModalOpen] = useState(false)
	const [categoryList, setCategoryList] = useState<string[]>([])
	const [newCategory, setNewCategory] = useState('')
	const { cancelCoverPreview, onCoverLinkMouseEnter, hoverCoverPreview, mousePosition } = useBlogCoverHover(editMode)

	useEffect(() => {
		if (!editMode) {
			setEditableItems(baseItems)
		}
	}, [baseItems, editMode])

	useEffect(() => {
		setCategoryList(categoriesFromServer || [])
	}, [categoriesFromServer])

	const displayItems = editMode ? editableItems : items

	const { groupedItems, groupKeys, getGroupLabel } = useMemo(() => {
		const sorted = [...displayItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

		const grouped = sorted.reduce(
			(acc, item) => {
				let key: string
				let label: string
				const date = dayjs(item.date)

				switch (displayMode) {
					case 'category':
						key = item.category || t('blog.uncategorized')
						label = key
						break
					case 'day':
						key = date.format('YYYY-MM-DD')
						label = formatDate(item.date, locale)
						break
					case 'week':
						const week = date.week()
						key = `${date.format('YYYY')}-W${week.toString().padStart(2, '0')}`
						label = t('blog.weekOfYear', { year: date.year(), week })
						break
					case 'month':
						key = date.format('YYYY-MM')
						label = t('blog.monthOfYear', { year: date.year(), month: date.month() + 1 })
						break
					case 'year':
					default:
						key = date.format('YYYY')
						label = t('blog.yearOf', { year: date.year() })
						break
				}

				if (!acc[key]) {
					acc[key] = { items: [], label }
				}
				acc[key].items.push(item)
				return acc
			},
			{} as Record<string, { items: BlogIndexItem[]; label: string }>
		)

		const keys = Object.keys(grouped).sort((a, b) => {
			if (displayMode === 'category') {
				// 文章 category 随语言展示，排序对照也用语言版分类，缺失时退回中文源
				const orderSource = localizedCategories.length > 0 ? localizedCategories : categoryList
				const categoryOrder = new Map(orderSource.map((c, index) => [c, index]))
				const aOrder = categoryOrder.has(a) ? categoryOrder.get(a)! : Number.MAX_SAFE_INTEGER
				const bOrder = categoryOrder.has(b) ? categoryOrder.get(b)! : Number.MAX_SAFE_INTEGER
				if (aOrder !== bOrder) return aOrder - bOrder
				return a.localeCompare(b)
			}
			// 按时间倒序排序
			if (displayMode === 'week') {
				// 周格式：YYYY-WW
				const [yearA, weekA] = a.split('-W').map(Number)
				const [yearB, weekB] = b.split('-W').map(Number)
				if (yearA !== yearB) return yearB - yearA
				return weekB - weekA
			}
			return b.localeCompare(a)
		})

		return {
			groupedItems: grouped,
			groupKeys: keys,
			getGroupLabel: (key: string) => grouped[key]?.label || key
		}
	}, [displayItems, displayMode, categoryList, localizedCategories, locale, t])

	const selectedCount = selectedSlugs.size
	const buttonText = isAuth ? t('admin.save') : t('admin.importKey')

	const toggleEditMode = useCallback(() => {
		if (editMode) {
			setEditMode(false)
			setEditableItems(baseItems)
			setSelectedSlugs(new Set())
		} else {
			setEditableItems(baseItems)
			setEditMode(true)
		}
	}, [editMode, baseItems])

	const toggleSelect = useCallback((slug: string) => {
		setSelectedSlugs(prev => {
			const next = new Set(prev)
			if (next.has(slug)) {
				next.delete(slug)
			} else {
				next.add(slug)
			}
			return next
		})
	}, [])

	// 全选所有文章
	const handleSelectAll = useCallback(() => {
		setSelectedSlugs(new Set(editableItems.map(item => item.slug)))
	}, [editableItems])

	// 全选/取消全选某个时间维度分组
	const handleSelectGroup = useCallback(
		(groupKey: string) => {
			const group = groupedItems[groupKey]
			if (!group) return

			// 检查该分组是否所有文章都已选中
			const allSelected = group.items.every(item => selectedSlugs.has(item.slug))

			setSelectedSlugs(prev => {
				const next = new Set(prev)
				if (allSelected) {
					// 如果已全选，则取消该分组的选择
					group.items.forEach(item => {
						next.delete(item.slug)
					})
				} else {
					// 如果未全选，则全选该分组
					group.items.forEach(item => {
						next.add(item.slug)
					})
				}
				return next
			})
		},
		[groupedItems, selectedSlugs]
	)

	// 取消全选
	const handleDeselectAll = useCallback(() => {
		setSelectedSlugs(new Set())
	}, [])

	const handleItemClick = useCallback(
		(event: React.MouseEvent, slug: string) => {
			if (!editMode) return
			event.preventDefault()
			event.stopPropagation()
			toggleSelect(slug)
		},
		[editMode, toggleSelect]
	)

	const handleDeleteSelected = useCallback(() => {
		if (selectedCount === 0) {
			toast.info(t('admin.selectArticlesToDelete'))
			return
		}
		setEditableItems(prev => prev.filter(item => !selectedSlugs.has(item.slug)))
		setSelectedSlugs(new Set())
	}, [selectedCount, selectedSlugs, t])

	const handleAssignCategory = useCallback((slug: string, category?: string) => {
		setEditableItems(prev =>
			prev.map(item => {
				if (item.slug !== slug) return item
				const nextCategory = category?.trim()
				if (!nextCategory) return { ...item, category: undefined }
				return { ...item, category: nextCategory }
			})
		)
	}, [])

	const handleAddCategory = useCallback(() => {
		const value = newCategory.trim()
		if (!value) {
			toast.info(t('admin.categoryNameRequired'))
			return
		}
		setCategoryList(prev => (prev.includes(value) ? prev : [...prev, value]))
		setNewCategory('')
	}, [newCategory, t])

	const handleRemoveCategory = useCallback((category: string) => {
		setCategoryList(prev => prev.filter(item => item !== category))
		setEditableItems(prev => prev.map(item => (item.category === category ? { ...item, category: undefined } : item)))
	}, [])

	const handleReorderCategories = useCallback((nextList: string[]) => {
		setCategoryList(nextList)
	}, [])

	const handleCancel = useCallback(() => {
		setEditableItems(baseItems)
		setSelectedSlugs(new Set())
		setEditMode(false)
	}, [baseItems])

	const handleSave = useCallback(async () => {
		const removedSlugs = baseItems.filter(item => !editableItems.some(editItem => editItem.slug === item.slug)).map(item => item.slug)
		const normalizedCategoryList = categoryList.map(c => c.trim()).filter(Boolean)
		const categoryListChanged = JSON.stringify(normalizedCategoryList) !== JSON.stringify((categoriesFromServer || []).map(c => c.trim()).filter(Boolean))
		const categoryAssignmentChanged = baseItems.some(origin => {
			const next = editableItems.find(editItem => editItem.slug === origin.slug)
			const originCategory = origin.category || ''
			const nextCategory = next?.category || ''
			return originCategory !== nextCategory
		})
		const hasChanges = removedSlugs.length > 0 || categoryListChanged || categoryAssignmentChanged

		if (!hasChanges) {
			toast.info(t('admin.noChangesToSave'))
			return
		}

		try {
			setSaving(true)
			await saveBlogEdits(baseItems, editableItems, normalizedCategoryList)
			setEditMode(false)
			setSelectedSlugs(new Set())
			setCategoryModalOpen(false)
		} catch (error: any) {
			console.error(error)
			toast.error(error?.message || t('admin.saveFailedShort'))
		} finally {
			setSaving(false)
		}
	}, [baseItems, editableItems, categoryList, categoriesFromServer, t])

	const handleSaveClick = useCallback(() => {
		if (!isAuth) {
			keyInputRef.current?.click()
			return
		}
		void handleSave()
	}, [handleSave, isAuth])

	const handlePrivateKeySelection = useCallback(
		async (file: File) => {
			try {
				const pem = await readFileAsText(file)
				setPrivateKey(pem)
				toast.success(t('admin.keyImported'))
			} catch (error) {
				console.error(error)
				toast.error(t('admin.readKeyFailed'))
			}
		},
		[setPrivateKey, t]
	)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!editMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				toggleEditMode()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [editMode, toggleEditMode])

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				{...stylex.props(styles.fileInput)}
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handlePrivateKeySelection(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div {...stylex.props(styles.page)}>
				{items.length > 0 && (
					<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(card.base, btnRounded.base, styles.filterBar)}>
						{[
							{ value: 'day', label: t('blog.timeDay') },
							{ value: 'week', label: t('blog.timeWeek') },
							{ value: 'month', label: t('blog.timeMonth') },
							{ value: 'year', label: t('blog.timeYear') },
							...(enableCategories ? ([{ value: 'category', label: t('blog.category') }] as const) : [])
						].map(option => (
							<button
								key={option.value}
								onClick={() => setDisplayMode(option.value as DisplayMode)}
								{...stylex.props(card.hover, btnRounded.base, styles.modeBtn, displayMode === option.value ? styles.modeActive : styles.modeIdle)}>
								{option.label}
							</button>
						))}
					</motion.div>
				)}

				{groupKeys.map((groupKey, index) => {
					const group = groupedItems[groupKey]
					if (!group) return null

					return (
						<motion.div
							onMouseLeave={cancelCoverPreview}
							key={groupKey}
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ delay: INIT_DELAY / 2 }}
							{...stylex.props(card.base, styles.groupCard)}>
							<div {...stylex.props(styles.groupHeader)}>
								<div {...stylex.props(styles.groupHeaderLeft)}>
									<div {...stylex.props(styles.groupTitle)}>{getGroupLabel(groupKey)}</div>
									<div {...stylex.props(styles.groupDot)}></div>
									<div {...stylex.props(styles.groupCount)}>{t('blog.articlesCount', { count: group.items.length })}</div>
								</div>
								{editMode &&
									(() => {
										const groupAllSelected = group.items.every(item => selectedSlugs.has(item.slug))
										return (
											<button
												onClick={() => handleSelectGroup(groupKey)}
												{...stylex.props(card.hover, styles.selectGroupBtn, groupAllSelected ? styles.selectGroupOn : styles.selectGroupOff)}>
												{groupAllSelected ? t('admin.deselectAll') : t('admin.selectGroup')}
											</button>
										)
									})()}
							</div>
							<div>
								{group.items.map(it => {
									const hasRead = isRead(it.slug)
									const isSelected = selectedSlugs.has(it.slug)
									const rowSx = stylex.props(
										styles.rowBase,
										editMode && styles.rowEdit,
										editMode ? (isSelected ? styles.rowSelected : styles.rowUnselected) : styles.rowPointer,
										hoverGroup
									)
									return (
										<Link
											onMouseEnter={() => onCoverLinkMouseEnter(it.cover)}
											onMouseLeave={cancelCoverPreview}
											href={`/blog/${it.slug}`}
											key={it.slug}
											onClick={event => handleItemClick(event, it.slug)}
											{...rowSx}>
											{editMode && (
												<span {...stylex.props(styles.checkBox, isSelected ? styles.checkBoxOn : styles.checkBoxOff)}>
													<Check />
												</span>
											)}
											<span {...stylex.props(styles.dateLabel)}>{dayjs(it.date).format('MM-DD')}</span>

											<div {...stylex.props(styles.dotColumn)}>
												<div {...stylex.props(styles.dot)}></div>
												<ShortLineSVG {...stylex.props(styles.shortLine)} />
											</div>
											<div {...stylex.props(styles.itemTitle, !editMode && styles.titleHover)}>
												{it.title || it.slug}
												{hasRead && <span {...stylex.props(styles.readTag)}>[{t('blog.readTag')}]</span>}
											</div>
											<div {...stylex.props(styles.tagList)}>
												{(it.tags || []).map(t => (
													<span key={t} {...stylex.props(styles.tagItem)}>
														#{t}
													</span>
												))}
											</div>
										</Link>
									)
								})}
							</div>
						</motion.div>
					)
				})}
				{items.length > 0 && (
					<div {...stylex.props(styles.moreRow)}>
						<motion.a
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							href='https://github.com/xiaoshenming'
							target='_blank'
							{...stylex.props(card.hover, card.base, styles.moreLink)}>
							<GithubSVG {...stylex.props(styles.githubIcon)} />
							{t('blog.loadMore')}
						</motion.a>
					</div>
				)}
			</div>

			<div {...stylex.props(styles.bottomArea)}>
				{!loading && items.length === 0 && <div {...stylex.props(styles.statusText)}>{t('blog.noArticles')}</div>}
				{loading && <div {...stylex.props(styles.statusText)}>{t('blog.loading')}</div>}
			</div>

			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(styles.toolbar)}>
				{editMode ? (
					<>
						{enableCategories && (
							<button onClick={() => setCategoryModalOpen(true)} disabled={saving} {...stylex.props(card.hover, styles.toolBtn)}>
								{t('admin.category')}
							</button>
						)}
						<button onClick={handleCancel} disabled={saving} {...stylex.props(card.hover, styles.cancelBtn)}>
							{t('admin.cancel')}
						</button>
						<button onClick={selectedCount === editableItems.length ? handleDeselectAll : handleSelectAll} {...stylex.props(card.hover, styles.toolBtn)}>
							{selectedCount === editableItems.length ? t('admin.deselectAll') : t('admin.selectAll')}
						</button>
						<button onClick={handleDeleteSelected} disabled={selectedCount === 0} {...stylex.props(card.hover, styles.deleteBtn)}>
							{t('admin.deleteSelected', { count: selectedCount })}
						</button>
						<button onClick={handleSaveClick} disabled={saving} {...stylex.props(card.hover, brandBtn.base, styles.saveBtn)}>
							{saving ? t('admin.saving') : buttonText}
						</button>
					</>
				) : (
					!hideEditButton && (
						<button onClick={toggleEditMode} {...stylex.props(card.hover, styles.editBtn)}>
							{t('admin.edit')}
						</button>
					)
				)}
			</motion.div>

			<BlogCoverHoverPreview preview={hoverCoverPreview} position={mousePosition} />

			<CategoryModal
				open={categoryModalOpen}
				onClose={() => setCategoryModalOpen(false)}
				categoryList={categoryList}
				newCategory={newCategory}
				onNewCategoryChange={setNewCategory}
				onAddCategory={handleAddCategory}
				onRemoveCategory={handleRemoveCategory}
				onReorderCategories={handleReorderCategories}
				editableItems={editableItems}
				onAssignCategory={handleAssignCategory}
			/>
		</>
	)
}
