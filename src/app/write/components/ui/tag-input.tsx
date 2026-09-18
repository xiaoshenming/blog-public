import { useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

type TagInputProps = {
	tags: string[]
	onChange: (tags: string[]) => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 输入容器 */
	box: {
		backgroundColor: colors.card,
		width: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		paddingBlock: 8
	},
	/** 标签行 */
	tagRow: {
		marginBottom: 8,
		display: 'flex',
		flexWrap: 'wrap',
		gap: 8
	},
	/** 单个标签 */
	tag: {
		display: 'flex',
		alignItems: 'center',
		gap: 6,
		borderRadius: 6,
		backgroundColor: '#dbeafe',
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 14,
		lineHeight: '20px',
		color: '#1447e6'
	},
	removeBtn: {
		color: colors.secondary
	},
	/** 文本输入（去默认聚焦描边） */
	input: {
		width: '100%',
		backgroundColor: 'transparent',
		fontSize: 14,
		lineHeight: '20px',
		outlineStyle: 'none'
	}
})

export function TagInput({ tags, onChange }: TagInputProps) {
	const [tagInput, setTagInput] = useState<string>('')

	const handleAddTag = () => {
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			onChange([...tags, tagInput.trim()])
			setTagInput('')
		}
	}

	const handleRemoveTag = (index: number) => {
		onChange(tags.filter((_, i) => i !== index))
	}

	return (
		<div {...stylex.props(styles.box)}>
			{tags.length > 0 && (
				<div {...stylex.props(styles.tagRow)}>
					{tags.map((tag, index) => (
						<span key={index} {...stylex.props(styles.tag)}>
							#{tag}
							<button type='button' onClick={() => handleRemoveTag(index)} {...stylex.props(styles.removeBtn)}>
								×
							</button>
						</span>
					))}
				</div>
			)}
			<input
				type='text'
				placeholder='添加标签（按回车）'
				{...stylex.props(styles.input)}
				value={tagInput}
				onChange={e => setTagInput(e.target.value)}
				onKeyDown={e => {
					if (e.key === 'Enter') {
						e.preventDefault()
						handleAddTag()
					}
				}}
			/>
		</div>
	)
}
