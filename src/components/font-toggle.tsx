'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { Check, Type } from 'lucide-react'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import { useSize } from '@/hooks/use-size'
import { useSkin } from '@/skin/context'
import { FONT_OPTIONS, getFontOption } from '@/config/fonts'
import { ensureFontCss } from '@/lib/font'

/**
 * 访客字体切换：结构与交互对齐 language-toggle / skin-toggle。
 *
 * 定位约定：本组件不自带 position:fixed —— 由布局层的共享 fixed 容器统一负责
 * left/bottom、移动端上移与 zIndex，wrap 只做 relative 供菜单锚定。
 *
 * 与皮肤的关系：皮肤预设自带推荐字体，选皮肤会连带换字体；本菜单是更细的一层，
 * 访客在这里显式选过字体后，它的优先级高于皮肤推荐值（见 src/skin/context.tsx）。
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
		minWidth: 180,
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
	/** 菜单项字体名：以该字体自身渲染，一眼可辨（字体族由行内 style 提供） */
	sampleName: {
		fontSize: 15,
		lineHeight: '22px',
		whiteSpace: 'nowrap'
	},
	/** 「跟随站点设置」与字体列表之间的分隔线 */
	separator: {
		height: 1,
		marginBlock: 6,
		marginInline: 4,
		backgroundColor: colors.line
	}
})

export default function FontToggle() {
	const { fontId, setFont, fontOverridden } = useSkin()
	const { t } = useI18n()
	const { maxSM } = useSize()
	const [open, setOpen] = useState(false)
	const wrapRef = useRef<HTMLDivElement>(null)

	// 进入页面就挂上全部候选字体的样式表，菜单里的示例才能以真实字体渲染
	useEffect(() => {
		FONT_OPTIONS.forEach(font => ensureFontCss(font.cssHref))
	}, [])

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
				aria-label={t('common.switchFont')}
				aria-expanded={open}
				title={t('common.switchFont')}
				{...stylex.props(card.base, card.hover, styles.toggle)}>
				<Type {...stylex.props(styles.icon)} />
				{!maxSM && <span>{t(getFontOption(fontId).nameKey)}</span>}
			</motion.button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 6, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, scale: 0.96 }}
						transition={{ duration: 0.16 }}
						role='menu'
						aria-label={t('common.font')}
						{...stylex.props(card.base, styles.menu)}>
						{FONT_OPTIONS.map(option => (
							<button
								key={option.id}
								type='button'
								role='menuitemradio'
								aria-checked={option.id === fontId}
								onClick={() => {
									setFont(option.id)
									setOpen(false)
								}}
								{...stylex.props(styles.menuItem, option.id === fontId && styles.menuItemActive)}>
								<span {...stylex.props(styles.sampleName)} style={{ fontFamily: option.family }}>
									{t(option.nameKey)}
								</span>
								{option.id === fontId && <Check {...stylex.props(styles.check)} />}
							</button>
						))}

						{/*
						 * 清除访客的字体覆盖，回到「皮肤推荐字体 / 站长默认字体」。
						 * 与皮肤菜单同理：是动作而非选项，故用 menuitem，且仅在存在覆盖时渲染。
						 */}
						{fontOverridden && (
							<>
								<div role='separator' {...stylex.props(styles.separator)} />
								<button
									type='button'
									role='menuitem'
									onClick={() => {
										setFont(null)
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
