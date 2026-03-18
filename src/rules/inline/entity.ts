/**
 * Process html entity - &#123;, &#xAF;, &quot;, ...
 */

// Basic entity decoding (simplified version)
const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: '\u00A0',
}

function isValidEntityCode(code: number): boolean {
  // Valid unicode code points
  if (code >= 0xD800 && code <= 0xDFFF)
    return false // surrogate pairs
  if (code >= 0x10FFFF)
    return false
  return true
}

function fromCodePoint(code: number): string {
  return String.fromCodePoint(code)
}

function decodeHTML(str: string): string {
  if (str.length >= 4 && str.charCodeAt(0) === 0x26 && str.charCodeAt(str.length - 1) === 0x3B) {
    const name = str.slice(1, -1).toLowerCase()
    if (entities[name])
      return entities[name]
  }
  return str
}

function isDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39
}

function isHexDigit(code: number): boolean {
  const lower = code | 0x20
  return isDigit(code) || (lower >= 0x61 && lower <= 0x66)
}

function isAsciiLetter(code: number): boolean {
  const lower = code | 0x20
  return lower >= 0x61 && lower <= 0x7A
}

function isAsciiAlphaNum(code: number): boolean {
  return isAsciiLetter(code) || isDigit(code)
}

function scanNumericEntity(src: any, start: number, max: number): string | null {
  let pos = start + 2
  if (pos >= max)
    return null

  let isHex = false
  let digitLimit = 7
  let digitStart = pos
  const code = src.charCodeAt(pos)
  if ((code | 0x20) === 0x78 /* x */) {
    isHex = true
    digitLimit = 6
    pos++
    digitStart = pos
  }

  while (pos < max && pos - digitStart < digitLimit) {
    const ch = src.charCodeAt(pos)
    if (!(isHex ? isHexDigit(ch) : isDigit(ch)))
      break
    pos++
  }

  if (pos === digitStart || pos >= max)
    return null

  const next = src.charCodeAt(pos)
  if (next !== 0x3B /* ; */)
    return null

  return src.slice(start, pos + 1)
}

function scanNamedEntity(src: any, start: number, max: number): string | null {
  let pos = start + 1
  if (pos >= max || !isAsciiLetter(src.charCodeAt(pos)))
    return null

  pos++
  while (pos < max && pos - start - 1 < 32 && isAsciiAlphaNum(src.charCodeAt(pos)))
    pos++

  if (pos - start - 1 < 2 || pos >= max || src.charCodeAt(pos) !== 0x3B /* ; */)
    return null

  const markup = src.slice(start, pos + 1)
  return decodeHTML(markup) !== markup ? markup : null
}

export function entity(state: any, silent?: boolean): boolean {
  const pos = state.pos
  const max = state.posMax

  if (state.src.charCodeAt(pos) !== 0x26 /* & */)
    return false

  if (pos + 1 >= max)
    return false

  const ch = state.src.charCodeAt(pos + 1)

  if (ch === 0x23 /* # */) {
    const markup = scanNumericEntity(state.src, pos, max)
    if (markup) {
      if (!silent) {
        const code
          = (markup.charCodeAt(2) | 0x20) === 0x78
            ? Number.parseInt(markup.slice(3, -1), 16)
            : Number.parseInt(markup.slice(2, -1), 10)

        const token = state.push('text_special', '', 0)
        token.content = isValidEntityCode(code)
          ? fromCodePoint(code)
          : fromCodePoint(0xFFFD)
        token.markup = markup
        token.info = 'entity'
      }
      state.pos += markup.length
      return true
    }
  }
  else {
    const markup = scanNamedEntity(state.src, pos, max)
    if (markup) {
      const decoded = decodeHTML(markup)
      if (!silent) {
        const token = state.push('text_special', '', 0)
        token.content = decoded
        token.markup = markup
        token.info = 'entity'
      }
      state.pos += markup.length
      return true
    }
  }

  return false
}

export default entity
