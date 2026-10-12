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
		boxShadow: cardTokens.shadow,
		/*
		 * 皮肤可选的墨线描边：四层背景各铺一条 repeat 的笔触线（上/下/左/右）。
		 * 线条素材是固定像素宽（横线 548×5、竖线 6×548），四条各自平铺，
		 * 因此任意宽高比的卡片都不变形 —— 这是相对 border-image 的关键差别。
		 * --skin-card-edge 为 none 时四层都不绘制，等同普通卡片。
		 *
		 * 使用约束：这里占满了 background-image 的四个图层位，且 background-size
		 * 是四值。任何「用了 card.base 又自己设 background-image」的元素，
		 * 单层图会被 background-size 的第一项（auto 5px）压成 5px 高。
		 * 需要自铺背景的卡片请显式覆盖 backgroundImage / backgroundSize
		 * （dropdown-toggle 的菜单与切换按钮就是这么做的）。
		 */
		backgroundImage: cardTokens.edge,
		backgroundPosition: 'top left, bottom left, top left, top right',
		backgroundRepeat: 'repeat-x, repeat-x, repeat-y, repeat-y',
		backgroundSize: 'auto 5px, auto 5px, 6px auto, 6px auto'
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
