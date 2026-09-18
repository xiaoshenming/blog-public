'use client'

import { useState } from 'react'
import * as stylex from '@stylexjs/stylex'

import { type AvatarItem } from './components/avatar-upload-dialog'
import { BloggerCard } from './components/blogger-card'
import { colors } from '@/styles/tokens.stylex'

export type BloggerStatus = 'recent' | 'disconnected'

export interface Blogger {
	name: string
	avatar: string
	url: string
	description: string
	stars: number
	status?: BloggerStatus
}

interface GridViewProps {
	bloggers: Blogger[]
	isEditMode?: boolean
	onUpdate?: (blogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => void
	onDelete?: (blogger: Blogger) => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 外层容器 */
	container: {
		marginInline: 'auto',
		width: '100%',
		maxWidth: '80rem',
		paddingInline: 24,
		paddingTop: 96,
		paddingBottom: 48
	},
	/** 搜索与分类区 */
	filters: {
		marginBottom: 32
	},
	/** 搜索框（纵向间距由 space-y 分摊承接；聚焦时品牌色描边） */
	searchInput: {
		marginInline: 'auto',
		display: 'block',
		width: '100%',
		maxWidth: '28rem',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		paddingInline: 16,
		paddingBlock: 8,
		marginBottom: 16,
		':focus': {
			boxShadow: '0 0 0 2px var(--color-brand)',
			outlineStyle: 'none'
		}
	},
	/** 分类按钮行 */
	categories: {
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8
	},
	/** 分类按钮（激活态换色） */
	catButton: {
		borderRadius: 9999,
		paddingInline: 16,
		paddingBlock: 6,
		fontSize: 14,
		lineHeight: '20px',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	catActive: {
		backgroundColor: colors.brand,
		color: colors.white
	},
	catIdle: {
		backgroundColor: '#e5e7eb',
		color: '#364153',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#d1d5dc'
			}
		}
	},
	/** 博主卡片网格（中屏两列、大屏三列） */
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
		gap: 32,
		'@media (width >= 48rem)': {
			gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
		},
		'@media (width >= 64rem)': {
			gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
		}
	},
	/** 空态提示 */
	empty: {
		marginTop: 48,
		textAlign: 'center',
		color: '#6a7282'
	}
})

export default function GridView({ bloggers, isEditMode = false, onUpdate, onDelete }: GridViewProps) {
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedCategory, setSelectedCategory] = useState<BloggerStatus>('recent')

	const filteredBloggers = bloggers.filter(blogger => {
		const status = blogger.status ?? 'recent'
		const matchesCategory = status === selectedCategory
		const matchesSearch =
			blogger.name.toLowerCase().includes(searchTerm.toLowerCase()) || blogger.description.toLowerCase().includes(searchTerm.toLowerCase())
		return matchesCategory && matchesSearch
	})

	return (
		<div {...stylex.props(styles.container)}>
			<div {...stylex.props(styles.filters)}>
				<input
					type='text'
					placeholder='搜索博主...'
					value={searchTerm}
					onChange={e => setSearchTerm(e.target.value)}
					{...stylex.props(styles.searchInput)}
				/>

				<div {...stylex.props(styles.categories)}>
					<button
						onClick={() => setSelectedCategory('recent')}
						{...stylex.props(styles.catButton, selectedCategory === 'recent' ? styles.catActive : styles.catIdle)}>
						近期更新
					</button>
					<button
						onClick={() => setSelectedCategory('disconnected')}
						{...stylex.props(styles.catButton, selectedCategory === 'disconnected' ? styles.catActive : styles.catIdle)}>
						长期失联
					</button>
				</div>
			</div>

			<div {...stylex.props(styles.grid)}>
				{filteredBloggers.map(blogger => (
					<BloggerCard key={blogger.url} blogger={blogger} isEditMode={isEditMode} onUpdate={onUpdate} onDelete={() => onDelete?.(blogger)} />
				))}
			</div>

			{filteredBloggers.length === 0 && (
				<div {...stylex.props(styles.empty)}>
					<p>没有找到相关博主</p>
				</div>
			)}
		</div>
	)
}
