'use client'

import { useEffect, useRef } from 'react'
import {
	type Creature,
	stepCreature,
	spawnFire,
	stepFire,
	drawCreature,
	drawFire,
} from './creature'
import { burnChar, prepareTextNodes, getCharSpans, cleanup } from './text-burn'

type DragonEscapeProps = {
	dragon: Creature
	startPos: DOMRect
	proseRef: React.RefObject<HTMLDivElement | null>
	onCaptured?: () => void
}

export default function DragonEscape({ dragon, startPos, proseRef, onCaptured }: DragonEscapeProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas || !proseRef.current) return

		const ctx = canvas.getContext('2d')!
		let mounted = true
		let raf = 0
		let textPrepared = false
		let captured = false
		let capturePhase: 'none' | 'chain-pull' | 'done' = 'none'
		let chainProgress = 0
		const CHAIN_DURATION = 800 // ms to pull dragon back
		let chainStartTime = 0
		// Remember the canvas center for capture target
		const captureTarget = {
			x: startPos.left + startPos.width / 2,
			y: startPos.top + startPos.height / 2,
		}

		// Wander state — dragon roams within prose area
		const wander = { x: 0, y: 0, vx: 0, vy: 0, nextTurn: 0, nextFire: 0 }

		function resize() {
			const dpr = window.devicePixelRatio || 1
			canvas.width = Math.round(window.innerWidth * dpr)
			canvas.height = Math.round(window.innerHeight * dpr)
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		resize()

		// Initialize dragon position from canvas escape point
		const head = dragon.segments[0]!
		// Convert from original canvas coords to viewport coords
		wander.x = startPos.left + startPos.width / 2
		wander.y = startPos.bottom
		head.x = wander.x
		head.y = wander.y

		// Prepare text nodes for burning
		if (proseRef.current && !textPrepared) {
			prepareTextNodes(proseRef.current)
			textPrepared = true
		}

		function updateWander(now: number) {
			const prose = proseRef.current
			if (!prose) return
			const rect = prose.getBoundingClientRect()
			const pad = 60
			const minX = rect.left + pad, maxX = rect.right - pad
			const minY = rect.top + pad, maxY = rect.bottom - pad

			if (now >= wander.nextTurn) {
				// Pick a distant random target within prose, not just a random velocity
				const tx = minX + Math.random() * (maxX - minX)
				const ty = minY + Math.random() * (maxY - minY)
				const dx = tx - wander.x, dy = ty - wander.y
				const dist = Math.sqrt(dx * dx + dy * dy)
				const speed = 2.0 + Math.random() * 2.5
				if (dist > 1) {
					wander.vx = (dx / dist) * speed
					wander.vy = (dy / dist) * speed
				}
				wander.nextTurn = now + 600 + Math.random() * 1800
			}
			wander.x += wander.vx; wander.y += wander.vy
			if (wander.x < minX) { wander.x = minX; wander.vx = Math.abs(wander.vx) }
			if (wander.x > maxX) { wander.x = maxX; wander.vx = -Math.abs(wander.vx) }
			if (wander.y < minY) { wander.y = minY; wander.vy = Math.abs(wander.vy) }
			if (wander.y > maxY) { wander.y = maxY; wander.vy = -Math.abs(wander.vy) }
		}

		function checkFireCollision() {
			if (!textPrepared) return
			const spans = getCharSpans()
			let burned = 0
			for (const p of dragon.fire) {
				if (burned >= 5) break
				// Fire particle position is in viewport coords
				const fx = p.x, fy = p.y
				const hitRadius = p.size
				for (const span of spans) {
					if (burned >= 5) break
					const rect = span.getBoundingClientRect()
					// Quick AABB check
					if (fx + hitRadius < rect.left || fx - hitRadius > rect.right) continue
					if (fy + hitRadius < rect.top || fy - hitRadius > rect.bottom) continue
					burnChar(span)
					burned++
				}
			}
		}

		function drawChains(head: { x: number; y: number }, target: { x: number; y: number }, progress: number) {
			const W = window.innerWidth
			// Draw 3 chains from edges converging on dragon head
			const chainOrigins = [
				{ x: 0, y: target.y - 50 },
				{ x: W, y: target.y - 50 },
				{ x: target.x, y: 0 },
			]
			ctx.save()
			ctx.strokeStyle = '#888'
			ctx.lineWidth = 3
			ctx.shadowColor = '#aaa'
			ctx.shadowBlur = 6
			for (const origin of chainOrigins) {
				const cx = origin.x + (head.x - origin.x) * progress
				const cy = origin.y + (head.y - origin.y) * progress
				ctx.beginPath()
				ctx.moveTo(origin.x, origin.y)
				// Chain link pattern
				const steps = 12
				for (let i = 1; i <= steps; i++) {
					const t = i / steps
					const mx = origin.x + (cx - origin.x) * t
					const my = origin.y + (cy - origin.y) * t
					const sag = Math.sin(t * Math.PI) * 15 * (1 - progress)
					const linkWobble = Math.sin(i * 2.5) * 4
					ctx.lineTo(mx + linkWobble, my + sag)
				}
				ctx.stroke()
			}
			ctx.restore()
		}

		function render(now: number) {
			if (!mounted) return
			const W = window.innerWidth, H = window.innerHeight
			ctx.clearRect(0, 0, W, H)

			const head = dragon.segments[0]!

			// Check if dragon wandered back into the original canvas area
			if (!captured && capturePhase === 'none') {
				// Refresh capture target from current scroll position
				const canvasEl = document.querySelector('[data-pretext-canvas]')
				if (canvasEl) {
					const cr = canvasEl.getBoundingClientRect()
					captureTarget.x = cr.left + cr.width / 2
					captureTarget.y = cr.top + cr.height / 2
					// Check if head is inside the canvas rect
					if (head.x >= cr.left && head.x <= cr.right && head.y >= cr.top && head.y <= cr.bottom) {
						capturePhase = 'chain-pull'
						chainStartTime = now
					}
				}
			}

			if (capturePhase === 'chain-pull') {
				chainProgress = Math.min(1, (now - chainStartTime) / CHAIN_DURATION)
				// Ease-in-out
				const ease = chainProgress < 0.5
					? 2 * chainProgress * chainProgress
					: 1 - Math.pow(-2 * chainProgress + 2, 2) / 2
				// Pull dragon toward capture target
				head.x += (captureTarget.x - head.x) * ease * 0.15
				head.y += (captureTarget.y - head.y) * ease * 0.15
				head.vx *= 0.8; head.vy *= 0.8
				stepCreature(dragon, now, head.x, head.y)
				if (dragon.fire.length > 0) stepFire(dragon, now)
				drawChains(head, captureTarget, chainProgress)
				drawFire(ctx, dragon)
				drawCreature(ctx, dragon)
				if (chainProgress >= 1) {
					capturePhase = 'done'
					captured = true
					cleanup()
					onCaptured?.()
				}
				raf = requestAnimationFrame(render)
				return
			}

			if (capturePhase === 'done') return

			updateWander(now)
			stepCreature(dragon, now, wander.x, wander.y)

			// Random fire bursts
			if (now >= wander.nextFire) {
				spawnFire(dragon)
				wander.nextFire = now + 300 + Math.random() * 1200
			}
			if (dragon.fire.length > 0) stepFire(dragon, now)

			// Check fire-text collision
			checkFireCollision()

			// Draw
			drawFire(ctx, dragon)
			drawCreature(ctx, dragon)

			raf = requestAnimationFrame(render)
		}

		const onResize = () => resize()
		window.addEventListener('resize', onResize)
		raf = requestAnimationFrame(render)

		return () => {
			mounted = false
			cancelAnimationFrame(raf)
			window.removeEventListener('resize', onResize)
			cleanup()
		}
	}, [dragon, startPos, proseRef])

	return (
		<canvas
			ref={canvasRef}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100vw',
				height: '100vh',
				pointerEvents: 'none',
				zIndex: 9999,
			}}
		/>
	)
}