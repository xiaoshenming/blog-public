# 水墨皮肤实现记：一套可扩展的皮肤系统，和复刻参考时的四个决策

先给结论：给博客加了一套皮肤系统（站长设默认值、访客可覆盖），并基于 shuimo-design 复刻了水墨皮肤。皮肤令牌 26 个全部走 CSS 自定义属性；水墨素材从 250 KB 压到 61 KB；访客偏好由 `<head>` 里的阻塞脚本在首次绘制前落地，不闪屏。

## 一、皮肤系统的设计

### 目标

- 站长在配置面板选一个皮肤作为默认值，可单独微调任意颜色
- 访客可以自己选皮肤和字体，覆盖站长设置，存 localStorage
- 新增一个皮肤，改动点尽量少

### 结构

一个皮肤一个目录，导出 `SkinModule`：

```ts
// src/skins/<id>/index.ts
export const shuimoSkin: SkinModule = {
  preset: {
    id: 'shuimo',
    nameKey: 'skins.shuimoName',      // 字典 key，四语齐备
    descriptionKey: 'skins.shuimoDesc',
    theme: { colorBrand: '#a81c2b', /* 14 个颜色令牌 */ },
    card: { radius: 3, radiusLg: 5, blur: 'none', shadow: '…', borderWidth: 0, edge: '…' },
    button: { radius: 2, radiusLg: 4, borderWidth: 5, frame: '…', texture: '…' },
    defaultFont: 'huiwenmincho',
    backgroundImageId: 'ink-ridges',
    backgroundParallax: true,
  },
  Decor: ShuimoDecor,   // 可选的装饰层组件
}
```

新增皮肤的接线点是三处：`SKIN_IDS`（类型源）、`SKIN_MODULES`（注册表）、`globals.css` 里一行 `@import`。前两处不同步会在开发态直接报错：

```ts
if (process.env.NODE_ENV !== 'production') {
  const registered = new Set(SKIN_MODULES.map(m => m.preset.id))
  const missing = SKIN_IDS.filter(id => !registered.has(id))
  if (missing.length) console.error(`[skins] 声明但未注册：${missing.join('、')}`)
}
```

反向（注册了但没在 `SKIN_IDS` 里声明）由 TypeScript 挡住 —— `preset.id` 的类型就是 `SkinId`。

### 令牌：一份映射表，三处消费

令牌不是散落在各处的魔法字符串，而是一张映射表：

```ts
const CARD_TOKENS: TokenSpec<SkinCardStyle> = {
  radius:      { cssVar: '--skin-card-radius',      toValue: c => `${c.radius}px` },
  edge:        { cssVar: '--skin-card-edge',        toValue: c => c.edge ?? 'none' },
  // …
}
```

这张表被三个地方共用：SSR 内联样式、运行时 `applySkin()`、以及引导脚本的序列化。共用一份是为了防止漂移 —— 之前 SSR 那份是手抄的清单，漏了 `--color-surface-strong`，而 `as React.CSSProperties` 让 TypeScript 查不出缺项，于是站长一旦微调这个颜色，首屏就会回落兜底值。

现在改成：

```ts
const htmlStyle = {
  ...themeVars(theme),                  // 14 个 --color-*
  ...styleVars(skin.card, skin.button), // 12 个 --skin-*
  '--skin-bg-image': backgroundUrl ? `url("${backgroundUrl}")` : 'none',
  '--font-sans': font.family,
} as React.CSSProperties
```

### 不闪屏：引导脚本

SSR 读不到 localStorage，所以访客选了水墨皮肤的话，首屏会先渲染站长的默认皮肤，hydration 之后才跳变。

解法是在 `<head>` 里塞一段阻塞脚本，在首次绘制前把访客偏好写进 `document.documentElement`：

```js
var vsid = (vs && d.skins[vs]) ? vs : null;   // 访客覆盖，且必须是有效 id
var sid  = vsid || d.siteSkinId;
r.setAttribute('data-skin', sid);
if (vsid && s) { for (var k in s.v) r.style.setProperty(k, s.v[k]); }
```

注意 `if (vsid && s)` 这个守卫 —— 它是我在这套系统里踩的第一个坑，见第四节。

## 二、复刻参考时的四个决策

参考实现是 shuimo-design 的 shuimo-ui（MIT）。第一版我凭印象做，效果「不够彻底」，后来对着源码重做，发现差距不在配色，而在四个**做法**上。

### 决策一：卡片描边用四条线，不用 border-image

最直觉的做法是 `border-image`：给卡片一张墨笔触方框贴图，切片拉伸。

但 `border-image` 会把四角按 `slice` 缩放、四条边拉伸填充。卡片尺寸从方形头像卡到通栏卡片跨度极大，笔触会被拉得严重变形。

参考实现的做法是：**四条边各自铺一条 repeat 的线**，用 Grid 3×3 布局四个独立元素。我这边不需要额外 DOM —— `background-image` 本身就支持多层：

```ts
// src/styles/shared/card.stylex.ts
backgroundImage: cardTokens.edge,                                    // 四层，由皮肤给
backgroundPosition: 'top left, bottom left, top left, top right',
backgroundRepeat: 'repeat-x, repeat-x, repeat-y, repeat-y',
backgroundSize: 'auto 5px, auto 5px, 6px auto, 6px auto',
```

皮肤侧只需提供四层图的顺序：

```ts
edge: "url('…/ink-line-h.webp'), url('…/ink-line-h.webp'), url('…/ink-line-v.webp'), url('…/ink-line-v.webp')"
```

线条素材是固定像素尺寸（横线 548×5、竖线 6×548），四条各自平铺，所以任意宽高比都不变形。`edge` 为 `none` 时四层都不绘制，等同普通卡片。

顺带一个素材细节：原始的 `crossrange.webp` 是给输入框当分隔线用的，alpha 峰值只有 70%、全图均值 20%，放大到卡片尺度只剩一道灰痕。我把它的 alpha 整体乘 1.75 做了个加浓版（峰值 100%，非零像素均值横版 31%→53%），淡的那版留给标题下划线和滑块轨道。

### 决策二：按钮反而应该用 border-image

和决策一相反 —— 按钮适合 `border-image`，因为按钮的尺寸接近素材的固有比例（156×45），四边拉伸的形变可以接受。

这正是参考实现的做法，我照搬了：

```css
.m-button {
  border: 5px double transparent;
  border-image: url(./assets/border/base.webp) 8;
  background-image: url(./assets/button-mask.svg);   /* 青海波纹底纹 */
}
```

关键点是 `border` 只用来占位宽度（`transparent` 保证图挂了也不会出现难看的边框），`border-image` 的 `slice` 是 8，`border-image-width` 走初始值 1（即 1 × `border-width` = 5px）。

落到令牌系统里：

```ts
button: {
  radius: 2, radiusLg: 4,
  borderWidth: 5,
  frame: "url('…/brush-frame.webp') 8",
  texture: "url('…/wave-mask.svg')",
}
```

### 决策三：纸要盖在画上面

参考实现的宣纸容器有三层：底色 → 纸纹 → 远山。层序上 **纸纹在远山之上**（DOM 里 `.m-rice-paper-hover` 排在 `.mountains` 之后），远山透过半透明的纸看过去，才有「画在纸上」的纵深。

我第一版把纸纹垫在背景画下面，得到的就是一张贴了背景图的网页。

不过这里有个陷阱：我原本给纸纹层写了 `mix-blend-mode: multiply`，想保留纸的明暗起伏。**这是空操作** —— 纸纹层挂在一个 `position: fixed; z-index: 1` 的容器里，按 CSS 合成规范，创建层叠上下文的元素同时会建立**隔离组**，组内的混合模式只能与组内内容混合，对组外的页面底色和背景画没有任何作用。

实测验证：同样「黑底 + 白层 multiply」，非隔离时测得 RGB(0,0,0)，放进 fixed + z-index 容器后测得 RGB(255,255,255)。参考实现也只用 opacity，我改成老实的叠加。

### 决策四：圆角收到近方，阴影几乎去掉

参考实现全库只有两处 `border-radius`（按钮 2px、下拉选项 5px），**整个项目不用 `box-shadow`**。层次靠纸色和墨色的深浅拉开，不靠投影。

对应到令牌：

```ts
card: {
  radius: 3,        // 默认皮肤是 40
  radiusLg: 5,      // 默认皮肤是 64
  blur: 'none',
  shadow: '0 1px 2px -1px rgb(43 51 62 / 10%)',   // 只留一道贴边的淡墨
  borderWidth: 0,   // 边框交给 edge 的四层墨线
}
```

另外卡片的底色要比默认皮肤更实更亮（`#fbf7ee99` → `#fdfbf6e0`）。半透明度过高会让卡片和背景的宣纸底色糊成一片，整页变成一块米色，墨线框也失去了衬托。

## 三、光标：三态、位图，和逐张实测的热点

参考的光标是**位图**，不是矢量：32×32 的 webp，三态（素笔 / 蘸朱砂 / 禁用）。我第一版自绘了 SVG，形状上也是毛笔，但和真东西完全不像 —— 差别在于一个是画出来的毛笔，一个是毛笔。

两个技术点：

**格式**：原素材是 webp，但 Safari 不支持 webp 光标，Firefox 也是较新版本才支持。转成 PNG（32×32 下体积只差几百字节），全平台通吃。

**热点**：`cursor: url(...) <x> <y>, fallback` 里的坐标是笔尖位置。我按 alpha 通道逐张实测了最左上不透明像素：

| 素材 | 笔尖坐标 |
|---|---|
| auto.png | (1, 0) |
| pointer.png | (1, 0) |
| disabled.png | **(0, 0)** |

三张并不一致 —— 一开始我统一写了 `1 0`，disabled 那支笔就偏了一个像素。

令牌也拆成三态，因为交互元素要换成「蘸朱砂的笔」，和静态区域区分开：

```css
html[data-skin='shuimo'] {
  --skin-cursor-auto:     url('…/auto.png') 1 0, auto;
  --skin-cursor-pointer:  url('…/pointer.png') 1 0, pointer;
  --skin-cursor-disabled: url('…/disabled.png') 0 0, not-allowed;
}
```

```css
:is(button, a, summary, [role='button'], [role='menuitem']) { cursor: var(--skin-cursor-pointer); }
```

只给一个 `--skin-cursor` 的话，按钮会被 `cursor: pointer` 顶掉。

## 四、踩坑记录

### 坑一：引导脚本把站长的自定义配色顶掉了

站点配置里站长把品牌色调成了 `#de4331`，而默认皮肤预设是 `#35bfab`。

原来的引导脚本是这样的：

```js
var sid = (vs && d.skins[vs]) ? vs : d.siteSkinId;
var s = d.skins[sid] || d.skins[d.siteSkinId];
if (s) { r.setAttribute('data-skin', sid); for (var k in s.t) r.style.setProperty(k, s.t[k]); }
```

访客**没有**覆盖时，`sid` 取站长皮肤，`s` 取该皮肤的**预设**，然后把预设的 14 个颜色变量无条件写进 html 内联样式 —— 正好盖掉 SSR 刚注入的站长自定义值。

时间线：SSR 注入红色 → head 阻塞脚本改成绿色 → 首屏绘制（绿色，错误）→ hydration 后 effect 改回红色。**每次加载都闪一帧**。

修法是加访客守卫：

```js
var vsid = (vs && d.skins[vs]) ? vs : null;
var sid  = vsid || d.siteSkinId;
r.setAttribute('data-skin', sid);
if (vsid && s) { for (var k in s.v) r.style.setProperty(k, s.v[k]); }   // ← 只在真有覆盖时写
```

没有覆盖时不动任何颜色变量，SSR 注入的就是对的。

### 坑二：滑块轨道改了没用

水墨皮肤的滑块要换成墨线轨道，我写了：

```css
[data-skin='shuimo'] .range-track { background: url('…/line-h.webp') repeat-x center / auto 5px; }
```

实际渲染出来还是原来的品牌色渐变。原因是 `globals.css` 里给 `::-webkit-slider-runnable-track` 和 `::-moz-range-track` 也铺了不透明的渐变，而这两个伪元素画在 input 背景**之上**，把它整个盖住了。

三个选择器都要覆盖：

```css
[data-skin='shuimo'] .range-track,
[data-skin='shuimo'] .range-track::-webkit-slider-runnable-track,
[data-skin='shuimo'] .range-track::-moz-range-track {
  background: url('…/line-h.webp') repeat-x center / auto 5px;
}
```

### 坑三：显式列 transition-property，顶掉了组件的 scale

水墨皮肤要把过渡改成「慢而柔和」，我写了：

```css
[data-skin='shuimo'] :is(a, button, input, …) {
  transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  transition-duration: 320ms;
}
```

只写 duration 和 timing 的话，`transition-property` 走初始值 `all` —— 对原本没有声明过渡的元素，等于凭空激活「全属性 320ms 过渡」，范围不可控。所以我改成显式列属性：

```css
transition-property: color, background-color, border-color, box-shadow, transform, opacity;
```

然后钟表页的模式按钮 hover 就跳变了 —— 因为它用的是独立的 `scale` 属性，不是 `transform`。这条规则无层、命中所有交互元素，会**顶掉组件自己声明的 `transition-property`**，所以清单必须涵盖组件实际会过渡的属性：

```css
transition-property: color, background-color, border-color, box-shadow, transform, scale, opacity;
```

### 坑四：视差的位移余量

背景画的指针视差是 ±8px，元素铺满视口。一开始我用 `transform: translate3d(...) scale(1.02)` 留余量，`scale` 按视口尺寸等比给出 —— 768 高的视口下每边只有 7.68px，小于 8px 的位移上限，指针到边角时对边会露出约 0.3px 缝隙。

改成固定像素余量，把背景层的 `inset` 从 `0` 改成 `-12px`，任何视口下都留得住（位移到极限时迎风侧仍余 4px）。

## 五、素材瘦身

复刻过程中素材一度涨到 250 KB，压缩后 61 KB：

| 素材 | 前 | 后 | 做法 |
|---|---|---|---|
| 宣纸纹理 | 105 KB | 13 KB | 降到显示尺寸 + q90 |
| 页面纸纹 | 55 KB | 21 KB | q90（保留 91% 纹理对比度） |
| 滑块手柄 | 75 KB | 2 KB | 856×840 → 64×64（显示尺寸 20px，3 倍余量） |

纸纹这类低对比度素材对质量参数很敏感：q65 会把标准差从 2.87 压到 1.22（纹理基本没了），q90 能保住 2.61。压缩这类图不要只看体积。

## 小结

- 皮肤系统的关键不是「能换色」，而是**令牌只有一份来源**、**访客偏好不闪屏**、**新增皮肤改动点少**
- 复刻参考时，差距通常在**做法**而不是配色。凭印象做出来的东西会复刻到形容词，复刻不到方法
- CSS 的坑大多有同一个特征：**规则写了，但不生效，而且不报错**。`border-image` 的变形、被伪元素盖住的背景、层叠上下文里的混合模式、被顶掉的 `transition-property` —— 这些只有真的去看渲染结果才会发现
