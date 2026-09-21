import { useEffect } from 'react'
import { useWriteStore } from '../stores/write-store'
import { toast } from 'sonner'
import { t } from '@/i18n/translate'

export function useLoadBlog(slug?: string) {
	const { loadBlogForEdit, loading } = useWriteStore()

	useEffect(() => {
		if (slug) {
			loadBlogForEdit(slug).catch(err => {
				console.error('Failed to load blog:', err)
				toast.error(t('write.loadFailed'))
			})
		}
	}, [slug, loadBlogForEdit])

	return { loading }
}
