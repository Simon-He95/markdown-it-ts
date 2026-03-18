/**
 * Process html tags
 */

import { HTML_TAG_RE } from '../../common/html_re'

function isHtmlSpace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0C || code === 0x0D
}

function isLinkOpen(str: string): boolean {
  if (str.length < 3)
    return false

  if (str.charCodeAt(0) !== 0x3C /* < */)
    return false

  if ((str.charCodeAt(1) | 0x20) !== 0x61 /* a */)
    return false

  const ch = str.charCodeAt(2)
  return ch === 0x3E || isHtmlSpace(ch)
}

function isLinkClose(str: string): boolean {
  if (str.length < 4)
    return false

  if (str.charCodeAt(0) !== 0x3C /* < */ || str.charCodeAt(1) !== 0x2F /* / */)
    return false

  if ((str.charCodeAt(2) | 0x20) !== 0x61 /* a */)
    return false

  for (let i = 3; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    if (ch === 0x3E /* > */)
      return true
    if (!isHtmlSpace(ch))
      return false
  }

  return false
}

function isLetter(ch: number): boolean {
  const lc = ch | 0x20
  return lc >= 0x61 && lc <= 0x7A
}

export function html_inline(state: any, silent?: boolean): boolean {
  if (!state.md.options.html) {
    return false
  }

  const max = state.posMax
  const pos = state.pos
  const src = state.src
  if (src.charCodeAt(pos) !== 0x3C || pos + 2 >= max) {
    return false
  }

  const ch = src.charCodeAt(pos + 1)
  if (ch !== 0x21 && ch !== 0x3F && ch !== 0x2F && !isLetter(ch)) {
    return false
  }

  const match = src.slice(pos).match(HTML_TAG_RE)
  if (!match) {
    return false
  }

  const markup = match[0]

  if (!silent) {
    const token = state.pushSimple('html_inline', '')
    token.content = markup

    if (isLinkOpen(markup))
      state.linkLevel++
    if (isLinkClose(markup))
      state.linkLevel--
  }

  state.pos += markup.length
  return true
}

export default html_inline
