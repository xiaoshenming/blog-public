朝にある記事を見ました：[《ブラウザでの液体ガラス》](https://kube.io/blog/liquid-glass-css-svg/)。記事の中でガラスの屈折率や置換については理解できましたが、他の部分は理解できません。

しかし、このコンポーネントのガイドにより実装が非常に簡単で、とても面白いと感じました。このコンポーネントをブログでしばらく使うことを許可してください。

コードは**非常に簡単**で、このブログのリポジトリの`components/liquid-grass`フォルダ内にあります。

## 実装方法

論理的には、2つの**置換**を組み合わせて境界を作る。面倒だと思うなら、境界効果を省くことも可能です。

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

## 原理

最初はそれが svg でのみ実現可能だと思っていた。つまり、ウェブアドレスを svg に埋め込む必要があるということだった。しかし実際にはそれは不要だ。第二に、直接ドキュメントの流れで使用可能であり、これは非常に**便利**だ。

SVGの内容を正しく書き込めば、**backdropFilter** の引き出しに使えます。**Chrome**での使用が制限されていますが、単独で遊ぶだけでも十分です。
