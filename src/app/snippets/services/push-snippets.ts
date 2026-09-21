import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { toast } from 'sonner'
import { t } from '@/i18n/translate'

export type PushSnippetsParams = {
	snippets: string[]
}

export async function pushSnippets(params: PushSnippetsParams): Promise<void> {
	const { snippets } = params

	const token = await getAuthToken()

	toast.info(t('dialogs.fetchingBranch'))
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const commitMessage = t('dialogs.commitSnippets')

	toast.info(t('dialogs.preparingFiles'))

	const treeItems: TreeItem[] = []

	const snippetsJson = JSON.stringify(snippets, null, '\t')
	const snippetsBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(snippetsJson), 'base64')
	treeItems.push({
		path: 'src/app/snippets/list.json',
		mode: '100644',
		type: 'blob',
		sha: snippetsBlob.sha
	})

	toast.info(t('dialogs.creatingTree'))
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	toast.info(t('dialogs.creatingCommit'))
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	toast.info(t('dialogs.updatingBranch'))
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success(t('dialogs.publishSuccess'))
}
