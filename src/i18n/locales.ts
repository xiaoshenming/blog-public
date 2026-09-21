import type { Locale } from './config'

/**
 * 语言字典注册表：非默认语言的字典聚合文件在 src/i18n/dictionaries/<locale>/。
 * 新增语言三步：
 *  1. config.ts 的 LOCALES 加语言码、LOCALE_LABELS 加显示名
 *  2. 在这里 import 该语言的聚合并注册
 *  3. dates.ts 补该语言的日期格式（与 dayjs locale import）
 * 字典文件本身由 scripts/i18n 翻译管线生成（TRANSLATE_TARGET=<语言码> pnpm i18n:dict）。
 * 注意：这里不校验 Dictionary 结构——zh 新增文案后其他语言允许滞后，缺 key 运行时回落中文。
 */
import { en } from './dictionaries/en'
import { ja } from './dictionaries/ja'
import { ko } from './dictionaries/ko'

export const dictionaries: Partial<Record<Locale, unknown>> = {
	en,
	ja,
	ko
}
