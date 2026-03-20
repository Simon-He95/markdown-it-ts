/**
 * Parse link label: returns the end position of label or -1 if not found
 * Assumes first character ([) already matches
 */
const FALLBACK_TO_INLINE_SCAN = -2

function scanPlainLinkLabel(src: string, start: number, max: number, disableNested?: boolean): number {
  let pos = start + 1

  while (pos < max) {
    const marker = src.charCodeAt(pos)

    if (marker === 0x5D /* ] */)
      return pos

    if (marker === 0x5C /* \ */) {
      pos += 2
      continue
    }

    // These constructs can legally contain `]` before the label closes.
    if (marker === 0x60 /* ` */ || marker === 0x3C /* < */)
      return FALLBACK_TO_INLINE_SCAN

    // Images inside link labels are valid and may hide nested brackets.
    if (marker === 0x21 /* ! */ && pos + 1 < max && src.charCodeAt(pos + 1) === 0x5B /* [ */)
      return FALLBACK_TO_INLINE_SCAN

    if (marker === 0x5B /* [ */) {
      if (disableNested)
        return -1
      return FALLBACK_TO_INLINE_SCAN
    }

    pos++
  }

  return -1
}

export function parseLinkLabel(state: any, start: number, disableNested?: boolean): number {
  let level = 1
  let found = false
  let marker
  let prevPos
  const src = state.src
  const max = state.posMax
  const oldPos = state.pos
  const inline = state.md.inline
  const noCloseFrom = state.__mdtsLinkLabelNoCloseFrom
  if (typeof noCloseFrom === 'number' && start + 1 >= noCloseFrom)
    return -1

  const nextClose = src.indexOf(']', start + 1)
  if (nextClose < 0 || nextClose >= max) {
    state.__mdtsLinkLabelNoCloseFrom = start + 1
    return -1
  }

  const fastLabelEnd = scanPlainLinkLabel(src, start, max, disableNested)

  if (fastLabelEnd !== FALLBACK_TO_INLINE_SCAN)
    return fastLabelEnd

  state.pos = start + 1

  while (state.pos < max) {
    marker = src.charCodeAt(state.pos)
    if (marker === 0x5D /* ] */) {
      level--
      if (level === 0) {
        found = true
        break
      }
    }
    prevPos = state.pos
    inline.skipToken(state)
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
