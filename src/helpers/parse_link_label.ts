/**
 * Parse link label: returns the end position of label or -1 if not found
 * Assumes first character ([) already matches
 */
export function parseLinkLabel(state: any, start: number, disableNested?: boolean): number {
  let level = 1
  let found = false
  let marker
  let prevPos
  const max = state.posMax
  const oldPos = state.pos

  state.pos = start + 1

  while (state.pos < max) {
    marker = state.src.charCodeAt(state.pos)
    if (marker === 0x5D /* ] */) {
      level--
      if (level === 0) {
        found = true
        break
      }
    }
    prevPos = state.pos
    state.md.inline.skipToken(state)
    if (marker === 0x5B /* [ */) {
      if (prevPos === state.pos - 1) {
        level++
      }
      else if (disableNested) {
        state.pos = oldPos
        return -1
      }
    }
  }

  let labelEnd = -1
  if (found)
    labelEnd = state.pos
  state.pos = oldPos
  return labelEnd
}

export default parseLinkLabel
