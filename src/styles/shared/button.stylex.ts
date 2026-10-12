import * as stylex from '@stylexjs/stylex'
import { buttonTokens, colors } from '@/styles/tokens.stylex'

/**
 * 品牌按钮（对应原全局 @utility brand-btn，内含 btn-rounded 的圆角与 squircle 升级）
 * 数值来源：Tailwind v4 编译产物实测值；圆角/边框/贴图改由 --skin-btn-* 令牌驱动，随皮肤切换
 */
export const brandBtn = stylex.create({
	base: {
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		backgroundColor: colors.brand,
		/*
		 * 皮肤可选的墨笔触边框（水墨下为 brush-frame.webp）与底纹（青海波纹）。
		 * border-image 只写 source 与 slice，宽度交给 borderWidth —— 与参考实现
		 * shuimo-ui 的 .m-button 同构（那边是 `border: 5px double transparent` + `border-image: url(...) 8`）。
		 * 为 none 时二者都不绘制，按钮回到普通实线边框。
		 * 底纹铺在背景色之上、文字之下（background 不覆盖内容），因此不影响可读性。
		 */
		borderImage: buttonTokens.frame,
		backgroundImage: buttonTokens.texture,
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		color: colors.white,
		borderWidth: buttonTokens.borderWidth,
		borderStyle: 'solid',
		borderColor: colors.border,
		borderRadius: buttonTokens.radius,
		boxShadow: '0 4px 12px rgb(0 0 0 / 5%)',
		'@supports (corner-shape: squircle)': {
			cornerShape: 'squircle',
			borderRadius: buttonTokens.radiusLg
		}
	}
})

/** 通用圆角按钮（对应原全局 @utility btn-rounded） */
export const btnRounded = stylex.create({
	base: {
		borderRadius: buttonTokens.radius,
		'@supports (corner-shape: squircle)': {
			cornerShape: 'squircle',
			borderRadius: buttonTokens.radiusLg
		}
	}
})
