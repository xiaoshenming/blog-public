import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

/** 旋转 keyframes（对应 Tailwind animate-spin：1s linear infinite） */
export const spin = stylex.keyframes({
	from: { transform: 'rotate(0deg)' },
	to: { transform: 'rotate(360deg)' }
})

/**
 * 杂项共享样式（对应原全局 @utility 中的通用工具类）
 * 数值来源：Tailwind v4 编译产物实测值
 */
export const util = stylex.create({
	/** no-spinner：隐藏数字输入框上下箭头 */
	noSpinner: {
		'::-webkit-outer-spin-button': {
			appearance: 'none',
			margin: 0
		},
		'::-webkit-inner-spin-button': {
			appearance: 'none',
			margin: 0
		},
		MozAppearance: 'textfield'
	},
	/** bg-linear：品牌色对角渐变背景 */
	bgLinear: {
		backgroundImage: 'linear-gradient(to right bottom, var(--color-brand) 0%, var(--color-brand-secondary))',
		color: colors.white
	},
	/** text-linear：渐变文字（双层渐变 + 文字裁切） */
	textLinear: {
		backgroundImage:
			'linear-gradient(to right bottom, #0003 0%, #aaa1), linear-gradient(to right bottom, var(--color-brand) 40%, var(--color-brand-secondary))',
		WebkitBackgroundClip: 'text',
		WebkitTextFillColor: 'transparent',
		backgroundClip: 'text'
	},
	/** 原自定义 @utility shadow 的投影值（软阴影） */
	shadowSoft: {
		boxShadow: '0 40px 50px -32px rgb(0 0 0 / 5%)'
	},
	/** 图标尺寸（原 size-4 = 16px） */
	iconSm: {
		width: 16,
		height: 16
	},
	/** 旋转动画（原 animate-spin） */
	spinner: {
		animationName: spin,
		animationDuration: '1s',
		animationTimingFunction: 'linear',
		animationIterationCount: 'infinite'
	}
})
