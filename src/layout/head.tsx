interface HeadProps {
	/** 站点当前字体需要的样式表，由 layout 根据 site-content 中的 font 解析后传入 */
	fontCssHref?: string
}

export default function Head({ fontCssHref }: HeadProps) {
	return (
		<head>
			<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' />
			<link rel='manifest' href='/manifest.json' />

			<link rel='icon' href='/favicon.png' />

			{fontCssHref && <link rel='stylesheet' href={fontCssHref} data-font-css='' />}
		</head>
	)
}
