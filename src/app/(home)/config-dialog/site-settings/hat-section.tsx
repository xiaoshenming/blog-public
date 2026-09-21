'use client'

import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import type { SiteContent } from '../../stores/config-store'

interface HatSectionProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

/** 原 Tailwind → StyleX 对照（选中态描边与投影合并为单层阴影） */
const styles = stylex.create({
	label: {
		marginBottom: 8,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	grid: {
		display: 'grid',
		gap: 12,
		gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
		'@media (width < 40rem)': {
			gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
		}
	},
	itemWrap: {
		position: 'relative'
	},
	/** 缩略图按钮（选中态：2px 品牌描边 + 卡片投影） */
	thumbButton: {
		display: 'block',
		width: '100%',
		overflow: 'hidden',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	thumbActive: {
		boxShadow: '0 0 0 2px var(--color-brand), 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)'
	},
	thumbIdle: {
		'@media (hover: hover)': {
			':hover': {
				borderColor: 'color-mix(in oklab, var(--color-brand) 60%, transparent)'
			}
		}
	},
	thumbImage: {
		height: 80,
		width: '100%',
		objectFit: 'contain'
	},
	badge: {
		pointerEvents: 'none',
		position: 'absolute',
		top: 4,
		left: 4,
		borderRadius: 9999,
		backgroundColor: colors.brand,
		paddingInline: 8,
		paddingBlock: 2,
		fontSize: 10,
		color: colors.white,
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)'
	},
	flipRow: {
		marginTop: 12
	},
	flipLabel: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	checkbox: {
		width: 16,
		height: 16,
		accentColor: colors.brand,
		borderRadius: 4
	},
	checkboxText: {
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	}
})

export function HatSection({ formData, setFormData }: HatSectionProps) {
	const { t } = useI18n()
	const currentHatIndex = formData.currentHatIndex ?? 1
	const hatCount = 24

	const handleSetHatIndex = (index: number) => {
		setFormData(prev => ({
			...prev,
			currentHatIndex: index
		}))
	}

	return (
		<div>
			<label {...stylex.props(styles.label)}>{t('config.hatImages')}</label>
			<div {...stylex.props(styles.grid)}>
				{Array.from({ length: hatCount }, (_, i) => i + 1).map(index => {
					const isActive = currentHatIndex === index

					return (
						<div key={index} {...stylex.props(styles.itemWrap)}>
							<button
								type='button'
								onClick={() => handleSetHatIndex(index)}
								{...stylex.props(styles.thumbButton, isActive ? styles.thumbActive : styles.thumbIdle)}>
								<img src={`/images/hats/${index}.webp`} alt={`hat ${index}`} {...stylex.props(styles.thumbImage)} />
							</button>
							{isActive && <span {...stylex.props(styles.badge)}>{t('config.currentlyUsed')}</span>}
						</div>
					)
				})}
			</div>
			<div {...stylex.props(styles.flipRow)}>
				<label {...stylex.props(styles.flipLabel)}>
					<input
						type='checkbox'
						checked={formData.hatFlipped ?? false}
						onChange={e => setFormData({ ...formData, hatFlipped: e.target.checked })}
						{...stylex.props(styles.checkbox)}
					/>
					<span {...stylex.props(styles.checkboxText)}>{t('config.flipHorizontally')}</span>
				</label>
			</div>
		</div>
	)
}
