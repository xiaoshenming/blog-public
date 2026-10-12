'use client'

import * as stylex from '@stylexjs/stylex'
import { Languages } from 'lucide-react'
import DropdownToggle, { dropdownIcon } from '@/components/dropdown-toggle'
import { useI18n } from '@/i18n/context'
import { LOCALES, localeLabel } from '@/i18n/config'

/** 常驻左下角的低调语言切换；多语言为向右侧弹出的菜单（定位由布局层的共享 fixed 容器统一负责） */
export default function LanguageToggle() {
	const { locale, setLocale, t } = useI18n()

	return (
		<DropdownToggle
			icon={<Languages {...stylex.props(dropdownIcon)} />}
			label={<span>{localeLabel(locale)}</span>}
			ariaLabel={t('common.switchTo')}
			menuLabel={t('common.language')}
			menuMinWidth={140}
			items={LOCALES.map(code => ({
				key: code,
				label: <span>{localeLabel(code)}</span>,
				active: code === locale,
				onSelect: () => setLocale(code)
			}))}
		/>
	)
}
