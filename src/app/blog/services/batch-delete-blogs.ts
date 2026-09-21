import { toast } from 'sonner'
import { t } from '@/i18n/translate'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { createBlob, createCommit, createTree, getRef, listRepoFilesRecursive, toBase64Utf8, type TreeItem, updateRef } from '@/lib/github-client'
import { removeBlogsFromIndex, buildLocalizedIndexRemovals } from '@/lib/blog-index'

export async function batchDeleteBlogs(slugs: string[]): Promise<void> {
	const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)))
	if (uniqueSlugs.length === 0) {
		throw new Error(t('admin.atLeastOneArticle'))
	}

	const token = await getAuthToken()

	toast.info(t('admin.fetchingBranch'))
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const treeItems: TreeItem[] = []

	for (const slug of uniqueSlugs) {
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
	const indexJson = await removeBlogsFromIndex(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, uniqueSlugs, GITHUB_CONFIG.BRANCH)
	const indexBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(indexJson), 'base64')
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha
	})

	// 同步清理语言版索引，避免多语言列表残留孤儿条目
	treeItems.push(...(await buildLocalizedIndexRemovals(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, GITHUB_CONFIG.BRANCH, uniqueSlugs)))

	toast.info(t('admin.creatingCommit'))
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	const commitLabel =
		uniqueSlugs.length === 1
			? t('admin.commitDeleteArticle', { slugs: uniqueSlugs[0] })
			: t('admin.commitBatchDeleteArticles', { slugs: uniqueSlugs.join(', ') })
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitLabel, treeData.sha, [latestCommitSha])

	toast.info(t('admin.updatingBranch'))
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success(t('admin.deleteSuccessDeploy'))
}
