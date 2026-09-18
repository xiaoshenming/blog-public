import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

/**
 * 品牌按钮（对应原全局 @utility brand-btn，内含 btn-rounded 的圆角与 squircle 升级）
 * 数值来源：Tailwind v4 编译产物实测值
 */
export const brandBtn = stylex.create({
	base: {
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		backgroundColor: colors.brand,
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		color: colors.white,
		borderWidth: '1.5px',
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: 12,
		boxShadow: '0 4px 12px rgb(0 0 0 / 5%)',
		'@supports (corner-shape: squircle)': {
			cornerShape: 'squircle',
			borderRadius: 16
		}
	}
})

/** 通用圆角按钮（对应原全局 @utility btn-rounded） */
export const btnRounded = stylex.create({
	base: {
		borderRadius: 12,
		'@supports (corner-shape: squircle)': {
			cornerShape: 'squircle',
			borderRadius: 16
		}
	}
})
