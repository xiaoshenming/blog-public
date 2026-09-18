'use client'

import { useWriteStore } from './stores/write-store'
import { usePreviewStore } from './stores/preview-store'
import { WriteEditor } from './components/editor'
import { WriteSidebar } from './components/sidebar'
import { WriteActions } from './components/actions'
import { WritePreview } from './components/preview'
import { useEffect } from 'react'
import * as stylex from '@stylexjs/stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
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

export default function WritePage() {
	const { form, cover, reset } = useWriteStore()
	useEffect(() => reset(), [])
	const { isPreview, closePreview } = usePreviewStore()

	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	return isPreview ? (
		<WritePreview form={form} coverPreviewUrl={coverPreviewUrl} onClose={closePreview} />
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
