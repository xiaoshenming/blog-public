'use client'

import { ColorPicker } from '@/components/color-picker'
import { XIcon } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import type { SiteContent } from '../stores/config-store'
import siteContent from '@/config/site-content.json'
import { cn } from '@/lib/utils'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'

interface ColorConfigProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

const DEFAULT_THEME_COLORS = siteContent.theme

type ColorPreset = {
	name: string
	theme: Partial<SiteContent['theme']>
	backgroundColors: string[]
}

const COLOR_PRESETS: ColorPreset[] = [
	{
		name: '春暖',
		theme: {
			colorBrand: '#35bfab',
			colorBrandSecondary: '#1fc9e7',
			colorPrimary: '#334f52',
			colorSecondary: '#7b888e',
			colorBg: '#eeeeee',
			colorBorder: '#ffffff',
			colorCard: '#ffffff66',
			colorArticle: '#ffffffcc'
		},
		backgroundColors: ['#EDDD62', '#9EE7D1', '#84D68A', '#EDDD62', '#88E6E5', '#a7f3d0']
	},
	{
		name: '秋实',
		theme: {
			colorPrimary: '#4E3F42',
			colorBrand: '#de4331',
			colorBrandSecondary: '#FCC841'
		},
		backgroundColors: ['#FCC841', '#DFEFFC', '#DEDE92', '#DE4331', '#FE9750', '#FCC841']
	},
	{
		name: '晴空',
		theme: {
			colorBrand: '#2fcbe7',
			colorPrimary: '#5B423F',
			colorSecondary: '#8b7667',
			colorBrandSecondary: '#eec25e',
			colorBg: '#d4e8f3',
			colorCard: '#ffffff99',
		},
		backgroundColors: ['#f7da3987', '#8fdbe9', '#fffef8']
	},
	{
		name: '深夜',
		theme: {
			colorBrand: '#2a48f3',
			colorPrimary: '#e6e8e8',
			colorSecondary: '#acadae',
			colorBrandSecondary: '#51d0b9',
			colorBg: '#0a051f',
			colorBorder: '#8a8a8a5e',
			colorCard: '#ffffff0e',
			colorArticle: '#6f6f6f33'
		},
		backgroundColors: ['#16007b']
	}
]

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；group 悬停联动保留字符串类） */
const styles = stylex.create({
	/** 原 space-y-6 分摊到非末块 */
	sectionGap: {
		marginBottom: 24
	},
	/** 区块标题 */
	label: {
		marginBottom: 8,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 无底距的区块标题 */
	labelPlain: {
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 基础颜色两列网格 */
	colorGrid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		gap: 16
	},
	/** 取色器行 */
	colorRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 12
	},
	/** 取色器旁的小字标签 */
	hint: {
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 背景颜色区块头部 */
	sectionHeader: {
		marginBottom: 8,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12
	},
	/** 头部按钮排布 */
	headerActions: {
		display: 'flex',
		gap: 8
	},
	/** 白色半透明描边小按钮（悬停加深） */
	ghostSmallButton: {
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, #fff 60%, transparent)',
		paddingInline: 12,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		whiteSpace: 'nowrap',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, #fff 80%, transparent)'
			}
		}
	},
	/** 背景色块列表 */
	swatchList: {
		display: 'flex',
		gap: 12
	},
	swatchItem: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	/** 色块包裹（group 悬停联动保留字符串类） */
	swatchWrap: {
		position: 'relative'
	},
	/** 删除按钮：默认透明，父级 group 悬停时显现（显隐沿用字符串类） */
	removeButton: {
		position: 'absolute',
		top: -4,
		right: -8,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, #fff 60%, transparent)',
		fontSize: 12,
		lineHeight: '16px',
		whiteSpace: 'nowrap',
		color: colors.secondary,
		opacity: 0,
		transitionProperty: 'opacity',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 删除图标尺寸 */
	removeIcon: {
		width: 12,
		height: 12
	},
	/** 预设列表 */
	presetList: {
		display: 'flex',
		flexDirection: 'column',
		gap: 12
	},
	/** 预设按钮：白色半透明描边，悬停加深 */
	presetButton: {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'color-mix(in oklab, #fff 60%, transparent)',
		padding: 12,
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
	/** 预设内的色块行 */
	presetSwatches: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	/** 40×40 色块（描边 + 小阴影，底色保留内联） */
	swatch: {
		width: 40,
		height: 40,
		borderRadius: 8,
		borderWidth: 2,
		borderStyle: 'solid',
		borderColor: 'rgb(255 255 255 / 20%)',
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)'
	},
	/** 预设名称 */
	presetName: {
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		whiteSpace: 'nowrap'
	}
})

export function ColorConfig({ formData, setFormData }: ColorConfigProps) {
	const theme = formData.theme ?? {}

	const handleThemeColorChange = (key: keyof typeof DEFAULT_THEME_COLORS, value: string) => {
		setFormData(prev => ({
			...prev,
			theme: {
				...prev.theme,
				[key]: value
			}
		}))
	}

	const handleBrandColorChange = (value: string) => {
		setFormData(prev => ({
			...prev,
			theme: {
				...prev.theme,
				colorBrand: value
			}
		}))
	}

	const handleColorChange = (index: number, value: string) => {
		const newColors = [...formData.backgroundColors]
		newColors[index] = value
		setFormData({ ...formData, backgroundColors: newColors })
	}

	const generateRandomColor = () => {
		const randomChannel = () => Math.floor(Math.random() * 256)
		return `#${[randomChannel(), randomChannel(), randomChannel()]
			.map(channel => channel.toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase()}`
	}

	const handleRandomizeColors = () => {
		const count = Math.floor(Math.random() * 5) + 4 // 4 ~ 8 个颜色
		const backgroundColors = Array.from({ length: count }, () => generateRandomColor())
		const colorBrand = generateRandomColor()

		setFormData(prev => ({
			...prev,
			backgroundColors,
			theme: {
				...prev.theme,
				colorBrand
			}
		}))
	}

	const handleAddColor = () => {
		setFormData({
			...formData,
			backgroundColors: [...formData.backgroundColors, '#EDDD62']
		})
	}

	const handleRemoveColor = (index: number) => {
		if (formData.backgroundColors.length > 1) {
			const newColors = formData.backgroundColors.filter((_, i) => i !== index)
			setFormData({ ...formData, backgroundColors: newColors })
		}
	}

	const handlePresetChange = (preset: ColorPreset) => {
		setFormData(prev => ({
			...prev,
			backgroundColors: [...preset.backgroundColors],
			theme: {
				...prev.theme,
				...preset.theme
			}
		}))
	}

	return (
		<div>
			<div {...stylex.props(styles.sectionGap)}>
				<label {...stylex.props(styles.label)}>基础颜色</label>
				<div {...stylex.props(styles.colorGrid)}>
					<div {...stylex.props(styles.colorRow)}>
						<ColorPicker value={formData.theme?.colorBrand ?? '#35bfab'} onChange={handleBrandColorChange} />
						<span {...stylex.props(styles.hint)}>主题色</span>
					</div>
					<div {...stylex.props(styles.colorRow)}>
						<ColorPicker
							value={theme.colorBrandSecondary ?? DEFAULT_THEME_COLORS.colorBrandSecondary}
							onChange={value => handleThemeColorChange('colorBrandSecondary', value)}
						/>
						<span {...stylex.props(styles.hint)}>次级主题色</span>
					</div>
					<div {...stylex.props(styles.colorRow)}>
						<ColorPicker value={theme.colorPrimary ?? DEFAULT_THEME_COLORS.colorPrimary} onChange={value => handleThemeColorChange('colorPrimary', value)} />
						<span {...stylex.props(styles.hint)}>主色</span>
					</div>
					<div {...stylex.props(styles.colorRow)}>
						<ColorPicker
							value={theme.colorSecondary ?? DEFAULT_THEME_COLORS.colorSecondary}
							onChange={value => handleThemeColorChange('colorSecondary', value)}
						/>
						<span {...stylex.props(styles.hint)}>次色</span>
					</div>
					<div {...stylex.props(styles.colorRow)}>
						<ColorPicker value={theme.colorBg ?? DEFAULT_THEME_COLORS.colorBg} onChange={value => handleThemeColorChange('colorBg', value)} />
						<span {...stylex.props(styles.hint)}>背景色</span>
					</div>
					<div {...stylex.props(styles.colorRow)}>
						<ColorPicker value={theme.colorBorder ?? DEFAULT_THEME_COLORS.colorBorder} onChange={value => handleThemeColorChange('colorBorder', value)} />
						<span {...stylex.props(styles.hint)}>边框色</span>
					</div>
					<div {...stylex.props(styles.colorRow)}>
						<ColorPicker value={theme.colorCard ?? DEFAULT_THEME_COLORS.colorCard} onChange={value => handleThemeColorChange('colorCard', value)} />
						<span {...stylex.props(styles.hint)}>卡片色</span>
					</div>
					<div {...stylex.props(styles.colorRow)}>
						<ColorPicker value={theme.colorArticle ?? DEFAULT_THEME_COLORS.colorArticle} onChange={value => handleThemeColorChange('colorArticle', value)} />
						<span {...stylex.props(styles.hint)}>文章背景</span>
					</div>
				</div>
			</div>

			<div {...stylex.props(styles.sectionGap)}>
				<div {...stylex.props(styles.sectionHeader)}>
					<label {...stylex.props(styles.labelPlain)}>背景颜色</label>
					<div {...stylex.props(styles.headerActions)}>
						<button onClick={handleRandomizeColors} {...stylex.props(card.hover, styles.ghostSmallButton)}>
							随机配色
						</button>
						<button onClick={handleAddColor} {...stylex.props(card.hover, styles.ghostSmallButton)}>
							+ 添加颜色
						</button>
					</div>
				</div>
				<div {...stylex.props(styles.swatchList)}>
					{formData.backgroundColors.map((color, index) => (
						<div key={index} {...stylex.props(styles.swatchItem)}>
							<div className={cn(stylex.props(styles.swatchWrap).className, 'group')}>
								<ColorPicker value={color} onChange={value => handleColorChange(index, value)} />
								{formData.backgroundColors.length > 1 && (
									<button
										onClick={() => handleRemoveColor(index)}
										className={cn(stylex.props(styles.removeButton).className, 'group-hover:opacity-100')}>
										<XIcon {...stylex.props(styles.removeIcon)} />
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			</div>

			<div {...stylex.props(styles.presetList)}>
				{COLOR_PRESETS.map(preset => (
					<button key={preset.name} onClick={() => handlePresetChange(preset)} {...stylex.props(styles.presetButton)}>
						<div {...stylex.props(styles.presetSwatches)}>
							<div
								{...stylex.props(styles.swatch)}
								style={{ backgroundColor: preset.theme.colorBrand ?? DEFAULT_THEME_COLORS.colorBrand }}
							/>
							{preset.backgroundColors.map((color, index) => (
								<div key={index} {...stylex.props(styles.swatch)} style={{ backgroundColor: color }} />
							))}
						</div>

						<span {...stylex.props(styles.presetName)}>{preset.name}</span>
					</button>
				))}
			</div>
		</div>
	)
}
