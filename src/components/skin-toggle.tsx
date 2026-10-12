'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { Check, Palette } from 'lucide-react'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import { useSize } from '@/hooks/use-size'
import { useSkin } from '@/skin/context'
import { SKIN_PRESETS } from '@/skins'

/**
 * 访客皮肤切换：结构与交互对齐 language-toggle（向上弹出菜单、点外部关闭、选中打勾）。
 *
 * 定位约定：本组件不自带 position:fixed —— 由接线方把 <LanguageToggle /> 与本组件放进
 * 同一个 fixed flex 行容器（容器负责 left/bottom、移动端上移与 zIndex），wrap 只做 relative
 * 供菜单定位。按钮间距由容器 gap 控制，不依赖语言按钮的渲染宽度。
 */
const styles = stylex.create({
	wrap: {
		position: 'relative'
	},
	toggle: {
		/** card.base 是给绝对定位卡片用的，按钮必须显式回到文档流 */
		position: 'static',
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: 9999,
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px',
		cursor: 'pointer'
	},
	icon: {
		width: 20,
		height: 20
	},
	/** 菜单向右侧展开：按钮竖排在左下角，向上弹会压住上面那个按钮 */
	menu: {
		position: 'absolute',
		left: '100%',
		bottom: 0,
		marginLeft: 8,
		display: 'flex',
		flexDirection: 'column',
		minWidth: 160,
		padding: 8,
		borderRadius: 12,
		overflow: 'hidden',
		boxShadow: '0 8px 24px rgb(0 0 0 / 12%)'
	},
	menuItem: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingInline: 12,
		paddingBlock: 8,
		borderRadius: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary,
		borderWidth: 0,
		backgroundColor: 'transparent',
		cursor: 'pointer',
		textAlign: 'left'
	},
	menuItemActive: {
		color: colors.brand,
		fontWeight: 500
	},
	check: {
		width: 14,
		height: 14
	},
	/** 菜单项左侧组合：色块预览 + 皮肤名 */
	itemMain: {
		display: 'flex',
		alignItems: 'center',
		gap: 10
	},
	/**
	 * 色块预览：bg 打底，内嵌 card 小卡，卡内一条 ink 文字条 + 一个 accent 圆点，
	 * 即预设 preview 的四色微缩图。颜色随预设变化、属数据驱动，用行内 style 注入。
	 */
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
	},
	/** 「跟随站点设置」与皮肤列表之间的分隔线 */
	separator: {
		height: 1,
		marginBlock: 6,
		marginInline: 4,
		backgroundColor: colors.line
	}
})

export default function SkinToggle() {
	const { skin, skinId, setSkin, skinOverridden } = useSkin()
	const { t } = useI18n()
	const { maxSM } = useSize()
	const [open, setOpen] = useState(false)
	const wrapRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const onPointerDown = (event: PointerEvent) => {
			if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		return () => document.removeEventListener('pointerdown', onPointerDown)
	}, [open])

	return (
		<div ref={wrapRef} {...stylex.props(styles.wrap)}>
			<motion.button
				type='button'
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay: 0.4 }}
				onClick={() => setOpen(value => !value)}
				aria-label={t('common.switchSkin')}
				aria-expanded={open}
				title={t('common.switchSkin')}
				{...stylex.props(card.base, card.hover, styles.toggle)}>
				<Palette {...stylex.props(styles.icon)} />
				{!maxSM && <span>{t(skin.nameKey)}</span>}
			</motion.button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 6, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, scale: 0.96 }}
						transition={{ duration: 0.16 }}
						role='menu'
						aria-label={t('common.switchSkin')}
						{...stylex.props(card.base, styles.menu)}>
						{SKIN_PRESETS.map(preset => (
							<button
								key={preset.id}
								type='button'
								role='menuitemradio'
								aria-checked={preset.id === skinId}
								onClick={() => {
									setSkin(preset.id)
									setOpen(false)
								}}
								{...stylex.props(styles.menuItem, preset.id === skinId && styles.menuItemActive)}>
								<span {...stylex.props(styles.itemMain)}>
									<span {...stylex.props(styles.swatch)} style={{ backgroundColor: preset.preview.bg }}>
										<span {...stylex.props(styles.swatchCard)} style={{ backgroundColor: preset.preview.card }}>
											<span {...stylex.props(styles.swatchInk)} style={{ backgroundColor: preset.preview.ink }} />
											<span {...stylex.props(styles.swatchAccent)} style={{ backgroundColor: preset.preview.accent }} />
										</span>
									</span>
									<span>{t(preset.nameKey)}</span>
								</span>
								{preset.id === skinId && <Check {...stylex.props(styles.check)} />}
							</button>
						))}

						{/*
						 * 「跟随站点设置」是清除访客覆盖的动作而非皮肤选项，故用 menuitem（皮肤项才用 menuitemradio）。
						 * 只清皮肤这一条轴：字体有自己的切换入口，各自负责各自的覆盖。
						 * 仅在存在覆盖时渲染：未覆盖时它是空操作，隐藏可减少菜单噪音；选中皮肤后菜单会关闭，
						 * 下次打开才出现该项，不会产生可见的高度跳变。
						 */}
						{skinOverridden && (
							<>
								<div role='separator' {...stylex.props(styles.separator)} />
								<button
									type='button'
									role='menuitem'
									onClick={() => {
										setSkin(null)
										setOpen(false)
									}}
									{...stylex.props(styles.menuItem)}>
									<span>{t('common.followSite')}</span>
								</button>
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
