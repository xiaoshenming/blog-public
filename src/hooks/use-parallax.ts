'use client'

import { useEffect, useRef } from 'react'

/** 视差幅度（px）。与参考实现 shuimo-ui 的远山视差同量级 —— 看得出在动，但不会让人注意到「有个东西在动」 */
const STRENGTH = 8
/** 每帧向目标位置收敛的比例。不跟手是刻意的：跟得太紧会显得廉价，收敛式才有「呼吸」感 */
const DAMPING = 0.08
/** 收敛到这个阈值以内就停掉 rAF，不让循环空转 */
const SETTLE = 0.0005

/**
 * 指针视差：元素随指针做极小幅位移，带阻尼收敛。
 *
 * 位移量按视口归一化到 -1..1 再乘 STRENGTH，所以屏幕中央几乎不动、越靠边越明显。
 * 元素必须自带位移余量（本站背景层是 inset: -12px）—— 它是铺满视口的，
 * 不留余量的话平移会在对边露出缝隙。余量在样式里给，这里不做缩放。
 *
 * 三层提前退出：未启用、元素不存在、用户偏好减弱动效。后两者任一成立都不挂监听。
 */
export function useParallax<T extends HTMLElement>(enabled: boolean) {
	const ref = useRef<T>(null)

	useEffect(() => {
		const el = ref.current
		if (!enabled || !el) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

		let frame = 0
		const target = { x: 0, y: 0 }
		const current = { x: 0, y: 0 }

		const apply = () => {
			el.style.transform = `translate3d(${(current.x * STRENGTH).toFixed(2)}px, ${(current.y * STRENGTH).toFixed(2)}px, 0)`
		}

		const tick = () => {
			frame = 0
			const dx = target.x - current.x
			const dy = target.y - current.y
			current.x += dx * DAMPING
			current.y += dy * DAMPING
			apply()
			if (Math.abs(dx) > SETTLE || Math.abs(dy) > SETTLE) schedule()
		}

		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(tick)
		}

		const onPointerMove = (event: PointerEvent) => {
			target.x = (event.clientX / window.innerWidth) * 2 - 1
			target.y = (event.clientY / window.innerHeight) * 2 - 1
			schedule()
		}

		window.addEventListener('pointermove', onPointerMove, { passive: true })
		return () => {
			window.removeEventListener('pointermove', onPointerMove)
			if (frame) cancelAnimationFrame(frame)
			el.style.transform = ''
		}
	}, [enabled])

	return ref
}
