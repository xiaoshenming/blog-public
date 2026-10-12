'use client'

import { useSkin } from '@/skin/context'
import { getSkinModule } from '@/skins'

/**
 * 皮肤装饰层分发：渲染当前皮肤模块提供的 Decor，未提供则什么都不渲染。
 * 装饰层各自实现在 `src/skins/<id>/decor.tsx`。
 */
export default function SkinDecor() {
	const { skinId } = useSkin()
	const Decor = getSkinModule(skinId).Decor

	return Decor ? <Decor /> : null
}
