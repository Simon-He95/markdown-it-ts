// Process links like https://example.org/

import type { StateInline } from '../../parse/parser_inline/state_inline'

function isAsciiLetter(code: number): boolean {
  const lower = code | 0x20
  return lower >= 0x61 && lower <= 0x7A
}

function isDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39
}

function isSchemeChar(code: number): boolean {
  return isAsciiLetter(code) || isDigit(code) || code === 0x2B /* + */ || code === 0x2D /* - */ || code === 0x2E /* . */
}

function extractTrailingScheme(pending: string): string | null {
  if (pending.length === 0)
    return null

  let start = pending.length - 1
  while (start >= 0 && isSchemeChar(pending.charCodeAt(start)))
    start--
  start++

  if (start >= pending.length || !isAsciiLetter(pending.charCodeAt(start)))
    return null

  return pending.slice(start)
}

function scanLinkifyCandidate(src: any, start: number, max: number): string {
  let end = start
  while (end < max) {
    const ch = src.charCodeAt(end)
    if (ch <= 0x20 || ch === 0x7F || ch === 0x3C /* < */)
      break
    end++
  }
  return src.slice(start, end)
}

export default function linkify(state: StateInline, silent?: boolean): boolean {
  if (!state.md.options.linkify)
    return false
  if (state.linkLevel > 0)
    return false

  const pos = state.pos
  const max = state.posMax

  if (pos + 3 > max)
    return false
  if (state.src.charCodeAt(pos) !== 0x3A /* : */)
    return false
  if (state.src.charCodeAt(pos + 1) !== 0x2F /* / */)
    return false
  if (state.src.charCodeAt(pos + 2) !== 0x2F /* / */)
    return false

  const proto = extractTrailingScheme(state.pending)
  if (!proto)
    return false

  const candidate = scanLinkifyCandidate(state.src, pos - proto.length, max)
  const link = state.md.linkify.matchAtStart(candidate)
  if (!link)
    return false

  let url = link.url

  // invalid link, but still detected by linkify somehow;
  // need to check to prevent infinite loop below
  if (url.length <= proto.length)
    return false

  // disallow '*' at the end of the link (conflicts with emphasis)
  url = url.replace(/\*+$/, '')

  const fullUrl = state.md.normalizeLink(url)
  if (!state.md.validateLink(fullUrl))
    return false

  if (!silent) {
    state.pending = state.pending.slice(0, -proto.length)

    const token_o = state.push('link_open', 'a', 1)
    token_o.attrs = [['href', fullUrl]]
    token_o.markup = 'linkify'
    token_o.info = 'auto'

    const token_t = state.push('text', '', 0)
    token_t.content = state.md.normalizeLinkText(url)

    const token_c = state.push('link_close', 'a', -1)
    token_c.markup = 'linkify'
    token_c.info = 'auto'
  }

  state.pos += url.length - proto.length
  return true
}
