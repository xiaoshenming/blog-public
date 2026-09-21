import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'
import type { Locale } from './config'

type DateVariant = 'long' | 'short'

/** 中文用「YYYY年M月D日」，英文用「Sep 21, 2026」；short 给列表等紧凑场景 */
const FORMATS: Record<Locale, Record<DateVariant, string>> = {
	zh: { long: 'YYYY年M月D日', short: 'YYYY/M/D' },
	en: { long: 'MMM D, YYYY', short: 'MMM D, YYYY' }
}

export function formatDate(date: string | number | Date | undefined, locale: Locale, variant: DateVariant = 'long'): string {
	if (!date) return ''
	const day = dayjs(date).locale(locale === 'en' ? 'en' : 'zh-cn')
	return day.isValid() ? day.format(FORMATS[locale][variant]) : ''
}
