export type FontOption = {
	id: string
	name: string
	description: string
	/** 写入 `--font-sans` 的完整 font-family 栈，SSR 与客户端切换都用它 */
	family: string
	/** 自托管 webfont 的样式表地址，没有则表示仅依赖访客本机字体 */
	cssHref?: string
}

export const DEFAULT_FONT_ID = 'system'

/** 系统默认栈需与 theme.css 中 `--font-sans` 保持一致，theme.css 那份是无 JS/无配置时的兜底 */
const SYSTEM_FONT_STACK =
	"'PingFang SC', -apple-system, system-ui, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei', Arial"

export const FONT_OPTIONS: FontOption[] = [
	{
		id: DEFAULT_FONT_ID,
		name: '系统默认',
		description: '跟随访客设备自带的无衬线字体，不产生任何额外下载',
		family: SYSTEM_FONT_STACK
	},
	{
		id: 'huiwenmincho',
		name: '汇文明朝体',
		description: '宋体（明朝体）风格，bosswnx 修正版，CC0 协议。已按 unicode-range 切块自托管，页面只下载用到的字',
		family: "'Huiwenmincho Improved', 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', 'SimSun', serif",
		cssHref: '/fonts/huiwenmincho/result.css'
	}
]

export function getFontOption(id?: string | null): FontOption {
	return FONT_OPTIONS.find(font => font.id === id) ?? FONT_OPTIONS[0]
}
