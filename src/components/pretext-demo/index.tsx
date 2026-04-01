'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
	prepareWithSegments,
	layoutNextLine,
	type PreparedTextWithSegments,
	type LayoutCursor,
} from '@chenglou/pretext'
import {
	type Creature,
	loadSprites,
	makeDragon,
	stepCreature,
	spawnFire,
	stepFire,
	drawCreature,
	drawFire,
	SEGMENT_SPACING,
} from './creature'

// --- Local config ---
type Interval = { left: number; right: number }
type Slot = { left: number; right: number }
type CachedLine = { text: string; x: number; y: number }

const CREATURE_PADDING = 10
const MIN_SLOT_WIDTH = 40

const DEMO_TEXT = `Web 渲染文本的流水线已经三十年没变了。浏览器加载字体、将文本塑形为字形、测量宽度、决定换行位置、垂直排列每一行。每一步都依赖前一步，每一步都需要浏览器查询内部布局树——维护这棵树的代价如此之高，以至于浏览器用同步重排屏障来守护对它的访问，动辄冻结主线程数十毫秒。

对于博客里的一段文字，这条流水线是隐形的。但 Web 早已不是静态文档的集合，它是应用平台。消息应用需要在渲染虚拟列表前知道每条消息气泡的精确高度；瀑布流布局需要每张卡片的高度来避免重叠。

每一个这样的操作都需要文本测量。而今天 Web 上的每次文本测量都需要一次同步布局重排。测量一个文本块的高度，就迫使浏览器重新计算页面上所有元素的位置。当你连续测量五百个文本块时，就触发了五百次完整的布局计算。这种模式叫做"布局抖动"，是现代 Web 上最大的卡顿来源。

如果文本测量根本不需要 DOM 呢？如果你能用纯算术精确计算每一行文本的断行位置、宽度和整个文本块的高度呢？这就是 pretext 的核心洞察。浏览器的 Canvas API 有一个 measureText 方法，能在不触发布局重排的情况下返回任意字符串在任意字体下的宽度。

pretext 利用了这种不对称性。文本首次出现时，pretext 通过 Canvas 测量每个词并缓存宽度。准备阶段之后，布局就是纯算术：遍历缓存的宽度、追踪当前行宽、超出最大宽度时插入换行、累加行高。没有 DOM，没有重排，没有布局树访问。性能提升不是渐进式的——是 300 到 600 倍的飞跃。`

const FONT = '16px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
const LINE_HEIGHT = 28
const TEXT_COLOR = '#dcdcf0'

// --- Text layout around creature ---
function getCreatureIntervals(c: Creature, bandTop: number, bandBottom: number, pad: number): Interval[] {
	const intervals: Interval[] = []
	for (const seg of c.segments) {
		const r = seg.width / 2 + pad
		if (seg.y + r < bandTop || seg.y - r > bandBottom) continue
		const bandCenter = (bandTop + bandBottom) / 2
		const dy = Math.abs(seg.y - bandCenter)
		const bandHalf = (bandBottom - bandTop) / 2
		const closest = Math.max(0, dy - bandHalf)
		if (closest >= r) continue
		const xExtent = Math.sqrt(r * r - closest * closest)
		intervals.push({ left: seg.x - xExtent, right: seg.x + xExtent })
	}
	if (intervals.length <= 1) return intervals
	intervals.sort((a, b) => a.left - b.left)
	const merged: Interval[] = [intervals[0]!]
	for (let i = 1; i < intervals.length; i++) {
		const cur = intervals[i]!
		const last = merged[merged.length - 1]!
		if (cur.left <= last.right) last.right = Math.max(last.right, cur.right)
		else merged.push(cur)
	}
	return merged
}

function getFireIntervals(c: Creature, bandTop: number, bandBottom: number, pad: number): Interval[] {
	const intervals: Interval[] = []
	for (const p of c.fire) {
		const r = p.size / 2 + pad
		if (p.y + r < bandTop || p.y - r > bandBottom) continue
		const bandCenter = (bandTop + bandBottom) / 2
		const dy = Math.abs(p.y - bandCenter)
		const bandHalf = (bandBottom - bandTop) / 2
		const closest = Math.max(0, dy - bandHalf)
		if (closest >= r) continue
		const xExtent = Math.sqrt(r * r - closest * closest)
		intervals.push({ left: p.x - xExtent, right: p.x + xExtent })
	}
	if (intervals.length <= 1) return intervals
	intervals.sort((a, b) => a.left - b.left)
	const merged: Interval[] = [intervals[0]!]
	for (let i = 1; i < intervals.length; i++) {
		const cur = intervals[i]!
		const last = merged[merged.length - 1]!
		if (cur.left <= last.right) last.right = Math.max(last.right, cur.right)
		else merged.push(cur)
	}
	return merged
}

function carveSlots(slots: Slot[], bLeft: number, bRight: number): Slot[] {
	const next: Slot[] = []
	for (const s of slots) {
		if (bRight <= s.left || bLeft >= s.right) { next.push(s); continue }
		if (bLeft > s.left) next.push({ left: s.left, right: bLeft })
		if (bRight < s.right) next.push({ left: bRight, right: s.right })
	}
	return next
}

function layoutText(
	prepared: PreparedTextWithSegments, dragon: Creature,
	W: number, H: number, margin: number,
): CachedLine[] {
	const lines: CachedLine[] = []
	let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
	let y = margin
	const capHeight = 16 * 0.857
	const textY = (LINE_HEIGHT - capHeight) / 2
	while (y + LINE_HEIGHT <= H - margin) {
		const bandTop = y, bandBottom = y + LINE_HEIGHT
		let slots: Slot[] = [{ left: margin, right: W - margin }]
		const cIntervals = getCreatureIntervals(dragon, bandTop, bandBottom, CREATURE_PADDING)
		for (const iv of cIntervals) slots = carveSlots(slots, iv.left, iv.right)
		const fIntervals = getFireIntervals(dragon, bandTop, bandBottom, 6)
		for (const iv of fIntervals) slots = carveSlots(slots, iv.left, iv.right)
		slots = slots.filter(s => s.right - s.left >= MIN_SLOT_WIDTH)
		if (slots.length === 0) { y += LINE_HEIGHT; continue }
		let exhausted = false
		for (const slot of slots) {
			const line = layoutNextLine(prepared, cursor, slot.right - slot.left)
			if (!line) { exhausted = true; break }
			lines.push({ text: line.text, x: slot.left, y: y + textY })
			cursor = line.end
		}
		if (exhausted) break
		y += LINE_HEIGHT
	}
	return lines
}

// --- Escape animation types ---
export type PretextDemoHandle = {
	triggerEscape: () => void
}

type PretextDemoProps = {
	onEscape?: (dragon: Creature, canvasRect: DOMRect) => void
}

const PretextDemo = forwardRef<PretextDemoHandle, PretextDemoProps>(function PretextDemo({ onEscape }, ref) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [show, setShow] = useState(false)
	const dragonRef = useRef<Creature | null>(null)
	const escapingRef = useRef(false)
	const onEscapeRef = useRef(onEscape)
	onEscapeRef.current = onEscape

	useEffect(() => { setShow(true) }, [])

	useImperativeHandle(ref, () => ({
		triggerEscape() {
			escapingRef.current = true
		},
	}))

	useEffect(() => {
		if (!show || !canvasRef.current) return
		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d')!
		let raf = 0
		let prepared: PreparedTextWithSegments | null = null
		const mouse = { x: 0, y: 0 }
		let mouseDown = false
		let mouseInside = false
		let mounted = true

		// Escape state machine
		let escapePhase: 'none' | 'fly-to-bottom' | 'burn-border' | 'done' = 'none'
		let burnStart = 0
		const BURN_DURATION = 1500

		const wander = { x: 0, y: 0, vx: 0, vy: 0, nextTurn: 0, nextFire: 0 }

		function updateWander(now: number, W: number, H: number) {
			const pad = 60
			if (now >= wander.nextTurn) {
				const angle = Math.random() * Math.PI * 2
				const speed = 0.6 + Math.random() * 0.8
				wander.vx = Math.cos(angle) * speed
				wander.vy = Math.sin(angle) * speed
				wander.nextTurn = now + 1500 + Math.random() * 3000
			}
			wander.x += wander.vx; wander.y += wander.vy
			if (wander.x < pad) { wander.x = pad; wander.vx = Math.abs(wander.vx) }
			if (wander.x > W - pad) { wander.x = W - pad; wander.vx = -Math.abs(wander.vx) }
			if (wander.y < pad) { wander.y = pad; wander.vy = Math.abs(wander.vy) }
			if (wander.y > H - pad) { wander.y = H - pad; wander.vy = -Math.abs(wander.vy) }
		}

		function resize() {
			const dpr = window.devicePixelRatio || 1
			const rect = canvas.getBoundingClientRect()
			canvas.width = Math.round(rect.width * dpr)
			canvas.height = Math.round(rect.height * dpr)
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		async function init() {
			resize()
			await loadSprites()
			if (!mounted) return
			const rect = canvas.getBoundingClientRect()
			const dragon = makeDragon(rect.width / 2, rect.height / 2, 1)
			dragonRef.current = dragon
			wander.x = rect.width / 2
			wander.y = rect.height / 2
			await document.fonts.ready
			prepared = prepareWithSegments(DEMO_TEXT, FONT)
			raf = requestAnimationFrame(render)
		}

		function drawBurnHole(W: number, H: number, progress: number) {
			const hx = W / 2
			const hy = H
			const hr = progress * 80
			ctx.save()
			ctx.globalCompositeOperation = 'destination-out'
			ctx.beginPath()
			for (let a = 0; a < Math.PI * 2; a += 0.1) {
				const wobble = 1 + Math.sin(a * 5 + progress * 10) * 0.15 + Math.cos(a * 3) * 0.1
				const r = hr * wobble
				const px = hx + Math.cos(a) * r
				const py = hy + Math.sin(a) * r * 0.6
				if (a === 0) ctx.moveTo(px, py)
				else ctx.lineTo(px, py)
			}
			ctx.closePath()
			ctx.fill()
			ctx.restore()
			// Glowing ember edge
			ctx.save()
			ctx.shadowColor = '#ff4400'
			ctx.shadowBlur = 20 * progress
			ctx.strokeStyle = '#8B4513'
			ctx.lineWidth = 3
			ctx.beginPath()
			for (let a = 0; a < Math.PI * 2; a += 0.1) {
				const wobble = 1 + Math.sin(a * 5 + progress * 10) * 0.15 + Math.cos(a * 3) * 0.1
				const r = hr * wobble
				const px = hx + Math.cos(a) * r
				const py = hy + Math.sin(a) * r * 0.6
				if (a === 0) ctx.moveTo(px, py)
				else ctx.lineTo(px, py)
			}
			ctx.closePath()
			ctx.stroke()
			ctx.restore()
		}

		function render(now: number) {
			const dragon = dragonRef.current
			if (!mounted || !dragon || !prepared) return
			const rect = canvas.getBoundingClientRect()
			const W = rect.width, H = rect.height
			// Check escape trigger
			if (escapingRef.current && escapePhase === 'none') {
				escapePhase = 'fly-to-bottom'
			}
			if (escapePhase === 'fly-to-bottom') {
				const head = dragon.segments[0]!
				const targetX = W / 2, targetY = H - 20
				// Use stronger force to fly to bottom quickly
				const fdx = targetX - head.x, fdy = targetY - head.y
				if (Math.abs(fdx) + Math.abs(fdy) > 1) {
					head.vx += fdx * 0.02
					head.vy += fdy * 0.02
				}
				head.vx *= 0.9; head.vy *= 0.9
				head.x += head.vx; head.y += head.vy
				// Smooth head angle toward velocity
				const spd = Math.sqrt(head.vx * head.vx + head.vy * head.vy)
				if (spd > 0.3) {
					const ta = Math.atan2(head.vy, head.vx)
					let ad = ta - head.angle
					while (ad > Math.PI) ad -= Math.PI * 2
					while (ad < -Math.PI) ad += Math.PI * 2
					head.angle += ad * 0.15
				}
				// Update body chain
				stepCreature(dragon, now, head.x, head.y)
				if (dragon.fire.length > 0) stepFire(dragon, now)
				const flyDist = Math.sqrt((head.x - targetX) ** 2 + (head.y - targetY) ** 2)
				if (flyDist < 30) {
					escapePhase = 'burn-border'
					burnStart = now
					head.angle = Math.PI / 2
				}
				// Draw during fly-to-bottom
				const lines = layoutText(prepared, dragon, W, H, 20)
				ctx.fillStyle = '#0f0f23'; ctx.fillRect(0, 0, W, H)
				ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = TEXT_COLOR
				for (const line of lines) ctx.fillText(line.text, Math.round(line.x), Math.round(line.y))
				drawFire(ctx, dragon); drawCreature(ctx, dragon)
				raf = requestAnimationFrame(render)
				return
			} else if (escapePhase === 'burn-border') {
				const progress = Math.min(1, (now - burnStart) / BURN_DURATION)
				stepCreature(dragon, now, W / 2, H + 10)
				spawnFire(dragon)
				if (dragon.fire.length > 0) stepFire(dragon, now)
				const lines = layoutText(prepared, dragon, W, H, 20)
				ctx.fillStyle = '#0f0f23'; ctx.fillRect(0, 0, W, H)
				ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = TEXT_COLOR
				for (const line of lines) ctx.fillText(line.text, Math.round(line.x), Math.round(line.y))
				drawFire(ctx, dragon); drawCreature(ctx, dragon)
				drawBurnHole(W, H, progress)
				if (progress >= 1) {
					escapePhase = 'done'
					onEscapeRef.current?.(dragon, canvas.getBoundingClientRect())
				}
				raf = requestAnimationFrame(render)
				return
			} else if (escapePhase === 'done') {
				const lines = layoutText(prepared, dragon, W, H, 20)
				ctx.fillStyle = '#0f0f23'; ctx.fillRect(0, 0, W, H)
				ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = TEXT_COLOR
				for (const line of lines) ctx.fillText(line.text, Math.round(line.x), Math.round(line.y))
				drawBurnHole(W, H, 1)
				return
			}
			// Normal mode
			updateWander(now, W, H)
			const tx = mouseInside ? mouse.x : wander.x
			const ty = mouseInside ? mouse.y : wander.y
			stepCreature(dragon, now, tx, ty)
			if (mouseDown) { spawnFire(dragon) }
			else if (!mouseInside && now >= wander.nextFire) {
				spawnFire(dragon); wander.nextFire = now + 400 + Math.random() * 1500
			}
			if (dragon.fire.length > 0) stepFire(dragon, now)
			const lines = layoutText(prepared, dragon, W, H, 20)
			ctx.fillStyle = '#0f0f23'; ctx.fillRect(0, 0, W, H)
			ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = TEXT_COLOR
			for (const line of lines) ctx.fillText(line.text, Math.round(line.x), Math.round(line.y))
			drawFire(ctx, dragon); drawCreature(ctx, dragon)
			raf = requestAnimationFrame(render)
		}

		const onMove = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect()
			mouse.x = e.clientX - rect.left
			mouse.y = e.clientY - rect.top
			mouseInside = true
		}
		const onDown = () => { mouseDown = true }
		const onUp = () => { mouseDown = false }
		const onLeave = () => { mouseInside = false; mouseDown = false }
		const onResize = () => { resize() }

		canvas.addEventListener('pointermove', onMove)
		canvas.addEventListener('pointerdown', onDown)
		canvas.addEventListener('pointerleave', onLeave)
		window.addEventListener('pointerup', onUp)
		window.addEventListener('resize', onResize)

		init()

		return () => {
			mounted = false
			cancelAnimationFrame(raf)
			canvas.removeEventListener('pointermove', onMove)
			canvas.removeEventListener('pointerdown', onDown)
			canvas.removeEventListener('pointerleave', onLeave)
			window.removeEventListener('pointerup', onUp)
			window.removeEventListener('resize', onResize)
		}
	}, [show])

	if (!show) return null

	return (
		<div style={{ margin: '0 0 16px' }}>
			<canvas
				ref={canvasRef}
				style={{
					width: '100%',
					height: 500,
					borderRadius: 16,
					cursor: 'default',
					userSelect: 'none',
					touchAction: 'none',
				}}
			/>
			<p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 8 }}>
				移动鼠标引导龙飞行，按住鼠标喷火 — 文字实时围绕龙身流动，零 DOM 测量
			</p>
		</div>
	)
})

export default PretextDemo
