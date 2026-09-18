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
	}
})

export default function Layout({ children }: PropsWithChildren) {
	useCenterInit()
	useSizeInit()
	const pathname = usePathname()
	const { backgroundImages, currentBackgroundImageId, backgroundColors, regenerateKey } = useConfigStore(
		useShallow(s => ({
			backgroundImages: (s.siteContent as any).backgroundImages as Array<{ id: string; url: string }> | undefined,
			currentBackgroundImageId: s.siteContent.currentBackgroundImageId,
			backgroundColors: s.siteContent.backgroundColors,
			regenerateKey: s.regenerateKey
		}))
	)
	const { maxSM, init } = useSize()

	const images = backgroundImages ?? []
	const currentBackgroundImage = currentBackgroundImageId && currentBackgroundImageId.trim() ? images.find(item => item.id === currentBackgroundImageId) : null

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
			{currentBackgroundImage && (
				<div
					{...stylex.props(styles.background)}
					style={{
						backgroundImage: `url(${currentBackgroundImage.url})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						backgroundRepeat: 'no-repeat'
					}}
				/>
			)}
			<BlurredBubblesBackground colors={backgroundColors} regenerateKey={regenerateKey} />

			<main {...stylex.props(styles.main)}>
				{children}
				<NavCard />
			</main>

			{maxSM && init && (
				<ScrollTopButton
					style={pathname === '/' ? [styles.scrollTopBase, styles.scrollTopHome] : [styles.scrollTopBase, styles.scrollTopDefault]}
				/>
			)}
		</>
	)
}
