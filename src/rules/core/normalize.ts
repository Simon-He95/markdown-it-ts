import type { State } from '../../parse/state'

// Normalize input string like the original implementation:
// - convert CRLF and CR to LF
// - replace NULL chars with U+FFFD
const NEWLINES_RE = /\r\n?|\n/g
const NULL_RE = /\0/g

export function normalize(state: State): void {
  if (!state || typeof state.src !== 'string')
    return
  let str = state.src.replace(NEWLINES_RE, '\n')
  str = str.replace(NULL_RE, '\uFFFD')
  state.src = str
}

export default normalize
