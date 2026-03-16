'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { handleOAuth2Callback } from '@/lib/oauth2-github'
import { useAuthStore } from '@/hooks/use-auth'
import { toast } from 'sonner'

function AuthCallbackContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { setOAuth2Auth } = useAuthStore()
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
				toast.error(`GitHub 授权失败: ${errorParam}`)
				setTimeout(() => router.push('/'), 3000)
				return
			}

			if (!code || !state) {
				setError('缺少必需的授权参数')
				setStatus('error')
				setTimeout(() => router.push('/'), 3000)
				return
			}

			const success = await handleOAuth2Callback(code, state)
			if (success) {
				setOAuth2Auth()
				setStatus('success')
				toast.success('GitHub OAuth2 登录成功')
				setTimeout(() => router.push('/'), 1500)
			} else {
				setError('登录失败，请重试')
				setStatus('error')
				toast.error('登录失败')
				setTimeout(() => router.push('/'), 3000)
			}
		}
		process()
	}, [searchParams, router, setOAuth2Auth])

	return (
		<div className='bg-bg text-primary flex min-h-screen items-center justify-center'>
			<div className='text-center'>
				{status === 'loading' && (
					<>
						<div className='border-brand mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent' />
						<p className='text-secondary'>正在处理 GitHub 登录...</p>
					</>
				)}
				{status === 'success' && (
					<>
						<div className='text-brand mb-2 text-4xl'>✓</div>
						<p>登录成功，正在跳转...</p>
					</>
				)}
				{status === 'error' && (
					<>
						<div className='mb-2 text-4xl text-red-500'>✗</div>
						<p className='mb-2'>{error}</p>
						<p className='text-secondary text-sm'>3 秒后自动跳转...</p>
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
				<div className='bg-bg flex min-h-screen items-center justify-center'>
					<div className='border-brand h-10 w-10 animate-spin rounded-full border-2 border-t-transparent' />
				</div>
			}>
			<AuthCallbackContent />
		</Suspense>
	)
}
