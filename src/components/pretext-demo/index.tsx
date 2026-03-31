'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
	prepareWithSegments,
	layoutNextLine,
	type PreparedTextWithSegments,
	type LayoutCursor,
} from '@chenglou/pretext'

type Orb = {
	x: number
	y: number
	r: number
	vx: number
	vy: number
	color: [number, number, number]
	paused: boolean
}

type PositionedLine = {
	x: number
	y: number
	width: number
	text: string
}

const DEMO_TEXT = `Web 渲染文本的流水线已经三十年没变了。浏览器加载字体、将文本塑形为字形、测量宽度、决定换行位置、垂直排列每一行。每一步都依赖前一步，每一步都需要浏览器查询内部布局树——维护这棵树的代价如此之高，以至于浏览器用同步重排屏障来守护对它的访问，动辄冻结主线程数十毫秒。

对于博客里的一段文字，这条流水线是隐形的。但 Web 早已不是静态文档的集合，它是应用平台。消息应用需要在渲染虚拟列表前知道每条消息气泡的精确高度；瀑布流布局需要每张卡片的高度来避免重叠；编辑器页面需要文字围绕图片、广告和交互元素流动。

每一个这样的操作都需要文本测量。而今天 Web 上的每次文本测量都需要一次同步布局重排。测量一个文本块的高度，就迫使浏览器重新计算页面上每个元素的位置。当你连续测量五百个文本块时，就触发了五百次完整的布局计算。这种模式叫做"布局抖动"，是现代 Web 上最大的卡顿来源。

如果文本测量根本不需要 DOM 呢？如果你能用纯算术精确计算每一行文本的断行位置、宽度和整个文本块的高度呢？这就是 pretext 的核心洞察。浏览器的 Canvas API 有一个 measureText 方法，能在不触发布局重排的情况下返回任意字符串在任意字体下的宽度。

pretext 利用了这种不对称性。文本首次出现时，pretext 通过 Canvas 测量每个词并缓存宽度。准备阶段之后，布局就是纯算术：遍历缓存的宽度、追踪当前行宽、超出最大宽度时插入换行、累加行高。没有 DOM，没有重排，没有布局树访问。性能提升不是渐进式的——是 300 到 600 倍的飞跃。`

const FONT = '16px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
const LINE_HEIGHT = 28

const ORB_DEFS = [
	{ fx: 0.35, fy: 0.3, r: 60, vx: 20, vy: 14, color: [196, 163, 90] as [number, number, number] },
	{ fx: 0.65, fy: 0.6, r: 50, vx: -16, vy: 18, color: [100, 140, 255] as [number, number, number] },
]

function circleBlockedInterval(
	cx: number, cy: number, r: number,
	bandTop: number, bandBottom: number, pad: number,
): { left: number; right: number } | null {
	if (bandTop >= cy + r || bandBottom <= cy - r) return null
	const minDy = cy >= bandTop && cy <= bandBottom ? 0 : cy < bandTop ? bandTop - cy : cy - bandBottom
	if (minDy >= r) return null
	const maxDx = Math.sqrt(r * r - minDy * minDy)
	return { left: cx - maxDx - pad, right: cx + maxDx + pad }
}

function layoutAroundOrbs(
	prepared: PreparedTextWithSegments,
	orbs: Orb[],
	regionX: number, regionY: number,
	regionW: number, regionH: number,
	lineHeight: number,
): PositionedLine[] {
	const lines: PositionedLine[] = []
	let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
	let lineTop = regionY

	while (lineTop + lineHeight <= regionY + regionH) {
		const bandTop = lineTop
		const bandBottom = lineTop + lineHeight
		const blocked: { left: number; right: number }[] = []

		for (const orb of orbs) {
			const interval = circleBlockedInterval(orb.x, orb.y, orb.r, bandTop, bandBottom, 12)
			if (interval) blocked.push(interval)
		}

		// carve available slots
		let slots = [{ left: regionX, right: regionX + regionW }]
		for (const b of blocked) {
			const next: { left: number; right: number }[] = []
			for (const s of slots) {
				if (b.right <= s.left || b.left >= s.right) { next.push(s); continue }
				if (b.left > s.left) next.push({ left: s.left, right: b.left })
				if (b.right < s.right) next.push({ left: b.right, right: s.right })
			}
			slots = next
		}
		slots = slots.filter(s => s.right - s.left >= 40).sort((a, b) => a.left - b.left)

		if (slots.length === 0) { lineTop += lineHeight; continue }

		let exhausted = false
		for (const slot of slots) {
			const line = layoutNextLine(prepared, cursor, slot.right - slot.left)
			if (!line) { exhausted = true; break }
			lines.push({ x: slot.left, y: lineTop, text: line.text, width: line.width })
			cursor = line.end
		}
		if (exhausted) break
		lineTop += lineHeight
	}
	return lines
}

export default function PretextDemo() {
	const containerRef = useRef<HTMLDivElement>(null)
	const rafRef = useRef<number | null>(null)
	const orbsRef = useRef<Orb[]>([])
	const preparedRef = useRef<PreparedTextWithSegments | null>(null)
	const linesRef = useRef<HTMLSpanElement[]>([])
	const dragRef = useRef<{ idx: number; ox: number; oy: number; sx: number; sy: number } | null>(null)
	const lastTimeRef = useRef<number | null>(null)
	const [show, setShow] = useState(false)

	useEffect(() => { setShow(true) }, [])

	const initOrbs = useCallback((w: number, h: number) => {
		orbsRef.current = ORB_DEFS.map(d => ({
			x: d.fx * w, y: d.fy * h, r: d.r,
			vx: d.vx, vy: d.vy, color: d.color, paused: false,
		}))
	}, [])

	useEffect(() => {
		if (!show || !containerRef.current) return
		const el = containerRef.current
		const rect = el.getBoundingClientRect()
		initOrbs(rect.width, rect.height)

		document.fonts.ready.then(() => {
			preparedRef.current = prepareWithSegments(DEMO_TEXT, FONT)
			renderFrame(performance.now())
		})

		return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
	}, [show, initOrbs])

	const syncLines = useCallback((lines: PositionedLine[]) => {
		const el = containerRef.current
		if (!el) return
		while (linesRef.current.length < lines.length) {
			const span = document.createElement('span')
			span.style.cssText = 'position:absolute;white-space:pre;font:' + FONT + ';line-height:' + LINE_HEIGHT + 'px;color:rgba(220,220,240,0.88);pointer-events:none;'
			el.appendChild(span)
			linesRef.current.push(span)
		}
		for (let i = 0; i < linesRef.current.length; i++) {
			const span = linesRef.current[i]!
			if (i < lines.length) {
				const l = lines[i]!
				span.textContent = l.text
				span.style.left = l.x + 'px'
				span.style.top = l.y + 'px'
				span.style.display = ''
			} else {
				span.style.display = 'none'
			}
		}
	}, [])

	const orbEls = useRef<HTMLDivElement[]>([])
	const ensureOrbEls = useCallback(() => {
		const el = containerRef.current
		if (!el) return
		while (orbEls.current.length < ORB_DEFS.length) {
			const i = orbEls.current.length
			const c = ORB_DEFS[i]!.color
			const div = document.createElement('div')
			div.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle at 35% 35%, rgba(${c[0]},${c[1]},${c[2]},0.35), rgba(${c[0]},${c[1]},${c[2]},0.12) 55%, transparent 72%);box-shadow:0 0 50px 12px rgba(${c[0]},${c[1]},${c[2]},0.18), 0 0 100px 30px rgba(${c[0]},${c[1]},${c[2]},0.07);transition:opacity 0.3s;`
			el.appendChild(div)
			orbEls.current.push(div)
		}
	}, [])

	const renderFrame = useCallback((now: number) => {
		const el = containerRef.current
		const prepared = preparedRef.current
		if (!el || !prepared) return

		const rect = el.getBoundingClientRect()
		const W = rect.width, H = rect.height
		const dt = Math.min(((lastTimeRef.current ?? now) - now) * -1 / 1000, 0.05)
		lastTimeRef.current = now
		const orbs = orbsRef.current

		for (const orb of orbs) {
			if (orb.paused || dragRef.current?.idx === orbs.indexOf(orb)) continue
			orb.x += orb.vx * dt; orb.y += orb.vy * dt
			if (orb.x - orb.r < 0) { orb.x = orb.r; orb.vx = Math.abs(orb.vx) }
			if (orb.x + orb.r > W) { orb.x = W - orb.r; orb.vx = -Math.abs(orb.vx) }
			if (orb.y - orb.r < 10) { orb.y = orb.r + 10; orb.vy = Math.abs(orb.vy) }
			if (orb.y + orb.r > H - 10) { orb.y = H - orb.r - 10; orb.vy = -Math.abs(orb.vy) }
		}

		const lines = layoutAroundOrbs(prepared, orbs, 20, 20, W - 40, H - 40, LINE_HEIGHT)
		syncLines(lines)
		ensureOrbEls()
		for (let i = 0; i < orbs.length; i++) {
			const orb = orbs[i]!
			const oel = orbEls.current[i]!
			oel.style.left = (orb.x - orb.r) + 'px'
			oel.style.top = (orb.y - orb.r) + 'px'
			oel.style.width = (orb.r * 2) + 'px'
			oel.style.height = (orb.r * 2) + 'px'
		}

		rafRef.current = requestAnimationFrame(renderFrame)
	}, [syncLines, ensureOrbEls])

	useEffect(() => {
		if (!show || !containerRef.current) return
		const el = containerRef.current

		const hitOrb = (px: number, py: number) => {
			const orbs = orbsRef.current
			for (let i = orbs.length - 1; i >= 0; i--) {
				const o = orbs[i]!
				const dx = px - o.x, dy = py - o.y
				if (dx * dx + dy * dy <= o.r * o.r) return i
			}
			return -1
		}

		const onDown = (e: PointerEvent) => {
			const rect = el.getBoundingClientRect()
			const px = e.clientX - rect.left, py = e.clientY - rect.top
			const idx = hitOrb(px, py)
			if (idx !== -1) {
				e.preventDefault()
				const orb = orbsRef.current[idx]!
				dragRef.current = { idx, ox: orb.x, oy: orb.y, sx: px, sy: py }
				el.style.cursor = 'grabbing'
			}
		}
		const onMove = (e: PointerEvent) => {
			const d = dragRef.current
			if (!d) {
				const rect = el.getBoundingClientRect()
				const idx = hitOrb(e.clientX - rect.left, e.clientY - rect.top)
				el.style.cursor = idx !== -1 ? 'grab' : 'default'
				return
			}
			const rect = el.getBoundingClientRect()
			const px = e.clientX - rect.left, py = e.clientY - rect.top
			const orb = orbsRef.current[d.idx]!
			orb.x = d.ox + (px - d.sx)
			orb.y = d.oy + (py - d.sy)
		}
		const onUp = () => {
			if (dragRef.current) { el.style.cursor = 'default'; dragRef.current = null }
		}

		el.addEventListener('pointerdown', onDown)
		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)
		return () => {
			el.removeEventListener('pointerdown', onDown)
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)
		}
	}, [show])

	if (!show) return null

	return (
		<div style={{ margin: '0 0 16px' }}>
			<div
				ref={containerRef}
				style={{
					position: 'relative',
					width: '100%',
					height: 500,
					overflow: 'hidden',
					borderRadius: 16,
					background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
					cursor: 'default',
					userSelect: 'none',
				}}
			/>
			<p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 8 }}>
				拖动发光球体，观察文字实时环绕流动 — 零 DOM 测量，纯算术布局
			</p>
		</div>
	)
}
