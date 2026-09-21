import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'
import { DEFAULT_LOCALE, type Locale } from './config'

type DateVariant = 'long' | 'short'

/** 各语言的日期格式；新语言在 locales.ts 注册后在这里补两项即可，缺失回落默认语言格式 */
const FORMATS: Partial<Record<Locale, Record<DateVariant, string>>> = {
	zh: { long: 'YYYY年M月D日', short: 'YYYY/M/D' },
	en: { long: 'MMM D, YYYY', short: 'MMM D, YYYY' }
}

/** dayjs 的 locale 包名与语言码基本一致，中文例外（zh-cn） */
function dayjsLocaleName(locale: Locale): string {
	return locale === 'zh' ? 'zh-cn' : locale
}

export function formatDate(date: string | number | Date | undefined, locale: Locale, variant: DateVariant = 'long'): string {
	if (!date) return ''
	const formats = FORMATS[locale] ?? FORMATS[DEFAULT_LOCALE] ?? { long: 'YYYY/M/D', short: 'YYYY/M/D' }
	const day = dayjs(date).locale(dayjsLocaleName(locale))
	return day.isValid() ? day.format(formats[variant]) : ''
}
