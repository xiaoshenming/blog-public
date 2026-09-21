'use client'

import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import { Languages } from 'lucide-react'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import { localeLabel } from '@/i18n/config'
import { useSize } from '@/hooks/use-size'

/** 卡片风格低调 pill：常驻左下角；移动端上移避开底部 mini 播放条 */
const styles = stylex.create({
	toggle: {
		position: 'fixed',
		left: 24,
		zIndex: 40,
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: 9999,
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px'
	},
	bottomDesktop: {
		bottom: 24
	},
	/** 移动端 mini 播放条占 bottom-3 通栏，上移一层 */
	bottomMobile: {
		bottom: 80
	},
	icon: {
		width: 20,
		height: 20
	}
})

export default function LanguageToggle() {
	const { locale, toggleLocale, t } = useI18n()
	const { maxSM } = useSize()

	return (
		<motion.button
			type='button'
			initial={{ opacity: 0, scale: 0.6 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: 0.4 }}
			onClick={toggleLocale}
			aria-label={t('common.switchTo')}
			title={t('common.switchTo')}
			{...stylex.props(card.base, card.hover, styles.toggle, maxSM ? styles.bottomMobile : styles.bottomDesktop)}>
			<Languages {...stylex.props(styles.icon)} />
			{!maxSM && <span>{locale === 'zh' ? localeLabel('en') : localeLabel('zh')}</span>}
		</motion.button>
	)
}
