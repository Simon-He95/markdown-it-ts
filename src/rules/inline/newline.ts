/**
 * Inline rule: newline
 * Process newlines
 */

export function newline(state: any, silent?: boolean): boolean {
  let pos = state.pos

  if (state.src.charCodeAt(pos) !== 0x0A /* \n */)
    return false

  const pmax = state.pending.length - 1
  const max = state.posMax

  // Check if it's a hard break (2+ spaces before newline)
  if (!silent) {
    if (pmax >= 0 && state.pending.charCodeAt(pmax) === 0x20) {
      if (pmax >= 1 && state.pending.charCodeAt(pmax - 1) === 0x20) {
        // Find spaces from the end
        let ws = pmax - 1
        while (ws >= 1 && state.pending.charCodeAt(ws - 1) === 0x20)
          ws--

        state.pending = state.pending.slice(0, ws)
        state.pushSimple('hardbreak', 'br')
      }
      else {
        state.pending = state.pending.slice(0, -1)
        state.pushSimple('softbreak', 'br')
      }
    }
    else {
      state.pushSimple('softbreak', 'br')
    }
  }

  pos++

  // Skip heading spaces for next line
  while (pos < max) {
    const ch = state.src.charCodeAt(pos)
    if (ch !== 0x09 && ch !== 0x20)
      break
    pos++
  }

  state.pos = pos

  return true
}

export default newline
