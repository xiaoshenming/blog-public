# Building an Ink-Wash Skin: A Pluggable Theme System and Four Replication Decisions

Bottom line first: the blog now has a theme system (site-wide defaults, visitor overrides) and an ink-wash skin replicated from shuimo-design. All 26 skin tokens go through CSS custom properties; the ink-wash assets went from 250 KB to 61 KB; visitor preferences are applied before first paint by a blocking script in `<head>`, so nothing flashes.

## 1. Designing the theme system

### Goals

- The site owner picks a skin as the default in the config panel, and can fine-tune any colour individually
- Visitors can pick their own skin and font, overriding the site settings, persisted in localStorage
- Adding a new skin should touch as few places as possible

### Structure

One directory per skin, exporting a `SkinModule`:

```ts
// src/skins/<id>/index.ts
export const shuimoSkin: SkinModule = {
  preset: {
    id: 'shuimo',
    nameKey: 'skins.shuimoName',      // dictionary key, present in all four languages
    descriptionKey: 'skins.shuimoDesc',
    theme: { colorBrand: '#a81c2b', /* 14 colour tokens */ },
    card: { radius: 3, radiusLg: 5, blur: 'none', shadow: '…', borderWidth: 0, edge: '…' },
    button: { radius: 2, radiusLg: 4, borderWidth: 5, frame: '…', texture: '…' },
    defaultFont: 'huiwenmincho',
    backgroundImageId: 'ink-ridges',
    backgroundParallax: true,
  },
  Decor: ShuimoDecor,   // optional decoration layer component
}
```

Registering a new skin means three edits: `SKIN_IDS` (the type source), `SKIN_MODULES` (the registry), and one `@import` line in `globals.css`. The first two falling out of sync is a hard error in development:

```ts
if (process.env.NODE_ENV !== 'production') {
  const registered = new Set(SKIN_MODULES.map(m => m.preset.id))
  const missing = SKIN_IDS.filter(id => !registered.has(id))
  if (missing.length) console.error(`[skins] declared but not registered: ${missing.join(', ')}`)
}
```

The reverse case (registered but not declared in `SKIN_IDS`) is caught by TypeScript — `preset.id` is typed as `SkinId`.

### Tokens: one mapping table, three consumers

The tokens aren't magic strings scattered around; they're a mapping table:

```ts
const CARD_TOKENS: TokenSpec<SkinCardStyle> = {
  radius:      { cssVar: '--skin-card-radius',      toValue: c => `${c.radius}px` },
  edge:        { cssVar: '--skin-card-edge',        toValue: c => c.edge ?? 'none' },
  // …
}
```

Three places consume that table: the SSR inline style, the runtime `applySkin()`, and the bootstrap script's serialisation. Sharing one table prevents drift — the SSR side used to be a hand-copied list that had silently dropped `--color-surface-strong`, and the `as React.CSSProperties` cast meant TypeScript couldn't see the omission. The result: the moment the owner tweaked that colour, the first paint fell back to the default.

Now it's generated:

```ts
const htmlStyle = {
  ...themeVars(theme),                  // 14 --color-* tokens
  ...styleVars(skin.card, skin.button), // 12 --skin-* tokens
  '--skin-bg-image': backgroundUrl ? `url("${backgroundUrl}")` : 'none',
  '--font-sans': font.family,
} as React.CSSProperties
```

### No flash: the bootstrap script

SSR can't read localStorage. So if a visitor has picked the ink-wash skin, the first paint renders the site's default skin and only switches after hydration.

The fix is a blocking script in `<head>` that writes the visitor's preference into `document.documentElement` before first paint:

```js
var vsid = (vs && d.skins[vs]) ? vs : null;   // visitor override, and it must be a valid id
var sid  = vsid || d.siteSkinId;
r.setAttribute('data-skin', sid);
if (vsid && s) { for (var k in s.v) r.style.setProperty(k, s.v[k]); }
```

Note that `if (vsid && s)` guard — it's the first pitfall I hit with this system. See section 4.

## 2. Four decisions when replicating the reference

The reference is shuimo-design's shuimo-ui (MIT). My first version was done from memory and came out "not thorough enough". Rebuilding it against the actual source showed the gap wasn't in the colour palette — it was in four matters of *method*.

### Decision 1: card borders use four lines, not border-image

The intuitive approach is `border-image`: give the card an ink-brush frame texture and let it stretch.

But `border-image` scales the four corners by the `slice` value and stretches the four edges. Card sizes here range from square avatar cards to full-width panels, so the brush strokes get badly distorted.

The reference's approach is **one tiled line per edge**, using a 3×3 Grid with four separate elements. I don't need extra DOM — `background-image` supports multiple layers natively:

```ts
// src/styles/shared/card.stylex.ts
backgroundImage: cardTokens.edge,                                    // four layers, supplied by the skin
backgroundPosition: 'top left, bottom left, top left, top right',
backgroundRepeat: 'repeat-x, repeat-x, repeat-y, repeat-y',
backgroundSize: 'auto 5px, auto 5px, 6px auto, 6px auto',
```

The skin only supplies the order of the four images:

```ts
edge: "url('…/ink-line-h.webp'), url('…/ink-line-h.webp'), url('…/ink-line-v.webp'), url('…/ink-line-v.webp')"
```

The line assets are fixed-pixel (horizontal 548×5, vertical 6×548), and each of the four tiles independently — so no aspect ratio distorts them. When `edge` is `none`, none of the four layers draw, and the card is an ordinary card.

One asset detail: the original `crossrange.webp` was designed as a divider for input fields. Its alpha peaks at 70% with a whole-image mean of 20%, which at card scale is just a grey smudge. I made a boosted version with alpha multiplied by 1.75 (peak 100%, non-zero mean 31% → 53% for the horizontal version), and kept the lighter one for heading underlines and slider tracks.

### Decision 2: buttons, on the other hand, *should* use border-image

The opposite of decision 1 — buttons suit `border-image`, because their dimensions are close to the asset's intrinsic ratio (156×45), so the edge stretching is acceptable.

This is exactly what the reference does, and I copied it:

```css
.m-button {
  border: 5px double transparent;
  border-image: url(./assets/border/base.webp) 8;
  background-image: url(./assets/button-mask.svg);   /* seigaiha wave texture */
}
```

The key detail: `border` is only there to reserve the width (`transparent` so a failed image load doesn't produce an ugly border), `border-image`'s `slice` is 8, and `border-image-width` takes its initial value of 1 (i.e. 1 × `border-width` = 5px).

As tokens:

```ts
button: {
  radius: 2, radiusLg: 4,
  borderWidth: 5,
  frame: "url('…/brush-frame.webp') 8",
  texture: "url('…/wave-mask.svg')",
}
```

### Decision 3: the paper goes *over* the painting

The reference's rice-paper container has three layers: base colour → paper texture → mountains. In that order the **paper texture sits above the mountains** (`.m-rice-paper-hover` comes after `.mountains` in the DOM). The mountains show through the translucent paper, and that's what creates the sense of depth of a picture painted on a sheet.

My first version put the paper *under* the background painting. What you get that way is a web page with a wallpaper.

There's a trap here, though: I originally gave the paper layer `mix-blend-mode: multiply`, hoping to keep the paper's light and dark variation. **That's a no-op.** The paper layer lives inside a `position: fixed; z-index: 1` container, and per the CSS compositing spec, an element that creates a stacking context also establishes an **isolated group** — blend modes inside it can only blend with content inside it, never with the page background or the painting outside.

Verified empirically: the same "black base + white layer with multiply" measures RGB(0,0,0) when not isolated, and RGB(255,255,255) once placed in a fixed + z-index container. The reference only uses opacity too, so I switched to a plain overlay.

### Decision 4: corners squared off, shadows almost gone

The reference has exactly two `border-radius` declarations in the whole library (2px on buttons, 5px on dropdown options), and **uses no `box-shadow` at all**. Depth comes from the difference in value between paper and ink, not from lifting things off the page.

As tokens:

```ts
card: {
  radius: 3,        // 40 in the default skin
  radiusLg: 5,      // 64 in the default skin
  blur: 'none',
  shadow: '0 1px 2px -1px rgb(43 51 62 / 10%)',   // just one faint ink edge
  borderWidth: 0,   // borders are handled by edge's four ink lines
}
```

The card fill also needs to be more opaque and lighter than the default skin (`#fbf7ee99` → `#fdfbf6e0`). Too much transparency and the cards blend into the paper background — the whole page turns into one beige mass, and the ink frames lose anything to stand against.

## 3. The cursor: three states, bitmaps, and per-asset hotspot measurement

The reference's cursors are **bitmaps**, not vectors: 32×32 webp, three states (plain brush / cinnabar-dipped / disabled). My first version was a hand-drawn SVG. It was also a calligraphy brush in shape, but it looked nothing like the real thing — the difference is between a drawing of a brush and a brush.

Two technical points:

**Format**: the originals are webp, but Safari doesn't support webp cursors, and Firefox only added it in relatively recent versions. Convert to PNG (at 32×32 the size difference is a few hundred bytes) and it works everywhere.

**Hotspot**: the coordinates in `cursor: url(...) <x> <y>, fallback` mark the brush tip. I measured the topmost-leftmost opaque pixel per asset via the alpha channel:

| Asset | Tip coordinate |
|---|---|
| auto.png | (1, 0) |
| pointer.png | (1, 0) |
| disabled.png | **(0, 0)** |

They're not consistent — I initially wrote `1 0` for all three, which shifted the disabled brush by one pixel.

The tokens are split into three states because interactive elements need the cinnabar-dipped brush, distinct from static areas:

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

With a single `--skin-cursor` variable, buttons get overridden by `cursor: pointer`.

## 4. Pitfalls

### Pitfall 1: the bootstrap script clobbered the owner's custom palette

The site config had the owner's brand colour set to `#de4331`, while the default skin preset is `#35bfab`.

The original bootstrap script looked like this:

```js
var sid = (vs && d.skins[vs]) ? vs : d.siteSkinId;
var s = d.skins[sid] || d.skins[d.siteSkinId];
if (s) { r.setAttribute('data-skin', sid); for (var k in s.t) r.style.setProperty(k, s.t[k]); }
```

When the visitor has **no** override, `sid` resolves to the site skin and `s` to that skin's **preset** — and then the preset's 14 colour variables get written unconditionally into the html inline style, exactly overwriting the owner's custom values that SSR had just injected.

The timeline: SSR injects red → the blocking head script changes it to green → first paint (green, wrong) → the hydration effect changes it back to red. **One flash on every page load.**

The fix is a visitor guard:

```js
var vsid = (vs && d.skins[vs]) ? vs : null;
var sid  = vsid || d.siteSkinId;
r.setAttribute('data-skin', sid);
if (vsid && s) { for (var k in s.v) r.style.setProperty(k, s.v[k]); }   // ← only write when there really is an override
```

With no override, no colour variable is touched, and what SSR injected is correct.

### Pitfall 2: changing the slider track did nothing

For the ink-wash slider I wanted an ink-line track, so I wrote:

```css
[data-skin='shuimo'] .range-track { background: url('…/line-h.webp') repeat-x center / auto 5px; }
```

It still rendered the original brand gradient. The reason: `globals.css` also paints an opaque gradient on `::-webkit-slider-runnable-track` and `::-moz-range-track`, and those pseudo-elements paint **above** the input's own background, covering it entirely.

All three selectors need overriding:

```css
[data-skin='shuimo'] .range-track,
[data-skin='shuimo'] .range-track::-webkit-slider-runnable-track,
[data-skin='shuimo'] .range-track::-moz-range-track {
  background: url('…/line-h.webp') repeat-x center / auto 5px;
}
```

### Pitfall 3: an explicit transition-property list clobbered a component's scale

The ink-wash skin wants slower, softer transitions, so I wrote:

```css
[data-skin='shuimo'] :is(a, button, input, …) {
  transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  transition-duration: 320ms;
}
```

Setting only duration and timing leaves `transition-property` at its initial value of `all` — which, for elements that never declared a transition, amounts to activating a "320ms transition on every property" out of nowhere, with an uncontrollable blast radius. So I switched to an explicit property list:

```css
transition-property: color, background-color, border-color, box-shadow, transform, opacity;
```

And then the mode buttons on the clock page started snapping instead of transitioning — because they use the standalone `scale` property, not `transform`. This rule is unlayered and matches every interactive element, so it **overrides a component's own `transition-property` declaration**; the list therefore has to cover the properties components actually transition:

```css
transition-property: color, background-color, border-color, box-shadow, transform, scale, opacity;
```

### Pitfall 4: displacement headroom for the parallax

The background painting's pointer parallax moves ±8px, and the element fills the viewport. I initially used `transform: translate3d(...) scale(1.02)` for headroom — but `scale` gives headroom proportionally to the viewport, so at 768px tall each side only gets 7.68px, less than the 8px displacement ceiling, and the opposite edge shows a ~0.3px gap when the pointer reaches a corner.

Switched to a fixed-pixel margin: the background layer's `inset` went from `0` to `-12px`, which holds at any viewport size (4px still remaining on the windward side at maximum displacement).

## 5. Shrinking the assets

Along the way the assets grew to 250 KB. After compression: 61 KB.

| Asset | Before | After | Approach |
|---|---|---|---|
| Rice paper texture | 105 KB | 13 KB | downscale to display size + q90 |
| Page paper texture | 55 KB | 21 KB | q90 (retains 91% of texture contrast) |
| Slider thumb | 75 KB | 2 KB | 856×840 → 64×64 (displayed at 20px, 3× headroom) |

Low-contrast assets like paper textures are very sensitive to the quality setting: q65 drops the standard deviation from 2.87 to 1.22 (the texture is essentially gone), while q90 holds it at 2.61. Don't judge this kind of image by file size alone.

## Takeaways

- The point of a theme system isn't "it can change colours" — it's that **tokens have exactly one source of truth**, **visitor preferences don't flash**, and **adding a skin touches few places**
- When replicating a reference, the gap is usually in **method**, not palette. Working from memory gets you the adjectives; it doesn't get you the method
- Most CSS pitfalls share one trait: **the rule is written, it doesn't take effect, and nothing errors**. Distorted `border-image`, backgrounds hidden by pseudo-elements, blend modes inside a stacking context, an overridden `transition-property` — you only find these by actually looking at the rendered result
