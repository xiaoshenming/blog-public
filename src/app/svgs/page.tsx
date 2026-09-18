'use client'

import { useMemo, useState } from 'react'
import { SvgComponent, svgItems } from '@/svgs/index'
import * as stylex from '@stylexjs/stylex'
import { cn } from '@/lib/utils'
import { colors } from '@/styles/tokens.stylex'

/** 本页样式（数值取自 Tailwind v4 编译产物；无令牌色板已固化） */
const styles = stylex.create({
	/** 页面主容器 */
	page: {
		marginInline: 'auto',
		maxWidth: 1024,
		paddingInline: 24,
		paddingBlock: 32,
		display: 'flex',
		flexDirection: 'column',
		gap: 16
	},
	/** 标题行 */
	header: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12
	},
	heading: {
		fontSize: 20,
		lineHeight: '28px',
		fontWeight: 500
	},
	/** 过滤输入框（原背景类无令牌零产出，故无底色） */
	filter: {
		height: 36,
		width: 224,
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		fontSize: 14,
		lineHeight: '20px',
		outlineStyle: 'none'
	},
	/** 图标网格（逐级增列） */
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		gap: 16,
		'@media (width >= 40rem)': {
			gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
		},
		'@media (width >= 48rem)': {
			gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
		},
		'@media (width >= 64rem)': {
			gridTemplateColumns: 'repeat(6, minmax(0, 1fr))'
		},
		'@media (width >= 80rem)': {
			gridTemplateColumns: 'repeat(8, minmax(0, 1fr))'
		}
	},
	/** 图标卡（悬停浅底，实测值固化 5% 混合） */
	card: {
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		padding: 12,
		textAlign: 'left',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, #1d293d 5%, transparent)'
			}
		}
	},
	iconBox: {
		display: 'flex',
		height: 48,
		alignItems: 'center',
		justifyContent: 'center'
	},
	icon: {
		width: 32,
		height: 32
	},
	/** 名称行：单行省略 */
	label: {
		marginTop: 8,
		width: '100%',
		overflow: 'hidden',
		textAlign: 'center',
		fontSize: 12,
		lineHeight: '16px',
		wordBreak: 'break-all',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	},
	/** 复制成功徽标（原前景/背景色类无令牌零产出，故无配色） */
	copied: {
		pointerEvents: 'none',
		position: 'absolute',
		top: 8,
		right: 8,
		borderRadius: 4,
		paddingInline: 6,
		paddingBlock: 2,
		fontSize: '10px',
		fontWeight: 500
	}
})

export default function Page() {
	const [query, setQuery] = useState('')
	const [copiedKey, setCopiedKey] = useState<string | null>(null)

	const items = useMemo(
		() =>
			svgItems.map(({ key, Component }: { key: string; Component: SvgComponent }) => ({
				key,
				Component,
				label: key.replace(/^\.\//, '').replace(/\.svg$/, '')
			})),
		[]
	)

	const filteredItems = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return items
		return items.filter(i => i.label.toLowerCase().includes(q))
	}, [items, query])

	const toPascalCase = (input: string) => {
		return input
			.split(/[^a-zA-Z0-9]+/)
			.filter(Boolean)
			.map(part => part.charAt(0).toUpperCase() + part.slice(1))
			.join('')
	}

	const handleCopy = async (label: string, key: string) => {
		try {
			const varName = `${toPascalCase(label)}SVG`
			const importCmd = `import ${varName} from '@/svgs/${label}.svg'`
			await navigator.clipboard.writeText(importCmd)
			setCopiedKey(key)
			window.setTimeout(() => setCopiedKey(null), 1500)
		} catch (_) {
			// no-op
		}
	}

	return (
		<div className={stylex.props(styles.page).className}>
			<div className={stylex.props(styles.header).className}>
				<h1 className={stylex.props(styles.heading).className}>SVG Gallery</h1>
				<input
					type='text'
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder='Filter icons...'
					className={stylex.props(styles.filter).className}
				/>
			</div>
			<div className={stylex.props(styles.grid).className}>
				{filteredItems.map(({ key, Component, label }: { key: string; Component: SvgComponent; label: string }) => (
					<button
						key={key}
						onClick={() => handleCopy(label, key)}
						title={'Click to copy import command'}
						type='button'
						className={cn(stylex.props(styles.card).className, 'group')}>
						<div className={stylex.props(styles.iconBox).className}>
							<Component {...stylex.props(styles.icon)} />
						</div>
						<div title={label} className={stylex.props(styles.label).className}>
							{label}
						</div>
						{copiedKey === key && (
							<span className={stylex.props(styles.copied).className}>
								Copied
							</span>
						)}
					</button>
				))}
			</div>
		</div>
	)
}
