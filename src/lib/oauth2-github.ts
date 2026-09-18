import { GITHUB_OAUTH2_CONFIG } from '@/consts'

function generateState(): string {
	return crypto.randomUUID()
}

export function initiateGitHubOAuth2(): void {
	const state = generateState()
	localStorage.setItem(GITHUB_OAUTH2_CONFIG.STATE_KEY, state)

	const params = new URLSearchParams({
		client_id: GITHUB_OAUTH2_CONFIG.CLIENT_ID,
		redirect_uri: `${GITHUB_OAUTH2_CONFIG.SITE_URL}/auth/callback`,
		scope: GITHUB_OAUTH2_CONFIG.SCOPE,
		state,
	})

	window.location.href = `https://github.com/login/oauth/authorize?${params}`
}

export async function handleOAuth2Callback(code: string, state: string): Promise<boolean> {
	const savedState = localStorage.getItem(GITHUB_OAUTH2_CONFIG.STATE_KEY)
	if (!savedState || savedState !== state) return false

	try {
		const res = await fetch('/api/auth/github/oauth2/callback', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		})
		const data = await res.json()

		if (data.success && data.access_token) {
			saveOAuth2Token(data.access_token)
			localStorage.removeItem(GITHUB_OAUTH2_CONFIG.STATE_KEY)
			return true
		}
		return false
	} catch {
		return false
	}
}

export function saveOAuth2Token(token: string): void {
	localStorage.setItem(GITHUB_OAUTH2_CONFIG.TOKEN_KEY, token)
}

export function getOAuth2Token(): string | null {
	if (typeof localStorage === 'undefined') return null
	return localStorage.getItem(GITHUB_OAUTH2_CONFIG.TOKEN_KEY)
}

export function clearOAuth2Token(): void {
	if (typeof localStorage === 'undefined') return
	localStorage.removeItem(GITHUB_OAUTH2_CONFIG.TOKEN_KEY)
}

export function hasOAuth2Auth(): boolean {
	if (typeof localStorage === 'undefined') return false
	return !!localStorage.getItem(GITHUB_OAUTH2_CONFIG.TOKEN_KEY)
}
