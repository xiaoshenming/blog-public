'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import ImageUploadDialog, { type ImageItem } from './image-upload-dialog'
import type { Project } from './project-card'
import { DialogModal } from '@/components/dialog-modal'
import { cn } from '@/lib/utils'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'

interface CreateDialogProps {
	project: Project | null
	onClose: () => void
	onSave: (project: Project) => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；图片遮罩悬停联动因 StyleX 不支持祖先选择器，保留字符串类） */
const styles = stylex.create({
	/** 图片行 */
	header: {
		marginBottom: 16,
		display: 'flex',
		alignItems: 'center',
		gap: 16
	},
	/** 图片容器（group 保留字符串） */
	imageWrap: {
		position: 'relative',
		cursor: 'pointer'
	},
	avatar: {
		height: 64,
		width: 64,
		borderRadius: 12,
		objectFit: 'cover'
	},
	/** 图片悬停遮罩（显隐沿用字符串类） */
	imageOverlay: {
		pointerEvents: 'none',
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		backgroundColor: 'rgb(0 0 0 / 40%)',
		opacity: 0,
		transitionProperty: 'opacity',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	overlayText: {
		fontSize: 12,
		lineHeight: '16px',
		color: colors.white
	},
	/** 空图片占位 */
	imageEmpty: {
		display: 'flex',
		height: 64,
		width: 64,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		backgroundColor: '#e5e7eb'
	},
	plusIcon: {
		width: 24,
		height: 24,
		color: '#6a7282'
	},
	info: {
		flex: '1'
	},
	nameInput: {
		width: '100%',
		fontSize: 18,
		lineHeight: '28px',
		fontWeight: 700,
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 年份与地址行 */
	metaRow: {
		marginTop: 4,
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	yearInput: {
		color: colors.secondary,
		width: 80,
		borderRadius: 4,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		':focus': {
			outlineStyle: 'none'
		}
	},
	urlInput: {
		color: colors.secondary,
		flex: '1',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 12,
		lineHeight: '16px',
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 标签区 */
	tagsSection: {
		marginTop: 12
	},
	/** 表单输入框（标签与可选链接共用） */
	fieldInput: {
		width: '100%',
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: '#f9fafb',
		paddingInline: 12,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		':focus': {
			outlineStyle: 'none'
		}
	},
	tagsRow: {
		marginTop: 8,
		display: 'flex',
		flexWrap: 'wrap',
		gap: 6
	},
	tag: {
		borderRadius: 9999,
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)',
		paddingInline: 10,
		paddingBlock: 2,
		fontSize: 12,
		lineHeight: '16px',
		color: '#4a5565'
	},
	/** 项目介绍 */
	descriptionInput: {
		marginTop: 12,
		width: '100%',
		resize: 'none',
		fontSize: 14,
		lineHeight: 1.625,
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 可选链接区（纵向堆叠） */
	optionalSection: {
		marginTop: 12,
		display: 'flex',
		flexDirection: 'column',
		gap: 8
	},
	/** 操作按钮行 */
	actions: {
		marginTop: 24,
		display: 'flex',
		gap: 12
	},
	cancelButton: {
		flex: '1',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: colors.white,
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#f9fafb'
			}
		}
	},
	/** 品牌按钮的弹性宽度与居中覆盖 */
	submitButton: {
		flex: '1',
		justifyContent: 'center'
	}
})

export default function CreateDialog({ project, onClose, onSave }: CreateDialogProps) {
	const [formData, setFormData] = useState<Project>({
		name: '',
		year: new Date().getFullYear(),
		image: '',
		url: '',
		description: '',
		tags: [],
		github: undefined,
		npm: undefined
	})
	const [showImageDialog, setShowImageDialog] = useState(false)
	const [tagsInput, setTagsInput] = useState('')

	useEffect(() => {
		if (project) {
			setFormData(project)
			setTagsInput(project.tags.join(', '))
		} else {
			setFormData({
				name: '',
				year: new Date().getFullYear(),
				image: '',
				url: '',
				description: '',
				tags: [],
				github: undefined,
				npm: undefined
			})
			setTagsInput('')
		}
	}, [project])

	const handleImageSubmit = (image: ImageItem) => {
		const imageUrl = image.type === 'url' ? image.url : image.previewUrl
		setFormData({ ...formData, image: imageUrl })
	}

	const handleTagsChange = (value: string) => {
		setTagsInput(value)
		const tags = value
			.split(',')
			.map(t => t.trim())
			.filter(t => t)
		setFormData({ ...formData, tags })
	}

	const handleSubmit = () => {
		if (!formData.name.trim() || !formData.image.trim() || !formData.url.trim() || !formData.description.trim()) {
			toast.error('请填写所有必填项')
			return
		}

		if (formData.tags.length === 0) {
			toast.error('请至少添加一个标签')
			return
		}

		onSave(formData)
		onClose()
		toast.success(project ? '更新成功' : '添加成功')
	}

	return (
		<DialogModal open onClose={onClose} className='card static w-md max-sm:w-full'>
			<div>
				<div {...stylex.props(styles.header)}>
					<div className={cn(stylex.props(styles.imageWrap).className, 'group')} onClick={() => setShowImageDialog(true)}>
						{formData.image ? (
							<>
								<img src={formData.image} alt={formData.name} {...stylex.props(styles.avatar)} />
								<div className={cn(stylex.props(styles.imageOverlay).className, 'group-hover:opacity-100')}>
									<span {...stylex.props(styles.overlayText)}>更换</span>
								</div>
							</>
						) : (
							<div {...stylex.props(styles.imageEmpty)}>
								<Plus {...stylex.props(styles.plusIcon)} />
							</div>
						)}
					</div>
					<div {...stylex.props(styles.info)}>
						<input
							type='text'
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							placeholder='项目名称'
							{...stylex.props(styles.nameInput)}
						/>
						<div {...stylex.props(styles.metaRow)}>
							<input
								type='number'
								value={formData.year}
								onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
								placeholder='年份'
								{...stylex.props(styles.yearInput)}
							/>
							<input
								type='url'
								value={formData.url}
								onChange={e => setFormData({ ...formData, url: e.target.value })}
								placeholder='https://example.com'
								{...stylex.props(styles.urlInput)}
							/>
						</div>
					</div>
				</div>

				<div {...stylex.props(styles.tagsSection)}>
					<input
						type='text'
						value={tagsInput}
						onChange={e => handleTagsChange(e.target.value)}
						placeholder='标签，用逗号分隔（如：React, Vue）'
						{...stylex.props(styles.fieldInput)}
					/>
					<div {...stylex.props(styles.tagsRow)}>
						{formData.tags.map(tag => (
							<span key={tag} {...stylex.props(styles.tag)}>
								{tag}
							</span>
						))}
					</div>
				</div>

				<textarea
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					placeholder='项目介绍...'
					{...stylex.props(styles.descriptionInput)}
					rows={4}
				/>

				<div {...stylex.props(styles.optionalSection)}>
					<input
						type='url'
						value={formData.github || ''}
						onChange={e => setFormData({ ...formData, github: e.target.value || undefined })}
						placeholder='GitHub URL（可选）'
						{...stylex.props(styles.fieldInput)}
					/>
					<input
						type='url'
						value={formData.npm || ''}
						onChange={e => setFormData({ ...formData, npm: e.target.value || undefined })}
						placeholder='NPM URL（可选）'
						{...stylex.props(styles.fieldInput)}
					/>
				</div>
			</div>

			<div {...stylex.props(styles.actions)}>
				<button onClick={onClose} {...stylex.props(styles.cancelButton)}>
					取消
				</button>
				<button onClick={handleSubmit} {...stylex.props(brandBtn.base, styles.submitButton)}>
					{project ? '保存' : '添加'}
				</button>
			</div>

			{showImageDialog && <ImageUploadDialog currentImage={formData.image} onClose={() => setShowImageDialog(false)} onSubmit={handleImageSubmit} />}
		</DialogModal>
	)
}
