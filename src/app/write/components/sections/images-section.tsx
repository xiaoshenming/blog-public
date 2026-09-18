'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'
import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import { cn } from '@/lib/utils'
import { card } from '@/styles/shared/card.stylex'
import { colors } from '@/styles/tokens.stylex'
import { util } from '@/styles/shared/util.stylex'

type ImagesSectionProps = {
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
	/** 标题行 */
	headerRow: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	/** 压缩工具链接 */
	toolLink: {
		fontSize: 12,
		lineHeight: '16px',
		'@media (hover: hover)': {
			':hover': {
				textDecoration: 'underline'
			}
		}
	},
	/** 地址输入行 */
	urlRow: {
		marginTop: 12,
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	urlInput: {
		backgroundColor: colors.card,
		flex: '1',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	addBtn: {
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 70%)',
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 隐藏的文件输入 */
	fileInput: {
		display: 'none'
	},
	/** 图片网格 */
	grid: {
		marginTop: 12,
		display: 'grid',
		gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
		gap: 8
	},
	/** 上传占位块（group 字符串保留） */
	plusTile: {
		backgroundColor: colors.card,
		position: 'relative',
		display: 'grid',
		aspectRatio: '1',
		cursor: 'pointer',
		placeItems: 'center',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, var(--color-secondary) 20%, transparent)'
			}
		}
	},
	plusIcon: {
		fontSize: 24,
		lineHeight: 1,
		color: '#a1a1a1'
	},
	/** 图片卡（group 字符串保留） */
	imageCard: {
		position: 'relative',
		aspectRatio: '1',
		overflow: 'hidden',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 50%)',
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 已设为封面：外圈描边 */
	imageCardCover: {
		boxShadow: '0 0 0 2px #3080ff'
	},
	thumb: {
		height: '100%',
		width: '100%',
		objectFit: 'cover'
	},
	/** 封面角标 */
	coverBadge: {
		position: 'absolute',
		top: 4,
		left: 4,
		borderRadius: 6,
		backgroundColor: '#3080ff',
		paddingInline: 6,
		paddingBlock: 2,
		color: colors.white
	},
	/** 删除按钮包裹层（悬停显隐沿用字符串类） */
	deleteWrap: {
		position: 'absolute',
		top: 4,
		right: 4,
		display: 'none'
	},
	deleteBtn: {
		borderRadius: 6,
		backgroundColor: 'rgb(255 255 255 / 80%)',
		paddingInline: 6,
		paddingBlock: 2,
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: colors.white
			}
		}
	}
})

export function ImagesSection({ delay = 0 }: ImagesSectionProps) {
	const { images, cover, addUrlImage, addFiles, deleteImage } = useWriteStore()
	const [urlInput, setUrlInput] = useState<string>('')
	const fileInputRef = useRef<HTMLInputElement>(null)

	const coverId = cover?.id ?? null

	return (
		<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} {...stylex.props(card.base, styles.section)}>
			<div {...stylex.props(styles.headerRow)}>
				<h2 {...stylex.props(styles.heading)}>图片管理</h2>
				<Link href='/image-toolbox' target='_blank' {...stylex.props(styles.toolLink)}>
					压缩工具
				</Link>
			</div>

			<div {...stylex.props(styles.urlRow)}>
				<input
					type='text'
					placeholder='https://...'
					{...stylex.props(styles.urlInput)}
					value={urlInput}
					onChange={e => setUrlInput(e.target.value)}
				/>
				<button
					{...stylex.props(styles.addBtn)}
					onClick={() => {
						const v = urlInput.trim()
						if (!v) return
						addUrlImage(v)
						setUrlInput('')
					}}>
					添加
				</button>
			</div>

			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				multiple
				{...stylex.props(styles.fileInput)}
				onChange={e => {
					const files = e.target.files
					if (files && files.length > 0) {
						addFiles(files)
					}
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div {...stylex.props(styles.grid)}>
				{/* plus tile */}
				<div
					className={cn(stylex.props(styles.plusTile).className, 'group')}
					onClick={() => fileInputRef.current?.click()}
					onDragOver={e => {
						e.preventDefault()
					}}
					onDrop={e => {
						e.preventDefault()
						const files = e.dataTransfer.files
						if (files && files.length) addFiles(files)
					}}>
					<span {...stylex.props(styles.plusIcon)}>+</span>
				</div>

				{images.map(item => {
					const isUrl = item.type === 'url'
					const src = isUrl ? item.url : item.previewUrl
					const markdown = isUrl ? `![](${item.url})` : `![](local-image:${item.id})`
					const isCover = coverId === item.id

					return (
						<div key={item.id} className={cn(stylex.props(styles.imageCard, isCover && styles.imageCardCover).className, 'group')}>
							<img
								src={src}
								{...stylex.props(styles.thumb)}
								draggable
								onDragStart={e => {
									e.dataTransfer.setData('text/plain', markdown)
									e.dataTransfer.setData('text/markdown', markdown)
								}}
							/>
							{isCover && <div {...stylex.props(styles.coverBadge, util.shadowSoft)}>封面</div>}
							<div className={cn(stylex.props(styles.deleteWrap).className, 'group-hover:flex')}>
								<button type='button' {...stylex.props(styles.deleteBtn, util.shadowSoft)} onClick={() => deleteImage(item.id)}>
									删除
								</button>
							</div>
						</div>
					)
				})}
			</div>
		</motion.div>
	)
}
