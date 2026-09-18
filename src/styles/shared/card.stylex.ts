import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

/**
 * 共享卡片样式（对应原全局 @utility card / card-hover / card-rounded）
 * 用法：stylex.props(card.base, card.hover)
 * squircle 组合（原 `card squircle`）→ stylex.props(card.base, card.squircle)
 * 数值来源：Tailwind v4 编译产物实测值（padding 24 / radius 40|64 / blur 4px / 双层阴影）
 */
export const card = stylex.create({
	base: {
		position: 'absolute',
		backgroundColor: colors.card,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		padding: 24,
		borderRadius: 40,
		backdropFilter: 'blur(4px)',
		boxShadow: '0 40px 50px -32px rgb(0 0 0 / 5%), inset 0 0 20px rgb(255 255 255 / 25%)'
	},
	/** 原 card 的 `&.squircle` 分支：@supports 未来圆角（无 @supports 支持时保持基础圆角） */
	squircle: {
		'@supports (corner-shape: squircle)': {
			cornerShape: 'squircle',
			borderRadius: 64
		}
	},
	hover: {
		transitionProperty: 'transform',
		transitionDuration: '200ms',
		'@media (hover: hover)': {
			':hover': {
				transform: 'scale(1.05)'
			}
		},
		':active': {
			transform: 'scale(0.95)'
		}
	},
	/** 原 card-rounded：独立圆角（含 squircle 升级） */
	rounded: {
		borderRadius: 40,
		'@supports (corner-shape: squircle)': {
			cornerShape: 'squircle',
			borderRadius: 64
		}
	}
})
