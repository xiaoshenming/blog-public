import { toast } from 'sonner'
import { t } from '@/i18n/translate'
import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { createBlob, createCommit, createTree, getRef, listRepoFilesRecursive, toBase64Utf8, type TreeItem, updateRef } from '@/lib/github-client'
import type { BlogIndexItem } from '@/lib/blog-index'

export async function saveBlogEdits(originalItems: BlogIndexItem[], nextItems: BlogIndexItem[], categories: string[]): Promise<void> {
	const removedSlugs = originalItems.filter(item => !nextItems.some(next => next.slug === item.slug)).map(item => item.slug)
	const uniqueRemoved = Array.from(new Set(removedSlugs.filter(Boolean)))

	const token = await getAuthToken()

	toast.info(t('admin.fetchingBranch'))
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const treeItems: TreeItem[] = []

	for (const slug of uniqueRemoved) {
		toast.info(t('admin.collectingFiles', { slug }))
		const basePath = `public/blogs/${slug}`
		const files = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, basePath, GITHUB_CONFIG.BRANCH)

		for (const path of files) {
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: null
			})
		}
	}

	toast.info(t('admin.updatingIndex'))
	const sortedItems = [...nextItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	const indexJson = JSON.stringify(sortedItems, null, 2)
	const indexBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(indexJson), 'base64')
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha
	})

	toast.info(t('admin.updatingCategories'))
	const uniqueCategories = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)))
	const categoriesJson = JSON.stringify({ categories: uniqueCategories }, null, 2)
	const categoriesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(categoriesJson), 'base64')
	treeItems.push({
		path: 'public/blogs/categories.json',
		mode: '100644',
		type: 'blob',
		sha: categoriesBlob.sha
	})

	toast.info(t('admin.creatingCommit'))
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	const actionLabels: string[] = []
	if (uniqueRemoved.length > 0) {
		actionLabels.push(t('admin.commitDeleteArticles', { items: uniqueRemoved.join(',') }))
	}
	actionLabels.push(t('admin.commitUpdateIndex'))
	if (uniqueCategories.length > 0) {
		actionLabels.push(t('admin.commitUpdateCategories'))
	}
	const commitLabel = actionLabels.join(' | ')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitLabel, treeData.sha, [latestCommitSha])

	toast.info(t('admin.updatingBranch'))
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success(t('admin.saveSuccessDeploy'))
}
