'use client'

import { useParams } from 'next/navigation'
import { useWriteStore } from '../stores/write-store'
import { usePreviewStore } from '../stores/preview-store'
import { useLoadBlog } from '../hooks/use-load-blog'
import { WriteEditor } from '../components/editor'
import { WriteSidebar } from '../components/sidebar'
import { WriteActions } from '../components/actions'
import { WritePreview } from '../components/preview'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 状态提示：整屏居中 */
	statusBox: {
		display: 'flex',
		height: '100vh',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 状态提示·弱化色 */
	statusMuted: {
		color: colors.secondary
	},
	/** 状态提示·错误色 */
	statusError: {
		color: '#fb2c36'
	},
	/** 写作区主容器：横向居中、顶部留白 */
	shell: {
		display: 'flex',
		height: '100%',
		justifyContent: 'center',
		gap: 24,
		paddingInline: 24,
		paddingTop: 96,
		paddingBottom: 48
	}
})

export default function EditBlogPage() {
	const params = useParams() as { slug?: string }
	const slug = params?.slug || ''

	const { form, cover } = useWriteStore()
	const { isPreview, closePreview } = usePreviewStore()
	const { loading } = useLoadBlog(slug)

	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	if (loading) {
		return <div {...stylex.props(styles.statusBox, styles.statusMuted)}>加载中...</div>
	}

	if (!slug) {
		return <div {...stylex.props(styles.statusBox, styles.statusError)}>无效的博客 ID</div>
	}

	return isPreview ? (
		<WritePreview form={form} coverPreviewUrl={coverPreviewUrl} onClose={closePreview} slug={slug} />
	) : (
		<>
			<div {...stylex.props(styles.shell)}>
				<WriteEditor />
				<WriteSidebar />
			</div>

			<WriteActions />
		</>
	)
}
