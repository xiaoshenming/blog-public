import clsx, { ClassValue } from 'clsx'

/** 拼接类名（原 twMerge 已随 Tailwind 移除：双体系期样式冲突由 styleq 运行时处理） */
export function cn(...inputs: ClassValue[]) {
	return clsx(...inputs)
}

export function thousandsSeparator(n: string | number | any, sign: string = ',') {
	if (typeof n === 'string' || typeof n === 'number') {
		n = String(n)
		const reg = /\B(?=(\d{3})+($|\.))/g

		if (n.includes('.')) {
			const nArr = n.split('.')
			nArr[0] = nArr[0].replace(reg, `$&${sign}`)

			return nArr.join('.')
		}

		return n.replace(reg, `$&${sign}`)
	} else return 0
}

export function getFileExt(filename: string): string {
	const lower = filename.toLowerCase()
	if (lower.endsWith('.jpg')) return '.jpg'
	if (lower.endsWith('.jpeg')) return '.jpeg'
	if (lower.endsWith('.webp')) return '.webp'
	if (lower.endsWith('.png')) return '.png'
	if (lower.endsWith('.svg')) return '.svg'
	return '.png'
}

export function rand(a: number, b: number) {
	return a + Math.random() * (b - a)
}
