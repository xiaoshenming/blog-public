/**
 * 文本焚烧系统 — 将 .prose 内文本拆成逐字 span，支持焚烧/恢复动画
 */

type CharRecord = {
	span: HTMLElement
	original: string
	burned: boolean
	restoreTimer: ReturnType<typeof setTimeout> | null
}

let charRecords: CharRecord[] = []
let prepared = false

const SKIP_TAGS = new Set(['CODE', 'PRE', 'KBD', 'SAMP', 'SCRIPT', 'STYLE', 'SVG', 'IMG', 'VIDEO', 'CANVAS', 'IFRAME'])

/** 判断节点是否在需要跳过的标签内 */
function isInsideSkipTag(node: Node): boolean {
	let el = node.parentElement
	while (el) {
		if (SKIP_TAGS.has(el.tagName)) return true
		el = el.parentElement
	}
	return false
}

/** 将 .prose 内文本节点拆成逐字 span */
export function prepareTextNodes(proseEl: HTMLElement): void {
	if (prepared) return
	prepared = true
	charRecords = []

	const walker = document.createTreeWalker(proseEl, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT
			if (isInsideSkipTag(node)) return NodeFilter.FILTER_REJECT
			return NodeFilter.FILTER_ACCEPT
		},
	})

	const textNodes: Text[] = []
	let current: Node | null
	while ((current = walker.nextNode())) {
		textNodes.push(current as Text)
	}

	// 使用 Intl.Segmenter 拆字（支持 CJK + emoji）
	const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' })

	for (const textNode of textNodes) {
		const parent = textNode.parentNode
		if (!parent) continue
		const text = textNode.textContent || ''
		const segments = [...segmenter.segment(text)]
		const frag = document.createDocumentFragment()

		for (const seg of segments) {
			const span = document.createElement('span')
			span.textContent = seg.segment
			span.className = 'dragon-char'
			span.setAttribute('data-char', '1')
			frag.appendChild(span)
			charRecords.push({ span, original: seg.segment, burned: false, restoreTimer: null })
		}
		parent.replaceChild(frag, textNode)
	}
}

/** 焚烧一个字符 span */
export function burnChar(span: HTMLElement): void {
	const rec = charRecords.find(r => r.span === span)
	if (!rec || rec.burned) return
	rec.burned = true

	// 移除之前的恢复类
	span.classList.remove('char-restore')
	span.classList.add('char-burn')

	// 0.8s 后创建灰烬副本
	setTimeout(() => {
		const rect = span.getBoundingClientRect()
		const ash = document.createElement('span')
		ash.textContent = rec.original
		ash.className = 'char-ash'
		ash.style.left = `${rect.left + window.scrollX}px`
		ash.style.top = `${rect.top + window.scrollY}px`
		ash.style.fontSize = window.getComputedStyle(span).fontSize
		// 随机飘散方向
		ash.style.setProperty('--ash-dx', `${(Math.random() - 0.5) * 60}px`)
		ash.style.setProperty('--ash-dy', `${-20 - Math.random() * 40}px`)
		ash.style.setProperty('--ash-rot', `${(Math.random() - 0.5) * 240}deg`)
		document.body.appendChild(ash)
		// 1.2s 后移除灰烬
		setTimeout(() => ash.remove(), 1200)
	}, 800)

	// 10s 后恢复
	rec.restoreTimer = setTimeout(() => restoreChar(span), 10000)
}

/** 恢复一个字符 span */
export function restoreChar(span: HTMLElement): void {
	const rec = charRecords.find(r => r.span === span)
	if (!rec) return
	rec.burned = false
	if (rec.restoreTimer) { clearTimeout(rec.restoreTimer); rec.restoreTimer = null }
	span.classList.remove('char-burn')
	span.classList.add('char-restore')
	setTimeout(() => span.classList.remove('char-restore'), 600)
}

/** 获取所有字符 span */
export function getCharSpans(): HTMLElement[] {
	return charRecords.filter(r => !r.burned).map(r => r.span)
}

/** 清理：恢复所有文本 */
export function cleanup(): void {
	for (const rec of charRecords) {
		if (rec.restoreTimer) clearTimeout(rec.restoreTimer)
	}
	charRecords = []
	prepared = false
}
