/**
 * Block rule: heading (# ## ###...)
 */

import type { StateBlock } from '../../parse/parser_block/state_block'

const HEADING_TAGS = ['', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
const HEADING_MARKUP = ['', '#', '##', '###', '####', '#####', '######']

function isSpace(code: number): boolean {
  switch (code) {
    case 0x09:
    case 0x20:
      return true
  }
  return false
}

export function heading(state: StateBlock, startLine: number, endLine: number, silent?: boolean): boolean {
  const src = state.src
  const bMarks = state.bMarks
  const tShift = state.tShift
  const eMarks = state.eMarks
  let pos = bMarks[startLine] + tShift[startLine]
  let max = eMarks[startLine]

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4)
    return false

  let ch = src.charCodeAt(pos)

  if (ch !== 0x23 /* # */ || pos >= max)
    return false

  // count heading level
  let level = 1
  ch = src.charCodeAt(++pos)
  while (ch === 0x23 /* # */ && pos < max && level <= 6) {
    level++
    ch = src.charCodeAt(++pos)
  }

  if (level > 6 || (pos < max && !isSpace(ch)))
    return false

  if (silent)
    return true

  let contentStart = pos
  while (contentStart < max) {
    ch = src.charCodeAt(contentStart)
    if (ch !== 0x09 && ch !== 0x20)
      break
    contentStart++
  }

  let contentEnd = max
  if (contentEnd > contentStart) {
    ch = src.charCodeAt(contentEnd - 1)
    if (ch === 0x09 || ch === 0x20 || ch === 0x23 /* # */) {
      // Let's cut tails like '    ###  ' from the end of string
      while (contentEnd > contentStart) {
        ch = src.charCodeAt(contentEnd - 1)
        if (ch !== 0x09 && ch !== 0x20)
          break
        contentEnd--
      }

      let tmp = contentEnd
      while (tmp > contentStart && src.charCodeAt(tmp - 1) === 0x23 /* # */) {
        tmp--
      }
      if (tmp > contentStart && isSpace(src.charCodeAt(tmp - 1))) {
        contentEnd = tmp
      }

      while (contentEnd > contentStart) {
        ch = src.charCodeAt(contentEnd - 1)
        if (ch !== 0x09 && ch !== 0x20)
          break
        contentEnd--
      }
    }
  }

  state.line = startLine + 1

  const token_o = state.push('heading_open', HEADING_TAGS[level], 1)
  token_o.markup = HEADING_MARKUP[level]
  token_o.map = [startLine, state.line]

  const token_i = state.push('inline', '', 0)
  token_i.content = src.slice(contentStart, contentEnd)
  token_i.map = [startLine, state.line]
  token_i.children = []

  const token_c = state.push('heading_close', HEADING_TAGS[level], -1)
  token_c.markup = HEADING_MARKUP[level]

  return true
}

export default heading
