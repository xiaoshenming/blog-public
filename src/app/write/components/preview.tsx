import { motion } from 'motion/react'
import { BlogPreview } from '@/components/blog-preview'
import { useWriteData } from '../hooks/use-write-data'
import type { PublishForm } from '../types'
import * as stylex from '@stylexjs/stylex'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 关闭预览按钮：右上角、半透明白底 */
	closeBtn: {
		position: 'absolute',
		top: 16,
		right: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	}
})

type WritePreviewProps = {
	form: PublishForm
	coverPreviewUrl: string | null
	onClose: () => void
	slug?: string
}

export function WritePreview({ form, coverPreviewUrl, onClose, slug }: WritePreviewProps) {
	const previewData = useWriteData()
	const { t } = useI18n()
	return (
		<div>
			<div onClick={e => e.stopPropagation()}>
				<BlogPreview
					markdown={previewData.markdown}
					title={previewData.title}
					tags={form.tags}
					date={previewData.date}
					summary={form.summary}
					cover={coverPreviewUrl || undefined}
					slug={slug}
				/>
			</div>
			<motion.button initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(card.hover, styles.closeBtn)} onClick={onClose}>
				{t('write.closePreview')}
			</motion.button>
		</div>
	)
}
