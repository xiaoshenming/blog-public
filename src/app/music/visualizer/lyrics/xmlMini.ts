// A dependency-free XML tree reader for TTML lyric documents.
//
// The blog has neither a DOM in every runtime this code may run in (the smoke tests run under Node)
// nor `@xmldom/xmldom`, so the TTML reader works on this tiny tree instead of a DOM. Namespace
// prefixes are kept verbatim in `name` / attribute keys and exposed through `localName` lookups, which
// is all the TTML vocabulary (`tt:p`, `ttm:role`, `itunes:key`, `xml:lang`) needs.

export interface XmlElement {
	type: 'element'
	name: string
	localName: string
	attrs: Record<string, string>
	children: XmlNode[]
}

export interface XmlText {
	type: 'text'
	text: string
}

export type XmlNode = XmlElement | XmlText

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: '\u00a0'
}

export const decodeXmlEntities = (value: string): string =>
	value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
		if (entity.startsWith('#x')) {
			return String.fromCodePoint(parseInt(entity.slice(2), 16))
		}
		if (entity.startsWith('#')) {
			return String.fromCodePoint(parseInt(entity.slice(1), 10))
		}
		return NAMED_ENTITIES[entity] ?? match
	})

const localNameOf = (qualifiedName: string): string => {
	const colon = qualifiedName.indexOf(':')
	return colon === -1 ? qualifiedName : qualifiedName.slice(colon + 1)
}

const ATTRIBUTE_REGEX = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

const parseAttributes = (source: string): Record<string, string> => {
	const attrs: Record<string, string> = {}
	ATTRIBUTE_REGEX.lastIndex = 0
	let match: RegExpExecArray | null
	while ((match = ATTRIBUTE_REGEX.exec(source)) !== null) {
		attrs[match[1]] = decodeXmlEntities(match[2] ?? match[3] ?? match[4] ?? '')
	}
	return attrs
}

/**
 * Parses an XML string into a lightweight tree. Prolog, comments, doctype and processing
 * instructions are skipped; CDATA becomes text. Malformed input degrades gracefully (unclosed
 * elements are closed at the end of the document) instead of throwing.
 */
export const parseXml = (source: string): XmlElement => {
	const root: XmlElement = { type: 'element', name: '#document', localName: '#document', attrs: {}, children: [] }
	const stack: XmlElement[] = [root]
	const length = source.length
	let position = 0

	const current = () => stack[stack.length - 1]
	const pushText = (text: string) => {
		if (text) {
			current().children.push({ type: 'text', text })
		}
	}

	while (position < length) {
		const tagStart = source.indexOf('<', position)
		if (tagStart === -1) {
			pushText(decodeXmlEntities(source.slice(position)))
			break
		}

		if (tagStart > position) {
			pushText(decodeXmlEntities(source.slice(position, tagStart)))
		}

		if (source.startsWith('<!--', tagStart)) {
			const end = source.indexOf('-->', tagStart + 4)
			position = end === -1 ? length : end + 3
			continue
		}

		if (source.startsWith('<![CDATA[', tagStart)) {
			const end = source.indexOf(']]>', tagStart + 9)
			pushText(source.slice(tagStart + 9, end === -1 ? length : end))
			position = end === -1 ? length : end + 3
			continue
		}

		if (source.startsWith('<?', tagStart) || source.startsWith('<!', tagStart)) {
			const end = source.indexOf('>', tagStart)
			position = end === -1 ? length : end + 1
			continue
		}

		const tagEnd = findTagEnd(source, tagStart)
		const rawTag = source.slice(tagStart + 1, tagEnd)
		position = tagEnd + 1

		if (rawTag.startsWith('/')) {
			const closingName = rawTag.slice(1).trim()
			// Close up to the matching element; a stray closing tag is ignored.
			for (let index = stack.length - 1; index > 0; index -= 1) {
				if (stack[index].name === closingName) {
					stack.length = index
					break
				}
			}
			continue
		}

		const selfClosing = rawTag.endsWith('/')
		const body = selfClosing ? rawTag.slice(0, -1) : rawTag
		const nameMatch = body.match(/^\s*([^\s\/>]+)/)
		if (!nameMatch) {
			continue
		}

		const element: XmlElement = {
			type: 'element',
			name: nameMatch[1],
			localName: localNameOf(nameMatch[1]),
			attrs: parseAttributes(body.slice(nameMatch[0].length)),
			children: []
		}
		current().children.push(element)
		if (!selfClosing) {
			stack.push(element)
		}
	}

	return root
}

/** Finds the `>` closing a tag while skipping quoted attribute values that may contain `>`. */
const findTagEnd = (source: string, tagStart: number): number => {
	let quote: string | null = null
	for (let index = tagStart + 1; index < source.length; index += 1) {
		const char = source[index]
		if (quote) {
			if (char === quote) quote = null
		} else if (char === '"' || char === "'") {
			quote = char
		} else if (char === '>') {
			return index
		}
	}
	return source.length - 1
}

export const getAttribute = (element: XmlElement, localName: string): string | undefined => {
	if (element.attrs[localName] !== undefined) {
		return element.attrs[localName]
	}
	for (const key of Object.keys(element.attrs)) {
		if (localNameOf(key) === localName) {
			return element.attrs[key]
		}
	}
	return undefined
}

export const childElements = (element: XmlElement): XmlElement[] => element.children.filter((child): child is XmlElement => child.type === 'element')

export const textContent = (node: XmlNode): string => (node.type === 'text' ? node.text : node.children.map(textContent).join(''))

/** Depth-first search for every descendant element with the given local name. */
export const findElements = (element: XmlElement, localName: string, into: XmlElement[] = []): XmlElement[] => {
	for (const child of childElements(element)) {
		if (child.localName === localName) {
			into.push(child)
		}
		findElements(child, localName, into)
	}
	return into
}

export const findFirstElement = (element: XmlElement, localName: string): XmlElement | undefined => {
	for (const child of childElements(element)) {
		if (child.localName === localName) {
			return child
		}
		const nested = findFirstElement(child, localName)
		if (nested) {
			return nested
		}
	}
	return undefined
}
