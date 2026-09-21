'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { Check, Languages } from 'lucide-react'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import { LOCALES, localeLabel } from '@/i18n/config'
import { useSize } from '@/hooks/use-size'

/** 常驻左下角的低调语言切换；多语言为向上弹出菜单，移动端整体上移避开底部 mini 播放条 */
const styles = stylex.create({
	wrap: {
		position: 'fixed',
		left: 24,
		zIndex: 40
	},
	bottomDesktop: {
		bottom: 24
	},
	/** 移动端 mini 播放条占 bottom-3 通栏，上移一层 */
	bottomMobile: {
		bottom: 80
	},
	toggle: {
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
	menu: {
		position: 'absolute',
		bottom: '100%',
		left: 0,
		marginBottom: 8,
		display: 'flex',
		flexDirection: 'column',
		minWidth: 140,
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
	}
})

export default function LanguageToggle() {
	const { locale, setLocale, t } = useI18n()
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
		<div ref={wrapRef} {...stylex.props(styles.wrap, maxSM ? styles.bottomMobile : styles.bottomDesktop)}>
			<motion.button
				type='button'
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay: 0.4 }}
				onClick={() => setOpen(value => !value)}
				aria-label={t('common.switchTo')}
				aria-expanded={open}
				title={t('common.switchTo')}
				{...stylex.props(card.base, card.hover, styles.toggle)}>
				<Languages {...stylex.props(styles.icon)} />
				{!maxSM && <span>{localeLabel(locale)}</span>}
			</motion.button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 6, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, scale: 0.96 }}
						transition={{ duration: 0.16 }}
						role='menu'
						aria-label={t('common.language')}
						{...stylex.props(card.base, styles.menu)}>
						{LOCALES.map(code => (
							<button
								key={code}
								type='button'
								role='menuitemradio'
								aria-checked={code === locale}
								onClick={() => {
									setLocale(code)
									setOpen(false)
								}}
								{...stylex.props(styles.menuItem, code === locale && styles.menuItemActive)}>
								<span>{localeLabel(code)}</span>
								{code === locale && <Check {...stylex.props(styles.check)} />}
							</button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
