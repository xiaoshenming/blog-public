오늘 나를 흥분시는 라이브러리를 발견했습니다: [@chenglou/pretext](https://github.com/chenglou/pretext).

chenlou는 React의 핵심 기여자로, React Motion, Reason 언어를 개발했습니다. 이번에는 DOM을 사용하지 않고 텍스트 레이아웃을 정확하게 계산하는 더 깊은 수준의 기술을 만들었습니다.

위의 어두운 영역은 pretext의 실시간 시연입니다. 한 마리 용이 화면 위를 움직이며, 중국어 글자들이 용의 몸 주위에서 실시간으로 흐릅니다. **마우스를 움직여 용을 이동시키고, 마우스를 누르면 불을 분사**합니다. 텍스트는 용과 불꽃을 피해 순식간에 재배치되며, 전체 과정에서 DOM 측정이 전혀 없고 순수한 산술 계산으로 60fps의 부드러운 속도로 작동합니다.

## 이는 어떤 문제를 해결했나요?

웹에서 텍스트의 높이나 줄 바꿈 위치를 알아내는 유일한 방법은 브라우저에게 물어보는 것입니다. 그러나 브라우저의 응답은 매번 **동기화 레이아웃 재배치**를 유발합니다—페이지上 모든 요소의 위치를 다시 계산하는 것입니다.

텍스트 블록을 측정하려면 한 번 재배치가 필요합니다. 500개를 측정하려면 500번의 재배치가 필요합니다. 이것이 바로 "레이아웃 충돌"이며, Chrome DevTools에서 보이는 화난 빨간 선이 바로 그것입니다.

pretext의 아이디어는 매우 간단하고 뛰어납니다: DOM 측정을 Canvas의 `measureText`로 대체하는 것입니다. Canvas의 측정은 같은 글꼴 엔진을 사용하므로 결과는 동일하지만, 글꼴 엔진은 레이아웃 트리에 포함되지 않기 때문에 **재배치 비용이 전혀 없습니다**.

## 핵심 API

```ts
import { prepare, layout } from '@chenglou/pretext'

// 첫 번째 단계：준비 (각 단어를 측정하고 캐시 너비 설정)
const prepared = prepare('당신의 텍스트 내용', '16px sans-serif')

// 두 번째 단계：레이아웃 (순수 산술, DOM 없음)
const { height, lineCount } = layout(prepared, containerWidth, lineHeight)
// 매우 간단합니다. height와 lineCount는 정확한 값입니다.
```

`prepare()`는 약 19ms(500개의 텍스트 배치), `layout()`는 약 0.05ms(동일한 배치). DOM 측정 대비 15-30ms와 비교할 때, 이는 **300-600배**의 향상입니다.

## 더 강력한 사용법

```ts
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const prepared = prepareWithSegments(text, font)

// 행별 레이아웃——각 행에 다른 너비를 지정할 수 있습니다!
let cursor = { segmentIndex: 0, graphemeIndex: 0 }
while (true) {
  const line = layoutNextLine(prepared, cursor, currentLineWidth)
  if (!line) break
  // line.text, line.width — 이 행의 내용과 너비
  cursor = line.end
}
```

`layoutNextLine`이 핵심인데, 이를 통해 각 줄에 다른 너비를 설정할 수 있습니다. 이는 위에서 보여주는 중문이 구체 주위를 감싸는 원리입니다: 각 줄은 먼저 구체가 가리는 수평 영역을 계산하고, 남은 너비는 `layoutNextLine`에 전달되며, 텍스트는 자연스럽게 구체의 양쪽으로 흘러나갑니다.

## CSS가 할 수 없는 것들?

1. **텍스트가 어떤 형태로든 감싸짐** — CSS Shapes는 부동 요소만 지원하며 한쪽으로만 감싸질 수 있습니다. pretext는 양쪽으로 동시에 감싸질 수 있으며, 장애물은 어떤 형태든 될 수 있고 애니메이션도 가능합니다.

2. **대화창을 간단하게 포장함** — CSS의 `fit-content`는 다중 줄 텍스트에 항상 빈 공간을 남겨둡니다. pretext는 이진 검색을 사용하여 행 수를 유지하면서 가장 좁은 너비를 찾습니다.

3. **가상 목록 정확한 높이** — 렌더링 없이도 각 메시지의 정확한 높이를 알 수 있어 완벽한 가상화가 가능하며 시각적 불안정이 없습니다.

4. **여러 열 텍스트 흐름** — 왼쪽 열이 가득 차면 커서가 부드럽게 오른쪽 열로 넘어갑니다. 신문 및 잡지의排版 효과가 웹에서도 이제 실현됩니다.

## 다국어 지원

pretext는 `Intl.Segmenter`를 통해 모든 복잡한 스크립트를 지원합니다:

- CJK(중일한) 문자별 줄바꿈 및 금지 처리
- 아랍어 RTL 텍스트
- 태국어, 미얀마어 등 공백 없이 단어로 분리되는 언어
- Emoji ZWJ 시퀀스

## 설치

```bash
npm install @chenglou/pretext
```

15KB, 의존성 없음, ESM. 그냥 이렇게.

## 제 느낌

editorial-engine의 데모를 보았을 때, 정말 놀랐습니다—빛나는 구체가 페이지 위에 떠 있고, 글자가 물처럼 그 주위를 따라 흐르는 모습이었습니다. 60fps로, 각 프레임의 레이아웃 계산에 0.5ms도 걸리지 않았습니다. 이는 CSS가 할 수 있는 일이 아닙니다.

첸루오는 15KB의 라이브러리를 사용하여, 30년 동안 브라우저의 텍스트 측정 문제를 극복했습니다. 새로운 브라우저 API가 필요 없고, 표준화된 프로세스도 필요하지 않습니다. 단지 수학, 캐시 측정, 그리고 한 가지 대담한 아이디어입니다: **DOM을 더 이상 사용하지 않는다면 어떻게 될까요?**

> 15킬로바이트. 의존성 없음. DOM 읽기 없음. 그리고 글자가 흐릅니다.
