In the morning, I saw an article: [“Liquid Glass in Browser”](https://kube.io/blog/liquid-glass-css-svg/). I can only understand the glass refractive index and replacement, but the rest is beyond my understanding.

However, I find that with its guidance, it’s easy to implement, and I enjoy it a lot. I’ll allow this component to be used on the blog for a while.

The code is **very simple** and is located in the `components/liquid-grass` directory within the blog repository folder.

## Implementation

Logically, two **permutations** combine to create an edge effect. If it’s too cumbersome, you can skip the edge effect.

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

## Principle

Initially, I thought it could only be implemented in SVG, which meant the URL content would need to be embedded in SVG. However, this is not required; instead, it can be used directly in the document flow, making it very **easy**.

Just need to write down the SVG content, and just reference **backdropFilter** is enough. Although it is restricted for use in **chrome**, just playing with it alone is sufficient.
