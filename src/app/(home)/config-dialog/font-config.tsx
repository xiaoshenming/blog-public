'use client'

import { useEffect } from 'react'
import { CheckIcon } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import { FONT_OPTIONS, getFontOption } from '@/config/fonts'
import { applyFont, ensureFontCss } from '@/lib/font'
import { useI18n } from '@/i18n/context'
import type { SiteContent } from '../stores/config-store'
import { colors } from '@/styles/tokens.stylex'

interface FontConfigProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

/* 同时包含简体、繁体、标点、英文与数字，方便对比覆盖范围与字形 */
const SAMPLE_TEXT = '落霞与孤鹜齐飞，秋水共长天一色。漢字體 The quick brown fox 0123456789'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 区块标题 */
	label: {
		marginBottom: 8,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 说明文字 */
	hint: {
		marginBottom: 12,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 字体卡片列表 */
	fontList: {
		display: 'flex',
		flexDirection: 'column',
		gap: 12
	},
	/** 字体卡片：白色半透明描边，悬停加深 */
	fontCard: {
		display: 'flex',
		alignItems: 'flex-start',
		gap: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, #fff 60%, transparent)',
		padding: 16,
		textAlign: 'left',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, #fff 80%, transparent)'
			}
		}
	},
	/** 选中态：品牌色描边 + 2px 光环（单层 boxShadow 等价） */
	fontCardActive: {
		borderColor: colors.brand,
		boxShadow: '0 0 0 2px color-mix(in oklab, var(--color-brand) 30%, transparent)'
	},
	/** 卡片正文（防止超长截断） */
	cardBody: {
		minWidth: 0,
		flex: '1'
	},
	/** 字体名行 */
	nameRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	/** 字体名 */
	fontName: {
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 选中勾图标 */
	checkIcon: {
		width: 16,
		height: 16,
		flexShrink: 0,
		color: colors.brand
	},
	/** 字体描述 */
	fontDesc: {
		marginTop: 2,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 示例文字（行高取原 leading-relaxed 的 1.625） */
	sample: {
		marginTop: 12,
		fontSize: 16,
		lineHeight: 1.625
	}
})

export function FontConfig({ formData, setFormData }: FontConfigProps) {
	const { t } = useI18n()
	const currentId = getFontOption(formData.font).id

	// 进入此 tab 就把所有候选字体的样式表挂上，示例文字才能以真实字体渲染
	useEffect(() => {
		FONT_OPTIONS.forEach(font => ensureFontCss(font.cssHref))
	}, [])

	const handleSelect = (id: string) => {
		setFormData(prev => ({ ...prev, font: id }))
		applyFont(id)
	}

	return (
		<div>
			<div>
				<label {...stylex.props(styles.label)}>{t('config.siteFont')}</label>
				<p {...stylex.props(styles.hint)}>{t('config.fontHint')}</p>
				<div {...stylex.props(styles.fontList)}>
					{FONT_OPTIONS.map(font => {
						const active = font.id === currentId
						return (
							<button key={font.id} type='button' onClick={() => handleSelect(font.id)} {...stylex.props(styles.fontCard, active && styles.fontCardActive)}>
								<div {...stylex.props(styles.cardBody)}>
									<div {...stylex.props(styles.nameRow)}>
										<span {...stylex.props(styles.fontName)}>{font.name}</span>
										{active && <CheckIcon {...stylex.props(styles.checkIcon)} />}
									</div>
									<p {...stylex.props(styles.fontDesc)}>{font.description}</p>
									<p {...stylex.props(styles.sample)} style={{ fontFamily: font.family }}>
										{SAMPLE_TEXT}
									</p>
								</div>
							</button>
						)
					})}
				</div>
			</div>
		</div>
	)
}
