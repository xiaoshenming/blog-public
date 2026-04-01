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
}

export default function DragonEscape({ dragon, startPos, proseRef }: DragonEscapeProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas || !proseRef.current) return

		const ctx = canvas.getContext('2d')!
		let mounted = true
		let raf = 0
		let textPrepared = false

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
				const angle = Math.random() * Math.PI * 2
				const speed = 1.0 + Math.random() * 1.2
				wander.vx = Math.cos(angle) * speed
				wander.vy = Math.sin(angle) * speed
				wander.nextTurn = now + 1500 + Math.random() * 3000
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

		function render(now: number) {
			if (!mounted) return
			const W = window.innerWidth, H = window.innerHeight
			ctx.clearRect(0, 0, W, H)

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