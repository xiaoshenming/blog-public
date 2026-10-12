import * as stylex from '@stylexjs/stylex'

/**
 * 颜色令牌 —— 使用 defineConsts（编译期常量内联）
 * 指向运行时注入的 --color-* 自定义属性
 * （源头：theme.css 默认值 + 根布局内联注入 + 皮肤/配置面板运行时修改，见 src/app/layout.tsx）
 *
 * 注意：刻意不使用 defineVars —— 它会生成哈希变量名（如 --xrf1o6s），
 * 与全局 CSS / 第三方样式的稳定变量名需求冲突（demo 实测结论）。
 */
export const colors = stylex.defineConsts({
	primary: 'var(--color-primary)',
	secondary: 'var(--color-secondary)',
	brandSecondary: 'var(--color-brand-secondary)',
	bg: 'var(--color-bg)',
	border: 'var(--color-border)',
	brand: 'var(--color-brand)',
	card: 'var(--color-card)',
	article: 'var(--color-article)',
	/** 正文墨色（比 primary 深，用于正文与标题） */
	ink: 'var(--color-ink)',
	/** 次要文字（说明、占位、禁用态） */
	muted: 'var(--color-muted)',
	/** 边框与分隔线 */
	line: 'var(--color-line)',
	/** 输入框/按钮等半透明实底 */
	surface: 'var(--color-surface)',
	/** 比 surface 更实的一层：悬停底色、需要压住背景的条状控件 */
	surfaceStrong: 'var(--color-surface-strong)',
	/** 极浅底（表头、代码块、hover 底色） */
	subtle: 'var(--color-subtle)',
	white: '#fff'
})

/** 字体令牌（配合 next/font 注入的 --font-* 变量） */
export const fonts = stylex.defineConsts({
	averia: 'var(--font-averia)',
	sans: 'var(--font-sans)'
})

/** 卡片质感令牌：随皮肤切换，见 src/skins/ 与 src/lib/skin.ts 的 applySkin */
export const cardTokens = stylex.defineConsts({
	radius: 'var(--skin-card-radius)',
	radiusLg: 'var(--skin-card-radius-lg)',
	blur: 'var(--skin-card-blur)',
	shadow: 'var(--skin-card-shadow)',
	borderWidth: 'var(--skin-card-border-width)'
})
