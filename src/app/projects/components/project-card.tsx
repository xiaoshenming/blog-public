'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import * as stylex from '@stylexjs/stylex'
import { useSize } from '@/hooks/use-size'
import ImageUploadDialog, { type ImageItem } from './image-upload-dialog'
import { card } from '@/styles/shared/card.stylex'
import { hoverGroup } from '@/styles/shared/markers.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

export interface Project {
	name: string
	year: number
	description: string
	image: string
	url: string
	tags: string[]
	github?: string
	npm?: string
}

interface ProjectCardProps {
	project: Project
	isEditMode?: boolean
	onUpdate?: (project: Project, oldProject: Project, imageItem?: ImageItem) => void
	onDelete?: () => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；图片遮罩悬停联动改用 marker + when.ancestor） */
const styles = stylex.create({
	/** 卡片外壳：卡片基底上改为相对定位的纵向排列 */
	cardShell: {
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		gap: 16
	},
	/** 编辑态右上角操作区 */
	actions: {
		position: 'absolute',
		top: 12,
		right: 12,
		zIndex: 10,
		display: 'flex',
		gap: 8
	},
	/** 操作按钮（悬停变色） */
	actionButton: {
		borderRadius: 8,
		paddingInline: 8,
		paddingBlock: 6,
		fontSize: 12,
		lineHeight: '16px',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	actionCancel: {
		color: '#99a1af',
		'@media (hover: hover)': {
			':hover': {
				color: '#4a5565'
			}
		}
	},
	actionBlue: {
		color: '#54a2ff',
		'@media (hover: hover)': {
			':hover': {
				color: '#155dfc'
			}
		}
	},
	actionDelete: {
		color: '#ff6568',
		'@media (hover: hover)': {
			':hover': {
				color: '#e40014'
			}
		}
	},
	/** 图片行 */
	header: {
		display: 'flex',
		alignItems: 'flex-start',
		gap: 16
	},
	/** 图片容器（marker 悬停组） */
	avatarWrap: {
		position: 'relative'
	},
	avatar: {
		height: 64,
		width: 64,
		flexShrink: 0,
		borderRadius: 12,
		objectFit: 'cover'
	},
	avatarEditable: {
		cursor: 'pointer'
	},
	/** 图片悬停遮罩：标记祖先悬停时显现 */
	avatarOverlay: {
		pointerEvents: 'none',
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		backgroundColor: 'rgb(0 0 0 / 40%)',
		opacity: {
			default: 0,
			[stylex.when.ancestor(':hover', hoverGroup)]: 1
		},
		transitionProperty: 'opacity',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	overlayText: {
		fontSize: 12,
		lineHeight: '16px',
		color: colors.white
	},
	info: {
		flex: '1'
	},
	/** 项目名称 */
	name: {
		fontSize: 18,
		lineHeight: '28px',
		fontWeight: 600
	},
	nameEditable: {
		cursor: 'text',
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 名称与年份行 */
	nameRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	/** 年份输入框 */
	yearInput: {
		color: colors.secondary,
		width: 72,
		borderRadius: 4,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: 'color-mix(in oklab, var(--color-secondary) 20%, transparent)',
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 14,
		lineHeight: '20px',
		':focus': {
			outlineStyle: 'none'
		}
	},
	yearText: {
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 标签区 */
	tagsRow: {
		marginTop: 8,
		display: 'flex',
		flexWrap: 'wrap',
		gap: 8
	},
	/** 标签输入框 */
	tagsInput: {
		width: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: 'color-mix(in oklab, var(--color-secondary) 20%, transparent)',
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)',
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 标签胶囊 */
	tag: {
		color: colors.secondary,
		backgroundColor: colors.card,
		borderRadius: 8,
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 简介 */
	description: {
		color: colors.secondary,
		fontSize: 14,
		lineHeight: 1.625
	},
	descriptionEditable: {
		cursor: 'text',
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 链接按钮行 */
	linksRow: {
		display: 'flex',
		flexWrap: 'wrap',
		gap: 8
	},
	/** 编辑态输入框 */
	editInput: {
		flex: '1',
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: 'color-mix(in oklab, var(--color-secondary) 20%, transparent)',
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)',
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 14,
		lineHeight: '20px',
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 链接按钮（悬停换背景） */
	linkButton: {
		backgroundColor: colors.card,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		paddingBlock: 6,
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: colors.bg
			}
		}
	}
})

export function ProjectCard({ project, isEditMode = false, onUpdate, onDelete }: ProjectCardProps) {
	const [isEditing, setIsEditing] = useState(false)
	const { maxSM } = useSize()
	const { t } = useI18n()
	const [localProject, setLocalProject] = useState(project)
	const [showImageDialog, setShowImageDialog] = useState(false)
	const [imageItem, setImageItem] = useState<ImageItem | null>(null)

	const handleFieldChange = (field: keyof Project, value: any) => {
		const updated = { ...localProject, [field]: value }
		setLocalProject(updated)
		onUpdate?.(updated, project, imageItem || undefined)
	}

	const handleImageSubmit = (image: ImageItem) => {
		setImageItem(image)
		const imageUrl = image.type === 'url' ? image.url : image.previewUrl
		const updated = { ...localProject, image: imageUrl }
		setLocalProject(updated)
		onUpdate?.(updated, project, image)
	}

	const handleTagsChange = (tagsStr: string) => {
		const tags = tagsStr
			.split(',')
			.map(t => t.trim())
			.filter(t => t)
		handleFieldChange('tags', tags)
	}

	const handleCancel = () => {
		setLocalProject(project)
		setIsEditing(false)
		setImageItem(null)
	}

	const canEdit = isEditMode && isEditing

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			{...(maxSM ? { animate: { opacity: 1, scale: 1 } } : { whileInView: { opacity: 1, scale: 1 } })}
			{...stylex.props(card.base, styles.cardShell)}>
			{isEditMode && (
				<div {...stylex.props(styles.actions)}>
					{isEditing ? (
						<>
							<button onClick={handleCancel} {...stylex.props(styles.actionButton, styles.actionCancel)}>
								{t('dialogs.cancel')}
							</button>
							<button onClick={() => setIsEditing(false)} {...stylex.props(styles.actionButton, styles.actionBlue)}>
								{t('dialogs.done')}
							</button>
						</>
					) : (
						<>
							<button onClick={() => setIsEditing(true)} {...stylex.props(styles.actionButton, styles.actionBlue)}>
								{t('dialogs.edit')}
							</button>
							<button onClick={onDelete} {...stylex.props(styles.actionButton, styles.actionDelete)}>
								{t('dialogs.delete')}
							</button>
						</>
					)}
				</div>
			)}

			<div {...stylex.props(styles.header)}>
				<div {...stylex.props(styles.avatarWrap, hoverGroup)}>
					<img
						src={localProject.image}
						alt={localProject.name}
						{...stylex.props(styles.avatar, canEdit && styles.avatarEditable)}
						onClick={() => canEdit && setShowImageDialog(true)}
					/>
					{canEdit && (
						<div {...stylex.props(styles.avatarOverlay)}>
							<span {...stylex.props(styles.overlayText)}>{t('dialogs.replace')}</span>
						</div>
					)}
				</div>
				<div {...stylex.props(styles.info)}>
					<div {...stylex.props(styles.nameRow)}>
						<h3
							contentEditable={canEdit}
							suppressContentEditableWarning
							onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
							{...stylex.props(styles.name, canEdit && styles.nameEditable)}>
							{localProject.name}
						</h3>
						{canEdit ? (
							<input
								type='number'
								value={localProject.year}
								onChange={e => handleFieldChange('year', parseInt(e.target.value) || 0)}
								{...stylex.props(styles.yearInput)}
							/>
						) : (
							<span {...stylex.props(styles.yearText)}>{localProject.year}</span>
						)}
					</div>
					<div {...stylex.props(styles.tagsRow)}>
						{canEdit ? (
							<input
								type='text'
								value={localProject.tags.join(', ')}
								onChange={e => handleTagsChange(e.target.value)}
								placeholder={t('dialogs.tagsCommaPlaceholder')}
								{...stylex.props(styles.tagsInput)}
							/>
						) : (
							localProject.tags.map(tag => (
								<span key={tag} {...stylex.props(styles.tag)}>
									{tag}
								</span>
							))
						)}
					</div>
				</div>
			</div>

			<p
				contentEditable={canEdit}
				suppressContentEditableWarning
				onBlur={e => handleFieldChange('description', e.currentTarget.textContent || '')}
				{...stylex.props(styles.description, canEdit && styles.descriptionEditable)}>
				{localProject.description}
			</p>

			<div {...stylex.props(styles.linksRow)}>
				{canEdit ? (
					<>
						<input
							type='url'
							value={localProject.url}
							onChange={e => handleFieldChange('url', e.target.value)}
							placeholder={t('dialogs.websiteUrlPlaceholder')}
							{...stylex.props(styles.editInput)}
						/>
						<input
							type='url'
							value={localProject.github || ''}
							onChange={e => handleFieldChange('github', e.target.value || undefined)}
							placeholder={t('dialogs.githubUrlOptional')}
							{...stylex.props(styles.editInput)}
						/>
						<input
							type='url'
							value={localProject.npm || ''}
							onChange={e => handleFieldChange('npm', e.target.value || undefined)}
							placeholder={t('dialogs.npmUrlOptional')}
							{...stylex.props(styles.editInput)}
						/>
					</>
				) : (
					<>
						<Link href={localProject.url} target='_blank' rel='noopener noreferrer' {...stylex.props(styles.linkButton)}>
							Website
						</Link>
						{localProject.github && (
							<Link href={localProject.github} target='_blank' rel='noopener noreferrer' {...stylex.props(styles.linkButton)}>
								GitHub
							</Link>
						)}
						{localProject.npm && (
							<Link href={localProject.npm} target='_blank' rel='noopener noreferrer' {...stylex.props(styles.linkButton)}>
								NPM
							</Link>
						)}
					</>
				)}
			</div>

			{canEdit && showImageDialog && (
				<ImageUploadDialog currentImage={localProject.image} onClose={() => setShowImageDialog(false)} onSubmit={handleImageSubmit} />
			)}
		</motion.div>
	)
}
