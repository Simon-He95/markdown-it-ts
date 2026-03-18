/**
 * Inline rule: escape
 * Process escaped characters
 */

import { Token } from '../../common/token'

// List of valid chars to escape (matches original markdown-it):
// "\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-"
const ESCAPED: number[] = (() => {
  const table = new Array(256).fill(0)
  const chars = '\\!\"#$%&\'()*+,./:;<=>?@[]^_`{|}~-'
  for (let i = 0; i < chars.length; i++) {
    table[chars.charCodeAt(i)] = 1
  }
  return table
})()

const ESCAPED_MARKUP: string[] = new Array(128)
const ESCAPED_CONTENT: string[] = new Array(128)

for (let i = 0; i < 128; i++) {
  const ch = String.fromCharCode(i)
  ESCAPED_MARKUP[i] = `\\${ch}`
  ESCAPED_CONTENT[i] = ESCAPED[i] ? ch : ESCAPED_MARKUP[i]
}

function pushEscapeToken(state: any, content: string, markup: string): void {
  if (state.pending) {
    state.pushPending()
  }

  const token = new Token('text_special', '', 0)
  token.level = state.level
  token.content = content
  token.markup = markup
  token.info = 'escape'
  state.pendingLevel = state.level
  state.tokens.push(token)
  state.tokens_meta.push(null)
}

export function escape(state: any, silent?: boolean): boolean {
  let pos = state.pos
  const max = state.posMax
  const src = state.src

  if (src.charCodeAt(pos) !== 0x5C /* \ */)
    return false

  pos++

  if (pos >= max)
    return false

  let ch = src.charCodeAt(pos)

  if (ch === 0x0A) {
    if (!silent) {
      state.push('hardbreak', 'br', 0)
    }

    pos++
    while (pos < max) {
      ch = src.charCodeAt(pos)
      if (ch !== 0x09 && ch !== 0x20)
        break
      pos++
    }

    state.pos = pos
    return true
  }

  if (ch < 0x80) {
    if (silent) {
      state.pos = pos + 1
      return true
    }

    pushEscapeToken(state, ESCAPED_CONTENT[ch], ESCAPED_MARKUP[ch])

    state.pos = pos + 1
    return true
  }

  if (silent) {
    if (ch >= 0xD800 && ch <= 0xDBFF && pos + 1 < max) {
      const ch2 = src.charCodeAt(pos + 1)
      if (ch2 >= 0xDC00 && ch2 <= 0xDFFF) {
        pos++
      }
    }

    state.pos = pos + 1
    return true
  }

  let escapedStr = src[pos]
  if (ch >= 0xD800 && ch <= 0xDBFF && pos + 1 < max) {
    const ch2 = src.charCodeAt(pos + 1)
    if (ch2 >= 0xDC00 && ch2 <= 0xDFFF) {
      escapedStr += src[pos + 1]
      pos++
    }
  }

  const origStr = `\\${escapedStr}`

  pushEscapeToken(state, ch < 0x100 && ESCAPED[ch] ? escapedStr : origStr, origStr)

  state.pos = pos + 1
  return true
}

export default escape
