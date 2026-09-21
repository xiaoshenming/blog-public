Today, I discovered a library that excites me: [@chenglou/pretext](https://github.com/chenglou/pretext).

Chenglou is a core contributor to React, having worked on React Motion and the Reason language. This time, he created something even more fundamental—**precise text layout calculation without using DOM**.

The dark area above is a real-time demo of pretext. A dragon moves around the screen, and Chinese text flows around the dragon in real time. **Move the mouse to guide the dragon’s movement, press and hold to spray fire**—the text instantly avoids the dragon and the fire, rearranging itself, with zero DOM measurements and pure arithmetic calculations, running smoothly at 60fps.

## What problem does it solve?

To find out how tall a text block is and where to wrap lines on the web, the only way is to ask the browser. And every time the browser responds, it triggers a **synchronized layout repaint**—recomputing the positions of all elements on the page.

Measure a text block? Repaint once. Measure 500 elements? Repaint 500 times. This is what "layout jitter" refers to, and the angry red bars in Chrome DevTools are evidence of it.

The idea behind pretext is simple and clever: use Canvas’s `measureText` instead of DOM measurement. Canvas uses the same font engine for measurement, so the result is the same, but since it isn’t part of the layout tree, there is **no repaint cost**.

## Core API

```ts
import { prepare, layout } from '@chenglou/pretext'

// Step 1: Preparation (measure each character, cache width)
const prepared = prepare('Your text content', '16px sans-serif')

// Step 2: Layout (pure arithmetic, no DOM)
const { height, lineCount } = layout(prepared, containerWidth, lineHeight)
// It’s that simple. height and lineCount are exact values.
```

`prepare()` takes about 19ms (500 text batches), and `layout()` takes about 0.05ms (same batch). Compared to 15–30ms measured via DOM, this is a **300–600 times** improvement.

## More powerful usage

```ts
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const prepared = prepareWithSegments(text, font)

// Line-by-line layout—can give each line different widths!
let cursor = { segmentIndex: 0, graphemeIndex: 0 }
while (true) {
  const line = layoutNextLine(prepared, cursor, currentLineWidth)
  if (!line) break
  // line.text, line.width — content and width of this line
  cursor = line.end
}
```

`layoutNextLine` is crucial—it allows you to set different widths for each line. This is how the text wraps around the sphere in the demo above: each line first calculates which horizontal intervals are obscured by the sphere, and the remaining width is passed to `layoutNextLine`, allowing the text to naturally flow to both sides of the sphere.

## What can it do that CSS cannot?

1. **Text wrapping around any shape** — CSS Shapes only supports floating elements and单侧 wrapping. pretext can wrap on both sides simultaneously, and the obstacles can be of any shape, with animations too.

2. **Compact packaging of chat bubbles** — CSS’s `fit-content` always leaves dead space for multi-line text. pretext uses binary search to find the narrowest width that maintains the number of lines unchanged.

# / - / >

3. **Virtual List Exact Height** — Without rendering, you know the exact height of each message, perfect virtualization with zero visual jitter.

4. **Multi-column Text Flow** — Once the left column is filled, the cursor seamlessly transitions to the right column. The layout effect of newspapers and magazines is finally possible on the Web.

## Multilingual Support

pretext supports all complex scripts through `Intl.Segmenter`:

- CJK (Chinese, Japanese, Korean) line breaks per character + restriction handling  
- Arabic RTL text  
- Spaced-out languages like Thai and Burmese without spaces  
- Emoji ZWJ sequence

## Installation

```bash
npm install @chenglou/pretext
```

15KB, zero dependencies, ESM. That’s all.

## My Feelings

When I saw the demo of editorial-engine, I was truly amazed—glowing spheres float on the page, text flows around them like water, at 60fps with layout calculations taking less than 0.5ms per frame. This is beyond what CSS can achieve.

Chen Lou uses a 15KB library to overcome the text measurement limitations in browsers over the past thirty years. No need for new browser APIs, no need for standardized processes—just mathematics, caching measurements, and a bold idea: **What if we stop asking about DOM?**

> Fifteen kilobytes. Zero dependencies. Zero DOM reads. And the text flows.
