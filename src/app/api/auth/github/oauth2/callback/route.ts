import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { code } = await request.json()

		if (!code) {
			return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 })
		}

		const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				client_id: process.env.NEXT_PUBLIC_GITHUB_OAUTH2_CLIENT_ID,
				client_secret: process.env.GITHUB_OAUTH2_CLIENT_SECRET,
				code,
			}),
		})

		if (!tokenResponse.ok) {
			throw new Error(`Token exchange failed: ${tokenResponse.status}`)
		}

		const tokenData = await tokenResponse.json()

		if (tokenData.error) {
			throw new Error(tokenData.error_description || tokenData.error)
		}

		return NextResponse.json({ success: true, access_token: tokenData.access_token })
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		)
	}
}
