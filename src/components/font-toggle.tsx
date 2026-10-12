'use client'

import * as stylex from '@stylexjs/stylex'
import { Type } from 'lucide-react'
import DropdownToggle, { dropdownIcon } from '@/components/dropdown-toggle'
import { useI18n } from '@/i18n/context'
import { useSkin } from '@/skin/context'
import { FONT_OPTIONS, getFontOption } from '@/config/fonts'
import { ensureFontCss } from '@/lib/font'

/**
 * 菜单项字体名以该字体自身渲染，一眼可辨（字体族由行内 style 提供）。
 */
const styles = stylex.create({
	sampleName: {
		fontSize: 15,
		lineHeight: '22px',
		whiteSpace: 'nowrap'
	}
})

/**
 * 访客字体切换；结构与交互由 DropdownToggle 承载，这里只接线数据。
 *
 * 与皮肤的关系：皮肤预设自带推荐字体，选皮肤会连带换字体；本菜单是更细的一层，
 * 访客在这里显式选过字体后，它的优先级高于皮肤推荐值（见 src/skin/context.tsx）。
 */
export default function FontToggle() {
	const { fontId, setFont, fontOverridden } = useSkin()
	const { t } = useI18n()

	/*
	 * 候选字体的样式表在「首次打开菜单」时才挂：菜单里的示例要以真实字体渲染，
	 * 但没打开过菜单的访客不该为它们付费 —— huiwenmincho 的 CSS 有 161KB，
	 * 进页面就全量加载会把「按需挂 link」的设计（引导脚本里的那套）整个抵消掉。
	 */
	const loadFontCss = () => {
		FONT_OPTIONS.forEach(font => ensureFontCss(font.cssHref))
	}

	return (
		<DropdownToggle
			icon={<Type {...stylex.props(dropdownIcon)} />}
			label={<span>{t(getFontOption(fontId).nameKey)}</span>}
			ariaLabel={t('common.switchFont')}
			menuLabel={t('common.font')}
			menuMinWidth={180}
			onOpen={loadFontCss}
			items={FONT_OPTIONS.map(option => ({
				key: option.id,
				label: (
					<span {...stylex.props(styles.sampleName)} style={{ fontFamily: option.family }}>
						{t(option.nameKey)}
					</span>
				),
				active: option.id === fontId,
				onSelect: () => setFont(option.id)
			}))}
			/* 清除访客的字体覆盖，回到「皮肤推荐字体 / 站长默认字体」 */
			footerItem={fontOverridden ? { label: t('common.followSite'), onSelect: () => setFont(null) } : undefined}
		/>
	)
}
