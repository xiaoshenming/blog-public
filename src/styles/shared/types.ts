import type { CompiledStyles, StyleXArray } from '@stylexjs/stylex'

/**
 * 组件样式透传 prop 的标准类型。
 *
 * 对齐 `stylex.props()` 实际接受的实参类型（CompiledStyles 系），
 * 而不是 `StyleXStyles`：后者的键被映射限定在 CSSProperties 上（weak type），
 * 「仅含媒体查询」的样式对象（如 `{ '@media (width < 40rem)': {...} }`）
 * 会因与目标类型无共同属性而被判为不可赋值（aritcle-card 实测案例）。
 *
 * 用法：组件内 `stylex.props(自身样式..., styleOverride)` 收尾合并，后写覆盖。
 */
export type StyleXProp = StyleXArray<null | undefined | CompiledStyles | boolean>
