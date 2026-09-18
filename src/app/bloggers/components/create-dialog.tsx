'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import AvatarUploadDialog, { type AvatarItem } from './avatar-upload-dialog'
import { DialogModal } from '@/components/dialog-modal'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { hoverGroup } from '@/styles/shared/markers.stylex'
import { colors } from '@/styles/tokens.stylex'

interface Blogger {
	name: string
	avatar: string
	url: string
	description: string
	stars: number
}

interface CreateDialogProps {
	blogger: Blogger | null
	onClose: () => void
	onSave: (blogger: Blogger, avatarItem?: AvatarItem) => void
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；group 悬停联动改用 marker + when.ancestor） */
const styles = stylex.create({
	/** 弹窗内容宽度 384 */
	dialogWidth: {
		width: 384
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
		position: 'relative',
		cursor: 'pointer'
	},
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 9999,
		objectFit: 'cover'
	},
	/** 头像悬停遮罩：标记祖先悬停时显现 */
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
	/** 空头像占位 */
	avatarEmpty: {
		display: 'flex',
		width: 64,
		height: 64,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
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
	urlInput: {
		marginTop: 4,
		width: '100%',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 12,
		lineHeight: '16px',
		color: colors.secondary,
		':focus': {
			outlineStyle: 'none'
		}
	},
	/** 星级评分 */
	stars: {
		display: 'flex',
		alignItems: 'center',
		gap: 2
	},
	starButton: {
		cursor: 'pointer'
	},
	starOn: {
		fill: '#fac800'
	},
	starOff: {
		fill: '#d1d5dc'
	},
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
	/** 品牌按钮的弹性宽度与居中覆盖（横向内边距同品牌按钮默认值） */
	submitButton: {
		flex: '1',
		justifyContent: 'center'
	}
})

export default function CreateDialog({ blogger, onClose, onSave }: CreateDialogProps) {
	const [formData, setFormData] = useState<Blogger>({
		name: '',
		avatar: '',
		url: '',
		description: '',
		stars: 3
	})
	const [showAvatarDialog, setShowAvatarDialog] = useState(false)
	const [avatarItem, setAvatarItem] = useState<AvatarItem | null>(null)

	useEffect(() => {
		if (blogger) {
			setFormData(blogger)
		} else {
			setFormData({
				name: '',
				avatar: '',
				url: '',
				description: '',
				stars: 3
			})
			setAvatarItem(null)
		}
	}, [blogger])

	const handleAvatarSubmit = (avatar: AvatarItem) => {
		setAvatarItem(avatar)
		const avatarUrl = avatar.type === 'url' ? avatar.url : avatar.previewUrl
		setFormData({ ...formData, avatar: avatarUrl })
	}

	const handleSubmit = () => {
		if (!formData.name.trim() || !formData.avatar.trim() || !formData.url.trim() || !formData.description.trim()) {
			toast.error('请填写所有必填项')
			return
		}

		onSave(formData, avatarItem || undefined)
		onClose()
		toast.success(blogger ? '更新成功' : '添加成功')
	}

	return (
		<DialogModal open onClose={onClose} style={[card.base, styles.dialogWidth]}>
			{/* 卡片样式的内容 */}
			<div>
				<div {...stylex.props(styles.header)}>
					<div {...stylex.props(styles.avatarWrap, hoverGroup)} onClick={() => setShowAvatarDialog(true)}>
						{formData.avatar ? (
							<>
								<img src={formData.avatar} alt={formData.name} {...stylex.props(styles.avatar)} />
								<div {...stylex.props(styles.avatarOverlay)}>
									<span {...stylex.props(styles.overlayText)}>更换</span>
								</div>
							</>
						) : (
							<div {...stylex.props(styles.avatarEmpty)}>
								<Plus {...stylex.props(styles.plusIcon)} />
							</div>
						)}
					</div>
					<div {...stylex.props(styles.info)}>
						<input
							type='text'
							value={formData.name}
							onChange={e => setFormData({ ...formData, name: e.target.value })}
							placeholder='博主名称'
							{...stylex.props(styles.nameInput)}
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

				{/* 星级评分 */}
				<div {...stylex.props(styles.stars)}>
					{[1, 2, 3, 4, 5].map(index => (
						<div key={index} onClick={() => setFormData({ ...formData, stars: index })} {...stylex.props(styles.starButton)}>
							<svg width='16' height='16' viewBox='0 0 24 24' {...stylex.props(index <= formData.stars ? styles.starOn : styles.starOff)}>
								<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
							</svg>
						</div>
					))}
				</div>

				<textarea
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					placeholder='博主介绍...'
					{...stylex.props(styles.descriptionInput)}
					rows={4}
				/>
			</div>

			{/* 操作按钮 */}
			<div {...stylex.props(styles.actions)}>
				<button onClick={onClose} {...stylex.props(styles.cancelButton)}>
					取消
				</button>
				<button onClick={handleSubmit} {...stylex.props(brandBtn.base, styles.submitButton)}>
					{blogger ? '保存' : '添加'}
				</button>
			</div>

			{showAvatarDialog && <AvatarUploadDialog currentAvatar={formData.avatar} onClose={() => setShowAvatarDialog(false)} onSubmit={handleAvatarSubmit} />}
		</DialogModal>
	)
}
