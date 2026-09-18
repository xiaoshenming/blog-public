'use client'

import { useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { DialogModal } from '@/components/dialog-modal'

type MarkdownImageProps = {
	src: string
	alt?: string
	title?: string
}

/** 原 Tailwind：主图 cursor-pointer transition-opacity hover:opacity-80 / 弹窗 max-w-none bg-transparent p-0 / 大图 max-h-[90vh] max-w-full rounded-2xl object-contain */
const styles = stylex.create({
	image: {
		cursor: 'pointer',
		transitionProperty: 'opacity',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				opacity: 0.8
			}
		}
	},
	dialog: {
		maxWidth: 'none',
		backgroundColor: 'transparent',
		padding: 0
	},
	preview: {
		maxHeight: '90vh',
		maxWidth: '100%',
		borderRadius: 16,
		objectFit: 'contain'
	}
})

export function MarkdownImage({ src, alt = '', title = '' }: MarkdownImageProps) {
	const [display, setDisplay] = useState(false)

	return (
		<>
			<img src={src} alt={alt} title={title} loading='lazy' onClick={() => setDisplay(true)} {...stylex.props(styles.image)} />
			<DialogModal open={display} onClose={() => setDisplay(false)} style={styles.dialog}>
				<img src={src} alt={alt} {...stylex.props(styles.preview)} />
			</DialogModal>
		</>
	)
}
