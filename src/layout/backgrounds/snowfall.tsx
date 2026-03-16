'use client'
import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'

const SNOWFLAKE_IMAGES = ['/images/christmas/snowflake/1.webp', '/images/christmas/snowflake/2.webp', '/images/christmas/snowflake/3.webp']
const DOT_RATIO = 0.8
const TARGET_FPS = 30
const FRAME_INTERVAL = 1000 / TARGET_FPS

interface SnowflakeData {
	type: 'dot' | 'image'
	img?: HTMLImageElement
	size: number
	speed: number // px per second
	x: number
	y: number
	driftX: number // horizontal drift per second
	rotate: number
	rotateSpeed: number
	opacity: number
}

function createSnowflakes(count: number, w: number, h: number, images: HTMLImageElement[]): SnowflakeData[] {
	const flakes: SnowflakeData[] = []
	for (let i = 0; i < count; i++) {
		const isDot = Math.random() < DOT_RATIO
		const size = isDot ? Math.random() * 10 + 5 : Math.random() * 40 + 20
		flakes.push({
			type: isDot ? 'dot' : 'image',
			img: isDot ? undefined : images[Math.floor(Math.random() * images.length)],
			size,
			speed: Math.random() * 30 + 20, // 20-50 px/s
			x: Math.random() * w,
			y: Math.random() * h * 2 - h, // spread across full height initially
			driftX: (Math.random() - 0.5) * 15,
			rotate: Math.random() * 360,
			rotateSpeed: isDot ? 0 : (Math.random() - 0.5) * 30,
			opacity: Math.random() * 0.5 + 0.5,
		})
	}
	return flakes
}

export default function SnowfallBackground({ zIndex, count = 125 }: { zIndex: number; count?: number }) {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		let w = window.innerWidth
		let h = window.innerHeight
		canvas.width = w
		canvas.height = h

		// preload snowflake images
		let loadedCount = 0
		const images: HTMLImageElement[] = []
		const totalImages = SNOWFLAKE_IMAGES.length

		const onAllLoaded = () => {
			const flakes = createSnowflakes(count, w, h, images)
			startAnimation(flakes)
		}

		SNOWFLAKE_IMAGES.forEach(src => {
			const img = new Image()
			img.src = src
			img.onload = () => {
				loadedCount++
				if (loadedCount === totalImages) onAllLoaded()
			}
			img.onerror = () => {
				loadedCount++
				if (loadedCount === totalImages) onAllLoaded()
			}
			images.push(img)
		})

		let animId: number
		let lastTime = 0

		function startAnimation(flakes: SnowflakeData[]) {
			const frame = (time: number) => {
				animId = requestAnimationFrame(frame)
				if (time - lastTime < FRAME_INTERVAL) return
				const dt = Math.min((time - lastTime) / 1000, 0.1) // cap delta
				lastTime = time

				ctx!.clearRect(0, 0, w, h)

				for (const f of flakes) {
					f.y += f.speed * dt
					f.x += f.driftX * dt
					f.rotate += f.rotateSpeed * dt

					// wrap around
					if (f.y > h + f.size) {
						f.y = -f.size * 2
						f.x = Math.random() * w
					}
					if (f.x < -f.size) f.x = w + f.size
					if (f.x > w + f.size) f.x = -f.size

					ctx!.save()
					ctx!.globalAlpha = f.opacity
					ctx!.translate(f.x, f.y)

					if (f.type === 'dot') {
						ctx!.beginPath()
						ctx!.arc(0, 0, f.size / 2, 0, Math.PI * 2)
						ctx!.fillStyle = 'white'
						ctx!.fill()
					} else if (f.img && f.img.complete && f.img.naturalWidth > 0) {
						ctx!.rotate((f.rotate * Math.PI) / 180)
						ctx!.drawImage(f.img, -f.size / 2, -f.size / 2, f.size, f.size)
					}

					ctx!.restore()
				}
			}
			animId = requestAnimationFrame(frame)
		}

		const onResize = () => {
			w = window.innerWidth
			h = window.innerHeight
			canvas.width = w
			canvas.height = h
		}
		window.addEventListener('resize', onResize)

		return () => {
			cancelAnimationFrame(animId)
			window.removeEventListener('resize', onResize)
		}
	}, [count])

	return (
		<motion.div
			animate={{ opacity: 1 }}
			initial={{ opacity: 0 }}
			transition={{ duration: 1 }}
			className='pointer-events-none fixed inset-0 z-0 overflow-hidden'
			style={{ zIndex }}>
			<canvas ref={canvasRef} className='h-full w-full' />
		</motion.div>
	)
}
