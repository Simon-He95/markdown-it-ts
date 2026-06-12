const FALLBACK_TO_INLINE_SCAN = -2

function scanPlainLinkLabel(src: string, start: number, max: number, disableNested?: boolean): number {
  let level = 1
  let pos = start + 1

  while (pos < max) {
    const marker = src.charCodeAt(pos)

    if (marker === 0x5D /* ] */) {
      level--
      if (level === 0)
        return pos
      if (disableNested) {
        const next = pos + 1 < max ? src.charCodeAt(pos + 1) : 0
        if (next === 0x28 /* ( */ || next === 0x5B /* [ */)
          return FALLBACK_TO_INLINE_SCAN
      }
      pos++
      continue
    }

    if (marker === 0x5C /* \ */) {
      pos += 2
      continue
    }

    // These constructs can legally contain `]` before the label closes.
    if (marker === 0x60 /* ` */ || marker === 0x3C /* < */)
      return FALLBACK_TO_INLINE_SCAN

    // Images need the inline scanner to preserve nested-link rules.
    if (marker === 0x21 /* ! */ && pos + 1 < max && src.charCodeAt(pos + 1) === 0x5B /* [ */)
      return FALLBACK_TO_INLINE_SCAN

    if (marker === 0x5B /* [ */) {
      level++
      pos++
      continue
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
  const noCloseFrom = state.linkLabelNoCloseFrom

  if (noCloseFrom >= 0 && start + 1 >= noCloseFrom)
    return -1

  const nextClose = src.indexOf(']', start + 1)
  if (nextClose < 0 || nextClose >= max) {
    state.linkLabelNoCloseFrom = start + 1
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
