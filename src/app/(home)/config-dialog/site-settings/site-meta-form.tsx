'use client'

import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import type { SiteContent } from '../../stores/config-store'

interface SiteMetaFormProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

/** 原 Tailwind → StyleX 对照（输入框样式统一复用） */
const styles = stylex.create({
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		gap: 8
	},
	label: {
		marginBottom: 8,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	field: {
		width: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)',
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	}
})

export function SiteMetaForm({ formData, setFormData }: SiteMetaFormProps) {
	const { t } = useI18n()
	return (
		<>
			<div {...stylex.props(styles.grid)}>
				<div>
					<label {...stylex.props(styles.label)}>{t('config.siteTitle')}</label>
					<input
						type='text'
						value={formData.meta.title}
						onChange={e => setFormData({ ...formData, meta: { ...formData.meta, title: e.target.value } })}
						{...stylex.props(styles.field)}
					/>
				</div>

				<div>
					<label {...stylex.props(styles.label)}>{t('config.username')}</label>
					<input
						type='text'
						value={formData.meta.username || ''}
						onChange={e => setFormData({ ...formData, meta: { ...formData.meta, username: e.target.value } })}
						{...stylex.props(styles.field)}
					/>
				</div>
			</div>

			<div>
				<label {...stylex.props(styles.label)}>{t('config.siteDescription')}</label>
				<textarea
					value={formData.meta.description}
					onChange={e => setFormData({ ...formData, meta: { ...formData.meta, description: e.target.value } })}
					rows={3}
					{...stylex.props(styles.field)}
				/>
			</div>
		</>
	)
}
