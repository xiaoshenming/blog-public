'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as stylex from '@stylexjs/stylex'
import { handleOAuth2Callback } from '@/lib/oauth2-github'
import { useAuthStore } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { util } from '@/styles/shared/util.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 页面容器：全屏居中 */
	screen: {
		display: 'flex',
		minHeight: '100vh',
		alignItems: 'center',
		justifyContent: 'center'
	},
	/** 容器底色 */
	screenBg: {
		backgroundColor: colors.bg
	},
	/** 容器主文字色 */
	screenPrimary: {
		color: colors.primary
	},
	/** 内容块：居中 */
	content: {
		textAlign: 'center'
	},
	/** 加载圆环：品牌色缺口圆环（自旋动画由共享 util 提供） */
	spinnerRing: {
		width: 40,
		height: 40,
		borderRadius: 9999,
		borderWidth: 2,
		borderStyle: 'solid',
		borderTopColor: 'transparent',
		borderRightColor: colors.brand,
		borderBottomColor: colors.brand,
		borderLeftColor: colors.brand
	},
	/** 加载圆环·主内容位：水平居中并留出下方间距 */
	spinnerOffset: {
		marginInline: 'auto',
		marginBottom: 16
	},
	/** 加载文案 */
	loadingText: {
		color: colors.secondary
	},
	/** 成功标记 */
	successIcon: {
		color: colors.brand,
		marginBottom: 8,
		fontSize: 36,
		lineHeight: '40px'
	},
	/** 失败标记 */
	errorIcon: {
		marginBottom: 8,
		fontSize: 36,
		lineHeight: '40px',
		color: '#fb2c36'
	},
	/** 错误信息文本 */
	errorText: {
		marginBottom: 8
	},
	/** 跳转提示 */
	redirectHint: {
		color: colors.secondary,
		fontSize: 14,
		lineHeight: '20px'
	}
})

function AuthCallbackContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { setOAuth2Auth } = useAuthStore()
	const { t } = useI18n()
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
	const [error, setError] = useState('')

	useEffect(() => {
		const process = async () => {
			const code = searchParams.get('code')
			const state = searchParams.get('state')
			const errorParam = searchParams.get('error')

			if (errorParam) {
				setError(searchParams.get('error_description') || errorParam)
				setStatus('error')
				toast.error(t('toolbox.githubAuthFailed', { error: errorParam }))
				setTimeout(() => router.push('/'), 3000)
				return
			}

			if (!code || !state) {
				setError(t('toolbox.missingAuthParams'))
				setStatus('error')
				setTimeout(() => router.push('/'), 3000)
				return
			}

			const success = await handleOAuth2Callback(code, state)
			if (success) {
				setOAuth2Auth()
				setStatus('success')
				toast.success(t('toolbox.githubLoginSuccess'))
				setTimeout(() => router.push('/'), 1500)
			} else {
				setError(t('toolbox.loginFailedRetry'))
				setStatus('error')
				toast.error(t('toolbox.loginFailed'))
				setTimeout(() => router.push('/'), 3000)
			}
		}
		process()
		// t 刻意不进依赖：语言切换不应重跑 OAuth 回调（code 一次性，重复兑换会失败）
	}, [searchParams, router, setOAuth2Auth])

	return (
		<div {...stylex.props(styles.screen, styles.screenBg, styles.screenPrimary)}>
			<div {...stylex.props(styles.content)}>
				{status === 'loading' && (
					<>
						<div {...stylex.props(styles.spinnerRing, styles.spinnerOffset, util.spinner)} />
						<p {...stylex.props(styles.loadingText)}>{t('toolbox.processingGithubLogin')}</p>
					</>
				)}
				{status === 'success' && (
					<>
						<div {...stylex.props(styles.successIcon)}>✓</div>
						<p>{t('toolbox.loginSuccessRedirecting')}</p>
					</>
				)}
				{status === 'error' && (
					<>
						<div {...stylex.props(styles.errorIcon)}>✗</div>
						<p {...stylex.props(styles.errorText)}>{error}</p>
						<p {...stylex.props(styles.redirectHint)}>{t('toolbox.autoRedirectHint', { seconds: 3 })}</p>
					</>
				)}
			</div>
		</div>
	)
}

export default function AuthCallbackPage() {
	return (
		<Suspense
			fallback={
				<div {...stylex.props(styles.screen, styles.screenBg)}>
					<div {...stylex.props(styles.spinnerRing, util.spinner)} />
				</div>
			}>
			<AuthCallbackContent />
		</Suspense>
	)
}
