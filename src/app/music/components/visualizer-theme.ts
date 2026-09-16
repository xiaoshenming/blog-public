import type { Theme } from '../visualizer/types'

/** `--font-sans` 是逗号分隔的 font-family 列表，拆成数组交给 fontStacks 归一化 */
function splitFontFamilies(value: string) {
	return value
		.split(',')
		.map(family => family.trim().replace(/^['"]|['"]$/g, ''))
		.filter(Boolean)
}

/**
 * 沉浸歌词固定走深色舞台，但品牌色和字体跟随站点配置（配置弹窗里改了会在下次打开时生效）。
 * 只在客户端打开面板时调用。
 */
export function buildVisualizerTheme(): Theme {
	const rootStyle = getComputedStyle(document.documentElement)
	const brand = rootStyle.getPropertyValue('--color-brand').trim() || '#f59e0b'
	const fontFamilyStack = splitFontFamilies(rootStyle.getPropertyValue('--font-sans'))

	return {
		name: 'blog-immersive',
		backgroundColor: '#0b0b10',
		primaryColor: '#f5f5f7',
		accentColor: brand,
		secondaryColor: 'rgba(245, 245, 247, 0.55)',
		fontStyle: 'sans',
		fontFamilyStack: fontFamilyStack.length ? fontFamilyStack : undefined,
		fontWeight: 500,
		animationIntensity: 'normal'
	}
}
