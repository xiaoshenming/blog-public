'use client'
import { PropsWithChildren } from 'react'
import { useCenterInit } from '@/hooks/use-center'
import BlurredBubblesBackground from './backgrounds/blurred-bubbles'
import NavCard from '@/components/nav-card'
import { Toaster } from 'sonner'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { useSize, useSizeInit } from '@/hooks/use-size'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { useShallow } from 'zustand/react/shallow'
import { ScrollTopButton } from '@/components/scroll-top-button'
import LanguageToggle from '@/components/language-toggle'
import SkinToggle from '@/components/skin-toggle'
import FontToggle from '@/components/font-toggle'
import SkinDecor from '@/components/skin-decor'
import { usePathname } from 'next/navigation'
import * as stylex from '@stylexjs/stylex'
import { util } from '@/styles/shared/util.stylex'

const styles = stylex.create({
	background: {
		position: 'fixed',
		inset: 0,
		zIndex: 0,
		overflow: 'hidden'
	},
	main: {
		position: 'relative',
		zIndex: 10,
		height: '100%'
	},
	/** 原 Tailwind：bg-brand/20 fixed right-6 z-50 shadow-md bottom-20|bottom-6 */
	scrollTopBase: {
		position: 'fixed',
		right: 24,
		zIndex: 50,
		backgroundColor: 'color-mix(in oklab, var(--color-brand) 20%, transparent)',
		boxShadow: '0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)'
	},
	scrollTopHome: {
		bottom: 80
	},
	scrollTopDefault: {
		bottom: 24
	},
	/**
	 * 左下角常驻工具栏：语言 / 皮肤 / 字体三个切换按钮**竖向**排列。
	 * 竖向而非横向的原因：横向一排会向右伸得很长，窄屏与页面内容互相遮挡。
	 * 定位由容器统一负责（三个按钮组件自身只做 relative），间距交给 gap，
	 * 因此不依赖任一按钮的渲染宽度。
	 */
	dockRow: {
		position: 'fixed',
		left: 24,
		zIndex: 40,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: 8
	},
	dockRowDesktop: {
		bottom: 24
	},
	/** 移动端 mini 播放条占 bottom-3 通栏，整体上移一层 */
	dockRowMobile: {
		bottom: 80
	}
})

export default function Layout({ children }: PropsWithChildren) {
	useCenterInit()
	useSizeInit()
	const pathname = usePathname()
	const { backgroundColors, regenerateKey } = useConfigStore(
		useShallow(s => ({
			backgroundColors: s.siteContent.backgroundColors,
			regenerateKey: s.regenerateKey
		}))
	)
	const { maxSM, init } = useSize()

	return (
		<>
			<Toaster
				position='bottom-right'
				richColors
				icons={{
					success: <CircleCheckIcon {...stylex.props(util.iconSm)} />,
					info: <InfoIcon {...stylex.props(util.iconSm)} />,
					warning: <TriangleAlertIcon {...stylex.props(util.iconSm)} />,
					error: <OctagonXIcon {...stylex.props(util.iconSm)} />,
					loading: <Loader2Icon {...stylex.props(util.iconSm, util.spinner)} />
				}}
				style={
					{
						'--border-radius': '12px'
					} as React.CSSProperties
				}
			/>
			{/*
			 * 背景图由 --skin-bg-image 驱动（SSR 注入站长设置，引导脚本在首次绘制前覆盖为访客偏好），
			 * 无图时变量为 none。始终渲染这一层，避免条件渲染带来的挂载时序差异。
			 */}
			<div
				{...stylex.props(styles.background)}
				style={{
					backgroundImage: 'var(--skin-bg-image, none)',
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundRepeat: 'no-repeat'
				}}
			/>
			<BlurredBubblesBackground colors={backgroundColors} regenerateKey={regenerateKey} />
			<SkinDecor />

			<main {...stylex.props(styles.main)}>
				{children}
				<NavCard />
			</main>

			<div {...stylex.props(styles.dockRow, maxSM ? styles.dockRowMobile : styles.dockRowDesktop)}>
				<LanguageToggle />
				<SkinToggle />
				<FontToggle />
			</div>

			{maxSM && init && (
				<ScrollTopButton style={pathname === '/' ? [styles.scrollTopBase, styles.scrollTopHome] : [styles.scrollTopBase, styles.scrollTopDefault]} />
			)}
		</>
	)
}
