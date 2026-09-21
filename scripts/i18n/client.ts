import { translateConfig } from './env'

type ChatOptions = { temperature?: number; maxTokens?: number; retries?: number }

/** OpenAI 兼容 /chat/completions，带指数退避重试；失败抛错由调用方降级处理 */
export async function chat(system: string, user: string, options: ChatOptions = {}): Promise<string> {
	const { temperature = 0.2, maxTokens = 8192, retries = 3 } = options
	let lastError: unknown = new Error('unknown')

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const res = await fetch(`${translateConfig.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${translateConfig.apiKey}` },
				body: JSON.stringify({
					model: translateConfig.model,
					temperature,
					max_tokens: maxTokens,
					stream: false,
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: user }
					]
				})
			})
			if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
			const data = await res.json()
			const content = data?.choices?.[0]?.message?.content
			if (typeof content !== 'string') throw new Error('响应缺少 message.content')
			return content
		} catch (error) {
			lastError = error
			if (attempt < retries) await sleep(800 * attempt)
		}
	}
	throw lastError
}

/** 有界并发 map，保持输入顺序输出结果 */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
	const results = new Array<R>(items.length)
	let cursor = 0
	const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (cursor < items.length) {
			const index = cursor++
			results[index] = await worker(items[index], index)
		}
	})
	await Promise.all(lanes)
	return results
}

export function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
