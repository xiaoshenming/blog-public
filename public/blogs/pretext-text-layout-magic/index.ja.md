今日、私を興奮させるライブラリを発見しました：[@chenglou/pretext](https://github.com/chenglou/pretext)。

陈楼（chenglou）はReactの核心的な貢献者であり、React MotionやReason言語を作成しています。今回、彼はより根本的な技術を開発しました——**DOMを通じずにテキストのレイアウトを正確に計算する**方法です。

上の暗い領域は pretextのリアルタイムデモンストレーションです。一匹の龍が画面内を動き回り、中国語の文字が龍の体の周りでリアルタイムに流れます。**マウスを動かすと龍が飛び、マウスを押し続けると火が噴出**——文字は瞬時に龍や火から避け、再配置され、全過程でDOMの測定がなく、純粋な算術計算が行われ、60fpsで滑らかな動作が可能です。

## それはどのような問題を解決したのでしょうか？

Web上でテキストの高さや改行位置を知るには、ブラウザに尋ねるしかない。しかしブラウザが回答するたびに**同期レイアウトの再配置**が発生し、ページ上のすべての要素の位置が再計算される。

テキストブロックのサイズを測定する？一度再配置する。500個を測定する？500回再配置する。これが「レイアウトの振動」であり、Chrome DevToolsに見える怒った赤い線もそれだ。

pretextのアイデアはシンプルで賢明：DOM測定の代わりにCanvasの`measureText`を使用する。Canvasの測定は同じフォントエンジンを使用するため結果は同じだが、レイアウトツリーには含まれないため**再配置のコストがない**。

## 核心 API

```ts
import { prepare, layout } from '@chenglou/pretext'

// 第一步：準備（各単語を測定し、キャッシュ幅を設定）
const prepared = prepare('你的文本内容', '16px sans-serif')

// 第二步：レイアウト（純粋な算数、DOM不要）
const { height, lineCount } = layout(prepared, containerWidth, lineHeight)
// ただそれだけ。height と lineCount は正確な値です。
```

`prepare()` は約 19ms（500 回のテキスト処理）、`layout()` は約 0.05ms（同じ処理回数）。DOMで測定される 15-30ms と比べて、これは **300-600 倍**の改善です。

## より強力な使い方

```ts
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const prepared = prepareWithSegments(text, font)

// 行ごとレイアウト——各行に異なる幅を設定できます！
let cursor = { segmentIndex: 0, graphemeIndex: 0 }
while (true) {
  const line = layoutNextLine(prepared, cursor, currentLineWidth)
  if (!line) break
  // line.text, line.width — この行の内容と幅
  cursor = line.end
}
```

`layoutNextLine` は重要な機能であり、各行に異なる幅を設定できる。これが上のデモで文字が球体の周りを囲む原理である：各行はまず球体によって隠される水平領域を計算し、残った幅を `layoutNextLine` に渡すことで、文字が自然に球体の両側に流れる。

## CSSではできないこと

1. **文字を任意の形状に囲む** — CSS Shapesは浮動要素のみをサポートし、片側のみの囲みが可能である。pretextは両側同時の囲みが可能で、障害物は任意の形状であり、アニメーションも可能である。

2. **テキストをコンパクトに包装する** — CSSの`fit-content`は多行テキストに対して常に余白が生じる。pretextは二項探索を用いて行数を変えずに最も狭い幅を求める。

3. **仮想リストの正確な高さ** — レンダーリングなしで各メッセージの正確な高さがわかります。完璧な仮想化で、視覚的な揺れが一切ありません。

4. **複数列のテキスト流れ** — 左列が満杯になったら、カーソルはシームレスに右列に渡され続けます。新聞や雑誌のレイアウト効果が、Web上でついに実現しました。

## 多言語対応

pretextは `Intl.Segmenter` を通じてすべての複雑なスクリプトをサポートします：

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

editorial-engineのデモを見たとき、本当に驚きました——発光する球体がページ上に浮かび、文字が水のようにそれらを取り巻くように流れます。60fpsで、各フレームのレイアウト計算に0.5msもかかりません。これはCSSでは実現不可能なことです。

陈楼は15KBのライブラリを使って、30年間続くブラウザのテキスト測定の障壁を突破しました。新しいブラウザAPIや標準化されたプロセスは必要ありません。それは数学、キャッシュ測定、そして大胆なアイデアです：**DOMを考えるのをやめればどうなるか？**

> 15キロバイト。依存関係なし。DOMの読み取りなし。そしてテキストは流れる。
