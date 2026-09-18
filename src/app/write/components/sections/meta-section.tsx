import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'
import { TagInput } from '../ui/tag-input'
import { useCategories } from '@/hooks/use-categories'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { Select } from '@/components/select'
import * as stylex from '@stylexjs/stylex'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'

type MetaSectionProps = {
	delay?: number
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；卡片系样式复用共享定义） */
const styles = stylex.create({
	/** 分类选择器：满宽小字 */
	selectFull: {
		width: '100%',
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 分区卡：相对定位覆盖卡片基底 */
	section: {
		position: 'relative'
	},
	heading: {
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 字段组：原块间距改为纵向间隙 */
	fields: {
		marginTop: 12,
		display: 'flex',
		flexDirection: 'column',
		gap: 8
	},
	/** 摘要输入框 */
	summaryArea: {
		backgroundColor: colors.card,
		display: 'block',
		width: '100%',
		resize: 'none',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		padding: 12,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 日期输入框 */
	dateInput: {
		backgroundColor: colors.card,
		width: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 隐藏开关行 */
	checkboxRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	checkbox: {
		width: 16,
		height: 16,
		borderRadius: 4,
		borderColor: '#d1d5dc'
	},
	checkboxLabel: {
		cursor: 'pointer',
		fontSize: 14,
		lineHeight: '20px',
		color: '#4a5565',
		userSelect: 'none'
	}
})

export function MetaSection({ delay = 0 }: MetaSectionProps) {
	const { form, updateForm } = useWriteStore()
	console.log(form.date)

	const { categories } = useCategories()
	const { siteContent } = useConfigStore()
	const enableCategories = siteContent.enableCategories ?? false

	const categoryOptions = [{ value: '', label: '未分类' }, ...categories.map(cat => ({ value: cat, label: cat }))]

	return (
		<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} {...stylex.props(card.base, styles.section)}>
			<h2 {...stylex.props(styles.heading)}>元信息</h2>

			<div {...stylex.props(styles.fields)}>
				<textarea
					placeholder='为这篇文章写一段简短摘要'
					rows={2}
					{...stylex.props(styles.summaryArea)}
					value={form.summary}
					onChange={e => updateForm({ summary: e.target.value })}
				/>

				<TagInput tags={form.tags} onChange={tags => updateForm({ tags })} />
				{enableCategories && (
					<Select style={styles.selectFull} value={form.category || ''} onChange={value => updateForm({ category: value })} options={categoryOptions} />
				)}
				<input
					type='datetime-local'
					placeholder='日期'
					{...stylex.props(styles.dateInput)}
					value={form.date}
					onChange={e => {
						updateForm({ date: e.target.value })
					}}
				/>

				<div {...stylex.props(styles.checkboxRow)}>
					<input
						type='checkbox'
						id='hidden-check'
						checked={form.hidden || false}
						onChange={e => updateForm({ hidden: e.target.checked })}
						{...stylex.props(styles.checkbox)}
					/>
					<label htmlFor='hidden-check' {...stylex.props(styles.checkboxLabel)}>
						隐藏此文章（仅管理员可见）
					</label>
				</div>
			</div>
		</motion.div>
	)
}
