'use client'

import { useRef } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useWriteStore } from '../../stores/write-store'
import * as stylex from '@stylexjs/stylex'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'

type CoverSectionProps = {
	delay?: number
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；卡片系样式复用共享定义） */
const styles = stylex.create({
	/** 分区卡：相对定位覆盖卡片基底 */
	section: {
		position: 'relative'
	},
	heading: {
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 隐藏的文件输入 */
	fileInput: {
		display: 'none'
	},
	/** 预览框 */
	previewBox: {
		backgroundColor: colors.card,
		marginTop: 12,
		height: 150,
		overflow: 'hidden',
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border
	},
	previewImg: {
		height: '100%',
		width: '100%',
		borderRadius: 16,
		objectFit: 'cover'
	},
	/** 空态：点击上传（悬停微亮） */
	emptyState: {
		display: 'grid',
		height: '100%',
		width: '100%',
		cursor: 'pointer',
		placeItems: 'center',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 60%)'
			}
		}
	},
	plusIcon: {
		fontSize: 30,
		lineHeight: 1,
		color: '#a1a1a1'
	}
})

export function CoverSection({ delay = 0 }: CoverSectionProps) {
	const { images, setCover, cover, addFiles } = useWriteStore()
	const fileInputRef = useRef<HTMLInputElement>(null)

	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	const handleCoverDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()

		// 处理从图片列表中拖入的情况
		const md = e.dataTransfer.getData('text/markdown') || e.dataTransfer.getData('text/plain') || ''
		const m = /!\[\]\(([^)]+)\)/.exec(md.trim())
		if (m) {
			const target = m[1]
			let foundItem

			if (target.startsWith('local-image:')) {
				const id = target.replace(/^local-image:/, '')
				foundItem = images.find(it => it.id === id)
			} else {
				foundItem = images.find(it => it.type === 'url' && it.url === target)
			}

			if (foundItem) {
				setCover(foundItem)
				toast.success('已设置封面')

				return
			}
		}

		// 处理直接拖入文件的情况
		const files = e.dataTransfer.files
		if (files && files.length > 0) {
			const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
			if (imageFiles.length === 0) {
				toast.error('请拖入图片文件')
				return
			}

			const resultImages = await addFiles(imageFiles as unknown as FileList)
			if (resultImages && resultImages.length > 0) {
				// 使用第一个图片作为封面
				setCover(resultImages[0])
				toast.success('已设置封面')
			}
			return
		}
	}

	const handleClickUpload = () => {
		fileInputRef.current?.click()
	}

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files || files.length === 0) return

		const resultImages = await addFiles(files)
		if (resultImages && resultImages.length > 0) {
			// 使用第一个图片作为封面
			setCover(resultImages[0])
			toast.success('已设置封面')
		}

		// 重置 input 以便可以选择相同的文件
		e.target.value = ''
	}

	return (
		<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} {...stylex.props(card.base, styles.section)}>
			<h2 {...stylex.props(styles.heading)}>封面</h2>
			<input ref={fileInputRef} type='file' accept='image/*' {...stylex.props(styles.fileInput)} onChange={handleFileChange} />
			<div
				{...stylex.props(styles.previewBox)}
				onDragOver={e => {
					e.preventDefault()
				}}
				onDrop={handleCoverDrop}>
				{!!coverPreviewUrl ? (
					<img src={coverPreviewUrl} alt='cover preview' {...stylex.props(styles.previewImg)} />
				) : (
					<div {...stylex.props(styles.emptyState)} onClick={handleClickUpload}>
						<span {...stylex.props(styles.plusIcon)}>+</span>
					</div>
				)}
			</div>
		</motion.div>
	)
}
