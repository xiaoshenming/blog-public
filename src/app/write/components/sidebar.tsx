import { CoverSection } from './sections/cover-section'
import { MetaSection } from './sections/meta-section'
import { ImagesSection } from './sections/images-section'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'
import * as stylex from '@stylexjs/stylex'

/** 原 Tailwind → StyleX 对照（数值取自 Tailwind v4 编译产物） */
const styles = stylex.create({
	/** 侧栏：定宽纵向堆叠（原块间距改为纵向间隙） */
	sidebar: {
		width: 320,
		display: 'flex',
		flexDirection: 'column',
		gap: 24
	}
})

export function WriteSidebar() {
	return (
		<div {...stylex.props(styles.sidebar)}>
			<CoverSection delay={INIT_DELAY + ANIMATION_DELAY * 0} />
			<MetaSection delay={INIT_DELAY + ANIMATION_DELAY * 1} />
			<ImagesSection delay={INIT_DELAY + ANIMATION_DELAY * 2} />
		</div>
	)
}
