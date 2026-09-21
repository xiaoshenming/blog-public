아침에 한 글을 읽었는데 [《브라우저에서의 액체형 유리》](https://kube.io/blog/liquid-glass-css-svg/)라는 글인데, 글에서 나는 유리의 굴절률과 교체 방식을만 이해할 수 있었고 나머지는 이해할 수 없었다.

하지만 이를 사용하면 쉽게 구현할 수 있고 재미있게 느껴진다. 이 컴포넌트를 블로그에 잠시 사용하는 것을 허용해 주세요.

코드는 **매우 간단**하며, 이 블로그 저장소의 `components/liquid-grass` 디렉터리에 있다.

## 구현 방법

논리적으로는 두 개의 **재위치**가 결합되어 한쪽 가장자리를 형성합니다. 번거롭다면 가장자리 효과를 제거해도 됩니다.

```tsx
const width = 210
const height = 150

<div
	style={{ width, height }}
	className='fixed top-0 left-0 z-90 select-none'
	whileTap={{
		scale: 1.1
	}}>
	<svg colorInterpolationFilters='sRGB' style={{ display: 'none' }}>
			<defs>
				<filter id='magnifying-glass-filter'>
					<feImage href={displacement1.src} x='0' y='0' width={width} height={height} result='magnifying_displacement_map' />
					<feDisplacementMap in='SourceGraphic' in2='magnifying_displacement_map' scale='24' xChannelSelector='R' yChannelSelector='G' result='magnified_source' />
					<feGaussianBlur in='magnified_source' stdDeviation='0' result='blurred_source' />
					<feImage href={displacement2.src} x='0' y='0' width={width} height={height} result='displacement_map' />
					<feDisplacementMap in='blurred_source' in2='displacement_map' scale='80' xChannelSelector='R' yChannelSelector='G' result='displaced' />
					<feColorMatrix in='displaced' type='saturate' result='displaced_saturated' values='9'></feColorMatrix>
					<feImage href={borderImg.src} x='0' y='0' width={width} height={height} result='specular_layer'></feImage>
					<feComposite in='displaced_saturated' in2='specular_layer' operator='in' result='specular_saturated'></feComposite>
					<feComponentTransfer in='specular_layer' result='specular_faded'>
						<feFuncA type='linear' slope='0.5'></feFuncA>
					</feComponentTransfer>
				<feBlend in='specular_saturated' in2='displaced' mode='normal' result='withSaturation'></feBlend>
				<feBlend in='specular_faded' in2='withSaturation' mode='normal'></feBlend>
			</filter>
		</defs>
	</svg>

	<div
		onClick={() => setIsTouched(true)}
		className='absolute inset-0 rounded-full'
		style={{
			backdropFilter: 'url(#magnifying-glass-filter)',
			boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 9px, rgba(0, 0, 0, 0.05) 0px 2px 24px inset, rgba(255, 255, 255, 0.2) 0px -2px 24px inset'
		}}>
	</div>
</div>

```

## 원리

처음에는 이 기능이 svg에서만 구현될 수 있다고 생각했는데, 이는 웹사이트 내용을 svg에 인쇄해야 한다는 것을 의미했습니다. 하지만 실제로는 그렇지 않으며, 문서 내에서 직접 사용할 수 있어 매우 **편리**합니다.

SVG 내용만 제대로 작성해도 **backdropFilter**를 꺼내서 사용하면 충분합니다. **chrome**에서만 사용되지만, 단순히 자신만의 용도로 사용하는 것만으로도 충분합니다.
