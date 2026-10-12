interface HeadProps {
	/** 站点当前字体需要的样式表，由 layout 根据 site-content 中的 font 解析后传入 */
	fontCssHref?: string
	/** 皮肤/字体的访客偏好引导脚本：必须在首次绘制前执行，否则会闪回站长默认皮肤 */
	preferenceBootstrap?: string
}

export default function Head({ fontCssHref, preferenceBootstrap }: HeadProps) {
	return (
		<head>
			<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' />
			<link rel='manifest' href='/manifest.json' />

			<link rel='icon' href='/favicon.png' />

			{fontCssHref && <link rel='stylesheet' href={fontCssHref} data-font-css='' />}
			{preferenceBootstrap && <script dangerouslySetInnerHTML={{ __html: preferenceBootstrap }} />}
		</head>
	)
}
