# 水墨スキン実装記：拡張可能なスキンシステムと、参考実装をなぞる際の四つの判断

結論から。ブログにスキンシステムを追加した（サイト側がデフォルトを設定し、訪問者が上書きできる）。shuimo-design を参考に水墨スキンも複製した。スキントークン 26 個はすべて CSS カスタムプロパティ経由、水墨の素材は 250 KB から 61 KB に削減、訪問者の設定は `<head>` のブロッキングスクリプトが初回描画前に適用するのでちらつかない。

## 1. スキンシステムの設計

### 目標

- サイト管理者が設定パネルでスキンを既定値として選び、色は個別に微調整できる
- 訪問者は自分でスキンとフォントを選び、サイト設定を上書きできる（localStorage に保存）
- スキンを一つ追加するときの変更点はできるだけ少なく

### 構造

スキン一つにつきディレクトリ一つ、`SkinModule` をエクスポートする。

```ts
// src/skins/<id>/index.ts
export const shuimoSkin: SkinModule = {
  preset: {
    id: 'shuimo',
    nameKey: 'skins.shuimoName',      // 辞書キー。四言語ぶん揃っている
    descriptionKey: 'skins.shuimoDesc',
    theme: { colorBrand: '#a81c2b', /* 14 個の色トークン */ },
    card: { radius: 3, radiusLg: 5, blur: 'none', shadow: '…', borderWidth: 0, edge: '…' },
    button: { radius: 2, radiusLg: 4, borderWidth: 5, frame: '…', texture: '…' },
    defaultFont: 'huiwenmincho',
    backgroundImageId: 'ink-ridges',
    backgroundParallax: true,
  },
  Decor: ShuimoDecor,   // 任意の装飾レイヤー
}
```

新しいスキンの接続点は三か所：`SKIN_IDS`（型の源）、`SKIN_MODULES`（登録表）、そして `globals.css` の `@import` 一行。前の二つがずれると開発時に即エラーになる。

```ts
if (process.env.NODE_ENV !== 'production') {
  const registered = new Set(SKIN_MODULES.map(m => m.preset.id))
  const missing = SKIN_IDS.filter(id => !registered.has(id))
  if (missing.length) console.error(`[skins] 宣言されているが未登録：${missing.join('、')}`)
}
```

逆方向（登録はあるが `SKIN_IDS` にない）は TypeScript が止める。`preset.id` の型が `SkinId` だからだ。

### トークン：マッピング表一つ、消費側三か所

トークンは各地に散らばった魔法の文字列ではなく、マッピング表になっている。

```ts
const CARD_TOKENS: TokenSpec<SkinCardStyle> = {
  radius:      { cssVar: '--skin-card-radius',      toValue: c => `${c.radius}px` },
  edge:        { cssVar: '--skin-card-edge',        toValue: c => c.edge ?? 'none' },
  // …
}
```

この表を三か所が共有する：SSR のインラインスタイル、実行時の `applySkin()`、そしてブロッキングスクリプトのシリアライズ。共有しているのはズレを防ぐためだ。以前 SSR 側は手書きのリストで、`--color-surface-strong` が抜けていた。`as React.CSSProperties` のキャストのせいで TypeScript は欠落を検出できず、管理者がその色を微調整した瞬間に初回描画が既定値に落ちていた。

今は生成している。

```ts
const htmlStyle = {
  ...themeVars(theme),                  // --color-* 14 個
  ...styleVars(skin.card, skin.button), // --skin-* 12 個
  '--skin-bg-image': backgroundUrl ? `url("${backgroundUrl}")` : 'none',
  '--font-sans': font.family,
} as React.CSSProperties
```

### ちらつかせない：ブロッキングスクリプト

SSR は localStorage を読めない。つまり訪問者が水墨スキンを選んでいると、初回描画はサイト既定のスキンで描かれ、hydration 後に切り替わる。

対策は `<head>` に置くブロッキングスクリプトで、初回描画前に訪問者の設定を `document.documentElement` へ書き込む。

```js
var vsid = (vs && d.skins[vs]) ? vs : null;   // 訪問者の上書き。かつ有効な id であること
var sid  = vsid || d.siteSkinId;
r.setAttribute('data-skin', sid);
if (vsid && s) { for (var k in s.v) r.style.setProperty(k, s.v[k]); }
```

この `if (vsid && s)` のガードが、この仕組みで最初に踏んだ落とし穴だ。第 4 節を参照。

## 2. 参考実装をなぞる際の四つの判断

参考は shuimo-design の shuimo-ui（MIT）。初版は記憶だけで作って「徹底されていない」と言われ、その後ソースと突き合わせて作り直した。差は配色ではなく、四つの**作り方**にあった。

### 判断一：カードの枠は border-image ではなく四本の線

最も直感的なのは `border-image` だ。墨の筆致の枠画像をカードに貼り、伸縮させる。

だが `border-image` は四隅を `slice` の値で拡大縮小し、四辺を引き伸ばして埋める。カードの寸法は正方形のアバターカードから全幅のパネルまで幅広く、筆致がひどく歪む。

参考実装のやり方は**一辺につき一本の線を並べる**方式で、3×3 の Grid に四つの独立した要素を置いている。こちらは追加の DOM が要らない。`background-image` がそもそも複数レイヤーに対応している。

```ts
// src/styles/shared/card.stylex.ts
backgroundImage: cardTokens.edge,                                    // 四層。スキンが供給する
backgroundPosition: 'top left, bottom left, top left, top right',
backgroundRepeat: 'repeat-x, repeat-x, repeat-y, repeat-y',
backgroundSize: 'auto 5px, auto 5px, 6px auto, 6px auto',
```

スキン側は四枚の順序を与えるだけ。

```ts
edge: "url('…/ink-line-h.webp'), url('…/ink-line-h.webp'), url('…/ink-line-v.webp'), url('…/ink-line-v.webp')"
```

線の素材は固定ピクセル（横 548×5、縦 6×548）で、四本がそれぞれ独立にタイルされる。だからどんな縦横比でも歪まない。`edge` が `none` のときは四層とも描画されず、通常のカードになる。

素材の細かい話を一つ。元の `crossrange.webp` は入力欄の区切り線用で、alpha のピークは 70%、画像全体の平均は 20%。カードの尺度ではただの灰色の筋になる。そこで alpha を 1.75 倍した濃い版を作った（ピーク 100%、非ゼロ画素の平均は横版で 31%→53%）。薄いほうは見出しの下線とスライダーのトラックに残してある。

### 判断二：ボタンは逆に border-image が適切

判断一の逆で、ボタンは `border-image` に向いている。ボタンの寸法が素材の固有比率（156×45）に近く、四辺の引き伸ばしが許容範囲に収まるからだ。

これはまさに参考実装のやり方で、そのまま踏襲した。

```css
.m-button {
  border: 5px double transparent;
  border-image: url(./assets/border/base.webp) 8;
  background-image: url(./assets/button-mask.svg);   /* 青海波の地紋 */
}
```

要点は、`border` は幅を確保するためだけにあり（`transparent` なので画像の読み込みに失敗しても醜い枠が出ない）、`border-image` の `slice` が 8、`border-image-width` は初期値の 1（つまり 1 × `border-width` = 5px）だということ。

トークンに落とすとこうなる。

```ts
button: {
  radius: 2, radiusLg: 4,
  borderWidth: 5,
  frame: "url('…/brush-frame.webp') 8",
  texture: "url('…/wave-mask.svg')",
}
```

### 判断三：紙は絵の**上**に被せる

参考実装の宣紙コンテナは三層：下地色 → 紙のテクスチャ → 遠山。この順序で、**紙のテクスチャは遠山より上**にある（DOM でも `.m-rice-paper-hover` が `.mountains` の後ろ）。遠山が半透明の紙を通して見えるから、「紙に描いた絵」という奥行きが生まれる。

初版は紙を背景画の**下**に敷いていた。それで出来るのは、壁紙を貼ったウェブページだ。

ただしここに罠がある。紙の層に `mix-blend-mode: multiply` を指定して、紙の明暗の起伏を残そうとしていた。**これは無効**だ。紙の層は `position: fixed; z-index: 1` のコンテナの中にあり、CSS 合成の仕様では、スタッキングコンテキストを作る要素は同時に**隔離グループ**を形成する。グループ内のブレンドモードはグループ内の内容としか混ざれず、外側のページ下地や背景画には一切作用しない。

実測で確認した。同じ「黒地 + 白層 multiply」が、非隔離では RGB(0,0,0)、fixed + z-index のコンテナに入れると RGB(255,255,255) になる。参考実装も opacity しか使っていないので、素直な重ね合わせに変更した。

### 判断四：角丸はほぼ直角、影はほぼ無し

参考実装には `border-radius` が全体で二か所しかない（ボタンの 2px、ドロップダウン項目の 5px）。そして**プロジェクト全体で `box-shadow` を使っていない**。奥行きは紙と墨の濃淡の差で作る。影で浮かせるのではない。

トークンにするとこう。

```ts
card: {
  radius: 3,        // 既定スキンは 40
  radiusLg: 5,      // 既定スキンは 64
  blur: 'none',
  shadow: '0 1px 2px -1px rgb(43 51 62 / 10%)',   // 縁に沿った淡い墨を一つだけ
  borderWidth: 0,   // 枠は edge の四本の墨線が担う
}
```

カードの下地も既定スキンより不透明で明るくする必要がある（`#fbf7ee99` → `#fdfbf6e0`）。透明度が高いとカードが背景の宣紙色と混ざり、ページ全体が一つのベージュの塊になって、墨の枠も引き立てる相手を失う。

## 3. カーソル：三状態、ビットマップ、素材ごとのホットスポット実測

参考のカーソルは**ビットマップ**であってベクタではない。32×32 の webp で三状態（素の筆 / 朱を蘸した筆 / 無効）。初版は手描きの SVG だった。形の上では同じ筆だが、実物とはまるで似ていない。違いは「筆を描いた絵」と「筆そのもの」だ。

技術的な点が二つ。

**形式**：元素材は webp だが、Safari は webp カーソルに対応しておらず、Firefox も比較的新しいバージョンからだ。PNG に変換すれば（32×32 ならサイズ差は数百バイト）全プラットフォームで動く。

**ホットスポット**：`cursor: url(...) <x> <y>, fallback` の座標は筆先の位置だ。alpha チャンネルから、最も左上の不透明画素を素材ごとに実測した。

| 素材 | 筆先の座標 |
|---|---|
| auto.png | (1, 0) |
| pointer.png | (1, 0) |
| disabled.png | **(0, 0)** |

三つは揃っていない。最初は三つとも `1 0` と書いていて、disabled の筆だけ 1 ピクセルずれていた。

トークンも三状態に分けている。操作可能な要素は「朱を蘸した筆」に差し替え、静的な領域と区別するためだ。

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

`--skin-cursor` 一つだけだと、ボタンは `cursor: pointer` に上書きされてしまう。

## 4. 落とし穴の記録

### 落とし穴一：ブロッキングスクリプトが管理者の設定した配色を上書きした

サイト設定で管理者はブランド色を `#de4331` にしていた。既定スキンのプリセットは `#35bfab` だ。

元のブロッキングスクリプトはこうだった。

```js
var sid = (vs && d.skins[vs]) ? vs : d.siteSkinId;
var s = d.skins[sid] || d.skins[d.siteSkinId];
if (s) { r.setAttribute('data-skin', sid); for (var k in s.t) r.style.setProperty(k, s.t[k]); }
```

訪問者の上書きが**無い**とき、`sid` はサイトのスキン、`s` はそのスキンの**プリセット**になる。そしてプリセットの色変数 14 個を無条件で html のインラインスタイルに書き込む。SSR が今しがた注入した管理者の設定値は、まさにそれで上書きされる。

時系列：SSR が赤を注入 → head のブロッキングスクリプトが緑に変更 → 初回描画（緑、誤り）→ hydration 後の effect が赤に戻す。**ページを読み込むたびに一フレームちらつく。**

修正は訪問者ガードを足すこと。

```js
var vsid = (vs && d.skins[vs]) ? vs : null;
var sid  = vsid || d.siteSkinId;
r.setAttribute('data-skin', sid);
if (vsid && s) { for (var k in s.v) r.style.setProperty(k, s.v[k]); }   // ← 本当に上書きがあるときだけ書く
```

上書きが無ければ色変数には一切触れず、SSR が注入した値がそのまま正しい。

### 落とし穴二：スライダーのトラックを変えても効かなかった

水墨スキンのスライダーを墨線のトラックにしたくて、こう書いた。

```css
[data-skin='shuimo'] .range-track { background: url('…/line-h.webp') repeat-x center / auto 5px; }
```

実際には元のブランド色グラデーションのまま描画された。理由は `globals.css` が `::-webkit-slider-runnable-track` と `::-moz-range-track` にも不透明なグラデーションを敷いており、これらの疑似要素は input 自身の背景の**上**に描画されて、それを完全に覆い隠すからだ。

三つのセレクタすべてを上書きする必要がある。

```css
[data-skin='shuimo'] .range-track,
[data-skin='shuimo'] .range-track::-webkit-slider-runnable-track,
[data-skin='shuimo'] .range-track::-moz-range-track {
  background: url('…/line-h.webp') repeat-x center / auto 5px;
}
```

### 落とし穴三：transition-property を明示したらコンポーネントの scale を潰した

水墨スキンはトランジションを「遅く柔らかく」したいので、こう書いた。

```css
[data-skin='shuimo'] :is(a, button, input, …) {
  transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  transition-duration: 320ms;
}
```

duration と timing だけを指定すると `transition-property` は初期値の `all` のままになる。つまりトランジションを宣言していない要素に対して、唐突に「全プロパティ 320ms のトランジション」を有効化してしまい、影響範囲が制御できない。そこでプロパティを明示する形に変えた。

```css
transition-property: color, background-color, border-color, box-shadow, transform, opacity;
```

すると今度は時計ページのモードボタンがパッと切り替わるようになった。独立した `scale` プロパティを使っており、`transform` ではないからだ。このルールはレイヤー無しで全ての操作要素に一致するので、**コンポーネント自身が宣言した `transition-property` を上書きする**。したがってリストはコンポーネントが実際にトランジションさせるプロパティを網羅していなければならない。

```css
transition-property: color, background-color, border-color, box-shadow, transform, scale, opacity;
```

### 落とし穴四：視差の移動余白

背景画のポインタ視差は ±8px で、要素はビューポートを覆っている。最初は `transform: translate3d(...) scale(1.02)` で余白を取っていたが、`scale` はビューポートの寸法に比例してしか余白を与えない。高さ 768px では片側 7.68px しかなく、移動の上限 8px を下回る。ポインタが隅に来ると反対側に約 0.3px の隙間が出る。

固定ピクセルの余白に変更した。背景レイヤーの `inset` を `0` から `-12px` にしただけで、どんなビューポートでも足りる（最大移動時でも風上側に 4px 残る）。

## 5. 素材の削減

途中で素材は 250 KB まで膨らんだ。圧縮後は 61 KB。

| 素材 | 前 | 後 | 方法 |
|---|---|---|---|
| 宣紙テクスチャ | 105 KB | 13 KB | 表示サイズまで縮小 + q90 |
| ページの紙テクスチャ | 55 KB | 21 KB | q90（テクスチャのコントラストを 91% 保持） |
| スライダーのつまみ | 75 KB | 2 KB | 856×840 → 64×64（表示は 20px、3 倍の余裕） |

紙のテクスチャのような低コントラストの素材は品質パラメータに非常に敏感だ。q65 では標準偏差が 2.87 から 1.22 に落ちる（テクスチャはほぼ消える）。q90 なら 2.61 を保てる。この種の画像はファイルサイズだけで判断してはいけない。

## まとめ

- スキンシステムの要点は「色を変えられる」ことではない。**トークンの出所が一つ**であること、**訪問者の設定がちらつかない**こと、**スキン追加の変更点が少ない**ことだ
- 参考をなぞるとき、差はたいてい配色ではなく**作り方**にある。記憶で作ると形容詞は複製できても、方法は複製できない
- CSS の落とし穴は共通の特徴を持つ。**ルールは書いてあり、効いておらず、エラーも出ない**。`border-image` の歪み、疑似要素に覆われた背景、スタッキングコンテキスト内のブレンドモード、上書きされた `transition-property` —— これらは実際に描画結果を見て初めて見つかる
