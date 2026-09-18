'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import * as stylex from '@stylexjs/stylex'
import { hashFileSHA256 } from '@/lib/file-utils'
import { hoverGroup } from '@/styles/shared/markers.stylex'
import { colors } from '@/styles/tokens.stylex'
import type { FileItem } from './types'

interface FaviconAvatarUploadProps {
	faviconItem: FileItem | null
	setFaviconItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	avatarItem: FileItem | null
	setAvatarItem: React.Dispatch<React.SetStateAction<FileItem | null>>
}

/** 原 Tailwind → StyleX 对照（group 悬停显隐改用 marker + when.ancestor） */
const styles = stylex.create({
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		gap: 16
	},
	label: {
		marginBottom: 8,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	fileInput: {
		display: 'none'
	},
	/** 上传框通用部分 */
	frame: {
		position: 'relative',
		height: 80,
		width: 80,
		cursor: 'pointer',
		overflow: 'hidden',
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)'
	},
	radiusSquare: {
		borderRadius: 8
	},
	radiusRound: {
		borderRadius: 9999
	},
	image: {
		height: '100%',
		width: '100%',
		objectFit: 'cover'
	},
	/** 悬停遮罩：标记祖先悬停时显现 */
	overlay: {
		pointerEvents: 'none',
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
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
	clickLayer: {
		position: 'absolute',
		inset: 0
	}
})

export function FaviconAvatarUpload({ faviconItem, setFaviconItem, avatarItem, setAvatarItem }: FaviconAvatarUploadProps) {
	const faviconInputRef = useRef<HTMLInputElement>(null)
	const avatarInputRef = useRef<HTMLInputElement>(null)

	const handleFaviconFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		const hash = await hashFileSHA256(file)
		const previewUrl = URL.createObjectURL(file)
		setFaviconItem({ type: 'file', file, previewUrl, hash })
		if (e.currentTarget) e.currentTarget.value = ''
	}

	const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		const hash = await hashFileSHA256(file)
		const previewUrl = URL.createObjectURL(file)
		setAvatarItem({ type: 'file', file, previewUrl, hash })
		if (e.currentTarget) e.currentTarget.value = ''
	}

	return (
		<div {...stylex.props(styles.grid)}>
			<div>
				<label {...stylex.props(styles.label)}>Favicon</label>
				<input ref={faviconInputRef} type='file' accept='image/*' {...stylex.props(styles.fileInput)} onChange={handleFaviconFileSelect} />
				<div {...stylex.props(styles.frame, styles.radiusSquare, hoverGroup)}>
					{faviconItem?.type === 'file' ? (
						<img src={faviconItem.previewUrl} alt='favicon preview' {...stylex.props(styles.image)} />
					) : (
						<img src='/favicon.png' alt='current favicon' {...stylex.props(styles.image)} />
					)}
					<div {...stylex.props(styles.overlay, styles.radiusSquare)}>
						<span {...stylex.props(styles.overlayText)}>{faviconItem ? '更换' : '上传'}</span>
					</div>

					<div {...stylex.props(styles.clickLayer)} onClick={() => faviconInputRef.current?.click()} />
				</div>
			</div>

			<div>
				<label {...stylex.props(styles.label)}>Avatar</label>
				<input ref={avatarInputRef} type='file' accept='image/*' {...stylex.props(styles.fileInput)} onChange={handleAvatarFileSelect} />
				<div {...stylex.props(styles.frame, styles.radiusRound, hoverGroup)}>
					{avatarItem?.type === 'file' ? (
						<img src={avatarItem.previewUrl} alt='avatar preview' {...stylex.props(styles.image)} />
					) : (
						<img src='/images/avatar.png' alt='current avatar' {...stylex.props(styles.image)} />
					)}
					<div {...stylex.props(styles.overlay, styles.radiusRound)}>
						<span {...stylex.props(styles.overlayText)}>{avatarItem ? '更换' : '上传'}</span>
					</div>
					<div {...stylex.props(styles.clickLayer)} onClick={() => avatarInputRef.current?.click()} />
				</div>
			</div>
		</div>
	)
}
