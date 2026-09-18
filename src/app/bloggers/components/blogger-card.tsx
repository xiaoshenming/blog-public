'use client'

import { motion } from 'motion/react'
import * as stylex from '@stylexjs/stylex'
import StarRating from '@/components/star-rating'
import { useSize } from '@/hooks/use-size'
import { cn } from '@/lib/utils'
import EditableStarRating from '@/components/editable-star-rating'
import { Blogger, type BloggerStatus } from '../grid-view'
import { useState } from 'react'
import AvatarUploadDialog, { type AvatarItem } from './avatar-upload-dialog'
import { card } from '@/styles/shared/card.stylex'
import { hoverGroup } from '@/styles/shared/markers.stylex'
import { colors } from '@/styles/tokens.stylex'

interface BloggerCardProps {
	blogger: Blogger
	isEditMode?: boolean
	onUpdate?: (blogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => void
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
	/** 头像容器（hoverGroup 标记：供子元素遮罩悬停显现） */
	avatarWrap: {
		position: 'relative'
	},
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 9999,
		objectFit: 'cover'
	},
	avatarEditable: {
		cursor: 'pointer'
	},
	/** 头像悬停遮罩：标记祖先悬停时显现（原 group/group-hover 语义） */
	avatarOverlay: {
		pointerEvents: 'none',
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
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
	/** 名称（原版 'group' 仅包头像，h3 悬停变色系死代码，未复现） */
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
	/** 状态切换 */
	statusRow: {
		marginTop: 8,
		display: 'flex',
		gap: 8
	},
	statusButton: {
		borderRadius: 9999,
		paddingInline: 12,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	statusActive: {
		backgroundColor: colors.brand,
		color: colors.white
	},
	statusIdle: {
		backgroundColor: '#e5e7eb',
		color: '#4a5565',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: '#d1d5dc'
			}
		}
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

export function BloggerCard({ blogger, isEditMode = false, onUpdate, onDelete }: BloggerCardProps) {
	const [expanded, setExpanded] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const { maxSM } = useSize()
	const [localBlogger, setLocalBlogger] = useState(blogger)
	const [showAvatarDialog, setShowAvatarDialog] = useState(false)
	const [avatarItem, setAvatarItem] = useState<AvatarItem | null>(null)

	const handleFieldChange = (field: keyof Blogger, value: any) => {
		const updated = { ...localBlogger, [field]: value }
		setLocalBlogger(updated)
		onUpdate?.(updated, blogger, avatarItem || undefined)
	}

	const handleAvatarSubmit = (avatar: AvatarItem) => {
		setAvatarItem(avatar)
		const avatarUrl = avatar.type === 'url' ? avatar.url : avatar.previewUrl
		const updated = { ...localBlogger, avatar: avatarUrl }
		setLocalBlogger(updated)
		onUpdate?.(updated, blogger, avatar)
	}

	const handleCancel = () => {
		setLocalBlogger(blogger)
		setIsEditing(false)
		setAvatarItem(null)
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
								取消
							</button>
							<button onClick={() => setIsEditing(false)} {...stylex.props(styles.actionButton, styles.actionBlue)}>
								完成
							</button>
						</>
					) : (
						<>
							<button onClick={() => setIsEditing(true)} {...stylex.props(styles.actionButton, styles.actionBlue)}>
								编辑
							</button>
							<button onClick={onDelete} {...stylex.props(styles.actionButton, styles.actionDelete)}>
								删除
							</button>
						</>
					)}
				</div>
			)}

			<div>
				<div {...stylex.props(styles.header)}>
					<div {...stylex.props(styles.avatarWrap, hoverGroup)}>
						<img
							src={localBlogger.avatar}
							alt={localBlogger.name}
							{...stylex.props(styles.avatar, canEdit && styles.avatarEditable)}
							onClick={() => canEdit && setShowAvatarDialog(true)}
						/>
						{canEdit && (
							<div {...stylex.props(styles.avatarOverlay)}>
								<span {...stylex.props(styles.overlayText)}>更换</span>
							</div>
						)}
					</div>
					<div {...stylex.props(styles.info)}>
						<h3
							contentEditable={canEdit}
							suppressContentEditableWarning
							onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
							className={stylex.props(styles.name, canEdit && styles.nameEditable).className}>
							{localBlogger.name}
						</h3>
						{canEdit ? (
							<div
								contentEditable
								suppressContentEditableWarning
								onBlur={e => handleFieldChange('url', e.currentTarget.textContent || '')}
								{...stylex.props(styles.url, styles.urlEditable)}>
								{localBlogger.url}
							</div>
						) : (
							<a
								href={localBlogger.url}
								target='_blank'
								rel='noopener noreferrer'
								{...stylex.props(styles.url, styles.urlLink)}>
								{localBlogger.url}
							</a>
						)}
					</div>
				</div>

				{canEdit ? (
					<EditableStarRating stars={localBlogger.stars} editable={true} onChange={stars => handleFieldChange('stars', stars)} />
				) : (
					<StarRating stars={localBlogger.stars} />
				)}

				{canEdit && (
					<div {...stylex.props(styles.statusRow)}>
						{(['recent', 'disconnected'] as BloggerStatus[]).map(status => (
							<button
								key={status}
								type='button'
								onClick={() => handleFieldChange('status', status)}
								{...stylex.props(styles.statusButton, (localBlogger.status ?? 'recent') === status ? styles.statusActive : styles.statusIdle)}>
								{status === 'recent' ? '近期更新' : '长期失联'}
							</button>
						))}
					</div>
				)}

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
					{...stylex.props(styles.description, canEdit ? styles.cursorText : styles.cursorPointer, !canEdit && (expanded ? styles.clampExpanded : styles.clampThumb))}>
					{localBlogger.description}
				</p>
			</div>

			{canEdit && showAvatarDialog && (
				<AvatarUploadDialog currentAvatar={localBlogger.avatar} onClose={() => setShowAvatarDialog(false)} onSubmit={handleAvatarSubmit} />
			)}
		</motion.div>
	)
}
