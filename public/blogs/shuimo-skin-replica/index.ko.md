# 수묵 스킨 구현기: 확장 가능한 스킨 시스템과 참고 구현을 따라갈 때의 네 가지 판단

결론부터. 블로그에 스킨 시스템을 붙였다(사이트 관리자가 기본값을 정하고, 방문자가 덮어쓸 수 있다). shuimo-design을 참고해 수묵 스킨도 복제했다. 스킨 토큰 26개는 모두 CSS 커스텀 프로퍼티를 거치고, 수묵 소재는 250KB에서 61KB로 줄었으며, 방문자 설정은 `<head>`의 블로킹 스크립트가 첫 페인트 전에 적용하므로 깜빡이지 않는다.

## 1. 스킨 시스템 설계

### 목표

- 사이트 관리자가 설정 패널에서 스킨을 기본값으로 고르고, 색은 개별적으로 미세 조정할 수 있다
- 방문자가 직접 스킨과 글꼴을 골라 사이트 설정을 덮어쓸 수 있다(localStorage에 저장)
- 스킨을 하나 추가할 때 변경 지점은 최대한 적게

### 구조

스킨 하나당 디렉터리 하나, `SkinModule`을 내보낸다.

```ts
// src/skins/<id>/index.ts
export const shuimoSkin: SkinModule = {
  preset: {
    id: 'shuimo',
    nameKey: 'skins.shuimoName',      // 사전 키. 네 언어 모두 준비되어 있다
    descriptionKey: 'skins.shuimoDesc',
    theme: { colorBrand: '#a81c2b', /* 색 토큰 14개 */ },
    card: { radius: 3, radiusLg: 5, blur: 'none', shadow: '…', borderWidth: 0, edge: '…' },
    button: { radius: 2, radiusLg: 4, borderWidth: 5, frame: '…', texture: '…' },
    defaultFont: 'huiwenmincho',
    backgroundImageId: 'ink-ridges',
    backgroundParallax: true,
  },
  Decor: ShuimoDecor,   // 선택적 장식 레이어
}
```

새 스킨의 연결 지점은 세 곳: `SKIN_IDS`(타입 원천), `SKIN_MODULES`(등록표), 그리고 `globals.css`의 `@import` 한 줄. 앞의 둘이 어긋나면 개발 중에 바로 오류가 난다.

```ts
if (process.env.NODE_ENV !== 'production') {
  const registered = new Set(SKIN_MODULES.map(m => m.preset.id))
  const missing = SKIN_IDS.filter(id => !registered.has(id))
  if (missing.length) console.error(`[skins] 선언되었지만 미등록：${missing.join('、')}`)
}
```

반대 방향(등록은 됐지만 `SKIN_IDS`에 없음)은 TypeScript가 막는다. `preset.id`의 타입이 `SkinId`이기 때문이다.

### 토큰: 매핑 표 하나, 소비 지점 세 곳

토큰은 여기저기 흩어진 마법 문자열이 아니라 매핑 표다.

```ts
const CARD_TOKENS: TokenSpec<SkinCardStyle> = {
  radius:      { cssVar: '--skin-card-radius',      toValue: c => `${c.radius}px` },
  edge:        { cssVar: '--skin-card-edge',        toValue: c => c.edge ?? 'none' },
  // …
}
```

이 표를 세 곳이 공유한다: SSR 인라인 스타일, 런타임 `applySkin()`, 그리고 블로킹 스크립트의 직렬화. 공유하는 이유는 어긋남을 막기 위해서다. 예전에 SSR 쪽은 손으로 옮긴 목록이었고 `--color-surface-strong`이 빠져 있었다. `as React.CSSProperties` 캐스트 때문에 TypeScript가 누락을 잡지 못했고, 관리자가 그 색을 미세 조정하는 순간 첫 페인트가 기본값으로 떨어졌다.

지금은 생성한다.

```ts
const htmlStyle = {
  ...themeVars(theme),                  // --color-* 14개
  ...styleVars(skin.card, skin.button), // --skin-* 12개
  '--skin-bg-image': backgroundUrl ? `url("${backgroundUrl}")` : 'none',
  '--font-sans': font.family,
} as React.CSSProperties
```

### 깜빡이지 않게: 블로킹 스크립트

SSR은 localStorage를 읽을 수 없다. 즉 방문자가 수묵 스킨을 골라 두면 첫 페인트는 사이트 기본 스킨으로 그려지고 hydration 이후에 바뀐다.

해법은 `<head>`에 넣는 블로킹 스크립트다. 첫 페인트 전에 방문자 설정을 `document.documentElement`에 써 넣는다.

```js
var vsid = (vs && d.skins[vs]) ? vs : null;   // 방문자 덮어쓰기. 게다가 유효한 id여야 한다
var sid  = vsid || d.siteSkinId;
r.setAttribute('data-skin', sid);
if (vsid && s) { for (var k in s.v) r.style.setProperty(k, s.v[k]); }
```

이 `if (vsid && s)` 가드가 이 구조에서 처음 밟은 함정이다. 4절을 보라.

## 2. 참고 구현을 따라갈 때의 네 가지 판단

참고는 shuimo-design의 shuimo-ui(MIT). 첫 버전은 기억만으로 만들어 "철저하지 않다"는 말을 들었고, 이후 소스와 맞춰보며 다시 만들었다. 차이는 배색이 아니라 네 가지 **만드는 방식**에 있었다.

### 판단 1: 카드 테두리는 border-image가 아니라 네 개의 선

가장 직관적인 방법은 `border-image`다. 먹 붓질 프레임 이미지를 카드에 붙여 늘리는 것.

하지만 `border-image`는 네 모서리를 `slice` 값으로 확대·축소하고 네 변을 늘려 채운다. 카드 크기는 정사각형 아바타 카드부터 전체 폭 패널까지 편차가 커서 붓질이 심하게 왜곡된다.

참고 구현의 방식은 **한 변에 선 하나씩 타일링**하는 것이다. 3×3 Grid에 네 개의 독립 요소를 둔다. 이쪽은 추가 DOM이 필요 없다. `background-image`가 원래 여러 레이어를 지원한다.

```ts
// src/styles/shared/card.stylex.ts
backgroundImage: cardTokens.edge,                                    // 네 겹. 스킨이 공급한다
backgroundPosition: 'top left, bottom left, top left, top right',
backgroundRepeat: 'repeat-x, repeat-x, repeat-y, repeat-y',
backgroundSize: 'auto 5px, auto 5px, 6px auto, 6px auto',
```

스킨 쪽은 네 장의 순서만 주면 된다.

```ts
edge: "url('…/ink-line-h.webp'), url('…/ink-line-h.webp'), url('…/ink-line-v.webp'), url('…/ink-line-v.webp')"
```

선 소재는 고정 픽셀(가로 548×5, 세로 6×548)이고 네 개가 각각 독립적으로 타일링된다. 그래서 어떤 종횡비에서도 왜곡되지 않는다. `edge`가 `none`이면 네 겹 모두 그려지지 않고 평범한 카드가 된다.

소재에 관한 자잘한 이야기 하나. 원래 `crossrange.webp`는 입력 필드 구분선용이라 alpha 최댓값이 70%, 이미지 전체 평균이 20%다. 카드 크기에서는 그냥 회색 얼룩이다. 그래서 alpha를 1.75배로 진하게 만든 버전을 썼다(최댓값 100%, 비영(非零) 픽셀 평균은 가로판 기준 31%→53%). 옅은 쪽은 제목 밑줄과 슬라이더 트랙에 남겼다.

### 판단 2: 버튼은 반대로 border-image가 맞다

판단 1의 반대다. 버튼은 `border-image`에 적합하다. 버튼 크기가 소재의 고유 비율(156×45)에 가까워 네 변의 늘어남이 허용 범위에 들어오기 때문이다.

이것이 바로 참고 구현의 방식이고 그대로 따랐다.

```css
.m-button {
  border: 5px double transparent;
  border-image: url(./assets/border/base.webp) 8;
  background-image: url(./assets/button-mask.svg);   /* 청해파 문양 */
}
```

요점은 `border`가 폭을 확보하기 위해서만 존재하고(`transparent`라 이미지 로드가 실패해도 못생긴 테두리가 나오지 않는다), `border-image`의 `slice`가 8이며, `border-image-width`는 초깃값 1(즉 1 × `border-width` = 5px)이라는 것이다.

토큰으로 옮기면 이렇게 된다.

```ts
button: {
  radius: 2, radiusLg: 4,
  borderWidth: 5,
  frame: "url('…/brush-frame.webp') 8",
  texture: "url('…/wave-mask.svg')",
}
```

### 판단 3: 종이는 그림 **위에** 덮는다

참고 구현의 화선지 컨테이너는 세 겹이다: 바탕색 → 종이 질감 → 먼 산. 이 순서에서 **종이 질감은 먼 산보다 위**에 있다(DOM에서도 `.m-rice-paper-hover`가 `.mountains` 뒤에 온다). 먼 산이 반투명한 종이 너머로 보이기에 "종이에 그린 그림"이라는 깊이가 생긴다.

첫 버전은 종이를 배경화 **아래**에 깔았다. 그렇게 나오는 것은 벽지를 붙인 웹페이지다.

다만 여기에 함정이 있다. 종이 레이어에 `mix-blend-mode: multiply`를 줘서 종이의 명암 기복을 남기려 했다. **이것은 무효다.** 종이 레이어는 `position: fixed; z-index: 1` 컨테이너 안에 있고, CSS 합성 명세에 따르면 스태킹 컨텍스트를 만드는 요소는 동시에 **격리 그룹**을 형성한다. 그룹 안의 블렌드 모드는 그룹 안의 내용과만 섞일 수 있고, 바깥의 페이지 바탕이나 배경화에는 전혀 작용하지 않는다.

실측으로 확인했다. 같은 "검은 바탕 + 흰 레이어 multiply"가 비격리에서는 RGB(0,0,0), fixed + z-index 컨테이너에 넣으면 RGB(255,255,255)로 측정된다. 참고 구현도 opacity만 쓰므로 솔직한 겹치기로 바꿨다.

### 판단 4: 모서리는 거의 직각, 그림자는 거의 없앰

참고 구현에는 `border-radius`가 전체에서 두 곳뿐이다(버튼 2px, 드롭다운 항목 5px). 그리고 **프로젝트 전체가 `box-shadow`를 쓰지 않는다**. 깊이는 종이와 먹의 농담 차이로 만든다. 그림자로 띄우는 게 아니다.

토큰으로 옮기면 이렇다.

```ts
card: {
  radius: 3,        // 기본 스킨은 40
  radiusLg: 5,      // 기본 스킨은 64
  blur: 'none',
  shadow: '0 1px 2px -1px rgb(43 51 62 / 10%)',   // 가장자리를 따라 옅은 먹 하나만
  borderWidth: 0,   // 테두리는 edge의 네 먹선이 맡는다
}
```

카드 바탕색도 기본 스킨보다 불투명하고 밝아야 한다(`#fbf7ee99` → `#fdfbf6e0`). 투명도가 높으면 카드가 배경의 화선지색과 섞여 페이지 전체가 하나의 베이지 덩어리가 되고, 먹 테두리도 대비시킬 상대를 잃는다.

## 3. 커서: 세 가지 상태, 비트맵, 소재별 핫스팟 실측

참고의 커서는 **비트맵**이지 벡터가 아니다. 32×32 webp에 세 가지 상태(맨 붓 / 주사 묻힌 붓 / 비활성). 첫 버전은 손으로 그린 SVG였다. 모양새는 같은 붓이지만 실물과는 전혀 닮지 않았다. 차이는 "붓을 그린 그림"과 "붓 그 자체"다.

기술적인 점 두 가지.

**형식**: 원본은 webp지만 Safari는 webp 커서를 지원하지 않고 Firefox도 비교적 최신 버전부터다. PNG로 변환하면(32×32에서 크기 차이는 수백 바이트) 모든 플랫폼에서 동작한다.

**핫스팟**: `cursor: url(...) <x> <y>, fallback`의 좌표는 붓끝 위치다. alpha 채널에서 가장 왼쪽 위의 불투명 픽셀을 소재별로 실측했다.

| 소재 | 붓끝 좌표 |
|---|---|
| auto.png | (1, 0) |
| pointer.png | (1, 0) |
| disabled.png | **(0, 0)** |

셋이 일치하지 않는다. 처음에는 셋 다 `1 0`으로 썼는데 disabled 붓만 1픽셀 어긋났다.

토큰도 세 상태로 나눴다. 상호작용 요소는 "주사 묻힌 붓"으로 바꿔 정적인 영역과 구분하기 위해서다.

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

`--skin-cursor` 하나만 두면 버튼이 `cursor: pointer`에 덮인다.

## 4. 함정 기록

### 함정 1: 블로킹 스크립트가 관리자의 커스텀 배색을 덮어썼다

사이트 설정에서 관리자는 브랜드 색을 `#de4331`로 해 두었다. 기본 스킨 프리셋은 `#35bfab`이다.

원래 블로킹 스크립트는 이랬다.

```js
var sid = (vs && d.skins[vs]) ? vs : d.siteSkinId;
var s = d.skins[sid] || d.skins[d.siteSkinId];
if (s) { r.setAttribute('data-skin', sid); for (var k in s.t) r.style.setProperty(k, s.t[k]); }
```

방문자 덮어쓰기가 **없을** 때, `sid`는 사이트 스킨이 되고 `s`는 그 스킨의 **프리셋**이 된다. 그리고 프리셋의 색 변수 14개를 무조건 html 인라인 스타일에 써 넣는다. SSR이 방금 주입한 관리자의 커스텀 값을 정확히 그것으로 덮는다.

타임라인: SSR이 빨강 주입 → head 블로킹 스크립트가 초록으로 변경 → 첫 페인트(초록, 잘못됨) → hydration 후 effect가 빨강으로 되돌림. **페이지를 읽을 때마다 한 프레임 깜빡인다.**

수정은 방문자 가드를 넣는 것.

```js
var vsid = (vs && d.skins[vs]) ? vs : null;
var sid  = vsid || d.siteSkinId;
r.setAttribute('data-skin', sid);
if (vsid && s) { for (var k in s.v) r.style.setProperty(k, s.v[k]); }   // ← 실제 덮어쓰기가 있을 때만 쓴다
```

덮어쓰기가 없으면 색 변수를 전혀 건드리지 않고, SSR이 주입한 값이 그대로 정답이 된다.

### 함정 2: 슬라이더 트랙을 바꿔도 적용되지 않았다

수묵 스킨의 슬라이더를 먹선 트랙으로 만들고 싶어 이렇게 썼다.

```css
[data-skin='shuimo'] .range-track { background: url('…/line-h.webp') repeat-x center / auto 5px; }
```

실제로는 원래의 브랜드 그라데이션이 그대로 그려졌다. 이유는 `globals.css`가 `::-webkit-slider-runnable-track`과 `::-moz-range-track`에도 불투명한 그라데이션을 깔아 두었고, 이 의사 요소들이 input 자신의 배경 **위에** 그려져 그것을 완전히 덮기 때문이다.

세 선택자를 모두 덮어써야 한다.

```css
[data-skin='shuimo'] .range-track,
[data-skin='shuimo'] .range-track::-webkit-slider-runnable-track,
[data-skin='shuimo'] .range-track::-moz-range-track {
  background: url('…/line-h.webp') repeat-x center / auto 5px;
}
```

### 함정 3: transition-property를 명시했더니 컴포넌트의 scale을 눌렀다

수묵 스킨은 전환을 "느리고 부드럽게" 하고 싶어 이렇게 썼다.

```css
[data-skin='shuimo'] :is(a, button, input, …) {
  transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  transition-duration: 320ms;
}
```

duration과 timing만 지정하면 `transition-property`는 초깃값 `all`로 남는다. 즉 전환을 선언한 적 없는 요소에 대해 갑자기 "모든 속성 320ms 전환"을 활성화하는 셈이고, 영향 범위를 통제할 수 없다. 그래서 속성을 명시하는 형태로 바꿨다.

```css
transition-property: color, background-color, border-color, box-shadow, transform, opacity;
```

그랬더니 이번에는 시계 페이지의 모드 버튼이 툭 바뀌기 시작했다. 독립 속성인 `scale`을 쓰고 있고 `transform`이 아니기 때문이다. 이 규칙은 레이어가 없고 모든 상호작용 요소에 매칭되므로 **컴포넌트가 스스로 선언한 `transition-property`를 덮는다**. 따라서 목록은 컴포넌트가 실제로 전환하는 속성을 망라해야 한다.

```css
transition-property: color, background-color, border-color, box-shadow, transform, scale, opacity;
```

### 함정 4: 시차의 이동 여유

배경화의 포인터 시차는 ±8px이고 요소는 뷰포트를 덮는다. 처음에는 `transform: translate3d(...) scale(1.02)`로 여유를 뒀지만, `scale`은 뷰포트 크기에 비례해서만 여유를 준다. 높이 768px에서는 한쪽당 7.68px뿐이라 이동 상한 8px보다 작고, 포인터가 구석에 오면 반대쪽에 약 0.3px 틈이 생긴다.

고정 픽셀 여유로 바꿨다. 배경 레이어의 `inset`을 `0`에서 `-12px`로 바꾼 것만으로 어떤 뷰포트에서도 충분하다(최대 이동에서도 바람받는 쪽에 4px가 남는다).

## 5. 소재 줄이기

중간에 소재는 250KB까지 불었다. 압축 후 61KB.

| 소재 | 전 | 후 | 방법 |
|---|---|---|---|
| 화선지 질감 | 105 KB | 13 KB | 표시 크기로 축소 + q90 |
| 페이지 종이 질감 | 55 KB | 21 KB | q90(질감 대비 91% 유지) |
| 슬라이더 손잡이 | 75 KB | 2 KB | 856×840 → 64×64(표시 20px, 3배 여유) |

종이 질감처럼 저대비 소재는 품질 파라미터에 매우 민감하다. q65에서는 표준편차가 2.87에서 1.22로 떨어진다(질감이 거의 사라진다). q90이면 2.61을 지킨다. 이런 이미지는 파일 크기만 보고 판단하면 안 된다.

## 정리

- 스킨 시스템의 요점은 "색을 바꿀 수 있다"가 아니다. **토큰의 출처가 하나**라는 것, **방문자 설정이 깜빡이지 않는다**는 것, **스킨 추가의 변경 지점이 적다**는 것이다
- 참고를 따라갈 때 차이는 대개 배색이 아니라 **만드는 방식**에 있다. 기억으로 만들면 형용사는 복제해도 방법은 복제하지 못한다
- CSS 함정은 공통된 특징이 있다. **규칙은 써 있고, 적용되지 않고, 오류도 나지 않는다**. `border-image`의 왜곡, 의사 요소에 가려진 배경, 스태킹 컨텍스트 안의 블렌드 모드, 덮어써진 `transition-property` —— 이것들은 실제로 렌더 결과를 봐야만 발견된다
