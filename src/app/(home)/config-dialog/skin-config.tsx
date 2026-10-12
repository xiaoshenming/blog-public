'use client'

import { useEffect } from 'react'
import { CheckIcon } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import { SKIN_PRESETS, getSkinPreset, type SkinPreset } from '@/skins'
import { getFontOption } from '@/config/fonts'
import { applyFont, ensureFontCss } from '@/lib/font'
import { applyTheme, applySkin, applyBackgroundImage } from '@/lib/skin'
import { useI18n } from '@/i18n/context'
import type { SiteContent } from '../stores/config-store'
import { colors } from '@/styles/tokens.stylex'

interface SkinConfigProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

/* 预览小样里的示例文字：同时含中英文，便于对比墨色与字形 */
const PREVIEW_TEXT = '正文示例 Aa'

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
	/** 皮肤卡片列表 */
	skinList: {
		display: 'flex',
		flexDirection: 'column',
		gap: 12
	},
	/** 皮肤卡片：白色半透明描边，悬停加深 */
	skinCard: {
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
	skinCardActive: {
		borderColor: colors.brand,
		boxShadow: '0 0 0 2px color-mix(in oklab, var(--color-brand) 30%, transparent)'
	},
	/** 卡片正文（防止超长截断） */
	cardBody: {
		minWidth: 0,
		flex: '1'
	},
	/** 皮肤名行 */
	nameRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	/** 皮肤名 */
	skinName: {
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
	/** 皮肤描述 */
	skinDesc: {
		marginTop: 2,
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	/** 配色小样外框：底=bg（背景色由内联样式提供） */
	previewBox: {
		marginTop: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: 'rgb(0 0 0 / 8%)',
		padding: 10
	},
	/** 小样内的卡片：卡=card（卡片色由内联样式提供） */
	previewCard: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		borderRadius: 6,
		paddingInline: 12,
		paddingBlock: 8,
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 8%)'
	},
	/** 小样示例文字：字=ink（颜色与字体由内联样式提供） */
	previewText: {
		fontSize: 13,
		lineHeight: '18px',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis'
	},
	/** 小样点缀胶囊：按钮=accent（点缀色由内联样式提供） */
	previewAccent: {
		width: 36,
		height: 18,
		borderRadius: 999,
		flexShrink: 0
	}
})

export function SkinConfig({ formData, setFormData }: SkinConfigProps) {
	const { t } = useI18n()
	const currentId = getSkinPreset(formData.skin).id

	// 进入此 tab 就挂上各皮肤推荐字体的样式表，预览小样才能以真实字体渲染
	useEffect(() => {
		SKIN_PRESETS.forEach(skin => ensureFontCss(getFontOption(skin.defaultFont).cssHref))
	}, [])

	const handleSelect = (skin: SkinPreset) => {
		// 皮肤 = 配色 + 推荐字体 + 关联背景，一并填入表单；站长之后仍可逐个 tab 单独微调。
		// 该皮肤没有关联背景时保留站长原有的背景选择，不做清空（清空是「网站设置」里的显式操作）。
		setFormData(prev => ({
			...prev,
			skin: skin.id,
			theme: skin.theme,
			font: skin.defaultFont,
			...(skin.backgroundImageId ? { currentBackgroundImageId: skin.backgroundImageId } : {})
		}))
		applyTheme(skin.theme)
		applySkin(skin.id)
		applyFont(skin.defaultFont)
		applyBackgroundImage(backgroundUrlFor(skin.backgroundImageId ?? formData.currentBackgroundImageId))
	}

	const backgroundUrlFor = (id?: string) => {
		if (!id) return null
		return formData.backgroundImages?.find(item => item.id === id)?.url ?? null
	}

	return (
		<div>
			<label {...stylex.props(styles.label)}>{t('config.tabSkin')}</label>
			<p {...stylex.props(styles.hint)}>{t('config.skinHint')}</p>
			<div {...stylex.props(styles.skinList)}>
				{SKIN_PRESETS.map(skin => {
					const active = skin.id === currentId
					return (
						<button key={skin.id} type='button' onClick={() => handleSelect(skin)} {...stylex.props(styles.skinCard, active && styles.skinCardActive)}>
							<div {...stylex.props(styles.cardBody)}>
								<div {...stylex.props(styles.nameRow)}>
									<span {...stylex.props(styles.skinName)}>{t(skin.nameKey)}</span>
									{active && <CheckIcon {...stylex.props(styles.checkIcon)} />}
								</div>
								<p {...stylex.props(styles.skinDesc)}>{t(skin.descriptionKey)}</p>
								{/* 配色小样：底=bg、卡=card、字=ink、按钮=accent，四色一眼可辨 */}
								<div {...stylex.props(styles.previewBox)} style={{ backgroundColor: skin.preview.bg }}>
									<div {...stylex.props(styles.previewCard)} style={{ backgroundColor: skin.preview.card }}>
										<span {...stylex.props(styles.previewText)} style={{ color: skin.preview.ink, fontFamily: getFontOption(skin.defaultFont).family }}>
											{PREVIEW_TEXT}
										</span>
										<span {...stylex.props(styles.previewAccent)} style={{ backgroundColor: skin.preview.accent }} />
									</div>
								</div>
							</div>
						</button>
					)
				})}
			</div>
		</div>
	)
}
