'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import * as stylex from '@stylexjs/stylex'
import { cn } from '@/lib/utils'
import { card } from '@/styles/shared/card.stylex'
import { util } from '@/styles/shared/util.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'

type TimerMode = 'stopwatch' | 'timer'

/** 本页样式（数值取自 Tailwind v4 编译产物；卡片系复用共享定义） */
const styles = stylex.create({
	/** 页面主容器 */
	page: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		paddingInline: 24,
		paddingTop: 128,
		paddingBottom: 48
	},
	/** 内容列：垂直间隔 32 */
	container: {
		width: '100%',
		maxWidth: 600,
		display: 'flex',
		flexDirection: 'column',
		gap: 32
	},
	/** 模式切换条：卡片基底上改相对定位并收窄内边距 */
	modeBar: {
		position: 'relative',
		display: 'flex',
		gap: 16,
		borderRadius: 12,
		padding: 8
	},
	/** 模式按钮 */
	modeBtn: {
		flex: '1',
		borderRadius: 12,
		paddingInline: 16,
		paddingBlock: 12,
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
	},
	/** 模式按钮·选中 */
	modeActive: {
		backgroundColor: colors.brand,
		color: colors.white,
		boxShadow: '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)'
	},
	/** 模式按钮·未选中：悬停转品牌色 */
	modeIdle: {
		color: colors.secondary,
		'@media (hover: hover)': {
			':hover': {
				color: colors.brand
			}
		}
	},
	/** 数码管卡片 */
	displayCard: {
		position: 'relative',
		padding: 16
	},
	/** 表盘底色 */
	clockFace: {
		backgroundColor: 'color-mix(in oklab, var(--color-secondary) 20%, transparent)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 32,
		padding: 32
	},
	/** 计时器输入卡片（仅一个子元素，无需纵向间隔） */
	timerCard: {
		position: 'relative'
	},
	/** 输入行 */
	inputRow: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16
	},
	/** 单个时间字段 */
	fieldCol: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 8
	},
	fieldLabel: {
		color: colors.secondary,
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 数字输入框 */
	timeInput: {
		width: 80,
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		paddingInline: 16,
		paddingBlock: 12,
		textAlign: 'center',
		fontSize: 24,
		lineHeight: '32px',
		fontWeight: 700,
		backdropFilter: 'blur(8px)',
		':focus': {
			backgroundColor: 'rgb(255 255 255 / 80%)'
		}
	},
	/** 输入行分隔冒号 */
	inputColon: {
		color: colors.secondary,
		marginTop: 32,
		fontSize: 24,
		lineHeight: '32px',
		fontWeight: 700
	},
	/** 控制按钮行 */
	controls: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16
	},
	/** 圆形控制键（64px）：计次 / 复位 */
	roundBtn: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 64,
		height: 64,
		borderRadius: 9999,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: 'rgb(255 255 255 / 60%)',
		backdropFilter: 'blur(8px)',
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'rgb(255 255 255 / 80%)'
			}
		},
		':disabled': {
			cursor: 'not-allowed',
			opacity: 0.5
		}
	},
	/** 计次键文字 */
	roundBtnText: {
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	/** 主控制键（80px） */
	startBtn: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 80,
		height: 80,
		borderRadius: 9999,
		color: colors.white,
		boxShadow: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)',
		transitionProperty: 'all',
		transitionDuration: '150ms',
		transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
		':disabled': {
			cursor: 'not-allowed',
			opacity: 0.5
		}
	},
	/** 主控制键·运行中 */
	startRunning: {
		backgroundColor: colors.brandSecondary,
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, var(--color-brand-secondary) 80%, transparent)'
			}
		}
	},
	/** 主控制键·待机 */
	startIdle: {
		backgroundColor: colors.brand,
		'@media (hover: hover)': {
			':hover': {
				backgroundColor: 'color-mix(in oklab, var(--color-brand) 80%, transparent)'
			}
		}
	},
	iconLg: {
		width: 32,
		height: 32
	},
	iconMd: {
		width: 20,
		height: 20
	},
	/** 计次记录网格 */
	lapGrid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
		gap: 12
	},
	lapItem: {
		backgroundColor: colors.card,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 16,
		paddingInline: 24,
		paddingBlock: 16
	},
	/** 计次时间文字（等宽字体，栈值取自编译产物） */
	lapText: {
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500
	},
	lapIndex: {
		color: colors.secondary
	},
	/** 数码管行 */
	digits: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6
	},
	/** 冒号：外部类经 cn 透传合并 */
	colon: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		gap: 8
	},
	colonDot: {
		width: 6,
		height: 6,
		backgroundColor: colors.primary
	}
})

export default function ClockPage() {
	const { t } = useI18n()
	const [mode, setMode] = useState<TimerMode>('stopwatch')
	const [stopwatchTime, setStopwatchTime] = useState(0)
	const [timerTime, setTimerTime] = useState(0)
	const [timerInput, setTimerInput] = useState({ hours: 0, minutes: 0, seconds: 0 })
	const [isRunning, setIsRunning] = useState(false)
	const [laps, setLaps] = useState<number[]>([])
	const intervalRef = useRef<number | null>(null)
	const startTimeRef = useRef<number | null>(null)
	const pausedTimeRef = useRef<number>(0)
	const initialTimerTimeRef = useRef<number>(0)
	const stopwatchTimeRef = useRef<number>(0)
	const timerTimeRef = useRef<number>(0)

	// Sync refs with state
	stopwatchTimeRef.current = stopwatchTime
	timerTimeRef.current = timerTime

	useEffect(() => {
		if (isRunning) {
			const now = performance.now()
			if (startTimeRef.current === null) {
				// Starting fresh
				startTimeRef.current = now
				if (mode === 'timer') {
					initialTimerTimeRef.current = timerTimeRef.current
				}
			} else {
				// Resuming from pause
				if (mode === 'stopwatch') {
					startTimeRef.current = now - pausedTimeRef.current
				} else {
					startTimeRef.current = now - (initialTimerTimeRef.current - timerTimeRef.current)
				}
			}

			const updateTime = () => {
				const currentTime = performance.now()
				const elapsed = currentTime - startTimeRef.current!

				if (mode === 'stopwatch') {
					setStopwatchTime(Math.floor(elapsed))
				} else {
					const remaining = initialTimerTimeRef.current - elapsed
					if (remaining <= 0) {
						setTimerTime(0)
						setIsRunning(false)
						startTimeRef.current = null
						return
					}
					setTimerTime(Math.floor(remaining))
				}

				intervalRef.current = requestAnimationFrame(updateTime)
			}

			intervalRef.current = requestAnimationFrame(updateTime)
		} else {
			if (intervalRef.current !== null) {
				cancelAnimationFrame(intervalRef.current)
				intervalRef.current = null
			}
			if (startTimeRef.current !== null) {
				if (mode === 'stopwatch') {
					pausedTimeRef.current = stopwatchTimeRef.current
				}
			}
		}

		return () => {
			if (intervalRef.current !== null) {
				cancelAnimationFrame(intervalRef.current)
			}
		}
	}, [isRunning, mode])

	const handleStartPause = () => {
		if (mode === 'timer' && timerTime === 0) {
			const totalMs = timerInput.hours * 3600000 + timerInput.minutes * 60000 + timerInput.seconds * 1000
			if (totalMs <= 0) return
			setTimerTime(totalMs)
			initialTimerTimeRef.current = totalMs
		}
		if (!isRunning) {
			startTimeRef.current = null
		}
		setIsRunning(prev => !prev)
	}

	const handleReset = () => {
		setIsRunning(false)
		startTimeRef.current = null
		pausedTimeRef.current = 0
		initialTimerTimeRef.current = 0
		if (mode === 'stopwatch') {
			setStopwatchTime(0)
			setLaps([])
		} else {
			setTimerTime(0)
			setTimerInput({ hours: 0, minutes: 0, seconds: 0 })
		}
	}

	const handleLap = () => {
		if (mode === 'stopwatch' && isRunning) {
			setLaps(prev => [stopwatchTime, ...prev])
		}
	}

	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000)
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		const milliseconds = Math.floor((ms % 1000) / 10)

		if (hours > 0) {
			return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
		}
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
	}

	const displayTime = mode === 'stopwatch' ? stopwatchTime : timerTime
	const canStart = mode === 'timer' ? timerTime > 0 || timerInput.hours > 0 || timerInput.minutes > 0 || timerInput.seconds > 0 : true

	return (
		<div className={stylex.props(styles.page).className}>
			<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={stylex.props(styles.container).className}>
				{/* Mode Selector */}
				<div className={stylex.props(card.base, styles.modeBar).className}>
					<button
						onClick={() => {
							setMode('stopwatch')
							setIsRunning(false)
							setTimerTime(0)
							setTimerInput({ hours: 0, minutes: 0, seconds: 0 })
							startTimeRef.current = null
							pausedTimeRef.current = 0
							initialTimerTimeRef.current = 0
						}}
						className={stylex.props(card.hover, styles.modeBtn, mode === 'stopwatch' ? styles.modeActive : styles.modeIdle).className}>
						{t('toolbox.stopwatch')}
					</button>
					<button
						onClick={() => {
							setMode('timer')
							setIsRunning(false)
							setStopwatchTime(0)
							setLaps([])
							startTimeRef.current = null
							pausedTimeRef.current = 0
							initialTimerTimeRef.current = 0
						}}
						className={stylex.props(card.hover, styles.modeBtn, mode === 'timer' ? styles.modeActive : styles.modeIdle).className}>
						{t('toolbox.timer')}
					</button>
				</div>

				<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={stylex.props(card.base, styles.displayCard).className}>
					<div className={stylex.props(styles.clockFace).className}>
						<TimeDisplay time={displayTime} key={mode} />
					</div>
				</motion.div>

				{/* Timer Input (only for timer mode when not running) */}
				{mode === 'timer' && !isRunning && timerTime === 0 && (
					<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={stylex.props(card.base, styles.timerCard).className}>
						<div className={stylex.props(styles.inputRow).className}>
							<div className={stylex.props(styles.fieldCol).className}>
								<label className={stylex.props(styles.fieldLabel).className}>{t('toolbox.hours')}</label>
								<input
									type='number'
									min='0'
									max='23'
									value={timerInput.hours}
									onChange={e => setTimerInput({ ...timerInput, hours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
									className={stylex.props(util.noSpinner, styles.timeInput).className}
								/>
							</div>
							<div className={stylex.props(styles.inputColon).className}>:</div>
							<div className={stylex.props(styles.fieldCol).className}>
								<label className={stylex.props(styles.fieldLabel).className}>{t('toolbox.minutes')}</label>
								<input
									type='number'
									min='0'
									max='59'
									value={timerInput.minutes}
									onChange={e => setTimerInput({ ...timerInput, minutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
									className={stylex.props(util.noSpinner, styles.timeInput).className}
								/>
							</div>
							<div className={stylex.props(styles.inputColon).className}>:</div>
							<div className={stylex.props(styles.fieldCol).className}>
								<label className={stylex.props(styles.fieldLabel).className}>{t('toolbox.seconds')}</label>
								<input
									type='number'
									min='0'
									max='59'
									value={timerInput.seconds}
									onChange={e => setTimerInput({ ...timerInput, seconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
									className={stylex.props(util.noSpinner, styles.timeInput).className}
								/>
							</div>
						</div>
					</motion.div>
				)}

				{/* Control Buttons */}
				<div className={stylex.props(styles.controls).className}>
					{mode === 'stopwatch' && (
						<button onClick={handleLap} disabled={!isRunning} className={stylex.props(card.hover, styles.roundBtn, styles.roundBtnText).className}>
							{t('toolbox.lap')}
						</button>
					)}
					<button
						onClick={handleStartPause}
						disabled={!canStart}
						className={stylex.props(card.hover, styles.startBtn, isRunning ? styles.startRunning : styles.startIdle).className}>
						{isRunning ? <Pause {...stylex.props(styles.iconLg)} /> : <Play {...stylex.props(styles.iconLg)} />}
					</button>
					<button onClick={handleReset} disabled={isRunning && mode === 'stopwatch'} className={stylex.props(card.hover, styles.roundBtn).className}>
						<RotateCcw {...stylex.props(styles.iconMd)} />
					</button>
				</div>

				{mode === 'stopwatch' && laps.length > 0 && (
					<div className={stylex.props(styles.lapGrid).className}>
						{laps.map((lap, index) => (
							<motion.div
								layout
								initial={{ opacity: 0, scale: 0.6 }}
								animate={{ opacity: 1, scale: 1 }}
								key={lap}
								className={stylex.props(styles.lapItem).className}>
								<span className={stylex.props(styles.lapText).className}>
									<span className={stylex.props(styles.lapIndex).className}>{laps.length - index}.</span> {formatTime(lap)}
								</span>
							</motion.div>
						))}
					</div>
				)}
			</motion.div>
		</div>
	)
}

interface TimeDisplayProps {
	time: number
}

function TimeDisplay({ time }: TimeDisplayProps) {
	const totalSeconds = Math.floor(time / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	const milliseconds = Math.floor((time % 1000) / 10)

	const hoursStr = hours.toString().padStart(2, '0')
	const minutesStr = minutes.toString().padStart(2, '0')
	const secondsStr = seconds.toString().padStart(2, '0')
	const millisecondsStr = milliseconds.toString().padStart(2, '0')

	return (
		<div className={stylex.props(styles.digits).className}>
			{hours > 0 && (
				<>
					<SevenSegmentDigit value={parseInt(hoursStr[0])} />
					<SevenSegmentDigit value={parseInt(hoursStr[1])} />
					<Colon />
				</>
			)}
			<SevenSegmentDigit value={parseInt(minutesStr[0])} />
			<SevenSegmentDigit value={parseInt(minutesStr[1])} />
			<Colon />
			<SevenSegmentDigit value={parseInt(secondsStr[0])} />
			<SevenSegmentDigit value={parseInt(secondsStr[1])} />
			<Colon />
			<SevenSegmentDigit value={parseInt(millisecondsStr[0])} />
			<SevenSegmentDigit value={parseInt(millisecondsStr[1])} />
		</div>
	)
}

interface SevenSegmentDigitProps {
	value: number
	className?: string
}

function SevenSegmentDigit({ value, className }: SevenSegmentDigitProps) {
	const segmentMap = {
		0: [true, true, true, true, true, true, false],
		1: [false, true, true, false, false, false, false],
		2: [true, true, false, true, true, false, true],
		3: [true, true, true, true, false, false, true],
		4: [false, true, true, false, false, true, true],
		5: [true, false, true, true, false, true, true],
		6: [true, false, true, true, true, true, true],
		7: [true, true, true, false, false, false, false],
		8: [true, true, true, true, true, true, true],
		9: [true, true, true, true, false, true, true]
	}

	const segments = segmentMap[value as keyof typeof segmentMap] || segmentMap[0]
	const activeColor = 'var(--color-primary)'
	const inactiveColor = 'rgba(0, 0, 0, 0.05)'

	return (
		<svg width='29' height='52' viewBox='0 0 29 52' fill='none' xmlns='http://www.w3.org/2000/svg' className={className}>
			<path
				d='M4.20248 3.49482C2.82797 2.27303 3.69218 0 5.53121 0H22.6867C24.5522 0 25.4019 2.32821 23.975 3.52982L23.5791 3.86316C23.2186 4.16681 22.7623 4.33333 22.2909 4.33333H5.90621C5.41638 4.33333 4.94359 4.15358 4.57748 3.82815L4.20248 3.49482Z'
				fill={segments[0] ? activeColor : inactiveColor}
			/>
			<path
				d='M3.85122 24.13C4.16644 23.936 4.5293 23.8333 4.89942 23.8333H23.3022C23.6503 23.8333 23.9923 23.9242 24.2945 24.0969L24.5862 24.2635C25.9298 25.0313 25.9298 26.9687 24.5862 27.7365L24.2945 27.9032C23.9923 28.0758 23.6503 28.1667 23.3022 28.1667H4.89942C4.5293 28.1667 4.16644 28.064 3.85122 27.87L3.58039 27.7033C2.31131 26.9224 2.31132 25.0777 3.58039 24.2967L3.85122 24.13Z'
				fill={segments[6] ? activeColor : inactiveColor}
			/>
			<path
				d='M3.06 23.5458C1.7279 24.3784 -8.31295e-08 23.4207 -1.47217e-07 21.8498L-8.06095e-07 5.69981C-8.77526e-07 3.94893 2.09055 3.04323 3.36788 4.24073L3.70121 4.55323C4.10452 4.93133 4.33333 5.45949 4.33333 6.01231L4.33333 21.6415C4.33333 22.3311 3.97809 22.972 3.39333 23.3375L3.06 23.5458Z'
				fill={segments[5] ? activeColor : inactiveColor}
			/>
			<path
				d='M24.8497 4.25654C26.1428 3.12502 28.1667 4.04338 28.1667 5.76169L28.1667 21.8498C28.1667 23.4207 26.4388 24.3784 25.1067 23.5458L24.7734 23.3375C24.1886 22.972 23.8334 22.3311 23.8334 21.6415L23.8334 6.05336C23.8334 5.47663 24.0823 4.92798 24.5163 4.54821L24.8497 4.25654Z'
				fill={segments[1] ? activeColor : inactiveColor}
			/>
			<path
				d='M23.9259 48.6321C25.1234 49.9094 24.2177 52 22.4669 52L5.69978 52C3.9489 52 3.04321 49.9094 4.24071 48.6321L4.55321 48.2988C4.9313 47.8955 5.45947 47.6667 6.01228 47.6667L22.1544 47.6667C22.7072 47.6667 23.2353 47.8955 23.6134 48.2988L23.9259 48.6321Z'
				fill={segments[3] ? activeColor : inactiveColor}
			/>
			<path
				d='M25.1862 28.489C26.5194 27.7391 28.1667 28.7025 28.1667 30.2322L28.1667 46.6299C28.1667 48.4117 26.0124 49.3041 24.7525 48.0441L24.4191 47.7108C24.0441 47.3357 23.8334 46.827 23.8334 46.2966L23.8334 30.4197C23.8334 29.6971 24.2231 29.0308 24.8528 28.6765L25.1862 28.489Z'
				fill={segments[2] ? activeColor : inactiveColor}
			/>
			<path
				d='M3.4564 47.7859C2.21509 49.1048 4.23823e-07 48.2263 6.6133e-07 46.4152L2.79423e-06 30.1501C3.00022e-06 28.5793 1.72791 27.6216 3.06 28.4541L3.39333 28.6625C3.9781 29.028 4.33334 29.6689 4.33334 30.3585L4.33333 46.061C4.33333 46.5705 4.13891 47.0607 3.78973 47.4317L3.4564 47.7859Z'
				fill={segments[4] ? activeColor : inactiveColor}
			/>
		</svg>
	)
}

function Colon({ className }: { className?: string }) {
	return (
		<div className={cn(stylex.props(styles.colon).className, className)}>
			<div className={stylex.props(styles.colonDot).className} />
			<div className={stylex.props(styles.colonDot).className} />
		</div>
	)
}
