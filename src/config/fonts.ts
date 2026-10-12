import type { TranslationKey } from '@/i18n/translate'

export type FontOption = {
	id: string
	/** 字体名与描述的字典 key（四语齐备；访客切换菜单与站长配置面板共用） */
	nameKey: TranslationKey
	descriptionKey: TranslationKey
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
		nameKey: 'config.fontSystem',
		descriptionKey: 'config.fontSystemDesc',
		family: SYSTEM_FONT_STACK
	},
	{
		id: 'huiwenmincho',
		nameKey: 'config.fontHuiwenmincho',
		descriptionKey: 'config.fontHuiwenminchoDesc',
		family: "'Huiwenmincho Improved', 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', 'SimSun', serif",
		cssHref: '/fonts/huiwenmincho/result.css'
	}
]

export function getFontOption(id?: string | null): FontOption {
	return FONT_OPTIONS.find(font => font.id === id) ?? FONT_OPTIONS[0]
}
