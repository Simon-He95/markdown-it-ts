/**
 * Inline rule: text
 * Skip text characters for text token, place those to pending buffer
 * and increment current pos
 */

// Rule to skip pure text
// '{}$%@~+=:' reserved for extensions

// !!!! Don't confuse with "Markdown ASCII Punctuation" chars
// http://spec.commonmark.org/0.15/#ascii-punctuation-character
function isTerminatorChar(ch: number): boolean {
  switch (ch) {
    case 0x0A: /* \n */
    case 0x21: /* ! */
    case 0x23: /* # */
    case 0x24: /* $ */
    case 0x25: /* % */
    case 0x26: /* & */
    case 0x2A: /* * */
    case 0x2B: /* + */
    case 0x2D: /* - */
    case 0x3A: /* : */
    case 0x3C: /* < */
    case 0x3D: /* = */
    case 0x3E: /* > */
    case 0x40: /* @ */
    case 0x5B: /* [ */
    case 0x5C: /* \ */
    case 0x5D: /* ] */
    case 0x5E: /* ^ */
    case 0x5F: /* _ */
    case 0x60: /* ` */
    case 0x7B: /* { */
    case 0x7D: /* } */
    case 0x7E: /* ~ */
      return true
    default:
      return false
  }
}

export function text(state: any, silent?: boolean): boolean {
  const src = state.src
  const start = state.pos
  const max = state.posMax

  if (start >= max || isTerminatorChar(src.charCodeAt(start)))
    return false

  let pos = start + 1
  while (pos < max && !isTerminatorChar(src.charCodeAt(pos))) {
    pos++
  }

  if (!silent) {
    state.pending += pos === start + 1 ? src.charAt(start) : src.slice(start, pos)
  }

  state.pos = pos

  return true
}

export default text
