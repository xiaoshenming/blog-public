import * as stylex from '@stylexjs/stylex'
import { cardTokens, colors } from '@/styles/tokens.stylex'

/**
 * 共享卡片样式（对应原全局 @utility card / card-hover / card-rounded）
 * 用法：stylex.props(card.base, card.hover)
 * squircle 组合（原 `card squircle`）→ stylex.props(card.base, card.squircle)
 *
 * 圆角/模糊/阴影/边框宽度改由 --skin-card-* 令牌驱动，随皮肤切换
 * （默认皮肤的值等同原 Tailwind v4 编译产物实测值：padding 24 / radius 40|64 / blur 4px / 双层阴影）
 */
export const card = stylex.create({
	base: {
		position: 'absolute',
		backgroundColor: colors.card,
		borderWidth: cardTokens.borderWidth,
		borderStyle: 'solid',
		borderColor: colors.border,
		padding: 24,
		borderRadius: cardTokens.radius,
		backdropFilter: cardTokens.blur,
		boxShadow: cardTokens.shadow
	},
	/** 原 card 的 `&.squircle` 分支：@supports 未来圆角（无 @supports 支持时保持基础圆角） */
	squircle: {
		'@supports (corner-shape: squircle)': {
			cornerShape: 'squircle',
			borderRadius: cardTokens.radiusLg
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
		borderRadius: cardTokens.radius,
		'@supports (corner-shape: squircle)': {
			cornerShape: 'squircle',
			borderRadius: cardTokens.radiusLg
		}
	}
})
