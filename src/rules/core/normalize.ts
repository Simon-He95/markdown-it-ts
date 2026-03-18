import type { State } from '../../parse/state'

// Normalize input string like the original implementation:
// - convert CRLF and CR to LF
// - replace NULL chars with U+FFFD
const NEWLINES_RE = /\r\n?|\n/g
const NULL_RE = /\0/g

export function normalize(state: State): void {
  if (!state || typeof state.src !== 'string')
    return

  const src = state.src
  const hasCR = src.includes('\r')
  const hasNull = src.includes('\0')

  if (!hasCR && !hasNull)
    return

  let str = src
  if (hasCR)
    str = str.replace(NEWLINES_RE, '\n')
  if (hasNull)
    str = str.replace(NULL_RE, '\uFFFD')
  state.src = str
}

export default normalize
