'use client'

import { useEffect, useRef, useState } from 'react'
import {
	prepareWithSegments,
	layoutNextLine,
	type PreparedTextWithSegments,
	type LayoutCursor,
} from '@chenglou/pretext'

// --- Types ---
type Segment = { x: number; y: number; angle: number; width: number; vx: number; vy: number }
type FireParticle = {
	x: number; y: number; vx: number; vy: number
	size: number; life: number; maxLife: number; frame: number; color: number
}
type Creature = {
	segments: Segment[]; jitterSeed: number; lastStepTime: number
	stepInterval: number; fire: FireParticle[]; fireLastStep: number; scale: number
}
type Interval = { left: number; right: number }
type Slot = { left: number; right: number }
type CachedLine = { text: string; x: number; y: number }

// --- Config ---
const SEGMENT_COUNT = 20
const SEGMENT_SPACING = 30
const SPRITE_SCALE = 0.24
const WING_SEGMENT = 5
const MAX_BEND = 0.25
const FIRE_STEP_INTERVAL = 30
const FIRE_PALETTE = ['#C4402A', '#E08A30', '#F0C030']
const CREATURE_PADDING = 10
const MIN_SLOT_WIDTH = 40

const SPRITE_HEIGHTS = [
	221, 130, 203, 223, 285, 299, 281, 224, 192, 174,
	191, 156, 155, 122, 126, 125, 107, 101, 101, 81,
]

const DEMO_TEXT = `Web 渲染文本的流水线已经三十年没变了。浏览器加载字体、将文本塑形为字形、测量宽度、决定换行位置、垂直排列每一行。每一步都依赖前一步，每一步都需要浏览器查询内部布局树——维护这棵树的代价如此之高，以至于浏览器用同步重排屏障来守护对它的访问，动辄冻结主线程数十毫秒。

对于博客里的一段文字，这条流水线是隐形的。但 Web 早已不是静态文档的集合，它是应用平台。消息应用需要在渲染虚拟列表前知道每条消息气泡的精确高度；瀑布流布局需要每张卡片的高度来避免重叠。

每一个这样的操作都需要文本测量。而今天 Web 上的每次文本测量都需要一次同步布局重排。测量一个文本块的高度，就迫使浏览器重新计算页面上所有元素的位置。当你连续测量五百个文本块时，就触发了五百次完整的布局计算。这种模式叫做"布局抖动"，是现代 Web 上最大的卡顿来源。

如果文本测量根本不需要 DOM 呢？如果你能用纯算术精确计算每一行文本的断行位置、宽度和整个文本块的高度呢？这就是 pretext 的核心洞察。浏览器的 Canvas API 有一个 measureText 方法，能在不触发布局重排的情况下返回任意字符串在任意字体下的宽度。

pretext 利用了这种不对称性。文本首次出现时，pretext 通过 Canvas 测量每个词并缓存宽度。准备阶段之后，布局就是纯算术：遍历缓存的宽度、追踪当前行宽、超出最大宽度时插入换行、累加行高。没有 DOM，没有重排，没有布局树访问。性能提升不是渐进式的——是 300 到 600 倍的飞跃。`

const FONT = '16px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
const LINE_HEIGHT = 28
const TEXT_COLOR = '#dcdcf0'
const BG = 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)'

// --- Sprite loading ---
let headImg: HTMLCanvasElement
let tongueImg: HTMLCanvasElement
let bodyImgs: HTMLCanvasElement[] = []
let wingFrontImg: HTMLCanvasElement
let wingBackImg: HTMLCanvasElement
let headSize: { w: number; h: number }
let tongueSize: { w: number; h: number }
let bodySizes: { w: number; h: number }[] = []
let wingFrontSize: { w: number; h: number }
let wingBackSize: { w: number; h: number }

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = src
	})
}

function preScale(img: HTMLImageElement, scale: number) {
	const dpr = window.devicePixelRatio || 1
	const w = Math.round(img.width * scale)
	const h = Math.round(img.height * scale)
	const canvas = document.createElement('canvas')
	canvas.width = Math.round(w * dpr)
	canvas.height = Math.round(h * dpr)
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
	return { canvas, w, h }
}

const SPRITE_BASE = '/blogs/pretext-text-layout-magic'
let spritesLoaded = false

async function loadSprites(): Promise<void> {
	if (spritesLoaded) return
	const results = await Promise.all([
		loadImage(`${SPRITE_BASE}/dragon-sprites/head.png`),
		loadImage(`${SPRITE_BASE}/dragon-sprites/tongue.png`),
		loadImage(`${SPRITE_BASE}/dragon-sprites/wing-front.png`),
		loadImage(`${SPRITE_BASE}/dragon-sprites/wing-back.png`),
		...Array.from({ length: 19 }, (_, i) => loadImage(`${SPRITE_BASE}/dragon-sprites/body-${i + 1}.png`)),
	])
	const s = SPRITE_SCALE
	let r: ReturnType<typeof preScale>
	r = preScale(results[0]!, s); headImg = r.canvas; headSize = { w: r.w, h: r.h }
	r = preScale(results[1]!, s); tongueImg = r.canvas; tongueSize = { w: r.w, h: r.h }
	r = preScale(results[2]!, s); wingFrontImg = r.canvas; wingFrontSize = { w: r.w, h: r.h }
	r = preScale(results[3]!, s); wingBackImg = r.canvas; wingBackSize = { w: r.w, h: r.h }
	for (let i = 4; i < results.length; i++) {
		r = preScale(results[i]!, s)
		bodyImgs.push(r.canvas)
		bodySizes.push({ w: r.w, h: r.h })
	}
	spritesLoaded = true
}

// --- Creature logic ---
function pseudoRandom(seed: number): number {
	const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
	return x - Math.floor(x)
}

function segmentWidth(i: number): number {
	return i < SPRITE_HEIGHTS.length ? SPRITE_HEIGHTS[i]! * SPRITE_SCALE : 10
}

function makeDragon(cx: number, cy: number, scale: number): Creature {
	const segments: Segment[] = []
	for (let i = 0; i < SEGMENT_COUNT; i++) {
		segments.push({ x: cx, y: cy + i * SEGMENT_SPACING * scale, angle: -Math.PI / 2, width: segmentWidth(i) * scale, vx: 0, vy: 0 })
	}
	return { segments, jitterSeed: Math.random() * 1000, lastStepTime: 0, stepInterval: 80, fire: [], fireLastStep: 0, scale }
}

function stepCreature(c: Creature, now: number, tx: number, ty: number): void {
	if (now - c.lastStepTime >= c.stepInterval) {
		c.lastStepTime = now
		c.jitterSeed = Math.random() * 1000
	}
	const head = c.segments[0]!

	// Spring-damper head physics: soft acceleration toward target
	const dx = tx - head.x, dy = ty - head.y
	const dist = Math.sqrt(dx * dx + dy * dy)
	const stiffness = 0.006  // spring constant — gentle pull
	const damping = 0.92     // velocity decay — smooth deceleration

	if (dist > 1) {
		head.vx += dx * stiffness
		head.vy += dy * stiffness
	}
	head.vx *= damping
	head.vy *= damping

	head.x += head.vx
	head.y += head.vy

	// Smooth head angle toward velocity direction
	const speed = Math.sqrt(head.vx * head.vx + head.vy * head.vy)
	if (speed > 0.3) {
		const targetAngle = Math.atan2(head.vy, head.vx)
		let angleDiff = targetAngle - head.angle
		while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
		while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
		head.angle += angleDiff * 0.12
	}

	// Body segments: original rigid chain constraint
	for (let i = 1; i < c.segments.length; i++) {
		const leader = c.segments[i - 1]!
		const seg = c.segments[i]!
		let desired = Math.atan2(leader.y - seg.y, leader.x - seg.x)
		let diff = desired - leader.angle
		while (diff > Math.PI) diff -= Math.PI * 2
		while (diff < -Math.PI) diff += Math.PI * 2
		if (diff > MAX_BEND) desired = leader.angle + MAX_BEND
		else if (diff < -MAX_BEND) desired = leader.angle - MAX_BEND
		seg.angle = desired
		const sp = SEGMENT_SPACING * c.scale
		seg.x = leader.x - Math.cos(seg.angle) * sp
		seg.y = leader.y - Math.sin(seg.angle) * sp
	}
}

function spawnFire(c: Creature): void {
	const head = c.segments[0]!
	const s = c.scale
	const snoutDist = 30 * s
	const sx = head.x + Math.cos(head.angle) * snoutDist
	const sy = head.y + Math.sin(head.angle) * snoutDist
	const count = 3 + Math.floor(Math.random() * 3)
	for (let i = 0; i < count; i++) {
		const spread = (Math.random() - 0.5) * 0.25
		const speed = (35 + Math.random() * 20) * s
		const angle = head.angle + spread
		c.fire.push({
			x: sx + (Math.random() - 0.5) * 4, y: sy + (Math.random() - 0.5) * 4,
			vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
			size: (8 + Math.random() * 12) * s, life: 1,
			maxLife: 12 + Math.floor(Math.random() * 6), frame: 0,
			color: Math.floor(Math.random() * 3),
		})
	}
}

function stepFire(c: Creature, now: number): void {
	if (now - c.fireLastStep < FIRE_STEP_INTERVAL) return
	c.fireLastStep = now
	for (let i = c.fire.length - 1; i >= 0; i--) {
		const p = c.fire[i]!
		p.frame++; p.life = 1 - p.frame / p.maxLife
		p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95
		const drift = Math.max(0, (p.frame - 4) / p.maxLife)
		p.vy -= drift * 1.5
		if (p.life < 0.25) p.size *= 0.75
		else if (p.frame < 3) p.size *= 1.15
		if (p.life <= 0 || p.size < 1.5) c.fire.splice(i, 1)
	}
}

function drawCreature(ctx: CanvasRenderingContext2D, c: Creature): void {
	const segs = c.segments
	const jitter = c.jitterSeed
	const wingTime = performance.now() / 1000
	const s = c.scale

	// Wing back
	if (wingBackImg) {
		const wSeg = segs[WING_SEGMENT]!
		const j = pseudoRandom(jitter + WING_SEGMENT * 37)
		const jx = (j - 0.5) * 1.5
		const jy = (pseudoRandom(jitter + WING_SEGMENT * 37 + 100) - 0.5) * 1.5
		const jA = (pseudoRandom(jitter + WING_SEGMENT * 37 + 200) - 0.5) * 0.04
		const wingFlap = Math.sin(wingTime * 3) * 0.4
		ctx.save()
		ctx.translate(wSeg.x + jx, wSeg.y + jy)
		ctx.rotate(wSeg.angle + jA + wingFlap)
		ctx.scale(s, s)
		ctx.drawImage(wingBackImg, -wingBackSize.w, -wingBackSize.h, wingBackSize.w, wingBackSize.h)
		ctx.restore()
	}

	// Body segments tail to head
	for (let i = segs.length - 1; i >= 0; i--) {
		const seg = segs[i]!
		const j = pseudoRandom(jitter + i * 37)
		const jx = (j - 0.5) * 1.5
		const jy = (pseudoRandom(jitter + i * 37 + 100) - 0.5) * 1.5
		const jA = (pseudoRandom(jitter + i * 37 + 200) - 0.5) * 0.04
		ctx.save()
		ctx.translate(seg.x + jx, seg.y + jy)
		ctx.rotate(seg.angle + jA)
		ctx.scale(s, s)
		if (i === 0) {
			if (tongueImg) ctx.drawImage(tongueImg, headSize.w * 0.3, -tongueSize.h / 2, tongueSize.w, tongueSize.h)
			if (headImg) ctx.drawImage(headImg, -headSize.w * 0.45, -headSize.h / 2, headSize.w, headSize.h)
		} else {
			const bi = i - 1
			const bImg = bodyImgs[bi], bSize = bodySizes[bi]
			if (bImg && bSize) ctx.drawImage(bImg, -bSize.w / 2, -bSize.h / 2, bSize.w, bSize.h)
			if (i === WING_SEGMENT && wingFrontImg) {
				const wf = Math.sin(wingTime * 3 + 0.5) * 0.4
				ctx.save(); ctx.rotate(-wf)
				ctx.drawImage(wingFrontImg, -wingFrontSize.w, -wingFrontSize.h, wingFrontSize.w, wingFrontSize.h)
				ctx.restore()
			}
		}
		ctx.restore()
	}
}

function drawFire(ctx: CanvasRenderingContext2D, c: Creature): void {
	for (const p of c.fire) {
		const va = Math.atan2(p.vy, p.vx)
		ctx.save()
		ctx.translate(p.x, p.y)
		ctx.rotate(va)
		ctx.globalAlpha = Math.min(1, p.life * 1.5)
		const age = 1 - p.life
		ctx.fillStyle = FIRE_PALETTE[age < 0.33 ? 0 : age < 0.66 ? 1 : 2]!
		const sz = p.size / 2
		const seed = p.color * 31 + p.frame * 0.3
		const jit = (n: number) => (pseudoRandom(seed + n * 17) - 0.5) * sz * 0.4
		const rough = sz * 0.35
		const verts = [
			[sz * 1.2 + jit(0), jit(1)], [jit(2), -sz * 0.7 + jit(3)],
			[-sz + jit(4), jit(5)], [jit(6), sz * 0.7 + jit(7)],
		]
		ctx.beginPath()
		ctx.moveTo(verts[0]![0]!, verts[0]![1]!)
		for (let i = 0; i < 4; i++) {
			const cur = verts[i]!, next = verts[(i + 1) % 4]!
			const steps = 4
			for (let k = 1; k <= steps; k++) {
				const t = k / steps
				ctx.lineTo(
					cur[0]! + (next[0]! - cur[0]!) * t + (pseudoRandom(seed + i * 100 + k * 13) - 0.5) * rough,
					cur[1]! + (next[1]! - cur[1]!) * t + (pseudoRandom(seed + i * 100 + k * 29) - 0.5) * rough,
				)
			}
		}
		ctx.closePath(); ctx.fill()
		ctx.globalAlpha = 1
		ctx.restore()
	}
}

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

export default function PretextDemo() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [show, setShow] = useState(false)

	useEffect(() => { setShow(true) }, [])

	useEffect(() => {
		if (!show || !canvasRef.current) return
		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d')!
		let raf = 0
		let dragon: Creature | null = null
		let prepared: PreparedTextWithSegments | null = null
		const mouse = { x: 0, y: 0 }
		let mouseDown = false
		let mouseInside = false
		let mounted = true

		// Autonomous wander — always active, smooth Perlin-like movement
		const wander = { x: 0, y: 0, vx: 0, vy: 0, nextTurn: 0, nextFire: 0 }

		function updateWander(now: number, W: number, H: number) {
			const pad = 60
			// Randomly change direction — slow, lazy turns
			if (now >= wander.nextTurn) {
				const angle = Math.random() * Math.PI * 2
				const speed = 0.6 + Math.random() * 0.8
				wander.vx = Math.cos(angle) * speed
				wander.vy = Math.sin(angle) * speed
				wander.nextTurn = now + 1500 + Math.random() * 3000
			}
			// Move
			wander.x += wander.vx
			wander.y += wander.vy
			// Bounce off edges smoothly
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
			dragon = makeDragon(rect.width / 2, rect.height / 2, 1)
			wander.x = rect.width / 2
			wander.y = rect.height / 2
			await document.fonts.ready
			prepared = prepareWithSegments(DEMO_TEXT, FONT)
			raf = requestAnimationFrame(render)
		}

		function render(now: number) {
			if (!mounted || !dragon || !prepared) return
			const rect = canvas.getBoundingClientRect()
			const W = rect.width, H = rect.height

			// Always update wander position
			updateWander(now, W, H)

			// Chase target: mouse when inside, otherwise wander point
			const tx = mouseInside ? mouse.x : wander.x
			const ty = mouseInside ? mouse.y : wander.y

			stepCreature(dragon, now, tx, ty)

			// Auto fire: random bursts when wandering, or on mouse down
			if (mouseDown) {
				spawnFire(dragon)
			} else if (!mouseInside && now >= wander.nextFire) {
				spawnFire(dragon)
				wander.nextFire = now + 400 + Math.random() * 1500
			}
			if (dragon.fire.length > 0) stepFire(dragon, now)

			const lines = layoutText(prepared, dragon, W, H, 20)

			// Clear
			ctx.fillStyle = '#0f0f23'
			ctx.fillRect(0, 0, W, H)

			// Draw text
			ctx.font = FONT
			ctx.textBaseline = 'top'
			ctx.fillStyle = TEXT_COLOR
			for (const line of lines) {
				ctx.fillText(line.text, Math.round(line.x), Math.round(line.y))
			}

			// Draw fire + creature
			drawFire(ctx, dragon)
			drawCreature(ctx, dragon)

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
}

