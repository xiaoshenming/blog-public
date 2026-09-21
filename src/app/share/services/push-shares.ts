import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import type { Share } from '../components/share-card'
import type { LogoItem } from '../components/logo-upload-dialog'
import { getFileExt } from '@/lib/utils'
import { toast } from 'sonner'
import { t } from '@/i18n/translate'

export type PushSharesParams = {
	shares: Share[]
	logoItems?: Map<string, LogoItem>
}

export async function pushShares(params: PushSharesParams): Promise<Share[]> {
	const { shares, logoItems } = params

	const blobShares = shares.filter(share => share.logo.startsWith('blob:'))
	if (blobShares.length > 0) {
		const missing = blobShares.filter(share => !logoItems?.has(share.url))
		if (missing.length > 0) {
			throw new Error(t('dialogs.logoNotUploaded', { names: missing.map(share => share.name).join('、') }))
		}
	}

	// 获取认证 token（自动从全局认证状态获取）
	const token = await getAuthToken()

	toast.info(t('dialogs.fetchingBranch'))
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const commitMessage = t('dialogs.commitShares')

	toast.info(t('dialogs.preparingFiles'))

	const treeItems: TreeItem[] = []
	const uploadedHashes = new Set<string>()
	let updatedShares = [...shares]

	// Process logo uploads
	if (logoItems && logoItems.size > 0) {
		toast.info(t('dialogs.uploadingLogos'))
		for (const [url, logoItem] of logoItems.entries()) {
			if (logoItem.type === 'file') {
				const hash = logoItem.hash || (await hashFileSHA256(logoItem.file))
				const ext = getFileExt(logoItem.file.name)
				const filename = `${hash}${ext}`
				const publicPath = `/images/share/${filename}`

				if (!uploadedHashes.has(hash)) {
					const path = `public/images/share/${filename}`
					const contentBase64 = await fileToBase64NoPrefix(logoItem.file)
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					treeItems.push({
						path,
						mode: '100644',
						type: 'blob',
						sha: blobData.sha
					})
					uploadedHashes.add(hash)
				}

				// Update share logo URL
				updatedShares = updatedShares.map(s => (s.url === url ? { ...s, logo: publicPath } : s))
			}
		}
	}

	// Create blob for shares list.json
	const sharesJson = JSON.stringify(updatedShares, null, '\t')
	const sharesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(sharesJson), 'base64')
	treeItems.push({
		path: 'src/app/share/list.json',
		mode: '100644',
		type: 'blob',
		sha: sharesBlob.sha
	})

	// Create tree
	toast.info(t('dialogs.creatingTree'))
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// Create commit
	toast.info(t('dialogs.creatingCommit'))
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// Update branch reference
	toast.info(t('dialogs.updatingBranch'))
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success(t('dialogs.publishSuccess'))

	return updatedShares
}
