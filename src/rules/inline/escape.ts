/**
 * Inline rule: escape
 * Process escaped characters
 */

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

export function escape(state: any, silent?: boolean): boolean {
  const { pos, posMax, src } = state

  if (src.charCodeAt(pos) !== 0x5C /* \ */)
    return false

  const pos_next = pos + 1

  if (pos_next >= posMax)
    return false

  const ch = src.charCodeAt(pos_next)

  // Check if it's an escapable character
  if (ch === 0x0A) {
    // Escaped newline
    if (!silent) {
      state.push('hardbreak', 'br', 0)
    }

    state.pos += 2
    return true
  }

  // Handle surrogate pairs and create special token like original markdown-it
  let escapedStr = src[pos_next]
  let nextPos = pos_next
  if (ch >= 0xD800 && ch <= 0xDBFF && pos_next + 1 < posMax) {
    const ch2 = src.charCodeAt(pos_next + 1)
    if (ch2 >= 0xDC00 && ch2 <= 0xDFFF) {
      escapedStr += src[pos_next + 1]
      nextPos++
    }
  }

  const origStr = src[pos] + escapedStr // '\' + escapedStr

  if (!silent) {
    const token = state.push('text_special', '', 0)
    if (ch < 0x100 && ESCAPED[ch]) {
      token.content = escapedStr
    }
    else {
      token.content = origStr
    }
    token.markup = origStr
    token.info = 'escape'
  }

  state.pos = nextPos + 1
  return true

  return false
}

export default escape
