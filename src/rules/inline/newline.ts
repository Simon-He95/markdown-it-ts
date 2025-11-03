/**
 * Inline rule: newline
 * Process newlines
 */

export function newline(state: any, silent?: boolean): boolean {
  const { pos, src, posMax } = state

  if (src.charCodeAt(pos) !== 0x0A /* \n */)
    return false

  const pmax = state.pending.length - 1
  const max = posMax

  // Check if it's a hard break (2+ spaces before newline)
  if (!silent) {
    if (pmax >= 0 && state.pending.charCodeAt(pmax) === 0x20) {
      if (pmax >= 1 && state.pending.charCodeAt(pmax - 1) === 0x20) {
        // Find spaces from the end
        let ws = pmax - 1
        while (ws >= 1 && state.pending.charCodeAt(ws - 1) === 0x20)
          ws--

        state.pending = state.pending.slice(0, ws)
        state.push('hardbreak', 'br', 0)
      }
      else {
        state.pending = state.pending.slice(0, -1)
        state.push('softbreak', 'br', 0)
      }
    }
    else {
      state.push('softbreak', 'br', 0)
    }
  }

  state.pos++

  // Skip heading spaces for next line
  while (state.pos < max && src.charCodeAt(state.pos) === 0x20)
    state.pos++

  return true
}

export default newline
