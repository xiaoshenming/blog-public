import { useMemo } from 'react'
import { useWriteStore } from '../stores/write-store'
import { useI18n } from '@/i18n/context'
import { formatDate } from '@/i18n/dates'

export function useWriteData() {
	const { form, images } = useWriteStore()
	const { locale, t } = useI18n()

	// Replace local-image placeholders with preview URLs
	const processedMarkdown = useMemo(() => {
		let mdForPreview = form.md
		for (const img of images) {
			if (img.type === 'file') {
				const placeholder = `local-image:${img.id}`
				mdForPreview = mdForPreview.split(`(${placeholder})`).join(`(${img.previewUrl})`)
			}
		}
		return mdForPreview
	}, [form.md, images])

	const title = form.title || t('write.untitled')
	const date = formatDate(form.date, locale)

	return {
		markdown: processedMarkdown,
		title,
		date
	}
}
