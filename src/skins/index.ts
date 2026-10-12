import { defaultSkin } from './default'
import { shuimoSkin } from './shuimo'
import { DEFAULT_SKIN_ID, SKIN_IDS, type SkinModule, type SkinPreset } from './types'

export * from './types'

/**
 * 皮肤注册表 —— 新增皮肤的唯一接线点（另需在 globals.css 里 @import 该皮肤的 CSS）。
 * 顺序即配置面板与访客菜单里的展示顺序。
 */
export const SKIN_MODULES: SkinModule[] = [defaultSkin, shuimoSkin]

export const SKIN_PRESETS: SkinPreset[] = SKIN_MODULES.map(module => module.preset)

/**
 * SKIN_IDS（类型源）与注册表是两处，容易加了一处忘了另一处 —— 开发态直接报出来。
 * 反向（注册了 SKIN_IDS 里没有的 id）由 TypeScript 挡住：preset.id 必须是 SkinId。
 */
if (process.env.NODE_ENV !== 'production') {
	const registered = new Set(SKIN_MODULES.map(module => module.preset.id))
	const missing = SKIN_IDS.filter(id => !registered.has(id))
	if (missing.length > 0) console.error(`[skins] 这些皮肤在 SKIN_IDS 里声明但未注册到 SKIN_MODULES：${missing.join('、')}`)
}

/** 未登记或非法 id 一律回落默认皮肤 */
export function getSkinModule(id?: string | null): SkinModule {
	return SKIN_MODULES.find(module => module.preset.id === id) ?? SKIN_MODULES[0]
}

export function getSkinPreset(id?: string | null): SkinPreset {
	return getSkinModule(id).preset
}

export { DEFAULT_SKIN_ID }
