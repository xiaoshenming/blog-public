import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { toast } from 'sonner'
import { t } from '@/i18n/translate'

export type AboutData = {
	title: string
	description: string
	content: string
}

export async function pushAbout(data: AboutData): Promise<void> {
	const token = await getAuthToken()

	toast.info(t('admin.fetchingBranch'))
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const commitMessage = t('admin.commitUpdateAbout')

	toast.info(t('admin.preparingFiles'))

	const treeItems: TreeItem[] = []

	const aboutJson = JSON.stringify(data, null, '\t')
	const aboutBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(aboutJson), 'base64')
	treeItems.push({
		path: 'src/app/about/list.json',
		mode: '100644',
		type: 'blob',
		sha: aboutBlob.sha
	})

	toast.info(t('admin.creatingTree'))
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	toast.info(t('admin.creatingCommit'))
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	toast.info(t('admin.updatingBranch'))
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success(t('admin.publishSuccess'))
}
