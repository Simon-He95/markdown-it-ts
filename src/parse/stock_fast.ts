import { Token } from '../common/token'

// Create a lookup table for special characters (faster than regex for short strings)
const INLINE_SPECIAL_CHARS = new Uint8Array(256)
const specialChars = [0x0A, 0x21, 0x23, 0x24, 0x25, 0x26, 0x2A, 0x2B, 0x2D, 0x3A, 0x3C, 0x3D, 0x3E, 0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F, 0x60, 0x7B, 0x7D, 0x7E]
for (const ch of specialChars) {
  INLINE_SPECIAL_CHARS[ch] = 1
}

const INLINE_TERMINATOR_RE = /[\n!#$%&*+\-:<=>@[\]\\^_`{}~]/
const JSON_CONTROL_CHAR_RANGE = '\\u0000-\\u001F'
const INLINE_AST_JSON_UNSAFE_RE = new RegExp(`[${JSON_CONTROL_CHAR_RANGE}"!#$%&*+\\-:<=>@[\\]\\\\^_\`{}~]`)

function isPlainInlineText(src: string): boolean {
  const len = src.length
  if (len <= 32) {
    for (let i = 0; i < len; i++) {
      const code = src.charCodeAt(i)
      if (code < 256 && INLINE_SPECIAL_CHARS[code])
        return false
    }
    return true
  }
  return !INLINE_TERMINATOR_RE.test(src)
}

function lineEnd(src: string, pos: number): number {
  const next = src.indexOf('\n', pos)
  return next === -1 ? src.length : next
}

function isBlankLine(src: string, start: number, end: number): boolean {
  for (let pos = start; pos < end; pos++) {
    const ch = src.charCodeAt(pos)
    if (ch !== 0x20 && ch !== 0x09)
      return false
  }
  return true
}

function startsWithFence(src: string, pos: number, end: number): boolean {
  return pos + 2 < end
    && src.charCodeAt(pos) === 0x60
    && src.charCodeAt(pos + 1) === 0x60
    && src.charCodeAt(pos + 2) === 0x60
}

function startsWithBulletItem(src: string, pos: number, end: number): boolean {
  return pos + 1 < end && src.charCodeAt(pos) === 0x2D && src.charCodeAt(pos + 1) === 0x20
}

function isShortPlainInlineText(src: string): boolean {
  if (src.length > 3)
    return isPlainInlineText(src)

  for (let pos = 0; pos < src.length; pos++) {
    switch (src.charCodeAt(pos)) {
      case 0x0A:
      case 0x21:
      case 0x23:
      case 0x24:
      case 0x25:
      case 0x26:
      case 0x2A:
      case 0x2B:
      case 0x2D:
      case 0x3A:
      case 0x3C:
      case 0x3D:
      case 0x3E:
      case 0x40:
      case 0x5B:
      case 0x5C:
      case 0x5D:
      case 0x5E:
      case 0x5F:
      case 0x60:
      case 0x7B:
      case 0x7D:
      case 0x7E:
        return false
    }
  }
  return true
}

function isShortPlainInlineTextRange(src: string, start: number, end: number): boolean {
  if (end - start > 3)
    return isPlainInlineText(src.slice(start, end))

  for (let pos = start; pos < end; pos++) {
    switch (src.charCodeAt(pos)) {
      case 0x0A:
      case 0x21:
      case 0x23:
      case 0x24:
      case 0x25:
      case 0x26:
      case 0x2A:
      case 0x2B:
      case 0x2D:
      case 0x3A:
      case 0x3C:
      case 0x3D:
      case 0x3E:
      case 0x40:
      case 0x5B:
      case 0x5C:
      case 0x5D:
      case 0x5E:
      case 0x5F:
      case 0x60:
      case 0x7B:
      case 0x7D:
      case 0x7E:
        return false
    }
  }
  return true
}

// Optimized range comparison - avoids creating substring
function rangeEqualsString(src: string, start: number, end: number, value: string): boolean {
  const len = value.length
  if (end - start !== len)
    return false

  // Unroll first few comparisons for common short strings
  if (len > 0 && src.charCodeAt(start) !== value.charCodeAt(0))
    return false
  if (len > 1 && src.charCodeAt(start + 1) !== value.charCodeAt(1))
    return false
  if (len > 2 && src.charCodeAt(start + 2) !== value.charCodeAt(2))
    return false

  for (let i = 3; i < len; i++) {
    if (src.charCodeAt(start + i) !== value.charCodeAt(i))
      return false
  }
  return true
}

const HEADING_TAGS = ['', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
const HEADING_MARKUPS = ['', '#', '##', '###', '####', '#####', '######'] as const
const PLAIN_CACHE_UNKNOWN = 0
const PLAIN_CACHE_ENABLED = 1
const PLAIN_CACHE_DISABLED = 2

function blockToken(type: string, tag: string, nesting: number, level: number): Token {
  const token = new Token(type, tag, nesting)
  token.level = level
  token.block = true
  return token
}

function inlineToken(content: string, line: number, level: number): Token {
  const token = blockToken('inline', '', 0, level)
  token.map = [line, line + 1]
  token.content = content
  const child = new Token('text', '', 0)
  child.content = content
  token.children = [child]

  return token
}

function pushAtxHeading(tokens: Token[], src: string, pos: number, end: number, line: number): boolean {
  let level = 0
  let markerEnd = pos
  while (markerEnd < end && src.charCodeAt(markerEnd) === 0x23 && level < 6) {
    markerEnd++
    level++
  }

  if (level === 0 || markerEnd >= end || src.charCodeAt(markerEnd) !== 0x20)
    return false

  let contentStart = markerEnd + 1
  while (contentStart < end && src.charCodeAt(contentStart) === 0x20)
    contentStart++

  let contentEnd = end
  while (contentEnd > contentStart && src.charCodeAt(contentEnd - 1) === 0x20)
    contentEnd--

  let markerStart = contentEnd
  while (markerStart > contentStart && src.charCodeAt(markerStart - 1) === 0x23)
    markerStart--

  if (markerStart > contentStart && src.charCodeAt(markerStart - 1) === 0x20) {
    contentEnd = markerStart - 1
    while (contentEnd > contentStart && src.charCodeAt(contentEnd - 1) === 0x20)
      contentEnd--
  }

  const content = src.slice(contentStart, contentEnd)
  if (!isPlainInlineText(content))
    return false

  const tag = HEADING_TAGS[level]
  const markup = HEADING_MARKUPS[level]
  const open = blockToken('heading_open', tag, 1, 0)
  open.map = [line, line + 1]
  open.markup = markup
  tokens.push(open)

  tokens.push(inlineToken(content, line, 1))

  const close = blockToken('heading_close', tag, -1, 0)
  close.markup = markup
  tokens.push(close)
  return true
}

function pushParagraph(tokens: Token[], content: string, line: number): void {
  const open = blockToken('paragraph_open', 'p', 1, 0)
  open.map = [line, line + 1]
  tokens.push(open)
  tokens.push(inlineToken(content, line, 1))
  tokens.push(blockToken('paragraph_close', 'p', -1, 0))
}

function paragraphContent(src: string, start: number, end: number): string {
  const lastCh = src.charCodeAt(end - 1)
  return lastCh === 0x20 || lastCh === 0x09 ? src.slice(start, end).trim() : src.slice(start, end)
}

function skipEmptyLines(src: string, pos: number): number {
  while (pos < src.length && src.charCodeAt(pos) === 0x0A) {
    pos++
  }
  return pos
}

function pushTightBulletListOpen(tokens: Token[], startLine: number): Token {
  const listOpen = blockToken('bullet_list_open', 'ul', 1, 0)
  listOpen.map = [startLine, startLine]
  listOpen.markup = '-'
  tokens.push(listOpen)
  return listOpen
}

function pushTightBulletListItem(tokens: Token[], content: string, line: number): Token {
  const itemOpen = blockToken('list_item_open', 'li', 1, 1)
  itemOpen.map = [line, line + 1]
  itemOpen.markup = '-'
  tokens.push(itemOpen)

  const paraOpen = blockToken('paragraph_open', 'p', 1, 2)
  paraOpen.map = [line, line + 1]
  paraOpen.hidden = true
  tokens.push(paraOpen)

  const inline = blockToken('inline', '', 0, 3)
  inline.map = [line, line + 1]
  inline.content = content
  const child = new Token('text', '', 0)
  child.content = content
  inline.children = [child]
  tokens.push(inline)

  const paraClose = blockToken('paragraph_close', 'p', -1, 2)
  paraClose.hidden = true
  tokens.push(paraClose)

  const itemClose = blockToken('list_item_close', 'li', -1, 1)
  itemClose.markup = '-'
  tokens.push(itemClose)
  return itemOpen
}

function pushTightBulletListClose(tokens: Token[]): void {
  const listClose = blockToken('bullet_list_close', 'ul', -1, 0)
  listClose.markup = '-'
  tokens.push(listClose)
}

function parseFence(src: string, pos: number, end: number, line: number): { token: Token, nextPos: number, nextLine: number } | null {
  if (!startsWithFence(src, pos, end))
    return null

  const info = src.slice(pos + 3, end)
  if (info.includes('`'))
    return null

  const contentStart = end < src.length ? end + 1 : end
  let contentEnd = contentStart
  let scan = contentStart
  let scanLine = line + 1

  while (scan < src.length) {
    const closeEnd = lineEnd(src, scan)
    if (startsWithFence(src, scan, closeEnd) && isBlankLine(src, scan + 3, closeEnd)) {
      const token = blockToken('fence', 'code', 0, 0)
      token.map = [line, scanLine + 1]
      token.markup = '```'
      token.info = info
      token.content = src.slice(contentStart, contentEnd)

      return {
        token,
        nextPos: closeEnd < src.length ? closeEnd + 1 : closeEnd,
        nextLine: scanLine + 1,
      }
    }

    scan = closeEnd < src.length ? closeEnd + 1 : closeEnd
    contentEnd = scan
    scanLine++
  }

  return null
}

type CodeAstJsonParts = [prefix: string, suffix: string]

function codeAstJsonParts(rawInfo: string, cache: Map<string, CodeAstJsonParts>): CodeAstJsonParts | null {
  const cached = cache.get(rawInfo)
  if (cached)
    return cached

  if (rawInfo.includes('`'))
    return null

  const info = rawInfo.trim()
  let parts: CodeAstJsonParts
  if (!info) {
    parts = ['{"type":"code","value":', '}']
  }
  else {
    let langEnd = info.length
    for (let i = 0; i < info.length; i++) {
      const ch = info.charCodeAt(i)
      if (ch === 0x20 || ch === 0x09) {
        langEnd = i
        break
      }
    }

    const lang = JSON.stringify(info.slice(0, langEnd))
    const meta = info.slice(langEnd).trim()
    parts = meta
      ? [`{"type":"code","lang":${lang},"meta":${JSON.stringify(meta)},"value":`, '}']
      : [`{"type":"code","lang":${lang},"value":`, '}']
  }

  cache.set(rawInfo, parts)
  return parts
}

function parseFenceAstJson(src: string, pos: number, end: number, cache: Map<string, CodeAstJsonParts>): { json: string, nextPos: number } | null {
  if (!startsWithFence(src, pos, end))
    return null

  const rawInfo = src.slice(pos + 3, end)
  const parts = codeAstJsonParts(rawInfo, cache)
  if (parts === null)
    return null

  const contentStart = end < src.length ? end + 1 : end
  let contentEnd = contentStart
  let scan = contentStart

  while (scan < src.length) {
    const closeEnd = lineEnd(src, scan)
    if (startsWithFence(src, scan, closeEnd) && isBlankLine(src, scan + 3, closeEnd)) {
      const content = JSON.stringify(src.slice(contentStart, contentEnd))
      return {
        json: parts[0] + content + parts[1],
        nextPos: closeEnd < src.length ? closeEnd + 1 : closeEnd,
      }
    }

    scan = closeEnd < src.length ? closeEnd + 1 : closeEnd
    contentEnd = scan
  }

  return null
}

function jsonShortInlineValue(src: string): string {
  if (src.length > 3)
    return JSON.stringify(src)

  for (let i = 0; i < src.length; i++) {
    const ch = src.charCodeAt(i)
    if (ch === 0x22 || ch < 0x20)
      return JSON.stringify(src)
  }

  return `"${src}"`
}

function plainInlineAstJsonValue(src: string): string | null {
  if (!INLINE_AST_JSON_UNSAFE_RE.test(src))
    return `"${src}"`

  if (!isPlainInlineText(src))
    return null

  return JSON.stringify(src)
}

function buildTightBulletListAstJson(src: string, pos: number, nextPos: number): string {
  let listJson = '{"type":"list","ordered":false,"spread":false,"children":['
  let firstItem = true
  let itemPos = pos

  while (itemPos < nextPos) {
    const itemEnd = lineEnd(src, itemPos)
    const content = src.slice(itemPos + 2, itemEnd)
    listJson += `${firstItem ? '' : ','}{"type":"listItem","spread":false,"children":[{"type":"paragraph","children":[{"type":"text","value":${jsonShortInlineValue(content)}}]}]}`
    firstItem = false
    itemPos = itemEnd < src.length ? itemEnd + 1 : itemEnd
  }

  return `${listJson}]}`
}

function atxHeadingAstJson(src: string, pos: number, end: number): string | null {
  let level = 0
  let markerEnd = pos
  while (markerEnd < end && src.charCodeAt(markerEnd) === 0x23 && level < 6) {
    markerEnd++
    level++
  }

  if (level === 0 || markerEnd >= end || src.charCodeAt(markerEnd) !== 0x20)
    return null

  let contentStart = markerEnd + 1
  while (contentStart < end && src.charCodeAt(contentStart) === 0x20)
    contentStart++

  let contentEnd = end
  while (contentEnd > contentStart && src.charCodeAt(contentEnd - 1) === 0x20)
    contentEnd--

  let markerStart = contentEnd
  while (markerStart > contentStart && src.charCodeAt(markerStart - 1) === 0x23)
    markerStart--

  if (markerStart > contentStart && src.charCodeAt(markerStart - 1) === 0x20) {
    contentEnd = markerStart - 1
    while (contentEnd > contentStart && src.charCodeAt(contentEnd - 1) === 0x20)
      contentEnd--
  }

  const content = src.slice(contentStart, contentEnd)
  const value = plainInlineAstJsonValue(content)
  if (value === null)
    return null

  return `{"type":"heading","depth":${level},"children":[{"type":"text","value":${value}}]}`
}

export function parseStockFastAstJson(src: string): string | null {
  if (src.length === 0)
    return '{"type":"root","children":[]}'

  if (src.includes('\r') || src.includes('\0'))
    return null

  const useChunks = src.length >= 1_500_000
  const compareListByRange = src.length >= 750_000
  const chunks: string[] = []
  let json = '{"type":"root","children":['
  let first = true
  let pos = 0
  const fenceInfoCache = new Map<string, CodeAstJsonParts>()
  let lastListSource = ''
  let lastListJson = ''
  let lastParagraph = ''
  let lastParagraphJson = ''

  while (pos < src.length) {
    const end = lineEnd(src, pos)
    const ch = src.charCodeAt(pos)

    if (pos === end) {
      pos = end < src.length ? end + 1 : end
      continue
    }

    if (ch === 0x20 || ch === 0x09) {
      if (!isBlankLine(src, pos, end))
        return null
      pos = end < src.length ? end + 1 : end
      continue
    }

    let node: string | null = null

    if (ch === 0x23) {
      node = atxHeadingAstJson(src, pos, end)
      if (node === null)
        return null
      pos = skipEmptyLines(src, end < src.length ? end + 1 : end)
    }
    else if (ch === 0x2D) {
      if (!startsWithBulletItem(src, pos, end))
        return null

      let firstItem = true
      let nextPos = pos

      while (nextPos < src.length) {
        const itemEnd = lineEnd(src, nextPos)
        if (!startsWithBulletItem(src, nextPos, itemEnd))
          break

        if (!isShortPlainInlineTextRange(src, nextPos + 2, itemEnd))
          return null

        firstItem = false
        nextPos = itemEnd < src.length ? itemEnd + 1 : itemEnd
      }

      if (firstItem)
        return null

      let lookahead = nextPos
      while (lookahead < src.length) {
        if (src.charCodeAt(lookahead) === 0x0A) {
          lookahead++
          continue
        }

        const lookaheadEnd = lineEnd(src, lookahead)
        if (!isBlankLine(src, lookahead, lookaheadEnd)) {
          if (startsWithBulletItem(src, lookahead, lookaheadEnd))
            return null
          break
        }
        lookahead = lookaheadEnd < src.length ? lookaheadEnd + 1 : lookaheadEnd
      }

      if (compareListByRange) {
        if (rangeEqualsString(src, pos, nextPos, lastListSource)) {
          node = lastListJson
        }
        else {
          node = buildTightBulletListAstJson(src, pos, nextPos)
          lastListSource = src.slice(pos, nextPos)
          lastListJson = node
        }
      }
      else {
        const listSource = src.slice(pos, nextPos)
        if (listSource === lastListSource) {
          node = lastListJson
        }
        else {
          node = buildTightBulletListAstJson(src, pos, nextPos)
          lastListSource = listSource
          lastListJson = node
        }
      }
      pos = lookahead
    }
    else if (ch === 0x60) {
      const fence = parseFenceAstJson(src, pos, end, fenceInfoCache)
      if (!fence)
        return null
      node = fence.json
      pos = skipEmptyLines(src, fence.nextPos)
    }
    else {
      const paragraph = paragraphContent(src, pos, end)
      if (paragraph === lastParagraph) {
        node = lastParagraphJson
      }
      else {
        const paragraphValue = plainInlineAstJsonValue(paragraph)
        if (paragraphValue === null)
          return null
        node = `{"type":"paragraph","children":[{"type":"text","value":${paragraphValue}}]}`
        lastParagraph = paragraph
        lastParagraphJson = node
      }

      const nextPos = end < src.length ? end + 1 : end
      if (nextPos < src.length && src.charCodeAt(nextPos) !== 0x0A) {
        const nextEnd = lineEnd(src, nextPos)
        if (!isBlankLine(src, nextPos, nextEnd))
          return null
      }

      pos = skipEmptyLines(src, nextPos)
    }

    if (node === null)
      return null
    if (useChunks)
      chunks.push(first ? node : `,${node}`)
    else
      json += first ? node : `,${node}`
    first = false
  }

  return useChunks ? `${json}${chunks.join('')}]}` : `${json}]}`
}

export function parseStockFast(src: string): Token[] | null {
  if (src.length === 0)
    return []

  if (src.includes('\r') || src.includes('\0'))
    return null

  const tokens: Token[] = []
  let plainInlineCacheMode = src.length >= 100_000 ? PLAIN_CACHE_UNKNOWN : PLAIN_CACHE_DISABLED
  let lastPlainInline = ''
  let lastPlainInlineOk = false
  let lastPlainInlineSeen = false
  let pos = 0
  let line = 0

  while (pos < src.length) {
    const end = lineEnd(src, pos)

    if (pos === end) {
      pos = end < src.length ? end + 1 : end
      line++
      continue
    }

    const ch = src.charCodeAt(pos)

    if (ch === 0x20 || ch === 0x09) {
      if (!isBlankLine(src, pos, end))
        return null
      pos = end < src.length ? end + 1 : end
      line++
      continue
    }

    if (ch === 0x23) {
      if (!pushAtxHeading(tokens, src, pos, end, line))
        return null
      const nextPos = end < src.length ? end + 1 : end
      pos = skipEmptyLines(src, nextPos)
      line += 1 + pos - nextPos
      continue
    }

    if (ch === 0x2D) {
      if (!startsWithBulletItem(src, pos, end))
        return null

      const startLine = line
      let nextPos = pos
      let nextLine = line
      let listOpen: Token | null = null
      let lastItemOpen: Token | null = null

      while (nextPos < src.length) {
        const itemEnd = lineEnd(src, nextPos)
        if (!startsWithBulletItem(src, nextPos, itemEnd))
          break

        const contentStart = nextPos + 2
        const content = itemEnd === contentStart + 1 ? src[contentStart] : src.slice(contentStart, itemEnd)
        if (!isShortPlainInlineText(content))
          return null

        if (listOpen === null)
          listOpen = pushTightBulletListOpen(tokens, startLine)
        lastItemOpen = pushTightBulletListItem(tokens, content, nextLine)
        nextPos = itemEnd < src.length ? itemEnd + 1 : itemEnd
        nextLine++
      }

      if (listOpen === null || lastItemOpen === null)
        return null

      let lookahead = nextPos
      let lookaheadLine = nextLine
      while (lookahead < src.length) {
        if (src.charCodeAt(lookahead) === 0x0A) {
          lookahead++
          lookaheadLine++
          continue
        }

        const lookaheadEnd = lineEnd(src, lookahead)
        if (!isBlankLine(src, lookahead, lookaheadEnd)) {
          if (startsWithBulletItem(src, lookahead, lookaheadEnd))
            return null
          break
        }
        lookahead = lookaheadEnd < src.length ? lookaheadEnd + 1 : lookaheadEnd
        lookaheadLine++
      }

      listOpen.map![1] = lookaheadLine
      lastItemOpen.map![1] = lookaheadLine
      pushTightBulletListClose(tokens)
      pos = lookahead
      line = lookaheadLine
      continue
    }

    if (ch === 0x60) {
      const fence = parseFence(src, pos, end, line)
      if (!fence)
        return null
      tokens.push(fence.token)
      pos = skipEmptyLines(src, fence.nextPos)
      line = fence.nextLine + pos - fence.nextPos
      continue
    }

    const paragraph = paragraphContent(src, pos, end)
    let paragraphIsPlain: boolean
    if (plainInlineCacheMode === PLAIN_CACHE_DISABLED) {
      paragraphIsPlain = isPlainInlineText(paragraph)
    }
    else if (plainInlineCacheMode === PLAIN_CACHE_ENABLED && paragraph === lastPlainInline) {
      paragraphIsPlain = lastPlainInlineOk
    }
    else {
      paragraphIsPlain = isPlainInlineText(paragraph)
      if (plainInlineCacheMode === PLAIN_CACHE_UNKNOWN) {
        if (lastPlainInlineSeen)
          plainInlineCacheMode = paragraph === lastPlainInline ? PLAIN_CACHE_ENABLED : PLAIN_CACHE_DISABLED
        lastPlainInline = paragraph
        lastPlainInlineOk = paragraphIsPlain
        lastPlainInlineSeen = true
      }
      else if (plainInlineCacheMode === PLAIN_CACHE_ENABLED) {
        lastPlainInline = paragraph
        lastPlainInlineOk = paragraphIsPlain
      }
    }

    if (!paragraphIsPlain)
      return null

    const nextPos = end < src.length ? end + 1 : end
    if (nextPos < src.length && src.charCodeAt(nextPos) !== 0x0A) {
      const nextEnd = lineEnd(src, nextPos)
      if (!isBlankLine(src, nextPos, nextEnd))
        return null
    }

    pushParagraph(tokens, paragraph, line)
    pos = skipEmptyLines(src, nextPos)
    line += 1 + pos - nextPos
  }

  return tokens
}
