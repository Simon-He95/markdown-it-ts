/**
 * Inline rule: escape
 * Process escaped characters
 */

// List of valid chars to escape: \ ` * _ { } [ ] ( ) # + - . ! |
const ESCAPED = [
  0x5C, // \
  0x60, // `
  0x2A, // *
  0x5F, // _
  0x7B, // {
  0x7D, // }
  0x5B, // [
  0x5D, // ]
  0x28, // (
  0x29, // )
  0x23, // #
  0x2B, // +
  0x2D, // -
  0x2E, // .
  0x21, // !
  0x7C, // |
]

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

  if (ch < 0x80 && ESCAPED.includes(ch)) {
    if (!silent) {
      state.pending += src[pos_next]
    }

    state.pos += 2
    return true
  }

  return false
}

export default escape
