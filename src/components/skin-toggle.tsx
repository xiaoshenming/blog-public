'use client'

import * as stylex from '@stylexjs/stylex'
import { Palette } from 'lucide-react'
import DropdownToggle, { dropdownIcon } from '@/components/dropdown-toggle'
import { useI18n } from '@/i18n/context'
import { useSkin } from '@/skin/context'
import { SKIN_PRESETS, type SkinPreset } from '@/skins'

/**
 * 菜单项左侧的色块预览：bg 打底，内嵌 card 小卡，卡内一条 ink 文字条 + 一个 accent 圆点，
 * 即预设 preview 的四色微缩图。颜色随预设变化、属数据驱动，用行内 style 注入。
 */
const styles = stylex.create({
	itemMain: {
		display: 'flex',
		alignItems: 'center',
		gap: 10
	},
	swatch: {
		position: 'relative',
		width: 28,
		height: 28,
		borderRadius: 8,
		overflow: 'hidden',
		flexShrink: 0
	},
	swatchCard: {
		position: 'absolute',
		top: 6,
		left: 6,
		right: 6,
		bottom: 6,
		borderRadius: 4
	},
	swatchInk: {
		position: 'absolute',
		top: 3,
		left: 3,
		width: 6,
		height: 3,
		borderRadius: 9999
	},
	swatchAccent: {
		position: 'absolute',
		right: 3,
		bottom: 3,
		width: 6,
		height: 6,
		borderRadius: 9999
	}
})

function SkinSwatch({ preview }: { preview: SkinPreset['preview'] }) {
	return (
		<span {...stylex.props(styles.swatch)} style={{ backgroundColor: preview.bg }}>
			<span {...stylex.props(styles.swatchCard)} style={{ backgroundColor: preview.card }}>
				<span {...stylex.props(styles.swatchInk)} style={{ backgroundColor: preview.ink }} />
				<span {...stylex.props(styles.swatchAccent)} style={{ backgroundColor: preview.accent }} />
			</span>
		</span>
	)
}

/** 访客皮肤切换；结构与交互由 DropdownToggle 承载，这里只接线数据 */
export default function SkinToggle() {
	const { skin, skinId, setSkin, skinOverridden } = useSkin()
	const { t } = useI18n()

	return (
		<DropdownToggle
			icon={<Palette {...stylex.props(dropdownIcon)} />}
			label={<span>{t(skin.nameKey)}</span>}
			ariaLabel={t('common.switchSkin')}
			menuLabel={t('common.skin')}
			menuMinWidth={160}
			items={SKIN_PRESETS.map(preset => ({
				key: preset.id,
				label: (
					<span {...stylex.props(styles.itemMain)}>
						<SkinSwatch preview={preset.preview} />
						<span>{t(preset.nameKey)}</span>
					</span>
				),
				active: preset.id === skinId,
				onSelect: () => setSkin(preset.id)
			}))}
			/*
			 * 只清皮肤这一条轴：字体有自己的切换入口，各自负责各自的覆盖。
			 * 仅在存在覆盖时渲染：未覆盖时它是空操作，隐藏可减少菜单噪音。
			 */
			footerItem={skinOverridden ? { label: t('common.followSite'), onSelect: () => setSkin(null) } : undefined}
		/>
	)
}
