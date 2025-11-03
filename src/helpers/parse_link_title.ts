/**
 * Parse link title: returns { ok, can_continue, pos, str, marker }
 */
export function parseLinkTitle(str: string, start: number, max: number, prev_state?: any) {
  let code
  let pos = start
  const state = {
    ok: false,
    can_continue: false,
    pos: 0,
    str: '',
    marker: 0,
  }
  if (prev_state) {
    state.str = prev_state.str
    state.marker = prev_state.marker
  }
  else {
    if (pos >= max)
      return state
    let marker = str.charCodeAt(pos)
    if (marker !== 0x22 /* " */ && marker !== 0x27 /* ' */ && marker !== 0x28 /* ( */)
      return state
    start++
    pos++
    if (marker === 0x28)
      marker = 0x29
    state.marker = marker
  }
  while (pos < max) {
    code = str.charCodeAt(pos)
    if (code === state.marker) {
      state.pos = pos + 1
      state.str += str.slice(start, pos)
      state.ok = true
      return state
    }
    else if (code === 0x28 /* ( */ && state.marker === 0x29 /* ) */) {
      return state
    }
    else if (code === 0x5C /* \ */ && pos + 1 < max) {
      pos++
    }
    pos++
  }
  state.can_continue = true
  state.str += str.slice(start, pos)
  return state
}

export default parseLinkTitle
