import parseLinkDestination from '../../helpers/parse_link_destination'
/**
 * Inline rule: image ![alt](src "title") and ![alt][ref]
 */
import parseLinkLabel from '../../helpers/parse_link_label'
import parseLinkTitle from '../../helpers/parse_link_title'

export function image(state: any, silent?: boolean): boolean {
  let code, content, label, pos, ref, res, title, start
  let href = ''
  const oldPos = state.pos
  const max = state.posMax

  if (state.src.charCodeAt(state.pos) !== 0x21 /* ! */)
    return false
  if (state.src.charCodeAt(state.pos + 1) !== 0x5B /* [ */)
    return false

  const labelStart = state.pos + 2
  const labelEnd = parseLinkLabel(state, state.pos + 1, false)
  if (labelEnd < 0)
    return false

  pos = labelEnd + 1
  if (pos < max && state.src.charCodeAt(pos) === 0x28 /* ( */) {
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
      else {
        title = ''
      }
    }
    if (pos >= max || state.src.charCodeAt(pos) !== 0x29 /* ) */) {
      state.pos = oldPos
      return false
    }
    pos++
  }
  else {
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
    content = state.src.slice(labelStart, labelEnd)
    const token = state.push('image', 'img', 0)
    token.attrs = [['src', href], ['alt', content]]
    if (title)
      token.attrs.push(['title', title])
  }
  state.pos = pos
  state.posMax = max
  return true
}

export default image
