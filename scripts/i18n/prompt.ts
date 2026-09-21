import { translateConfig } from './env'

/** 沉浸式翻译插件的系统提示词（{{to}} 已固定为 English，去掉插件内部变量占位） */
const BASE_SYSTEM = `You are a professional ${translateConfig.targetLanguage} native translator who needs to fluently translate text into ${translateConfig.targetLanguage}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.
5. If input contains %%, use %% in your output, if input has no %%, don't use %% in your output

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use %% as paragraph separator between translations`

/** 站点专有名词表：译文保持一致写法 */
const GLOSSARY = `Glossary (keep these untranslated or use the exact rendering):
- 留仙洞 → Liuxiandong
- 鸣潮 → Wuthering Waves
- 博主/站名 Suni → Suni
- 汇文明朝体 → Huiwen Mingcho (font name)

Markdown posts: keep Markdown syntax intact (headings, lists, bold/italic, tables, blockquotes), never translate URLs, image paths, code spans (\`...\`) and fenced code blocks; keep a leading # / - / > marker at line starts.`

/** markdown 长文用（附 glossary）；UI 短句用基础版即可 */
export const markdownSystem = `${BASE_SYSTEM}\n\n${GLOSSARY}`

export const uiSystem = BASE_SYSTEM

export function multiParagraphUser(texts: string[]): string {
	return `Translate to ${translateConfig.targetLanguage}:\n\n${texts.join('\n\n%%\n\n')}`
}

export function singleParagraphUser(text: string): string {
	return `Translate to ${translateConfig.targetLanguage} (output translation only):\n\n${text}`
}
