/**
 * Process html tags
 */

// Simplified HTML_TAG_RE pattern
const HTML_TAG_RE = /^<\/?[a-z][a-z0-9-]*(?:\s+[a-z_:][\w:.-]*(?:\s*=\s*(?:[^"'=<>`\s]+|'[^']*'|"[^"]*"))?)*\s*\/?>/i

function isLinkOpen(str: string): boolean {
  return /^<a[>\s]/i.test(str)
}

function isLinkClose(str: string): boolean {
  return /^<\/a\s*>/i.test(str)
}

function isLetter(ch: number): boolean {
  const lc = ch | 0x20 // to lower case
  return lc >= 0x61 /* a */ && lc <= 0x7A /* z */
}

export function html_inline(state: any, silent?: boolean): boolean {
  if (!state.md.options.html) {
    return false
  }

  // Check start
  const max = state.posMax
  const pos = state.pos

  if (state.src.charCodeAt(pos) !== 0x3C /* < */ || pos + 2 >= max) {
    return false
  }

  // Quick fail on second char
  const ch = state.src.charCodeAt(pos + 1)
  if (
    ch !== 0x21
    && /* ! */ ch !== 0x3F
    && /* ? */ ch !== 0x2F
    && /* / */ !isLetter(ch)
  ) {
    return false
  }

  const match = state.src.slice(pos).match(HTML_TAG_RE)
  if (!match) {
    return false
  }

  if (!silent) {
    const token = state.push('html_inline', '', 0)
    token.content = match[0]

    if (isLinkOpen(token.content))
      state.linkLevel++
    if (isLinkClose(token.content))
      state.linkLevel--
  }

  state.pos += match[0].length
  return true
}

export default html_inline
