'use client'

import { useEffect, useRef, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'

/** PIXI Application 实例（CDN 加载，无类型包） */
interface PixiAppInstance {
	stage: { addChild: (child: unknown) => void }
	view: HTMLCanvasElement
	destroy: (opts?: { removeView?: boolean }) => void
}

/** Live2D 模型实例 */
interface Live2DModelInstance {
	anchor: { set: (x: number, y: number) => void }
	x: number
	y: number
	scale: { set: (x: number, y: number) => void }
}

const CDN_SCRIPTS = [
	'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.2.0/browser/pixi.min.js',
	'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
	'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism4.min.js'
]

const MODEL_URL = '/live2d/live2d.model3.json'

function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve()
			return
		}
		const script = document.createElement('script')
		script.src = src
		script.crossOrigin = 'anonymous'
		script.onload = () => resolve()
		script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
		document.head.appendChild(script)
	})
}

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 舞台：方形比例圆形裁切 */
	stage: {
		position: 'relative',
		aspectRatio: '1',
		width: '100%',
		overflow: 'hidden',
		borderRadius: 9999
	},
	/** 画布挂载点：铺满舞台 */
	canvasHost: {
		position: 'absolute',
		inset: 0,
		height: '100%',
		width: '100%'
	},
	/** 加载浮层：居中 */
	statusOverlay: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: colors.secondary
	},
	/** 错误浮层：居中、内边距与居中文本 */
	errorOverlay: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		textAlign: 'center',
		color: '#fb2c36'
	}
})

export default function Live2DViewer() {
	const containerRef = useRef<HTMLDivElement>(null)
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	const [errorMsg, setErrorMsg] = useState<string>('')

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		let app: PixiAppInstance | null = null

		const init = async () => {
			try {
				for (const src of CDN_SCRIPTS) {
					await loadScript(src)
				}

				const PIXI = (window as unknown as { PIXI: unknown }).PIXI
				if (!PIXI) {
					throw new Error('PIXI not found on window')
				}
				;(window as unknown as { PIXI: unknown }).PIXI = PIXI

				const PIXIApp = (
					PIXI as { Application: new (opts: { view: HTMLCanvasElement; width?: number; height?: number; backgroundAlpha?: number }) => PixiAppInstance }
				).Application

				const Live2DModel = (PIXI as { live2d?: { Live2DModel: { from: (url: string) => Promise<Live2DModelInstance> } } }).live2d?.Live2DModel

				if (!Live2DModel) {
					throw new Error('PIXI.live2d.Live2DModel not found')
				}

				const width = container.clientWidth || 500
				const height = container.clientHeight || 500
				const canvas = document.createElement('canvas')
				canvas.style.width = '100%'
				canvas.style.height = '100%'
				canvas.style.display = 'block'
				container.appendChild(canvas)

				app = new PIXIApp({
					view: canvas,
					width,
					height,
					backgroundAlpha: 0
				})

				const model = await Live2DModel.from(MODEL_URL)
				app.stage.addChild(model)

				model.anchor.set(0.5, 0.5)
				model.x = width / 2
				model.y = height / 2
				model.scale.set(0.25, 0.25)

				setStatus('ready')
			} catch (err) {
				setErrorMsg(err instanceof Error ? err.message : String(err))
				setStatus('error')
			}
		}

		init()

		return () => {
			if (app !== null && typeof app === 'object' && 'destroy' in app && typeof app.destroy === 'function') {
				app.destroy({ removeView: true })
			}
			container.innerHTML = ''
		}
	}, [])

	return (
		<div {...stylex.props(styles.stage)}>
			<div ref={containerRef} {...stylex.props(styles.canvasHost)} />
			{status === 'loading' && <div {...stylex.props(styles.statusOverlay)}>加载 Live2D 模型中…</div>}
			{status === 'error' && <div {...stylex.props(styles.errorOverlay)}>{errorMsg}</div>}
		</div>
	)
}
