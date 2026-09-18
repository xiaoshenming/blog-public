'use client'

import { useEffect } from 'react'
import { CheckIcon } from 'lucide-react'
import { FONT_OPTIONS, getFontOption } from '@/config/fonts'
import { applyFont, ensureFontCss } from '@/lib/font'
import { cn } from '@/lib/utils'
import type { SiteContent } from '../stores/config-store'

interface FontConfigProps {
	formData: SiteContent
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

/* 同时包含简体、繁体、标点、英文与数字，方便对比覆盖范围与字形 */
const SAMPLE_TEXT = '落霞与孤鹜齐飞，秋水共长天一色。漢字體 The quick brown fox 0123456789'

export function FontConfig({ formData, setFormData }: FontConfigProps) {
	const currentId = getFontOption(formData.font).id

	// 进入此 tab 就把所有候选字体的样式表挂上，示例文字才能以真实字体渲染
	useEffect(() => {
		FONT_OPTIONS.forEach(font => ensureFontCss(font.cssHref))
	}, [])

	const handleSelect = (id: string) => {
		setFormData(prev => ({ ...prev, font: id }))
		applyFont(id)
	}

	return (
		<div className='space-y-6'>
			<div>
				<label className='mb-2 block text-sm font-medium'>全站字体</label>
				<p className='text-secondary mb-3 text-xs'>点选后整站立即预览；「保存」提交后对所有访客生效，「取消」则还原为原来的字体。</p>
				<div className='flex flex-col gap-3'>
					{FONT_OPTIONS.map(font => {
						const active = font.id === currentId
						return (
							<button
								key={font.id}
								type='button'
								onClick={() => handleSelect(font.id)}
								className={cn(
									'flex items-start gap-3 rounded-lg border bg-white/60 p-4 text-left transition-colors hover:bg-white/80',
									active && 'border-brand ring-brand/30 ring-2'
								)}>
								<div className='min-w-0 flex-1'>
									<div className='flex items-center gap-2'>
										<span className='text-sm font-medium'>{font.name}</span>
										{active && <CheckIcon className='text-brand size-4 shrink-0' />}
									</div>
									<p className='text-secondary mt-0.5 text-xs'>{font.description}</p>
									<p className='mt-3 text-base leading-relaxed' style={{ fontFamily: font.family }}>
										{SAMPLE_TEXT}
									</p>
								</div>
							</button>
						)
					})}
				</div>
			</div>
		</div>
	)
}
