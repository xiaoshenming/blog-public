import { create } from 'zustand'
import { clearAllAuthCache, getAuthToken as getToken, hasAuth as checkAuth, getPemFromCache, savePemToCache } from '@/lib/auth'
import { getOAuth2Token, hasOAuth2Auth, clearOAuth2Token } from '@/lib/oauth2-github'
import { useConfigStore } from '@/app/(home)/stores/config-store'

interface AuthStore {
	isAuth: boolean
	isOAuth2Auth: boolean
	privateKey: string | null

	setPrivateKey: (key: string) => void
	setOAuth2Auth: () => void
	clearAuth: () => void
	refreshAuthState: () => void
	getAuthToken: () => Promise<string>
}

export function hasAnyAuth(): boolean {
	const state = useAuthStore.getState()
	return !!state.privateKey || state.isOAuth2Auth || hasOAuth2Auth()
}

export const useAuthStore = create<AuthStore>((set, get) => ({
	isAuth: false,
	isOAuth2Auth: false,
	privateKey: null,

	setPrivateKey: async (key: string) => {
		set({ isAuth: true, privateKey: key })
		const { siteContent } = useConfigStore.getState()
		if (siteContent?.isCachePem) {
			await savePemToCache(key)
		}
	},

	setOAuth2Auth: () => {
		set({ isOAuth2Auth: hasOAuth2Auth() })
	},

	clearAuth: () => {
		clearAllAuthCache()
		clearOAuth2Token()
		set({ isAuth: false, isOAuth2Auth: false })
	},

	refreshAuthState: async () => {
		const isAuth = await checkAuth()
		const isOAuth2Auth = hasOAuth2Auth()
		set({ isAuth, isOAuth2Auth })
	},

	getAuthToken: async () => {
		// 优先使用 OAuth2 token
		const oauth2Token = getOAuth2Token()
		if (oauth2Token) {
			get().refreshAuthState()
			return oauth2Token
		}
		// 回退到 App token
		const token = await getToken()
		get().refreshAuthState()
		return token
	},
}))

getPemFromCache().then((key) => {
	if (key) {
		useAuthStore.setState({ privateKey: key })
	}
})

checkAuth().then((isAuth) => {
	if (isAuth) {
		useAuthStore.setState({ isAuth })
	}
})

// 初始化 OAuth2 状态
if (typeof localStorage !== 'undefined' && hasOAuth2Auth()) {
	useAuthStore.setState({ isOAuth2Auth: true })
}
