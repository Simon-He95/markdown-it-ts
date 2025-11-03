import parseLinkDestination from '../../helpers/parse_link_destination'
/**
 * Inline rule: link [text](url "title") and [text][ref]
 */
import parseLinkLabel from '../../helpers/parse_link_label'
import parseLinkTitle from '../../helpers/parse_link_title'

export function link(state: any, silent?: boolean): boolean {
  let code, label, res, ref
  let href = ''
  let title = ''
  let start = state.pos
  let parseReference = true

  if (state.src.charCodeAt(state.pos) !== 0x5B /* [ */)
    return false

  const oldPos = state.pos
  const max = state.posMax
  const labelStart = state.pos + 1
  const labelEnd = parseLinkLabel(state, state.pos, true)
  if (labelEnd < 0)
    return false

  let pos = labelEnd + 1
  if (pos < max && state.src.charCodeAt(pos) === 0x28 /* ( */) {
    parseReference = false
    pos++
    for (; pos < max; pos++) {
      code = state.src.charCodeAt(pos)
      if (code !== 0x20 && code !== 0x0A)
        break
    }
    if (pos >= max)
      return false
    start = pos
    res = parseLinkDestination(state.src, pos, state.posMax)
    if (res.ok) {
      href = res.str
      pos = res.pos
      for (; pos < max; pos++) {
        code = state.src.charCodeAt(pos)
        if (code !== 0x20 && code !== 0x0A)
          break
      }
      res = parseLinkTitle(state.src, pos, state.posMax)
      if (pos < max && res.ok) {
        title = res.str
        pos = res.pos
        for (; pos < max; pos++) {
          code = state.src.charCodeAt(pos)
          if (code !== 0x20 && code !== 0x0A)
            break
        }
      }
    }
    if (pos >= max || state.src.charCodeAt(pos) !== 0x29 /* ) */) {
      parseReference = true
    }
    pos++
  }
  if (parseReference) {
    if (typeof state.env.references === 'undefined')
      return false
    if (pos < max && state.src.charCodeAt(pos) === 0x5B /* [ */) {
      start = pos + 1
      pos = parseLinkLabel(state, pos)
      if (pos >= 0) {
        label = state.src.slice(start, pos++)
      }
      else {
        pos = labelEnd + 1
      }
    }
    else {
      pos = labelEnd + 1
    }
    if (!label)
      label = state.src.slice(labelStart, labelEnd)
    ref = state.env.references[label && label.toLowerCase()]
    if (!ref) {
      state.pos = oldPos
      return false
    }
    href = ref.href
    title = ref.title
  }
  if (!silent) {
    state.pos = labelStart
    state.posMax = labelEnd
    const token_o = state.push('link_open', 'a', 1)
    const attrs = [['href', href]]
    token_o.attrs = attrs
    if (title)
      attrs.push(['title', title])
    state.linkLevel++
    state.md.inline.tokenize(state)
    state.linkLevel--
    state.push('link_close', 'a', -1)
  }
  state.pos = pos
  state.posMax = max
  return true
}

export default link
