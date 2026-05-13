/**
 * Process autolinks '<protocol:...>'
 */

// Keep these expressions close to markdown-it semantics. Do not rewrite them
// for lint-only simplifications because that can change parser compatibility.
// eslint-disable-next-line regexp/no-unused-capturing-group, regexp/prefer-w, regexp/use-ignore-case
const EMAIL_RE = /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/
// eslint-disable-next-line no-control-regex, regexp/no-unused-capturing-group, regexp/use-ignore-case
const AUTOLINK_RE = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/

export function autolink(state: any, silent?: boolean): boolean {
  let pos = state.pos
  const src = state.src

  if (src.charCodeAt(pos) !== 0x3C /* < */) {
    return false
  }

  const start = pos
  const max = state.posMax

  for (;;) {
    if (++pos >= max)
      return false

    const ch = src.charCodeAt(pos)

    if (ch === 0x3C /* < */)
      return false
    if (ch === 0x3E /* > */)
      break
  }

  const url = src.slice(start + 1, pos)

  if (AUTOLINK_RE.test(url)) {
    const fullUrl = state.md.normalizeLink(url)
    if (!state.md.validateLink(fullUrl))
      return false

    if (!silent) {
      const token_o = state.push('link_open', 'a', 1)
      token_o.attrs = [['href', fullUrl]]
      token_o.markup = 'autolink'
      token_o.info = 'auto'

      const token_t = state.push('text', '', 0)
      token_t.content = state.md.normalizeLinkText(url)

      const token_c = state.push('link_close', 'a', -1)
      token_c.markup = 'autolink'
      token_c.info = 'auto'
    }

    state.pos += url.length + 2
    return true
  }

  if (EMAIL_RE.test(url)) {
    const fullUrl = state.md.normalizeLink(`mailto:${url}`)
    if (!state.md.validateLink(fullUrl))
      return false

    if (!silent) {
      const token_o = state.push('link_open', 'a', 1)
      token_o.attrs = [['href', fullUrl]]
      token_o.markup = 'autolink'
      token_o.info = 'auto'

      const token_t = state.push('text', '', 0)
      token_t.content = state.md.normalizeLinkText(url)

      const token_c = state.push('link_close', 'a', -1)
      token_c.markup = 'autolink'
      token_c.info = 'auto'
    }

    state.pos += url.length + 2
    return true
  }

  return false
}

export default autolink
