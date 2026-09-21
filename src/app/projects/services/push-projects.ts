import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import type { Project } from '../components/project-card'
import type { ImageItem } from '../components/image-upload-dialog'
import { getFileExt } from '@/lib/utils'
import { toast } from 'sonner'
import { t } from '@/i18n/translate'

export type PushProjectsParams = {
	projects: Project[]
	imageItems?: Map<string, ImageItem>
}

export async function pushProjects(params: PushProjectsParams): Promise<void> {
	const { projects, imageItems } = params

	const token = await getAuthToken()

	toast.info(t('dialogs.fetchingBranch'))
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const commitMessage = t('dialogs.commitProjects')

	toast.info(t('dialogs.preparingFiles'))

	const treeItems: TreeItem[] = []
	const uploadedHashes = new Set<string>()
	let updatedProjects = [...projects]

	if (imageItems && imageItems.size > 0) {
		toast.info(t('dialogs.uploadingImages'))
		for (const [url, imageItem] of imageItems.entries()) {
			if (imageItem.type === 'file') {
				const hash = imageItem.hash || (await hashFileSHA256(imageItem.file))
				const ext = getFileExt(imageItem.file.name)
				const filename = `${hash}${ext}`
				const publicPath = `/images/project/${filename}`

				if (!uploadedHashes.has(hash)) {
					const path = `public/images/project/${filename}`
					const contentBase64 = await fileToBase64NoPrefix(imageItem.file)
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					treeItems.push({
						path,
						mode: '100644',
						type: 'blob',
						sha: blobData.sha
					})
					uploadedHashes.add(hash)
				}

				updatedProjects = updatedProjects.map(p => (p.url === url ? { ...p, image: publicPath } : p))
			}
		}
	}

	const projectsJson = JSON.stringify(updatedProjects, null, '\t')
	const projectsBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(projectsJson), 'base64')
	treeItems.push({
		path: 'src/app/projects/list.json',
		mode: '100644',
		type: 'blob',
		sha: projectsBlob.sha
	})

	toast.info(t('dialogs.creatingTree'))
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	toast.info(t('dialogs.creatingCommit'))
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	toast.info(t('dialogs.updatingBranch'))
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success(t('dialogs.publishSuccess'))
}
