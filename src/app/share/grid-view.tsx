'use client'

import { useState } from 'react'
import * as stylex from '@stylexjs/stylex'

import { type LogoItem } from './components/logo-upload-dialog'
import { ShareCard, type Share } from './components/share-card'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

interface GridViewProps {
	shares: Share[]
	isEditMode?: boolean
	onUpdate?: (share: Share, oldShare: Share, logoItem?: LogoItem) => void
	onDelete?: (share: Share) => void
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
	/** 搜索与标签筛选区 */
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
	/** 标签按钮行 */
	tagRow: {
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8
	},
	/** 标签按钮（激活态换色） */
	tagButton: {
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
	tagActive: {
		backgroundColor: colors.brand,
		color: colors.white
	},
	tagIdle: {
		backgroundColor: '#e5e7eb',
		color: '#364153',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#d1d5dc'
			}
		}
	},
	/** 卡片网格（中屏两列、大屏三列） */
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

export default function GridView({ shares, isEditMode = false, onUpdate, onDelete }: GridViewProps) {
	const { t } = useI18n()
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedTag, setSelectedTag] = useState<string>('all')

	const allTags = Array.from(new Set(shares.flatMap(share => share.tags)))

	const filteredShares = shares.filter(share => {
		const matchesSearch = share.name.toLowerCase().includes(searchTerm.toLowerCase()) || share.description.toLowerCase().includes(searchTerm.toLowerCase())
		const matchesTag = selectedTag === 'all' || share.tags.includes(selectedTag)
		return matchesSearch && matchesTag
	})

	return (
		<div {...stylex.props(styles.container)}>
			<div {...stylex.props(styles.filters)}>
				<input
					type='text'
					placeholder={t('collections.searchPlaceholder')}
					value={searchTerm}
					onChange={e => setSearchTerm(e.target.value)}
					{...stylex.props(styles.searchInput)}
				/>

				<div {...stylex.props(styles.tagRow)}>
					<button onClick={() => setSelectedTag('all')} {...stylex.props(styles.tagButton, selectedTag === 'all' ? styles.tagActive : styles.tagIdle)}>
						{t('collections.all')}
					</button>
					{allTags.map(tag => (
						<button key={tag} onClick={() => setSelectedTag(tag)} {...stylex.props(styles.tagButton, selectedTag === tag ? styles.tagActive : styles.tagIdle)}>
							{tag}
						</button>
					))}
				</div>
			</div>

			<div {...stylex.props(styles.grid)}>
				{filteredShares.map(share => (
					<ShareCard key={share.url} share={share} isEditMode={isEditMode} onUpdate={onUpdate} onDelete={() => onDelete?.(share)} />
				))}
			</div>

			{filteredShares.length === 0 && (
				<div {...stylex.props(styles.empty)}>
					<p>{t('collections.noResults')}</p>
				</div>
			)}
		</div>
	)
}
