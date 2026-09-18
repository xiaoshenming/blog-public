'use client'

import * as stylex from '@stylexjs/stylex'
import Live2DViewer from './live2d-viewer'

/** 容器：全高居中并留出上下间距 */
const styles = stylex.create({
	page: {
		display: 'flex',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		paddingBlock: 32
	}
})

export default function Live2DPage() {
	return (
		<div {...stylex.props(styles.page)}>
			<Live2DViewer />
		</div>
	)
}
