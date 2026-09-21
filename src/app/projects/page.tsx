'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import * as stylex from '@stylexjs/stylex'
import { ProjectCard, type Project } from './components/project-card'
import CreateDialog from './components/create-dialog'
import { pushProjects } from './services/push-projects'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import initialListEn from './list.en.json'
import type { ImageItem } from './components/image-upload-dialog'
import { useI18n } from '@/i18n/context'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'
import { colors } from '@/styles/tokens.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 隐藏的文件选择框 */
	fileInput: {
		display: 'none'
	},
	/** 页面容器 */
	container: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		paddingInline: 24,
		paddingTop: 128,
		paddingBottom: 48
	},
	/** 项目网格（窄屏单列） */
	grid: {
		display: 'grid',
		width: '100%',
		maxWidth: 1200,
		gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		gap: 24,
		'@media (width < 48rem)': {
			gridTemplateColumns: 'repeat(1, minmax(0, 1fr))'
		}
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
	/** 白底操作按钮（配合共享卡片悬停反馈） */
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
	/** 卡片底操作按钮（毛玻璃 + 悬停变亮；颜色过渡覆盖共享卡片悬停的形变过渡，与原状一致） */
	editButton: {
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
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
	const [projects, setProjects] = useState<Project[]>(initialList as Project[])
	const [originalProjects, setOriginalProjects] = useState<Project[]>(initialList as Project[])
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [editingProject, setEditingProject] = useState<Project | null>(null)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [imageItems, setImageItems] = useState<Map<string, ImageItem>>(new Map())
	const keyInputRef = useRef<HTMLInputElement>(null)

	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const { locale } = useI18n()
	const hideEditButton = siteContent.hideEditButton ?? false

	/** 访客态按语言展示对应内容数据；编辑态固定中文（中文为管理端数据源） */
	const displayProjects = !isEditMode && locale === 'en' ? (initialListEn as Project[]) : projects

	const handleUpdate = (updatedProject: Project, oldProject: Project, imageItem?: ImageItem) => {
		setProjects(prev => prev.map(p => (p.url === oldProject.url ? updatedProject : p)))
		if (imageItem) {
			setImageItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedProject.url, imageItem)
				return newMap
			})
		}
	}

	const handleAdd = () => {
		setEditingProject(null)
		setIsCreateDialogOpen(true)
	}

	const handleSaveProject = (updatedProject: Project) => {
		if (editingProject) {
			const updated = projects.map(p => (p.url === editingProject.url ? updatedProject : p))
			setProjects(updated)
		} else {
			setProjects([...projects, updatedProject])
		}
	}

	const handleDelete = (project: Project) => {
		if (confirm(`确定要删除 ${project.name} 吗？`)) {
			setProjects(projects.filter(p => p.url !== project.url))
		}
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
			await pushProjects({
				projects,
				imageItems
			})

			setOriginalProjects(projects)
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
		setProjects(originalProjects)
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

			<div {...stylex.props(styles.container)}>
				<div {...stylex.props(styles.grid)}>
					{displayProjects.map((project, index) => (
						<ProjectCard key={project.url} project={project} isEditMode={isEditMode} onUpdate={handleUpdate} onDelete={() => handleDelete(project)} />
					))}
				</div>
			</div>

			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} {...stylex.props(styles.toolbar)}>
				{isEditMode ? (
					<>
						<button onClick={handleCancel} disabled={isSaving} {...stylex.props(card.hover, styles.ghostButton)}>
							取消
						</button>
						<button onClick={handleAdd} {...stylex.props(card.hover, styles.ghostButton)}>
							添加
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

			{isCreateDialogOpen && <CreateDialog project={editingProject} onClose={() => setIsCreateDialogOpen(false)} onSave={handleSaveProject} />}
		</>
	)
}
