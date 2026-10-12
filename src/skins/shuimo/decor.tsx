'use client'

import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

/**
 * 水墨皮肤的装饰层（由 src/components/skin-decor.tsx 按当前皮肤分发）。
 *
 * 层级约定（对齐 layout/backgrounds 的既有分层）：
 *   BlurredBubbles z-0 < 本层 z-1 < 内容 main z-10
 * 整层 pointer-events: none + aria-hidden，纯气氛，不参与交互、不挡任何点击。
 * 装饰位置避开固定的交互元素：左下角（语言/皮肤/字体切换）、右下角（回顶按钮、Toaster）。
 */
const styles = stylex.create({
	layer: {
		position: 'fixed',
		inset: 0,
		zIndex: 1,
		overflow: 'hidden',
		pointerEvents: 'none'
	},
	/**
	 * 右上角朱砂墨痕：ink-mark.svg（本项目自绘的落款墨痕）作 mask，
	 * 以品牌色（胭脂虫朱砂）上色，得到一枚若隐若现的落款式色痕；
	 * 微模糊模拟墨渗纸的柔边。
	 */
	inkMark: {
		position: 'absolute',
		top: 30,
		right: 44,
		width: 30,
		height: 76,
		backgroundColor: colors.brand,
		maskImage: 'url(/skins/shuimo/ink-mark.svg)',
		maskSize: '100% 100%',
		maskRepeat: 'no-repeat',
		opacity: 0.32,
		filter: 'blur(0.4px)',
		transform: 'rotate(-3deg)'
	},
	/**
	 * 底部中央竹枝：bamboo.webp（556×37 横枝）作 mask，以「竹月」色上色，
	 * 低透明度横陈于页面下缘，压在气泡画布之上、内容之下。
	 * 小屏隐藏：视口窄时底部会与通栏 UI（音乐条等）叠在一起，留白比点缀重要。
	 */
	bamboo: {
		position: 'absolute',
		left: '50%',
		bottom: -6,
		width: 480,
		height: 32,
		backgroundColor: colors.secondary,
		maskImage: 'url(/skins/shuimo/bamboo.webp)',
		maskSize: '100% 100%',
		maskRepeat: 'no-repeat',
		opacity: 0.14,
		transform: 'translateX(-50%) rotate(-1.5deg)',
		'@media (width < 48rem)': {
			display: 'none'
		}
	}
})

export default function ShuimoDecor() {
	return (
		<div aria-hidden='true' {...stylex.props(styles.layer)}>
			<div {...stylex.props(styles.inkMark)} />
			<div {...stylex.props(styles.bamboo)} />
		</div>
	)
}
