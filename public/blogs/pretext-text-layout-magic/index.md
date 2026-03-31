今天发现了一个让我兴奋的库：[@chenglou/pretext](https://github.com/chenglou/pretext)。

陈楼（chenglou）是 React 核心贡献者，写过 React Motion、Reason 语言。这次他搞了个更底层的东西——**不通过 DOM 就能精确计算文本布局**。

上面那个深色区域就是 pretext 的实时演示。两个发光球体在漂浮，中文文字围绕它们实时流动。**试试拖动球体**，你会看到文字瞬间重新排列——整个过程零 DOM 测量，纯算术计算。

## 它解决了什么问题？

Web 上想知道一段文字有多高、在哪里换行，唯一的办法是问浏览器。而浏览器每次回答都要触发一次**同步布局重排**——重新计算页面上所有元素的位置。

测量一个文本块？重排一次。测量五百个？重排五百次。这就是"布局抖动"，Chrome DevTools 里那些愤怒的红条就是它。

pretext 的思路很简单也很聪明：用 Canvas 的 `measureText` 替代 DOM 测量。Canvas 测量用的是同一个字体引擎，结果一样，但它不在布局树里，所以**零重排代价**。

## 核心 API

```ts
import { prepare, layout } from '@chenglou/pretext'

// 第一步：准备（测量每个词，缓存宽度）
const prepared = prepare('你的文本内容', '16px sans-serif')

// 第二步：布局（纯算术，无 DOM）
const { height, lineCount } = layout(prepared, containerWidth, lineHeight)
// 就这么简单。height 和 lineCount 是精确值。
```

`prepare()` 大约 19ms（500 个文本批次），`layout()` 大约 0.05ms（同一批次）。对比 DOM 测量的 15-30ms，这是 **300-600 倍**的提升。

## 更强大的用法

```ts
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const prepared = prepareWithSegments(text, font)

// 逐行布局——可以给每行不同的宽度！
let cursor = { segmentIndex: 0, graphemeIndex: 0 }
while (true) {
  const line = layoutNextLine(prepared, cursor, currentLineWidth)
  if (!line) break
  // line.text, line.width — 这行的内容和宽度
  cursor = line.end
}
```

`layoutNextLine` 是关键——它让你能给每一行设置不同的宽度。这就是上面演示中文字能环绕球体的原理：每一行先计算哪些水平区间被球体遮挡，剩余的宽度传给 `layoutNextLine`，文字就自然地流到球体两侧了。

## 它能做什么 CSS 做不到的事？

1. **文字环绕任意形状** — CSS Shapes 只支持浮动元素、只能单侧环绕。pretext 可以双侧同时环绕，障碍物可以是任意形状，还能动画。

2. **聊天气泡紧凑包装** — CSS 的 `fit-content` 对多行文本总是留死空间。pretext 用二分搜索找到保持行数不变的最窄宽度。

3. **虚拟列表精确高度** — 不用渲染就知道每条消息的精确高度，完美虚拟化，零视觉跳动。

4. **多列文本流** — 左列排满后，光标无缝交给右列继续。报纸杂志的排版效果，在 Web 上终于可行了。

## 多语言支持

pretext 通过 `Intl.Segmenter` 支持所有复杂脚本：

- CJK（中日韩）每字符断行 + 禁则处理
- 阿拉伯语 RTL 文本
- 泰语、缅甸语等无空格分词语言
- Emoji ZWJ 序列

## 安装

```bash
npm install @chenglou/pretext
```

15KB，零依赖，ESM。就这样。

## 我的感受

看到 editorial-engine 那个演示的时候，我是真的被震到了——发光球体在页面上漂浮，文字像水一样围绕它们流动，60fps，每帧布局计算不到 0.5ms。这不是 CSS 能做到的事情。

陈楼用一个 15KB 的库，绕过了浏览器三十年来的文本测量瓶颈。不需要新的浏览器 API，不需要标准化流程，就是数学、缓存测量、和一个大胆的想法：**如果我们不再问 DOM 呢？**

> Fifteen kilobytes. Zero dependencies. Zero DOM reads. And the text flows.
