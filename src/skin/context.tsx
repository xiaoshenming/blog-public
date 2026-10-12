'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { getSkinPreset, type SkinId, type SkinPreset } from '@/skins'
import { applyFont } from '@/lib/font'
import {
	applyBackgroundImage,
	applySkin,
	applyTheme,
	persistFont,
	persistSkin,
	readStoredFont,
	readStoredSkin,
	resolveBackgroundUrl,
	resolveFont,
	resolveSkin
} from '@/lib/skin'

type SkinValue = {
	/** 最终生效的皮肤 id（已合并访客覆盖） */
	skinId: SkinId
	skin: SkinPreset
	/** 最终生效的字体 id（已合并访客覆盖） */
	fontId: string
	/** 传入 id 覆盖站长默认值，传 null 恢复跟随站长设置 */
	setSkin: (id: SkinId | null) => void
	setFont: (id: string | null) => void
	/** 访客是否自己选了皮肤（与字体各自独立，两个切换菜单各管一条轴） */
	skinOverridden: boolean
	/** 访客是否自己选了字体 */
	fontOverridden: boolean
}

const SkinContext = createContext<SkinValue | null>(null)

/**
 * 皮肤与字体的统一偏好层：站长默认值（site-content.json） + 访客覆盖（localStorage）。
 *
 * 与 I18nProvider 同样的取舍：SSR 阶段读不到 localStorage，只按站长默认渲染；
 * 为消除「访客覆盖时首屏闪回默认皮肤」，layout.tsx 里有一段阻塞式内联脚本
 * 在首次绘制前就写好 data-skin 与 CSS 变量，这里只负责后续的响应式更新。
 */
export function SkinProvider({ children }: { children: ReactNode }) {
	const siteSkin = useConfigStore(useShallow(s => (s.siteContent as { skin?: string }).skin))
	const siteFont = useConfigStore(useShallow(s => (s.siteContent as { font?: string }).font))
	const siteTheme = useConfigStore(useShallow(s => s.siteContent.theme))
	const siteBackgroundImageId = useConfigStore(useShallow(s => s.siteContent.currentBackgroundImageId))
	const backgroundImages = useConfigStore(useShallow(s => (s.siteContent as { backgroundImages?: Array<{ id: string; url: string }> }).backgroundImages ?? []))

	const [visitorSkin, setVisitorSkin] = useState<SkinId | null>(null)
	const [visitorFont, setVisitorFont] = useState<string | null>(null)
	/**
	 * 访客偏好是否已从 localStorage 读出。读出前一律不动 DOM：
	 * 引导脚本已经按访客偏好落地过一份正确值，此时若按 SSR 的「未覆盖」状态重算，
	 * 会先用默认皮肤把它覆盖掉、下一帧再改回来 —— 既闪一下又白费了引导脚本。
	 */
	const [preferencesLoaded, setPreferencesLoaded] = useState(false)

	useEffect(() => {
		setVisitorSkin(readStoredSkin())
		setVisitorFont(readStoredFont())
		setPreferencesLoaded(true)
	}, [])

	const skinId = resolveSkin(visitorSkin, siteSkin)
	const skin = useMemo(() => getSkinPreset(skinId), [skinId])

	// 访客一旦自己选了皮肤，就该看到该皮肤的完整配色（含字体与关联背景），而不是站长微调过的版本
	const theme = visitorSkin ? skin.theme : siteTheme
	const fontId = resolveFont(visitorFont, visitorSkin ? null : siteFont, skinId)
	const backgroundUrl = resolveBackgroundUrl(visitorSkin, skinId, siteBackgroundImageId, backgroundImages)

	useEffect(() => {
		if (!preferencesLoaded) return
		applyTheme(theme)
		applySkin(skinId)
		applyBackgroundImage(backgroundUrl)
	}, [preferencesLoaded, theme, skinId, backgroundUrl])

	useEffect(() => {
		if (!preferencesLoaded) return
		applyFont(fontId)
	}, [preferencesLoaded, fontId])

	const setSkin = useCallback((next: SkinId | null) => {
		persistSkin(next)
		setVisitorSkin(next)
	}, [])

	const setFont = useCallback((next: string | null) => {
		persistFont(next)
		setVisitorFont(next)
	}, [])

	const value = useMemo<SkinValue>(
		() => ({
			skinId,
			skin,
			fontId,
			setSkin,
			setFont,
			skinOverridden: visitorSkin !== null,
			fontOverridden: visitorFont !== null
		}),
		[skinId, skin, fontId, setSkin, setFont, visitorSkin, visitorFont]
	)

	return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}

export function useSkin(): SkinValue {
	const value = useContext(SkinContext)
	if (!value) throw new Error('useSkin 必须在 <SkinProvider> 内使用')
	return value
}
