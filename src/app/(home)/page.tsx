'use client'

import HiCard from '@/app/(home)/hi-card'
import ArtCard from '@/app/(home)/art-card'
import ClockCard from '@/app/(home)/clock-card'
import CalendarCard from '@/app/(home)/calendar-card'
import SocialButtons from '@/app/(home)/social-buttons'
import ShareCard from '@/app/(home)/share-card'
import AritcleCard from '@/app/(home)/aritcle-card'
import WriteButtons from '@/app/(home)/write-buttons'
import LikePosition from './like-position'
import HatCard from './hat-card'
import BeianCard from './beian-card'
import { useSize } from '@/hooks/use-size'
import { useLayoutEditStore } from './stores/layout-edit-store'
import { useConfigStore } from './stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const ConfigDialog = dynamic(() => import('./config-dialog/index'), { ssr: false })
import { useEffect } from 'react'
import SnowfallBackground from '@/layout/backgrounds/snowfall'
import MusicCard from '@/components/music-card'
import MusicMiniBar from '@/components/music-mini-bar'
import * as stylex from '@stylexjs/stylex'
import { colors } from '@/styles/tokens.stylex'
import { card } from '@/styles/shared/card.stylex'
import { brandBtn } from '@/styles/shared/button.stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const sx = stylex.create({
	/** 编辑栏外层：固定顶栏、水平居中、上边距 24、不响应指针、层级 50 */
	editBarWrap: {
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 50,
		display: 'flex',
		justifyContent: 'center',
		paddingTop: 24,
		pointerEvents: 'none'
	},
	/** 编辑栏主体：横向排列、间距 12、大圆角、半透明白底、内边距、软阴影、背景模糊 */
	editBar: {
		pointerEvents: 'auto',
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		borderRadius: 16,
		backgroundColor: 'rgb(255 255 255 / 80%)',
		paddingInline: 16,
		paddingBlock: 8,
		boxShadow: '0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)',
		backdropFilter: 'blur(8px)'
	},
	/** 提示文字：小号、灰色 */
	editHint: {
		fontSize: 12,
		lineHeight: '16px',
		color: '#4a5565'
	},
	/** 按钮组：横向排列、间距 8 */
	editActions: {
		display: 'flex',
		gap: 8
	},
	/** 取消按钮：小圆角、描边、白底、小号文字、中等字重、深灰文字 */
	cancelButton: {
		borderRadius: 12,
		borderWidth: 1,
		borderStyle: 'solid',
		borderColor: colors.border,
		backgroundColor: colors.white,
		paddingInline: 12,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px',
		fontWeight: 500,
		color: '#364153'
	},
	/** 保存按钮附加：小号内边距与文字（覆盖品牌按钮默认尺寸） */
	saveButton: {
		paddingInline: 12,
		paddingBlock: 4,
		fontSize: 12,
		lineHeight: '16px'
	},
	/** 卡片区：小屏改为纵向弹性布局、居中、间距 24、上下内边距 */
	cardArea: {
		'@media (width < 40rem)': {
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			gap: 24,
			paddingTop: 112,
			paddingBottom: 80
		}
	}
})

export default function Home() {
	const { maxSM } = useSize()
	const { cardStyles, configDialogOpen, setConfigDialogOpen, enableChristmas } = useConfigStore(
		useShallow(s => ({
			cardStyles: s.cardStyles,
			configDialogOpen: s.configDialogOpen,
			setConfigDialogOpen: s.setConfigDialogOpen,
			enableChristmas: (s.siteContent as any).enableChristmas as boolean | undefined
		}))
	)
	const editing = useLayoutEditStore(state => state.editing)
	const saveEditing = useLayoutEditStore(state => state.saveEditing)
	const cancelEditing = useLayoutEditStore(state => state.cancelEditing)

	const handleSave = () => {
		saveEditing()
		toast.success('首页布局偏移已保存（尚未提交到远程配置）')
	}

	const handleCancel = () => {
		cancelEditing()
		toast.info('已取消此次拖拽布局修改')
	}

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === ',')) {
				e.preventDefault()
				setConfigDialogOpen(true)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [setConfigDialogOpen])

	return (
		<>
			{enableChristmas && <SnowfallBackground zIndex={0} count={!maxSM ? 125 : 20} />}

			{editing && (
				<div {...stylex.props(sx.editBarWrap)}>
					<div {...stylex.props(sx.editBar)}>
						<span {...stylex.props(sx.editHint)}>正在编辑首页布局，拖拽卡片调整位置</span>
						<div {...stylex.props(sx.editActions)}>
							<button type='button' onClick={handleCancel} {...stylex.props(card.hover, sx.cancelButton)}>
								取消
							</button>
							<button type='button' onClick={handleSave} {...stylex.props(brandBtn.base, card.hover, sx.saveButton)}>
								保存偏移
							</button>
						</div>
					</div>
				</div>
			)}

			<div {...stylex.props(sx.cardArea)}>
				{cardStyles.artCard?.enabled !== false && <ArtCard />}
				{cardStyles.hiCard?.enabled !== false && <HiCard />}
				{!maxSM && cardStyles.clockCard?.enabled !== false && <ClockCard />}
				{!maxSM && cardStyles.calendarCard?.enabled !== false && <CalendarCard />}
				{cardStyles.socialButtons?.enabled !== false && <SocialButtons />}
				{!maxSM && cardStyles.shareCard?.enabled !== false && <ShareCard />}
				{cardStyles.articleCard?.enabled !== false && <AritcleCard />}
				{!maxSM && cardStyles.writeButtons?.enabled !== false && <WriteButtons />}
				{cardStyles.likePosition?.enabled !== false && <LikePosition />}
				{cardStyles.hatCard?.enabled !== false && <HatCard />}
				{cardStyles.beianCard?.enabled !== false && <BeianCard />}
				{!maxSM && cardStyles.musicCard?.enabled !== false && <MusicCard />}
			</div>

			{maxSM && cardStyles.musicCard?.enabled !== false && <MusicMiniBar />}
			{enableChristmas && <SnowfallBackground zIndex={2} count={!maxSM ? 125 : 20} />}
			<ConfigDialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} />
		</>
	)
}
