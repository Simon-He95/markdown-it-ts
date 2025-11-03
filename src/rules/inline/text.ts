/**
 * Inline rule: text
 * Skip all tokens except for the text token
 */

// Basic text characters that don't trigger other rules
const TEXT_RE = /^[^*_\\[\]`<!\n]+/

export function text(state: any, silent?: boolean): boolean {
  const { pos, src } = state

  // Quick check for common text characters
  const match = src.slice(pos).match(TEXT_RE)
  if (!match)
    return false

  if (!silent) {
    state.pending += match[0]
  }

  state.pos += match[0].length
  return true
}

export default text
