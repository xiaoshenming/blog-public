import * as stylex from '@stylexjs/stylex'

/**
 * 颜色令牌 —— 使用 defineConsts（编译期常量内联）
 * 指向运行时注入的 --color-* 自定义属性
 * （源头：theme.css 默认值 + 根布局内联注入 + 配置面板运行时修改，见 src/app/layout.tsx）
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
	white: '#fff'
})

/** 字体令牌（配合 next/font 注入的 --font-* 变量） */
export const fonts = stylex.defineConsts({
	averia: 'var(--font-averia)',
	sans: 'var(--font-sans)'
})
