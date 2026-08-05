/**
 * Inline rule: text
 * Skip text characters for text token, place those to pending buffer
 * and increment current pos
 */

// Rule to skip pure text
// '{}$%@~+=:' reserved for extensions

// !!!! Don't confuse with "Markdown ASCII Punctuation" chars
// http://spec.commonmark.org/0.15/#ascii-punctuation-character

// Precomputed lookup table for terminator chars (0 = not a terminator).
// Lookup is significantly faster than a switch in the hot per-character loop.
const TERMINATOR_TABLE = new Uint8Array(256)
for (const code of [
  0x0A, /* \n */
  0x21, /* ! */
  0x23, /* # */
  0x24, /* $ */
  0x25, /* % */
  0x26, /* & */
  0x2A, /* * */
  0x2B, /* + */
  0x2D, /* - */
  0x3A, /* : */
  0x3C, /* < */
  0x3D, /* = */
  0x3E, /* > */
  0x40, /* @ */
  0x5B, /* [ */
  0x5C, /* \ */
  0x5D, /* ] */
  0x5E, /* ^ */
  0x5F, /* _ */
  0x60, /* ` */
  0x7B, /* { */
  0x7D, /* } */
  0x7E, /* ~ */
])
  TERMINATOR_TABLE[code] = 1

function isTerminatorChar(ch: number): boolean {
  return ch < 0x100 && TERMINATOR_TABLE[ch] === 1
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
