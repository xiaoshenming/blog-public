'use client'

import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import type { SiteContent } from '../../stores/config-store'

interface BeianFormProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

/** 原 Tailwind → StyleX 对照（space-y-2 与标题自带 mb-2 同值 8，等价保留） */
const styles = stylex.create({
	sectionLabel: {
		marginBottom: 8,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		gap: 8
	},
	fieldLabel: {
		marginBottom: 4,
		display: 'block',
		fontSize: 12,
		lineHeight: '16px',
		color: '#4a5565'
	},
	input: {
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

export function BeianForm({ formData, setFormData }: BeianFormProps) {
	const { t } = useI18n()
	return (
		<div>
			<label {...stylex.props(styles.sectionLabel)}>{t('config.beianSection')}</label>
			<div {...stylex.props(styles.grid)}>
				<div>
					<label {...stylex.props(styles.fieldLabel)}>{t('config.beianNumber')}</label>
					<input
						type='text'
						value={formData.beian?.text || ''}
						onChange={e => setFormData({ ...formData, beian: { ...(formData.beian || { text: '', link: '' }), text: e.target.value } })}
						placeholder={t('config.beianNumberPlaceholder')}
						{...stylex.props(styles.input)}
					/>
				</div>
				<div>
					<label {...stylex.props(styles.fieldLabel)}>{t('config.beianLink')}</label>
					<input
						type='url'
						value={formData.beian?.link || ''}
						onChange={e => setFormData({ ...formData, beian: { ...(formData.beian || { text: '', link: '' }), link: e.target.value } })}
						placeholder='https://beian.miit.gov.cn/'
						{...stylex.props(styles.input)}
					/>
				</div>
			</div>
		</div>
	)
}
