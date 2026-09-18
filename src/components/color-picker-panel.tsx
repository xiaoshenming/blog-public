'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { hexToHsva, hsvaToHex, hsvToHsl, clamp, toFixed } from '@/lib/color'

interface ColorPickerPanelProps {
	value: string
	onChange?: (color: string) => void
	style?: React.CSSProperties
	className?: string
}

const MOUSE_LEFT = 0

/** 面板容器：224 宽、白底、1px 边框、8 圆角、大阴影、不可选中；显隐由条件透明度控制 */
const styles = stylex.create({
	panel: {
		width: 224,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: colors.white,
		padding: 12,
		boxShadow: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)',
		userSelect: 'none'
	},
	panelShown: {
		opacity: 1
	},
	panelHidden: {
		opacity: 0
	},
	/** 明度/饱和度取色区：上缘圆角、十字光标 */
	pickerArea: {
		position: 'relative',
		height: 128,
		width: '100%',
		cursor: 'crosshair',
		borderTopLeftRadius: 6,
		borderTopRightRadius: 6
	},
	/** 取色区游标：16×16 白边圆点、双轴居中偏移 */
	pickerThumb: {
		position: 'absolute',
		zIndex: 10,
		width: 16,
		height: 16,
		translate: '-50% -50%',
		cursor: 'crosshair',
		borderRadius: 9999,
		borderWidth: 2,
		borderStyle: 'solid',
		borderColor: colors.white,
		boxShadow: '0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)'
	},
	/** 色相/透明度滑轨：20 高、纵向居中、指针光标 */
	slider: {
		position: 'relative',
		display: 'flex',
		height: 20,
		cursor: 'pointer',
		alignItems: 'center'
	},
	/** 滑轨滑块：16×16 白边圆点、仅水平居中偏移 */
	sliderThumb: {
		position: 'absolute',
		width: 16,
		height: 16,
		translate: '-50%',
		cursor: 'pointer',
		borderRadius: 9999,
		borderWidth: 2,
		borderStyle: 'solid',
		borderColor: colors.white,
		boxShadow: '0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)'
	},
	/** 透明度滑轨底板：下缘圆角（棋盘格背景保留内联） */
	alphaTrack: {
		borderBottomLeftRadius: 6,
		borderBottomRightRadius: 6
	},
	/** 透明度滑块白底（衬出内层半透明色） */
	alphaThumbWhite: {
		backgroundColor: colors.white
	},
	/** 透明度滑块内芯：撑满、全圆（颜色保留内联） */
	alphaThumbInner: {
		width: '100%',
		height: '100%',
		borderRadius: 9999
	},
	/** 十六进制输入框：全宽、6 圆角、1px 边框、紧凑内边距、小号字；聚焦显示 2px 蓝色光环（色板无令牌，固化实测 lab 值） */
	hexInput: {
		width: '100%',
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 8,
		paddingBlock: 4,
		fontSize: 14,
		lineHeight: '20px',
		':focus': {
			outlineStyle: 'none',
			boxShadow: '0 0 0 2px lab(54.1736% 13.3369 -74.6839)'
		}
	}
})

export function ColorPickerPanel({ value, onChange, style, className }: ColorPickerPanelProps) {
	const [show, setShow] = useState(false)
	const [hueOffset, setHueOffset] = useState(0)
	const [alphaOffset, setAlphaOffset] = useState(255)
	const [saturationOffset, setSaturationOffset] = useState(255)
	const [brightOffset, setBrightOffset] = useState(0)

	const hueRef = useRef<HTMLDivElement>(null)
	const pickerRef = useRef<HTMLDivElement>(null)
	const alphaRef = useRef<HTMLDivElement>(null)

	const [hueActive, setHueActive] = useState(false)
	const [alphaActive, setAlphaActive] = useState(false)
	const [saturationActive, setSaturationActive] = useState(false)
	const [brightActive, setBrightActive] = useState(false)

	const prevHexRef = useRef<string>(value)

	// Initialize from value (only once on mount)
	useEffect(() => {
		if (value) {
			const hsva = hexToHsva(value)
			prevHexRef.current = value
			// Use setTimeout to ensure refs are mounted
			setTimeout(() => {
				if (hueRef.current && pickerRef.current && alphaRef.current) {
					const hueWidth = hueRef.current.getBoundingClientRect().width
					const pickerWidth = pickerRef.current.getBoundingClientRect().width
					const pickerHeight = pickerRef.current.getBoundingClientRect().height
					const alphaWidth = alphaRef.current.getBoundingClientRect().width

					setHueOffset((hsva.h / 360) * hueWidth)
					setSaturationOffset(hsva.s * pickerWidth)
					setBrightOffset((1 - hsva.v) * pickerHeight)
					setAlphaOffset(hsva.a * alphaWidth)
					setShow(true)
				}
			}, 0)
		}
	}, [])

	const hue = useMemo(() => {
		if (hueRef.current) {
			const { width } = hueRef.current.getBoundingClientRect()
			return toFixed((hueOffset / width) * 360)
		}
		return 0
	}, [hueOffset, hueRef.current])

	const alpha = useMemo(() => {
		if (alphaRef.current) {
			const { width } = alphaRef.current.getBoundingClientRect()
			return clamp(toFixed(alphaOffset / width, 4), 0, 1)
		}
		return 1
	}, [alphaOffset, alphaRef.current])

	const saturation = useMemo(() => {
		if (pickerRef.current) {
			const { width } = pickerRef.current.getBoundingClientRect()
			return clamp(toFixed(saturationOffset / width, 4), 0, 1)
		}
		return 1
	}, [saturationOffset, pickerRef.current])

	const bright = useMemo(() => {
		if (pickerRef.current) {
			const { height } = pickerRef.current.getBoundingClientRect()
			return 1 - clamp(toFixed(brightOffset / height, 4), 0, 1)
		}
		return 0
	}, [brightOffset, pickerRef.current])

	const hsl = useMemo(() => {
		return hsvToHsl(hue, saturation, bright)
	}, [hue, saturation, bright])
	const hex = useMemo(() => hsvaToHex(hue, saturation, bright, alpha), [hue, saturation, bright, alpha])

	// Notify parent of color change
	useEffect(() => {
		if (onChange && hex && hex !== prevHexRef.current) {
			prevHexRef.current = hex
			onChange(hex)
		}
	}, [hex, onChange])

	// Handle mouse events
	useEffect(() => {
		const mousemoveHandler = (e: MouseEvent) => {
			if (hueActive && hueRef.current) {
				const { left, right, width } = hueRef.current.getBoundingClientRect()
				if (e.pageX < left) {
					setHueOffset(0)
				} else if (e.pageX > right) {
					setHueOffset(width)
				} else {
					setHueOffset(e.pageX - left)
				}
			}

			if (alphaActive && alphaRef.current) {
				const { left, right, width } = alphaRef.current.getBoundingClientRect()
				if (e.pageX < left) {
					setAlphaOffset(0)
				} else if (e.pageX > right) {
					setAlphaOffset(width)
				} else {
					setAlphaOffset(e.pageX - left)
				}
			}

			if ((saturationActive || brightActive) && pickerRef.current) {
				const { left, top, right, bottom, width, height } = pickerRef.current.getBoundingClientRect()

				if (saturationActive) {
					if (e.pageX < left) {
						setSaturationOffset(0)
					} else if (e.pageX > right) {
						setSaturationOffset(width)
					} else {
						setSaturationOffset(e.pageX - left)
					}
				}

				if (brightActive) {
					if (e.pageY < top) {
						setBrightOffset(0)
					} else if (e.pageY > bottom) {
						setBrightOffset(height)
					} else {
						setBrightOffset(e.pageY - top)
					}
				}
			}
		}

		const mouseupHandler = () => {
			setHueActive(false)
			setAlphaActive(false)
			setSaturationActive(false)
			setBrightActive(false)
		}

		if (hueActive || alphaActive || saturationActive || brightActive) {
			document.addEventListener('mousemove', mousemoveHandler)
			document.addEventListener('mouseup', mouseupHandler)
			document.addEventListener('mouseleave', mouseupHandler)
		}

		return () => {
			document.removeEventListener('mousemove', mousemoveHandler)
			document.removeEventListener('mouseup', mouseupHandler)
			document.removeEventListener('mouseleave', mouseupHandler)
		}
	}, [hueActive, alphaActive, saturationActive, brightActive])

	const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value

		// Support both #RRGGBB and #RRGGBBAA
		if (/^#[0-9A-Fa-f]{0,8}$/.test(inputValue)) {
			if ((inputValue.length === 7 || inputValue.length === 9) && onChange) {
				onChange(inputValue)
			}

			if (inputValue.length === 7 || inputValue.length === 9) {
				const hsva = hexToHsva(inputValue)
				if (hueRef.current && pickerRef.current && alphaRef.current) {
					const hueWidth = hueRef.current.getBoundingClientRect().width
					const pickerWidth = pickerRef.current.getBoundingClientRect().width
					const pickerHeight = pickerRef.current.getBoundingClientRect().height
					const alphaWidth = alphaRef.current.getBoundingClientRect().width

					setHueOffset((hsva.h / 360) * hueWidth)
					setSaturationOffset(hsva.s * pickerWidth)
					setBrightOffset((1 - hsva.v) * pickerHeight)
					setAlphaOffset(hsva.a * alphaWidth)
				}
			}
		}
	}

	const { className: sx, style: sxStyle } = stylex.props(styles.panel, show ? styles.panelShown : styles.panelHidden)

	return (
		<div
			data-color-picker-panel
			className={cn(sx, className)}
			style={{ ...sxStyle, ...style }}>
			{/* Saturation and brightness picker */}
			<div
				ref={pickerRef}
				onMouseDown={e => {
					if (e.button === MOUSE_LEFT) {
						const { left, top, width, height } = pickerRef.current!.getBoundingClientRect()
						setSaturationOffset(clamp(e.pageX - left, 0, width))
						setBrightOffset(clamp(e.pageY - top, 0, height))
						setSaturationActive(true)
						setBrightActive(true)
					}
				}}
				{...stylex.props(styles.pickerArea)}
				style={{
					backgroundColor: `hsl(${hue}, 100%, 50%)`,
					backgroundImage: 'linear-gradient(0deg, #000, transparent), linear-gradient(90deg, #fff, hsla(0, 0%, 100%, 0))'
				}}>
				<div
					{...stylex.props(styles.pickerThumb)}
					style={{
						backgroundColor: `hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}%)`,
						left: saturationOffset,
						top: brightOffset
					}}
				/>
			</div>

			{/* Hue slider */}
			<div
				ref={hueRef}
				onMouseDown={e => {
					if (e.button === MOUSE_LEFT) {
						const { left, width } = hueRef.current!.getBoundingClientRect()
						setHueOffset(clamp(e.pageX - left, 0, width))
						setHueActive(true)
					}
				}}
				{...stylex.props(styles.slider)}
				style={{
					background:
						'linear-gradient(to right, rgb(255, 0, 0), rgb(255, 255, 0), rgb(0, 255, 0), rgb(0, 255, 255), rgb(0, 0, 255), rgb(255, 0, 255), rgb(255, 0, 0))'
				}}>
				<div
					{...stylex.props(styles.sliderThumb)}
					style={{ backgroundColor: `hsl(${hue} 100% 50%)`, left: hueOffset }}
				/>
			</div>

			{/* Alpha slider */}
			<div
				{...stylex.props(styles.alphaTrack)}
				style={{
					backgroundSize: '12px 12px',
					backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='12' height='12' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 12 0 L 0 0 0 12' fill='none' stroke='%23e5e7eb' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`
				}}>
				<div
					ref={alphaRef}
					onMouseDown={e => {
						if (e.button === MOUSE_LEFT) {
							const { left, width } = alphaRef.current!.getBoundingClientRect()
							setAlphaOffset(clamp(e.pageX - left, 0, width))
							setAlphaActive(true)
						}
					}}
					{...stylex.props(styles.slider)}
					style={{
						background: `linear-gradient(to right, hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / 0%), hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / 100%))`
					}}>
					<div {...stylex.props(styles.sliderThumb, styles.alphaThumbWhite)} style={{ left: alphaOffset }}>
						<div {...stylex.props(styles.alphaThumbInner)} style={{ backgroundColor: `hsl(${hsl.h} ${hsl.s * 100}% ${hsl.l * 100}% / ${alpha * 100}%)` }} />
					</div>
				</div>
			</div>

			{/* Hex input */}
			<input
				type='text'
				value={hex}
				onChange={handleHexInputChange}
				{...stylex.props(styles.hexInput)}
				placeholder='#000000'
			/>
		</div>
	)
}
