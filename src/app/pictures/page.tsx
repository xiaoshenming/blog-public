'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import * as stylex from '@stylexjs/stylex'
import initialList from './list.json'
import initialListEn from './list.en.json'
import { RandomLayout } from './components/random-layout'
import UploadDialog from './components/upload-dialog'
import { pushPictures } from './services/push-pictures'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import type { ImageItem } from '../projects/components/image-upload-dialog'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/context'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'

export interface Picture {
	id: string
	uploadedAt: string
	description?: string
	image?: string
	images?: string[]
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物；卡片/品牌按钮复用共享定义） */
const styles = stylex.create({
	/** 隐藏的密钥文件输入框 */
	fileInput: {
		display: 'none'
	},
	/** 空态提示：撑满视口并居中 */
	emptyState: {
		display: 'flex',
		minHeight: '100vh',
		alignItems: 'center',
		justifyContent: 'center',
		textAlign: 'center',
		fontSize: 14,
		lineHeight: '20px',
		color: colors.secondary
	},
	/** 右上角操作区（小屏隐藏） */
	toolbar: {
		position: 'absolute',
		top: 16,
		right: 24,
		display: 'flex',
		gap: 12,
		'@media (width < 40rem)': {
			display: 'none'
		}
	},
	/** 压缩工具按钮：浅蓝底蓝字（配合共享悬停样式提供缩放反馈） */
	compressButton: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: '#eff6ff',
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		color: '#1447e6'
	},
	/** 白底操作按钮（配合共享悬停样式提供缩放反馈） */
	ghostButton: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 品牌按钮的横向内边距覆盖 */
	saveButton: {
		paddingInline: 24
	},
	/** 编辑按钮（毛玻璃 + 悬停变亮；颜色过渡覆盖共享悬停样式的缩放过渡，与原状一致） */
	editButton: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 24,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		backdropFilter: 'blur(8px)',
		transitionProperty:
			'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		}
	}
})

export default function Page() {
	const [pictures, setPictures] = useState<Picture[]>(initialList as Picture[])
	const [originalPictures, setOriginalPictures] = useState<Picture[]>(initialList as Picture[])
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
	const [imageItems, setImageItems] = useState<Map<string, ImageItem>>(new Map())
	const keyInputRef = useRef<HTMLInputElement>(null)
	const router = useRouter()

	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const { locale, t } = useI18n()
	const hideEditButton = siteContent.hideEditButton ?? false

	/** 访客态按语言展示对应内容数据；编辑态固定中文（中文为管理端数据源） */
	const displayPictures = !isEditMode && locale !== DEFAULT_LOCALE ? (initialListEn as Picture[]) : pictures

	const handleUploadSubmit = ({ images, description }: { images: ImageItem[]; description: string }) => {
		const now = new Date().toISOString()

		if (images.length === 0) {
			toast.error('请至少选择一张图片')
			return
		}

		const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
		const desc = description.trim() || undefined

		const imageUrls = images.map(imageItem => (imageItem.type === 'url' ? imageItem.url : imageItem.previewUrl))

		const newPicture: Picture = {
			id,
			uploadedAt: now,
			description: desc,
			images: imageUrls
		}

		const newMap = new Map(imageItems)

		images.forEach((imageItem, index) => {
			if (imageItem.type === 'file') {
				newMap.set(`${id}::${index}`, imageItem)
			}
		})

		setPictures(prev => [...prev, newPicture])
		setImageItems(newMap)
		setIsUploadDialogOpen(false)
	}

	const handleDeleteSingleImage = (pictureId: string, imageIndex: number | 'single') => {
		setPictures(prev => {
			return prev
				.map(picture => {
					if (picture.id !== pictureId) return picture

					// 如果是 single image，删除整个 Picture
					if (imageIndex === 'single') {
						return null
					}

					// 如果是 images 数组中的图片
					if (picture.images && picture.images.length > 0) {
						const newImages = picture.images.filter((_, idx) => idx !== imageIndex)
						// 如果删除后数组为空，删除整个 Picture
						if (newImages.length === 0) {
							return null
						}
						return {
							...picture,
							images: newImages
						}
					}

					return picture
				})
				.filter((p): p is Picture => p !== null)
		})

		// 更新 imageItems Map
		setImageItems(prev => {
			const next = new Map(prev)
			if (imageIndex === 'single') {
				// 删除所有相关的文件项
				for (const key of next.keys()) {
					if (key.startsWith(`${pictureId}::`)) {
						next.delete(key)
					}
				}
			} else {
				// 删除特定索引的文件项
				next.delete(`${pictureId}::${imageIndex}`)

				// 重新索引：删除索引 imageIndex 后，后面的索引需要前移
				// 例如：删除索引 1，原来的索引 2 变成 1，索引 3 变成 2
				const keysToUpdate: Array<{ oldKey: string; newKey: string }> = []
				for (const key of next.keys()) {
					if (key.startsWith(`${pictureId}::`)) {
						const [, indexStr] = key.split('::')
						const oldIndex = Number(indexStr)
						if (!isNaN(oldIndex) && oldIndex > imageIndex) {
							const newIndex = oldIndex - 1
							keysToUpdate.push({
								oldKey: key,
								newKey: `${pictureId}::${newIndex}`
							})
						}
					}
				}

				// 执行重新索引
				for (const { oldKey, newKey } of keysToUpdate) {
					const value = next.get(oldKey)
					if (value) {
						next.set(newKey, value)
						next.delete(oldKey)
					}
				}
			}
			return next
		})
	}

	const handleDeleteGroup = (picture: Picture) => {
		if (!confirm('确定要删除这一组图片吗？')) return

		setPictures(prev => prev.filter(p => p.id !== picture.id))
		setImageItems(prev => {
			const next = new Map(prev)
			for (const key of next.keys()) {
				if (key.startsWith(`${picture.id}::`)) {
					next.delete(key)
				}
			}
			return next
		})
	}

	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	const handleSave = async () => {
		setIsSaving(true)

		try {
			await pushPictures({
				pictures,
				imageItems
			})

			setOriginalPictures(pictures)
			setImageItems(new Map())
			setIsEditMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		setPictures(originalPictures)
		setImageItems(new Map())
		setIsEditMode(false)
	}

	const buttonText = isAuth ? '保存' : '导入密钥'

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setIsEditMode(true)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isEditMode])

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				{...stylex.props(styles.fileInput)}
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<RandomLayout pictures={displayPictures} isEditMode={isEditMode} onDeleteSingle={handleDeleteSingleImage} onDeleteGroup={handleDeleteGroup} />

			{displayPictures.length === 0 && <div className={stylex.props(styles.emptyState).className}>{t('collections.emptyPictures')}</div>}

			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(styles.toolbar)}>
				{isEditMode ? (
					<>
						<button onClick={() => router.push('/image-toolbox')} {...stylex.props(card.hover, styles.compressButton)}>
							压缩工具
						</button>
						<button onClick={handleCancel} disabled={isSaving} {...stylex.props(card.hover, styles.ghostButton)}>
							取消
						</button>
						<button onClick={() => setIsUploadDialogOpen(true)} {...stylex.props(card.hover, styles.ghostButton)}>
							上传
						</button>
						<button onClick={handleSaveClick} disabled={isSaving} {...stylex.props(card.hover, brandBtn.base, styles.saveButton)}>
							{isSaving ? '保存中...' : buttonText}
						</button>
					</>
				) : (
					!hideEditButton && (
						<button onClick={() => setIsEditMode(true)} {...stylex.props(card.hover, styles.editButton)}>
							编辑
						</button>
					)
				)}
			</motion.div>

			{isUploadDialogOpen && <UploadDialog onClose={() => setIsUploadDialogOpen(false)} onSubmit={handleUploadSubmit} />}
		</>
	)
}
