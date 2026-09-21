'use client'

import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import StarRating from '@/components/star-rating'
import { useSize } from '@/hooks/use-size'
import EditableStarRating from '@/components/editable-star-rating'
import { useState } from 'react'
import LogoUploadDialog, { type LogoItem } from './logo-upload-dialog'
import { card } from '@/styles/shared/card.stylex'
import { hoverGroup } from '@/styles/shared/markers.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

export interface Share {
	name: string
	logo: string
	url: string
	description: string
	tags: string[]
	stars: number
}

interface ShareCardProps {
	share: Share
	isEditMode?: boolean
	onUpdate?: (share: Share, oldShare: Share, logoItem?: LogoItem) => void
	onDelete?: () => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；group 悬停联动改用 marker + when.ancestor） */
const styles = stylex.create({
	/** 卡片外壳：卡片基底上改为相对定位并裁剪溢出 */
	cardShell: {
		position: 'relative',
		display: 'block',
		overflow: 'hidden'
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
	/** 操作按钮（悬停加深） */
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
	/** 头像行 */
	header: {
		marginBottom: 16,
		display: 'flex',
		alignItems: 'center',
		gap: 16
	},
	/** 头像容器（marker 悬停组） */
	avatarWrap: {
		position: 'relative'
	},
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 12,
		objectFit: 'cover'
	},
	avatarEditable: {
		cursor: 'pointer'
	},
	/** 头像悬停遮罩：标记祖先悬停时显现 */
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
	/** 名称（悬停变色原属容器外死代码，未迁移） */
	name: {
		fontSize: 18,
		lineHeight: '28px',
		fontWeight: 700,
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		':focus': {
			outlineStyle: 'none'
		}
	},
	nameEditable: {
		cursor: 'text'
	},
	/** 地址文本（链接形态附加悬停变色与下划线） */
	url: {
		marginTop: 4,
		display: 'block',
		maxWidth: 200,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary
	},
	urlEditable: {
		cursor: 'text',
		':focus': {
			outlineStyle: 'none'
		}
	},
	urlLink: {
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand,
				textDecorationLine: 'underline'
			}
		}
	},
	/** 标签区 */
	tags: {
		marginTop: 12,
		display: 'flex',
		flexWrap: 'wrap',
		gap: 6
	},
	/** 标签编辑输入框 */
	tagsInput: {
		width: '100%',
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: '#d1d5dc',
		backgroundColor: '#f9fafb',
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
		borderRadius: 9999,
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 10%, transparent)',
		paddingInline: 10,
		paddingBlock: 2,
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 简介（展开/收起切换行数裁切） */
	description: {
		marginTop: 12,
		fontSize: 14,
		lineHeight: 1.625,
		color: '#4a5565',
		transitionProperty: 'all',
		transitionDuration: '300ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		':focus': {
			outlineStyle: 'none'
		}
	},
	cursorText: {
		cursor: 'text'
	},
	cursorPointer: {
		cursor: 'pointer'
	},
	clampThumb: {
		display: '-webkit-box',
		WebkitBoxOrient: 'vertical',
		WebkitLineClamp: 3,
		overflow: 'hidden'
	},
	clampExpanded: {
		display: 'block',
		WebkitBoxOrient: 'horizontal',
		WebkitLineClamp: 'unset',
		overflow: 'visible'
	}
})

export function ShareCard({ share, isEditMode = false, onUpdate, onDelete }: ShareCardProps) {
	const [expanded, setExpanded] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const { maxSM } = useSize()
	const { t } = useI18n()
	const [localShare, setLocalShare] = useState(share)
	const [showLogoDialog, setShowLogoDialog] = useState(false)
	const [logoItem, setLogoItem] = useState<LogoItem | null>(null)

	const handleFieldChange = (field: keyof Share, value: any) => {
		const updated = { ...localShare, [field]: value }
		setLocalShare(updated)
		onUpdate?.(updated, share, logoItem || undefined)
	}

	const handleLogoSubmit = (logo: LogoItem) => {
		setLogoItem(logo)
		const logoUrl = logo.type === 'url' ? logo.url : logo.previewUrl
		const updated = { ...localShare, logo: logoUrl }
		setLocalShare(updated)
		onUpdate?.(updated, share, logo)
	}

	const handleTagsChange = (tagsStr: string) => {
		const tags = tagsStr
			.split(',')
			.map(t => t.trim())
			.filter(t => t)
		handleFieldChange('tags', tags)
	}

	const handleCancel = () => {
		setLocalShare(share)
		setIsEditing(false)
		setLogoItem(null)
	}

	const canEdit = isEditMode && isEditing

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.6 }}
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

			<div>
				<div {...stylex.props(styles.header)}>
					<div {...stylex.props(styles.avatarWrap, hoverGroup)}>
						<img
							src={localShare.logo}
							alt={localShare.name}
							{...stylex.props(styles.avatar, canEdit && styles.avatarEditable)}
							onClick={() => canEdit && setShowLogoDialog(true)}
						/>
						{canEdit && (
							<div {...stylex.props(styles.avatarOverlay)}>
								<span {...stylex.props(styles.overlayText)}>{t('dialogs.replace')}</span>
							</div>
						)}
					</div>
					<div {...stylex.props(styles.info)}>
						<h3
							contentEditable={canEdit}
							suppressContentEditableWarning
							onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
							{...stylex.props(styles.name, canEdit && styles.nameEditable)}>
							{localShare.name}
						</h3>
						{canEdit ? (
							<div
								contentEditable
								suppressContentEditableWarning
								onBlur={e => handleFieldChange('url', e.currentTarget.textContent || '')}
								{...stylex.props(styles.url, styles.urlEditable)}>
								{localShare.url}
							</div>
						) : (
							<a href={localShare.url} target='_blank' rel='noopener noreferrer' {...stylex.props(styles.url, styles.urlLink)}>
								{localShare.url}
							</a>
						)}
					</div>
				</div>

				{canEdit ? (
					<EditableStarRating stars={localShare.stars} editable={true} onChange={stars => handleFieldChange('stars', stars)} />
				) : (
					<StarRating stars={localShare.stars} />
				)}

				<div {...stylex.props(styles.tags)}>
					{canEdit ? (
						<input
							type='text'
							value={localShare.tags.join(', ')}
							onChange={e => handleTagsChange(e.target.value)}
							placeholder={t('dialogs.tagsCommaPlaceholder')}
							{...stylex.props(styles.tagsInput)}
						/>
					) : (
						localShare.tags.map(tag => (
							<span key={tag} {...stylex.props(styles.tag)}>
								{tag}
							</span>
						))
					)}
				</div>

				<p
					contentEditable={canEdit}
					suppressContentEditableWarning
					onBlur={e => handleFieldChange('description', e.currentTarget.textContent || '')}
					onClick={e => {
						if (!canEdit) {
							e.preventDefault()
							setExpanded(!expanded)
						}
					}}
					{...stylex.props(
						styles.description,
						canEdit ? styles.cursorText : styles.cursorPointer,
						!canEdit && (expanded ? styles.clampExpanded : styles.clampThumb)
					)}>
					{localShare.description}
				</p>
			</div>

			{canEdit && showLogoDialog && <LogoUploadDialog currentLogo={localShare.logo} onClose={() => setShowLogoDialog(false)} onSubmit={handleLogoSubmit} />}
		</motion.div>
	)
}
