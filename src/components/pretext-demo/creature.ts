/**
 * 龙的核心逻辑 — 物理/渲染/火焰，供 PretextDemo 和 DragonEscape 共用
 */

// --- Types ---
export type Segment = { x: number; y: number; angle: number; width: number; vx: number; vy: number }
export type FireParticle = {
	x: number; y: number; vx: number; vy: number
	size: number; life: number; maxLife: number; frame: number; color: number
}
export type Creature = {
	segments: Segment[]; jitterSeed: number; lastStepTime: number
	stepInterval: number; fire: FireParticle[]; fireLastStep: number; scale: number
}

// --- Config ---
export const SEGMENT_COUNT = 20
export const SEGMENT_SPACING = 30
export const SPRITE_SCALE = 0.24
const WING_SEGMENT = 5
const MAX_BEND = 0.25
const FIRE_STEP_INTERVAL = 30
const FIRE_PALETTE = ['#C4402A', '#E08A30', '#F0C030']

const SPRITE_HEIGHTS = [
	221, 130, 203, 223, 285, 299, 281, 224, 192, 174,
	191, 156, 155, 122, 126, 125, 107, 101, 101, 81,
]

const SPRITE_BASE = '/blogs/pretext-text-layout-magic'

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
let spritesLoaded = false

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

export async function loadSprites(): Promise<void> {
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

// --- Helpers ---
function pseudoRandom(seed: number): number {
	const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
	return x - Math.floor(x)
}

function segmentWidth(i: number): number {
	return i < SPRITE_HEIGHTS.length ? SPRITE_HEIGHTS[i]! * SPRITE_SCALE : 10
}

export function makeDragon(cx: number, cy: number, scale: number): Creature {
	const segments: Segment[] = []
	for (let i = 0; i < SEGMENT_COUNT; i++) {
		segments.push({ x: cx, y: cy + i * SEGMENT_SPACING * scale, angle: -Math.PI / 2, width: segmentWidth(i) * scale, vx: 0, vy: 0 })
	}
	return { segments, jitterSeed: Math.random() * 1000, lastStepTime: 0, stepInterval: 80, fire: [], fireLastStep: 0, scale }
}

export function stepCreature(c: Creature, now: number, tx: number, ty: number): void {
	if (now - c.lastStepTime >= c.stepInterval) {
		c.lastStepTime = now
		c.jitterSeed = Math.random() * 1000
	}
	const head = c.segments[0]!
	const dx = tx - head.x, dy = ty - head.y
	const dist = Math.sqrt(dx * dx + dy * dy)
	const stiffness = 0.006
	const damping = 0.92
	if (dist > 1) { head.vx += dx * stiffness; head.vy += dy * stiffness }
	head.vx *= damping; head.vy *= damping
	head.x += head.vx; head.y += head.vy
	const speed = Math.sqrt(head.vx * head.vx + head.vy * head.vy)
	if (speed > 0.3) {
		const targetAngle = Math.atan2(head.vy, head.vx)
		let angleDiff = targetAngle - head.angle
		while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
		while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
		head.angle += angleDiff * 0.12
	}
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

export function spawnFire(c: Creature): void {
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

export function stepFire(c: Creature, now: number): void {
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

export function drawCreature(ctx: CanvasRenderingContext2D, c: Creature): void {
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

export function drawFire(ctx: CanvasRenderingContext2D, c: Creature): void {
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