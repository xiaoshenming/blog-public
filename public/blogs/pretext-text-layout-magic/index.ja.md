今日、私を興奮させるライブラリを発見しました：[@chenglou/pretext](https://github.com/chenglou/pretext)。

陈楼（chenglou）はReactの核心的な貢献者であり、React MotionやReason言語を作成しています。今回、彼はより根本的な技術を開発しました——**DOMを通じずにテキストのレイアウトを正確に計算する方法**。

上の暗い領域は pretextのリアルタイムデモンストレーションです。一匹の龍が画面内を動き回り、中国語のテキストが龍の体の周りでリアルタイムに流れます。**マウスを動かすと龍が飛び、マウスを押し続けると火が噴出**——テキストは瞬時に龍や火から避け、再配置され、全過程でDOMの測定がなく、純粋な算数計算が行われ、60fpsで滑らかな動作が実現されます。

## それはどのような問題を解決したのでしょうか？

Web上でテキストの高さや改行位置を知るには、ブラウザに尋ねるしかない。しかしブラウザが回答するたびに**同期レイアウトの再配置**が起こり、ページ上のすべての要素の位置が再計算される。

テキストブロックのサイズを測定する？一度再配置する。五百個を測定する？五百回再配置する。これが「レイアウトの揺れ」であり、Chrome DevToolsに見える怒った赤い線もこれによるものだ。

pretextのアイデアはシンプルで賢明だ：DOM測定をCanvasの`measureText`に置き換える。Canvasの測定は同じフォントエンジンを使用するため結果は同じだが、レイアウトツリーには含まれないため**再配置のコストがない**。

## 核心 API

```ts
import { prepare, layout } from '@chenglou/pretext'

// 第一ステップ：準備（各文字を測定し、キャッシュ幅を設定）
const prepared = prepare('你的文本内容', '16px sans-serif')

// 第二ステップ：レイアウト（純粋な算数、DOM不要）
const { height, lineCount } = layout(prepared, containerWidth, lineHeight)
// これだけです。height と lineCount は正確な値です。
```

`prepare()` は約 19ms（500 回のテキストバッチ）、`layout()` は約 0.05ms（同じバッチ）。DOM での測定が 15-30ms であることを考えると、これは **300-600 倍**の改善です。

## より強力な使い方

```ts
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const prepared = prepareWithSegments(text, font)

// 行ごとのレイアウト——各行に異なる幅を設定できます！
let cursor = { segmentIndex: 0, graphemeIndex: 0 }
while (true) {
  const line = layoutNextLine(prepared, cursor, currentLineWidth)
  if (!line) break
  // line.text, line.width — この行の内容と幅
  cursor = line.end
}
```

`layoutNextLine` は重要な機能です——これにより各行に異なる幅を設定できます。これが上のデモで文字が球体の周りに配置される原理です：各行はまず、球体によって隠される水平範囲を計算し、残った幅を `layoutNextLine` に渡します。そうすると文字が自然に球体の両側に流れます。

## それはCSSができないことですか？

文字を任意の形状に囲む — CSS Shapesは浮動要素のみをサポートし、片側のみの囲みが可能です。pretextは両側同時の囲みが可能で、障害物は任意の形状であり、アニメーションも実現できます。

2. **聊天气泡紧凑包装** — CSSの`fit-content`は複数行のテキストに対して常に余白を残す。pretextは二項探索を用いて、行数を変えないようにする最も狭い幅を求める。

3. **仮想リストの正確な高さ** — レンダーリングなしで各メッセージの正確な高さがわかる、完璧な仮想化、視覚的な揺れがない。

4. **複数列のテキスト流れ** — 左列が満杯になったら、カーソルがシームレスに右列に渡る。新聞や雑誌のレイアウト効果が、Web上でついに実現された。

## 多言語対応

pretextは `Intl.Segmenter` を通じてすべての複雑なスクリプトをサポートする：

- CJK（中日韩）の文字間改行と禁止処理
- アラビア語 RTL テキスト
- タイ語、ビルマ語などのスペースのない分詞言語
- Emoji ZWJ シーケンス

## インストール

```bash
npm install @chenglou/pretext
```

15KB、依存性なし、ESM。以上。

## 私の感想

editorial-engineのデモを見たとき、本当に驚きました——発光する球体がページ上に浮かび、文字が水のようにそれらを取り囲むように流れます。60fpsで、各フレームのレイアウト計算に0.5msもかかりません。これはCSSでは成し遂げられないことです。

陈楼は15KBのライブラリを使って、30年間続くブラウザのテキスト測定の障壁を突破しました。新しいブラウザAPIは必要なく、標準化されたプロセスも不要です。それは数学、キャッシュ測定、そして大胆なアイデアです：**DOMを考えるのをやめればどうなるか？**

> 15キロバイト。依存関係なし。DOMの読み取りなし。そしてテキストは流れる。
