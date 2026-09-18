'use client'

import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import type { SiteContent } from '../../stores/config-store'
import type { ArtImageUploads, BackgroundImageUploads, FileItem, SocialButtonImageUploads } from './types'
import { FaviconAvatarUpload } from './favicon-avatar-upload'
import { SiteMetaForm } from './site-meta-form'
import { ArtImagesSection } from './art-images-section'
import { BackgroundImagesSection } from './background-images-section'
import { SocialButtonsSection } from './social-buttons-section'
import { HatSection } from './hat-section'
import { BeianForm } from './beian-form'

export type { FileItem, ArtImageUploads, BackgroundImageUploads, SocialButtonImageUploads } from './types'

/** 原 Tailwind → StyleX 对照（space-y-6 改为弹性列 + 间距 24） */
const styles = stylex.create({
	container: {
		display: 'flex',
		flexDirection: 'column',
		gap: 24
	},
	checkboxRow: {
		display: 'flex',
		gap: 12
	},
	checkboxLabel: {
		display: 'flex',
		alignItems: 'center',
		gap: 8
	},
	checkbox: {
		width: 16,
		height: 16,
		accentColor: colors.brand,
		borderRadius: 4
	},
	checkboxText: {
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	}
})

interface SiteSettingsProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
	faviconItem: FileItem | null
	setFaviconItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	avatarItem: FileItem | null
	setAvatarItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	artImageUploads: ArtImageUploads
	setArtImageUploads: React.Dispatch<React.SetStateAction<ArtImageUploads>>
	backgroundImageUploads: BackgroundImageUploads
	setBackgroundImageUploads: React.Dispatch<React.SetStateAction<BackgroundImageUploads>>
	socialButtonImageUploads: SocialButtonImageUploads
	setSocialButtonImageUploads: React.Dispatch<React.SetStateAction<SocialButtonImageUploads>>
}

export function SiteSettings({
	formData,
	setFormData,
	faviconItem,
	setFaviconItem,
	avatarItem,
	setAvatarItem,
	artImageUploads,
	setArtImageUploads,
	backgroundImageUploads,
	setBackgroundImageUploads,
	socialButtonImageUploads,
	setSocialButtonImageUploads
}: SiteSettingsProps) {
	return (
		<div {...stylex.props(styles.container)}>
			<FaviconAvatarUpload faviconItem={faviconItem} setFaviconItem={setFaviconItem} avatarItem={avatarItem} setAvatarItem={setAvatarItem} />

			<SiteMetaForm formData={formData} setFormData={setFormData} />

			<BeianForm formData={formData} setFormData={setFormData} />

			<SocialButtonsSection
				formData={formData}
				setFormData={setFormData}
				socialButtonImageUploads={socialButtonImageUploads}
				setSocialButtonImageUploads={setSocialButtonImageUploads}
			/>

			<ArtImagesSection formData={formData} setFormData={setFormData} artImageUploads={artImageUploads} setArtImageUploads={setArtImageUploads} />

			<BackgroundImagesSection
				formData={formData}
				setFormData={setFormData}
				backgroundImageUploads={backgroundImageUploads}
				setBackgroundImageUploads={setBackgroundImageUploads}
			/>

			<div {...stylex.props(styles.checkboxRow)}>
				<label {...stylex.props(styles.checkboxLabel)}>
					<input
						type='checkbox'
						checked={formData.clockShowSeconds ?? false}
						onChange={e => setFormData({ ...formData, clockShowSeconds: e.target.checked })}
						{...stylex.props(styles.checkbox)}
					/>
					<span {...stylex.props(styles.checkboxText)}>时钟显示秒数</span>
				</label>

				<label {...stylex.props(styles.checkboxLabel)}>
					<input
						type='checkbox'
						checked={formData.summaryInContent ?? false}
						onChange={e => setFormData({ ...formData, summaryInContent: e.target.checked })}
						{...stylex.props(styles.checkbox)}
					/>
					<span {...stylex.props(styles.checkboxText)}>摘要放入内容</span>
				</label>

				<label {...stylex.props(styles.checkboxLabel)}>
					<input
						type='checkbox'
						checked={formData.hideEditButton ?? false}
						onChange={e => setFormData({ ...formData, hideEditButton: e.target.checked })}
						{...stylex.props(styles.checkbox)}
					/>
					<span {...stylex.props(styles.checkboxText)}>隐藏编辑按钮（编辑快捷键 ctrl/cmd + ,）</span>
				</label>
			</div>
			<div {...stylex.props(styles.checkboxRow)}>
				<label {...stylex.props(styles.checkboxLabel)}>
					<input
						type='checkbox'
						checked={formData.isCachePem ?? false}
						onChange={e => setFormData({ ...formData, isCachePem: e.target.checked })}
						{...stylex.props(styles.checkbox)}
					/>
					<span {...stylex.props(styles.checkboxText)}>缓存PEM(已加密，但存在风险)</span>
				</label>
				<label {...stylex.props(styles.checkboxLabel)}>
					<input
						type='checkbox'
						checked={formData.enableCategories ?? false}
						onChange={e => setFormData({ ...formData, enableCategories: e.target.checked })}
						{...stylex.props(styles.checkbox)}
					/>
					<span {...stylex.props(styles.checkboxText)}>启用文章分类</span>
				</label>
				<label {...stylex.props(styles.checkboxLabel)}>
					<input
						type='checkbox'
						checked={formData.enableChristmas ?? false}
						onChange={e => setFormData({ ...formData, enableChristmas: e.target.checked })}
						{...stylex.props(styles.checkbox)}
					/>
					<span {...stylex.props(styles.checkboxText)}>开启圣诞节</span>
				</label>
			</div>

			<HatSection formData={formData} setFormData={setFormData} />
		</div>
	)
}
