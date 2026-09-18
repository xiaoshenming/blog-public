import * as stylex from '@stylexjs/stylex'

/**
 * 组件样式透传 prop 的标准类型。
 *
 * 取 `stylex.props()` 首个参数的类型（CompiledStyles 系），而不是 `StyleXStyles`：
 * `StyleXStyles` 的键被映射限定在 CSSProperties 上（weak type），
 * 「仅含媒体查询」的样式对象（如 `{ '@media (width < 40rem)': {...} }`）会因
 * 无共同属性被判为不可赋值（aritcle-card 实测案例）。
 */
export type StyleXProp = Parameters<typeof stylex.props>[0]
