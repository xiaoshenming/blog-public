import { describe, expect, it } from 'vitest'
import { detectLyricSourceFormat, parseLyricSource, parseLyricSourceData } from './index'

/** 逐词时间轴的公共不变量：行有序、每行有词、词时间单调且落在行区间内 */
function expectWordTimelineInvariants(lines: ReturnType<typeof parseLyricSource>) {
	expect(lines.length).toBeGreaterThan(0)
	for (let i = 1; i < lines.length; i++) {
		expect(lines[i].startTime).toBeGreaterThanOrEqual(lines[i - 1].startTime)
	}
	for (const line of lines) {
		expect(line.words.length).toBeGreaterThan(0)
		for (const word of line.words) {
			expect(word.startTime).toBeGreaterThanOrEqual(line.startTime - 0.05)
			expect(word.endTime).toBeLessThanOrEqual(line.endTime + 0.05)
			expect(word.endTime).toBeGreaterThan(word.startTime)
		}
		for (let i = 1; i < line.words.length; i++) {
			expect(line.words[i].startTime).toBeGreaterThanOrEqual(line.words[i - 1].startTime)
		}
	}
}

describe('parseLyricSource：普通双语 LRC', () => {
	const source = ['[ti:测试]', '[00:01.00]第一句歌词', '[00:01.00]first line translation', '[00:05.00]第二句歌词', '[00:09.00]第三句'].join('\n')

	it('识别为 lrc 并合并同时间戳的翻译行', () => {
		expect(detectLyricSourceFormat(source)).toBe('lrc')
		const lines = parseLyricSource(source)
		expect(lines).toHaveLength(3)
		expect(lines[0].fullText).toBe('第一句歌词')
		expect(lines[0].translation).toBe('first line translation')
		expect(lines[2].translation).toBeUndefined()
	})

	it('为无词级行生成伪逐词时间轴：单调递增且落在行区间内', () => {
		const lines = parseLyricSource(source)
		expectWordTimelineInvariants(lines)
		const first = lines[0]
		expect(first.words[0].text).not.toBe('')
		// 首词从行首开始
		expect(first.words[0].startTime).toBeCloseTo(1.0, 1)
	})

	it('行按 startTime 排序', () => {
		const lines = parseLyricSource('[00:09.00]c\n[00:01.00]a\n[00:05.00]b')
		expect(lines.map(l => l.fullText)).toEqual(['a', 'b', 'c'])
	})
})

describe('parseLyricSource：增强 LRC 词级标签', () => {
	const source = '[00:01.00]<00:01.00>Hel<00:01.40>lo <00:02.00>world\n[00:04.00]第二行'

	it('识别为 enhanced-lrc 且词时间取自标签', () => {
		expect(detectLyricSourceFormat(source)).toBe('enhanced-lrc')
		const [first] = parseLyricSource(source)
		expectWordTimelineInvariants([first])
		expect(first.words[0]).toMatchObject({ text: 'Hel', startTime: 1.0 })
		expect(first.words[1].startTime).toBeCloseTo(1.4, 3)
	})
})

describe('parseLyricSource：YRC', () => {
	// 真实 YRC：行头 [起始毫秒,时长毫秒]，词组 (起始,时长,0)文本；首行可为 JSON 元数据
	const source = [
		'{"t":0,"c":[{"tx":"作词: "},{"tx":"某人"}]}',
		'[1000,3000](1000,500,0)我(1500,500,0)们(2000,1000,0)的(3000,1000,0)歌',
		'[5000,2000](5000,1000,0)Hello (6000,1000,0)World'
	].join('\n')

	it('识别为 yrc 并保留逐词起止时间', () => {
		expect(detectLyricSourceFormat(source)).toBe('yrc')
		const lines = parseLyricSource(source)
		expectWordTimelineInvariants(lines)
		expect(lines[0].words.map(w => [w.text, w.startTime])).toContainEqual(['们', 1.5])
		expect(lines[0].endTime).toBeCloseTo(4, 1)
	})
})

describe('parseLyricSource：TTML', () => {
	const source = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" itunes:timing="Word">',
		'<body><div>',
		'<p begin="00:01.000" end="00:03.000">',
		'<span begin="00:01.000" end="00:02.000">Hel</span><span begin="00:02.000" end="00:03.000">lo</span>',
		'<span ttm:role="x-translation" xml:lang="zh-CN">你好</span>',
		'</p>',
		'</div></body></tt>'
	].join('\n')

	it('识别为 ttml，逐字合并为词并提取翻译', () => {
		expect(detectLyricSourceFormat(source)).toBe('ttml')
		const lines = parseLyricSource(source)
		expectWordTimelineInvariants(lines)
		expect(lines[0].fullText).toContain('Hello')
		expect(lines[0].translation).toBe('你好')
	})

	it('itunes:timing="Word" 时 LyricData.isWordByWord 为 true（上游仅 TTML/awlrc 设置该标记）', () => {
		expect(parseLyricSourceData(source).isWordByWord).toBe(true)
		expect(parseLyricSourceData('[00:01.00]普通行').isWordByWord).toBeUndefined()
	})
})

describe('边界情况', () => {
	it('空输入与纯标签输入返回空数组', () => {
		expect(parseLyricSource('')).toEqual([])
		expect(parseLyricSource('[ti:x]\n[ar:y]')).toEqual([])
	})

	it('错误内容不抛异常', () => {
		expect(() => parseLyricSource('这不是歌词<<<>>>{{}}')).not.toThrow()
	})
})
