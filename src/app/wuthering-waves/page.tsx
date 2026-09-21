'use client'

import { useCallback, useState } from 'react'
import * as stylex from '@stylexjs/stylex'
import { hoverGroup } from '@/styles/shared/markers.stylex'
import { colors } from '@/styles/tokens.stylex'
import { useI18n } from '@/i18n/context'
import type { TranslationKey, TranslationParams } from '@/i18n/translate'

type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string

interface CardRecord {
	cardPoolType: string
	resourceId: number
	qualityLevel: number
	resourceType: string
	name: string
	count: number
	time: string
}

type PitySegment = {
	pulls: number
	name: string | null
	time: string | null
}

function parseCardRecords(raw: string, t: TranslateFn): CardRecord[] {
	const data = JSON.parse(raw) as unknown
	if (!Array.isArray(data)) {
		throw new Error(t('toolbox.errorRootNotArray'))
	}
	return data.map((item, i) => {
		if (typeof item !== 'object' || item === null) {
			throw new Error(t('toolbox.errorItemNotObject', { index: i + 1 }))
		}
		const r = item as Record<string, unknown>
		const qualityLevel = Number(r.qualityLevel)
		if (!Number.isFinite(qualityLevel)) {
			throw new Error(t('toolbox.errorMissingQualityLevel', { index: i + 1 }))
		}
		return {
			cardPoolType: String(r.cardPoolType ?? ''),
			resourceId: Number(r.resourceId ?? 0),
			qualityLevel,
			resourceType: String(r.resourceType ?? ''),
			name: String(r.name ?? ''),
			count: Number(r.count ?? 1),
			time: String(r.time ?? '')
		}
	})
}

/** 按数组顺序累计；遇到 5 星则结束当前段并新开计数。未完成段无 name。 */
function buildPitySegments(records: CardRecord[]): PitySegment[] {
	const segments: PitySegment[] = []
	let pulls = 0
	let name = null
	let time = null

	for (const rec of records) {
		pulls++
		if (rec.qualityLevel === 5) {
			segments.push({ pulls, name: name, time: time })
			pulls = 1
			name = rec.name
			time = rec.time
		}
	}

	if (pulls > 0) {
		segments.push({ pulls, name: name, time: time })
	}

	return segments
}

/** 本页样式（数值取自 Tailwind v4 编译产物；无令牌文本色按零产出处理） */
const styles = stylex.create({
	/** 页面主容器 */
	page: {
		marginInline: 'auto',
		maxWidth: 768,
		paddingInline: 16,
		paddingBlock: 96,
		display: 'flex',
		flexDirection: 'column',
		gap: 16
	},
	heading: {
		fontSize: 20,
		lineHeight: '28px',
		fontWeight: 600,
		letterSpacing: '-0.025em'
	},
	para: {
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 步骤列表 */
	steps: {
		color: colors.secondary,
		listStylePosition: 'inside',
		listStyleType: 'disc',
		fontSize: 14,
		lineHeight: '20px'
	},
	link: {
		color: colors.brand,
		'@media (hover: hover)': {
			':hover': {
				textDecorationLine: 'underline'
			}
		}
	},
	accent: {
		color: colors.brand
	},
	muted: {
		color: colors.secondary
	},
	/** JSON 输入区（focus-visible 环用单层阴影等价） */
	editor: {
		backgroundColor: colors.card,
		width: '100%',
		resize: 'vertical',
		borderRadius: 6,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		paddingInline: 12,
		paddingBlock: 8,
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		fontSize: 14,
		lineHeight: '20px',
		':focus-visible': {
			outlineStyle: 'none',
			boxShadow: '0 0 0 2px currentcolor'
		}
	},
	/** 分析按钮（flex 列容器下保持内容宽度） */
	analyzeBtn: {
		alignSelf: 'flex-start',
		backgroundColor: colors.brand,
		borderRadius: 6,
		paddingInline: 16,
		paddingBlock: 8,
		fontSize: 14,
		lineHeight: '20px',
		fontWeight: 500,
		color: colors.white,
		'@media (hover: hover)': {
			':hover': {
				opacity: 0.9
			}
		}
	},
	/** 错误提示 */
	error: {
		fontSize: 14,
		lineHeight: '20px'
	},
	segmentList: {
		display: 'flex',
		flexDirection: 'column',
		gap: 8
	},
	segmentItem: {
		display: 'flex',
		alignItems: 'center',
		gap: 12
	},
	/** 抽数条：宽度由内联 style 控制 */
	pullBar: {
		backgroundColor: colors.brandSecondary,
		display: 'flex',
		height: 28,
		flexShrink: 0,
		alignItems: 'center',
		overflow: 'hidden',
		borderRadius: 4,
		paddingLeft: 8,
		fontSize: 12,
		lineHeight: 1,
		fontWeight: 700,
		color: colors.white,
		fontVariantNumeric: 'tabular-nums'
	},
	/** 名称行：单行省略 */
	segmentName: {
		minWidth: 0,
		flex: '1',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontSize: 14,
		lineHeight: '20px'
	},
	/** 时间提示：默认隐藏，悬停标记父项时显示 */
	timeHint: {
		display: {
			default: 'none',
			[stylex.when.ancestor(':hover', hoverGroup)]: 'inline'
		},
		color: colors.secondary,
		fontSize: 12,
		lineHeight: '16px'
	},
	pending: {
		color: colors.secondary
	}
})

export default function Page() {
	const { t } = useI18n()
	const [input, setInput] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [segments, setSegments] = useState<PitySegment[]>([])

	const analyze = useCallback(() => {
		setError(null)
		const trimmed = input.trim()
		if (!trimmed) {
			setSegments([])
			return
		}
		try {
			const records = parseCardRecords(trimmed, t)
			setSegments(buildPitySegments(records))
		} catch (e) {
			setSegments([])
			setError(e instanceof Error ? e.message : t('toolbox.parseFailed'))
		}
	}, [input, t])

	return (
		<div className={stylex.props(styles.page).className}>
			<h1 className={stylex.props(styles.heading).className}>{t('toolbox.gachaAnalysisTitle')}</h1>
			<p className={stylex.props(styles.para).className}>
				<span>{t('toolbox.usageTitle')}</span>
			</p>
			<ul className={stylex.props(styles.steps).className}>
				<li>
					{t('toolbox.step1BeforeLink')}{' '}
					<a href='https://mc.kurogames.com/cloud/#/tools' target='_blank' className={stylex.props(styles.link).className}>
						https://mc.kurogames.com/cloud/#/tools
					</a>
					{t('toolbox.step1AfterLink')}
				</li>
				<li>
					{t('toolbox.step2BeforeF12')}
					<span className={stylex.props(styles.accent).className}>F12</span>
					{t('toolbox.step2BeforeNetwork')}
					<span className={stylex.props(styles.accent).className}>Network</span>
					{t('toolbox.step2BeforeExchange')}
					<span className={stylex.props(styles.accent).className}>{t('toolbox.exchangeRecord')}</span>
					{t('toolbox.step2BeforeQuery')}
					<span className={stylex.props(styles.accent).className}>query</span>
					{t('toolbox.step2AfterQuery')}
				</li>
				<li>
					{t('toolbox.step3BeforeQuery')}
					<span className={stylex.props(styles.accent).className}>query</span>
					{t('toolbox.step3BeforePreview')}
					<span className={stylex.props(styles.accent).className}>Preview</span>
					{t('toolbox.step3BeforeData')}
					<span className={stylex.props(styles.accent).className}>data</span>
					{t('toolbox.step3BeforeCopyValue')}
					<span className={stylex.props(styles.accent).className}>Copy Value</span>
					{t('toolbox.step3AfterCopyValue')}
				</li>
				<li>{t('toolbox.step4PasteAnalyze')}</li>
			</ul>

			<textarea
				value={input}
				onChange={e => setInput(e.target.value)}
				rows={5}
				spellCheck={false}
				className={stylex.props(styles.editor).className}
				style={{ maxHeight: '7.5rem' }}
				placeholder='[{"cardPoolType":"…","qualityLevel":4,"name":"…",...}, ...]'
			/>

			<button type='button' onClick={analyze} className={stylex.props(styles.analyzeBtn).className}>
				{t('toolbox.analyze')}
			</button>

			{error ? (
				<p className={stylex.props(styles.error).className} role='alert'>
					{error}
				</p>
			) : null}

			{segments.length > 0 ? (
				<ul className={stylex.props(styles.segmentList).className}>
					{segments.map((seg, i) => (
						<li key={i} {...stylex.props(styles.segmentItem, hoverGroup)}>
							<div
								className={stylex.props(styles.pullBar).className}
								style={{ width: seg.pulls * 4 + 16 }}
								title={t('toolbox.pullsCount', { count: seg.pulls })}>
								{seg.pulls}
							</div>
							<span className={stylex.props(styles.segmentName).className}>
								{seg.name ? (
									<span>
										{seg.name} <span {...stylex.props(styles.timeHint)}>({seg.time?.slice(0, 10)})</span>
									</span>
								) : (
									<span className={stylex.props(styles.pending).className}>{t('toolbox.notFiveStarYet')}</span>
								)}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}
