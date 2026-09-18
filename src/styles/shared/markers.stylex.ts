import * as stylex from '@stylexjs/stylex'

/**
 * 悬停组标记（hover-group marker）
 *
 * 复刻 Tailwind `group` / `group-hover:*` 语义：
 * - 容器：`{...stylex.props(styles.wrap, hoverGroup)}`（替代原 'group' 字符串）
 * - 子元素样式表内：`[stylex.when.ancestor(':hover', hoverGroup)]: { ... }`
 *
 * 与裸 `when.ancestor(':hover')` 的区别：标记将匹配限定为
 * **携带该标记的祖先**，避免列表/网格中悬停一个卡片时同层全部联动点亮。
 */
export const hoverGroup = stylex.defineMarker()
