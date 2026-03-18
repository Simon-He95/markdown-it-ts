/**
 * Parse backticks (inline code)
 */

export function backticks(state: any, silent?: boolean): boolean {
  const src = state.src
  let pos = state.pos
  const ch = src.charCodeAt(pos)

  if (ch !== 0x60 /* ` */) {
    return false
  }

  const start = pos
  pos++
  const max = state.posMax

  // scan marker length
  while (pos < max && src.charCodeAt(pos) === 0x60 /* ` */) {
    pos++
  }

  const marker = src.slice(start, pos)
  const openerLength = marker.length

  if (state.backticksScanned && (state.backticks[openerLength] || 0) <= start) {
    if (!silent)
      state.pending += marker
    state.pos += openerLength
    return true
  }

  let matchEnd = pos
  let matchStart

  // Nothing found in the cache, scan until the end of the line (or until marker is found)
  while ((matchStart = src.indexOf('`', matchEnd)) !== -1) {
    matchEnd = matchStart + 1

    // scan marker length
    while (matchEnd < max && src.charCodeAt(matchEnd) === 0x60 /* ` */) {
      matchEnd++
    }

    const closerLength = matchEnd - matchStart

    if (closerLength === openerLength) {
      // Found matching closer length.
      if (!silent) {
        const token = state.push('code_inline', 'code', 0)
        token.markup = marker
        let content = src.slice(pos, matchStart)
        if (content.includes('\n')) {
          content = content.replace(/\n/g, ' ')
        }
        if (content.length > 2 && content.charCodeAt(0) === 0x20 && content.charCodeAt(content.length - 1) === 0x20) {
          content = content.slice(1, -1)
        }
        token.content = content
      }
      state.pos = matchEnd
      return true
    }

    // Some different length found, put it in cache as upper limit of where closer can be found
    state.backticks[closerLength] = matchStart
  }

  // Scanned through the end, didn't find anything
  state.backticksScanned = true

  if (!silent)
    state.pending += marker
  state.pos += openerLength
  return true
}

export default backticks
