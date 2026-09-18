// Level-4 rule of SentenceLayout: break mixed CJK text at the spaces that separate CJK blocks.

export const CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/

export const hasCjkText = (text: string) => CJK_REGEX.test(text)

export function splitCJKBySpace(text: string): string[] {
	if (!hasCjkText(text)) {
		return [text]
	}

	const segments: string[] = []
	let currentSegment = ''
	let inCjkBlock = false

	for (let i = 0; i < text.length; i++) {
		const char = text[i]
		const isCJK = CJK_REGEX.test(char)
		const isWestern = /[a-zA-Z0-9]/.test(char)
		const isSpace = /\s/.test(char)

		if (isCJK) {
			currentSegment += char
			inCjkBlock = true
		} else if (isWestern) {
			// Western 字符跟随当前块（不做边界分割）
			currentSegment += char
		} else if (isSpace) {
			// 空格处理：
			// - 全角空格 → 总是触发分割，附到前段末尾
			// - 半角空格在 CJK 后 → 分割；其他情况跟随
			const isFullWidthSpace = char === '\u3000'

			if (isFullWidthSpace && currentSegment.length > 0) {
				// 全角空格：完成当前段
				currentSegment += char
				segments.push(currentSegment)
				currentSegment = ''
				inCjkBlock = false
			} else if (inCjkBlock && currentSegment.length > 0) {
				// 半角空格在 CJK 块中：检查前一个字符
				const lastChar = currentSegment[currentSegment.length - 1]
				if (CJK_REGEX.test(lastChar)) {
					currentSegment += char
					segments.push(currentSegment)
					currentSegment = ''
					inCjkBlock = false
				} else {
					currentSegment += char
				}
			} else if (currentSegment.length === 0 && segments.length > 0) {
				segments[segments.length - 1] += char
			} else {
				// 其他情况的空格，跟随
				currentSegment += char
			}
		} else {
			if (currentSegment.length === 0 && segments.length > 0) {
				segments[segments.length - 1] += char
			} else {
				currentSegment += char
			}
		}
	}

	if (currentSegment) {
		if (segments.length > 0 && /^\s+$/.test(currentSegment)) {
			segments[segments.length - 1] += currentSegment
		} else {
			segments.push(currentSegment)
		}
	}

	return segments.length > 1 ? segments : [text]
}
