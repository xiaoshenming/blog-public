'use client'

import * as stylex from '@stylexjs/stylex'

interface EditableStarRatingProps {
	stars: number
	editable?: boolean
	onChange?: (stars: number) => void
}

/** 原 Tailwind：容器 flex items-center gap-0.5；可编辑态 cursor-pointer；星形 filled→fill-yellow-400、empty→fill-gray-300 */
const styles = stylex.create({
	row: {
		display: 'flex',
		alignItems: 'center',
		gap: 2
	},
	clickable: {
		cursor: 'pointer'
	},
	filled: {
		fill: 'oklch(85.2% 0.199 91.936)'
	},
	empty: {
		fill: 'oklch(87.2% 0.01 258.338)'
	}
})

export default function EditableStarRating({ stars, editable = false, onChange }: EditableStarRatingProps) {
	const handleClick = (index: number) => {
		if (editable && onChange) {
			onChange(index)
		}
	}

	return (
		<div {...stylex.props(styles.row)}>
			{[1, 2, 3, 4, 5].map(index => {
				const filled = index <= stars
				return (
					<div key={index} onClick={() => handleClick(index)} {...stylex.props(editable && styles.clickable)}>
						<StarIcon filled={filled} />
					</div>
				)
			})}
		</div>
	)
}

function StarIcon({ filled }: { filled: boolean }) {
	return (
		<svg width='16' height='16' viewBox='0 0 24 24' {...stylex.props(filled ? styles.filled : styles.empty)}>
			<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
		</svg>
	)
}

