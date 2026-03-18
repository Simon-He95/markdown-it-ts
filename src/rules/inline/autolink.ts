/**
 * Process autolinks '<protocol:...>'
 */

const EMAIL_RE = /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/

function isAsciiLetter(ch: number): boolean {
  const lc = ch | 0x20
  return lc >= 0x61 && lc <= 0x7A
}

function isAutolinkScheme(src: string, start: number, end: number): boolean {
  const len = end - start
  if (len < 2 || len > 32 || !isAsciiLetter(src.charCodeAt(start)))
    return false

  for (let pos = start + 1; pos < end; pos++) {
    const ch = src.charCodeAt(pos)
    if ((ch >= 0x30 && ch <= 0x39)
      || (ch >= 0x41 && ch <= 0x5A)
      || (ch >= 0x61 && ch <= 0x7A)
      || ch === 0x2B /* + */
      || ch === 0x2D /* - */
      || ch === 0x2E /* . */) {
      continue
    }
    return false
  }

  return true
}

export function autolink(state: any, silent?: boolean): boolean {
  let pos = state.pos
  const src = state.src

  if (src.charCodeAt(pos) !== 0x3C /* < */) {
    return false
  }

  const start = pos
  const max = state.posMax
  let colonPos = -1
  let hasAt = false

  for (;;) {
    if (++pos >= max)
      return false

    const ch = src.charCodeAt(pos)

    if (ch === 0x3C /* < */)
      return false
    if (ch === 0x3E /* > */)
      break
    if (ch <= 0x20)
      return false
    if (ch === 0x3A /* : */) {
      if (colonPos < 0)
        colonPos = pos
    }
    else if (ch === 0x40 /* @ */) {
      hasAt = true
    }
  }

  if (colonPos < 0 && !hasAt)
    return false

  if (colonPos > start + 2 && isAutolinkScheme(src, start + 1, colonPos)) {
    const url = src.slice(start + 1, pos)
    const fullUrl = state.md.normalizeLink(url)
    if (!state.md.validateLink(fullUrl)) {
      return false
    }

    if (!silent) {
      const token_o = state.push('link_open', 'a', 1)
      token_o.attrs = [['href', fullUrl]]
      token_o.markup = 'autolink'
      token_o.info = 'auto'

      const token_t = state.pushSimple('text', '')
      token_t.content = state.md.normalizeLinkText(url)

      const token_c = state.push('link_close', 'a', -1)
      token_c.markup = 'autolink'
      token_c.info = 'auto'
    }

    state.pos = pos + 1
    return true
  }

  if (hasAt) {
    const url = src.slice(start + 1, pos)
    if (!EMAIL_RE.test(url)) {
      return false
    }

    const fullUrl = state.md.normalizeLink(`mailto:${url}`)
    if (!state.md.validateLink(fullUrl)) {
      return false
    }

    if (!silent) {
      const token_o = state.push('link_open', 'a', 1)
      token_o.attrs = [['href', fullUrl]]
      token_o.markup = 'autolink'
      token_o.info = 'auto'

      const token_t = state.pushSimple('text', '')
      token_t.content = state.md.normalizeLinkText(url)

      const token_c = state.push('link_close', 'a', -1)
      token_c.markup = 'autolink'
      token_c.info = 'auto'
    }

    state.pos = pos + 1
    return true
  }

  return false
}

export default autolink
