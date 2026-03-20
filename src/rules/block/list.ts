/**
 * Block rule: list
 */

import type { StateBlock } from '../../parse/parser_block/state_block'

function isSpace(code: number): boolean {
  switch (code) {
    case 0x09:
    case 0x20:
      return true
  }
  return false
}

// Search `[-+*][\n ]`, returns next pos after marker on success
// or -1 on fail.
function skipBulletListMarker(state: StateBlock, startLine: number): number {
  const eMarks = state.eMarks
  const bMarks = state.bMarks
  const tShift = state.tShift
  const src = state.src
  const max = eMarks[startLine]
  let pos = bMarks[startLine] + tShift[startLine]

  const marker = src.charCodeAt(pos++)
  // Check bullet
  if (marker !== 0x2A
    && /* * */ marker !== 0x2D
    && /* - */ marker !== 0x2B /* + */) {
    return -1
  }

  if (pos < max) {
    const ch = src.charCodeAt(pos)

    if (!isSpace(ch)) {
      // " -test " - is not a list item
      return -1
    }
  }

  return pos
}

// Search `\d+[.)][\n ]`, returns next pos after marker on success
// or -1 on fail.
function skipOrderedListMarker(state: StateBlock, startLine: number): number {
  const bMarks = state.bMarks
  const tShift = state.tShift
  const eMarks = state.eMarks
  const src = state.src
  const start = bMarks[startLine] + tShift[startLine]
  const max = eMarks[startLine]
  let pos = start

  // List marker should have at least 2 chars (digit + dot)
  if (pos + 1 >= max)
    return -1

  let ch = src.charCodeAt(pos++)

  if (ch < 0x30 /* 0 */ || ch > 0x39 /* 9 */)
    return -1

  for (;;) {
    // EOL -> fail
    if (pos >= max)
      return -1

    ch = src.charCodeAt(pos++)

    if (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) {
      // List marker should have no more than 9 digits
      // (prevents integer overflow in browsers)
      if (pos - start >= 10)
        return -1

      continue
    }

    // found valid marker
    if (ch === 0x29 /* ) */ || ch === 0x2E /* . */) {
      break
    }

    return -1
  }

  if (pos < max) {
    ch = src.charCodeAt(pos)

    if (!isSpace(ch)) {
      // " 1.test " - is not a list item
      return -1
    }
  }
  return pos
}

function parseOrderedListMarkerValue(state: StateBlock, startLine: number, markerEnd: number): number {
  const bMarks = state.bMarks
  const tShift = state.tShift
  const src = state.src
  const start = bMarks[startLine] + tShift[startLine]
  let value = 0
  for (let pos = start; pos < markerEnd - 1; pos++) {
    value = value * 10 + src.charCodeAt(pos) - 0x30
  }
  return value
}

const SINGLE_DIGIT_MARKERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

function markTightParagraphs(state: StateBlock, idx: number): void {
  const level = state.level + 2
  const tokens = state.tokens

  for (let i = idx + 2, l = tokens.length - 2; i < l; i++) {
    const token = tokens[i]
    if (token.level !== level)
      continue

    if (token.type === 'paragraph_open') {
      token.hidden = true
      tokens[i + 2].hidden = true
      i += 2
      continue
    }

    if (token.nesting === 1) {
      let nesting = 1
      while (nesting > 0 && ++i < l) {
        nesting += tokens[i].nesting
      }
    }
  }
}

export function list(state: StateBlock, startLine: number, endLine: number, silent?: boolean): boolean {
  let max: number
  let pos: number
  let start: number = 0
  let nextLine = startLine
  let tight = true

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[nextLine] - state.blkIndent >= 4)
    return false

  // Special case:
  //  - item 1
  //   - item 2
  //    - item 3
  //     - item 4
  //      - this one is a paragraph continuation
  if (state.listIndent >= 0
    && state.sCount[nextLine] - state.listIndent >= 4
    && state.sCount[nextLine] < state.blkIndent) {
    return false
  }

  let isTerminatingParagraph = false

  // limit conditions when list can interrupt
  // a paragraph (validation mode only)
  if (silent && state.parentType === 'paragraph') {
    // Next list item should still terminate previous list item;
    //
    // This code can fail if plugins use blkIndent as well as lists,
    // but I hope the spec gets fixed long before that happens.
    //
    if (state.sCount[nextLine] >= state.blkIndent) {
      isTerminatingParagraph = true
    }
  }

  // Detect list type and position after marker
  let isOrdered: boolean
  let markerValue: number | undefined
  let posAfterMarker: number
  const src = state.src
  const bMarks = state.bMarks
  const tShift = state.tShift
  const eMarks = state.eMarks
  const sCount = state.sCount
  const bsCount = state.bsCount
  const lineStart = bMarks[nextLine] + tShift[nextLine]
  if (lineStart >= eMarks[nextLine]) {
    return false
  }
  const marker = src.charCodeAt(lineStart)
  if (marker >= 0x30 && marker <= 0x39) {
    posAfterMarker = skipOrderedListMarker(state, nextLine)
    if (posAfterMarker < 0)
      return false

    isOrdered = true
    start = lineStart
    markerValue = parseOrderedListMarkerValue(state, nextLine, posAfterMarker)

    // If we're starting a new ordered list right after
    // a paragraph, it should start with 1.
    if (isTerminatingParagraph && markerValue !== 1)
      return false
  }
  else if (marker === 0x2A || marker === 0x2D || marker === 0x2B) {
    posAfterMarker = skipBulletListMarker(state, nextLine)
    if (posAfterMarker < 0)
      return false
    isOrdered = false
  }
  else {
    return false
  }

  // If we're starting a new unordered list right after
  // a paragraph, first line should not be empty.
  if (isTerminatingParagraph) {
    if (state.skipSpaces(posAfterMarker) >= eMarks[nextLine])
      return false
  }

  // For validation mode we can terminate immediately
  if (silent)
    return true

  // We should terminate list on style change. Remember first one to compare.
  const markerCharCode = src.charCodeAt(posAfterMarker - 1)
  const markerMarkup = String.fromCharCode(markerCharCode)

  // Start list
  if (isOrdered) {
    const token = state.push('ordered_list_open', 'ol', 1)
    if (markerValue !== undefined && markerValue !== 1) {
      token.attrs = [['start', String(markerValue)]]
    }
  }
  else {
    state.push('bullet_list_open', 'ul', 1)
  }

  const listLines: [number, number] = [nextLine, 0]
  state.tokens[state.tokens.length - 1].map = listLines
  state.tokens[state.tokens.length - 1].markup = markerMarkup

  //
  // Iterate list items
  //

  let prevEmptyEnd = false
  const listTokIdx = state.tokens.length - 1
  const terminatorRules = state.md.block.ruler.getRulesForState(state, 'list')

  const oldParentType = state.parentType
  state.parentType = 'list'

  while (nextLine < endLine) {
    pos = posAfterMarker
    max = eMarks[nextLine]

    const initial = sCount[nextLine] + posAfterMarker - (bMarks[nextLine] + tShift[nextLine])
    let offset = initial

    while (pos < max) {
      const ch = src.charCodeAt(pos)

      if (ch === 0x09) {
        offset += 4 - (offset + bsCount[nextLine]) % 4
      }
      else if (ch === 0x20) {
        offset++
      }
      else {
        break
      }

      pos++
    }

    const contentStart = pos
    let indentAfterMarker: number

    if (contentStart >= max) {
      // trimming space in "-    \n  3" case, indent is 1 here
      indentAfterMarker = 1
    }
    else {
      indentAfterMarker = offset - initial
    }

    // If we have more than 4 spaces, the indent is 1
    // (the rest is just indented code block)
    if (indentAfterMarker > 4)
      indentAfterMarker = 1

    // "  -  test"
    //  ^^^^^ - calculating total length of this thing
    const indent = initial + indentAfterMarker

    // Run subparser & write tokens
    const token = state.push('list_item_open', 'li', 1)
    token.markup = markerMarkup
    const itemLines: [number, number] = [nextLine, 0]
    token.map = itemLines
    if (isOrdered) {
      const markerDigits = posAfterMarker - start - 1
      token.info = markerDigits === 1
        ? SINGLE_DIGIT_MARKERS[src.charCodeAt(start) - 0x30]
        : src.slice(start, posAfterMarker - 1)
    }
    // change current state, then restore it after parser subcall
    const oldTight = state.tight
    const oldTShift = state.tShift[nextLine]
    const oldSCount = state.sCount[nextLine]

    //  - example list
    // ^ listIndent position will be here
    //   ^ blkIndent position will be here
    //
    const oldListIndent = state.listIndent
    state.listIndent = state.blkIndent
    state.blkIndent = indent

    state.tight = true
    state.tShift[nextLine] = contentStart - bMarks[nextLine]
    state.sCount[nextLine] = offset

    if (contentStart >= max && state.isEmpty(nextLine + 1)) {
      // workaround for this case
      // (list item is empty, list terminates before "foo"):
      // ~~~~~~~~
      //   -
      //
      //     foo
      // ~~~~~~~~
      state.line = Math.min(state.line + 2, endLine)
    }
    else {
      state.md.block.tokenize(state, nextLine, endLine, true)
    }

    // If any of list item is tight, mark list as tight
    if (!state.tight || prevEmptyEnd) {
      tight = false
    }
    // Item become loose if finish with empty line,
    // but we should filter last element, because it means list finish
    prevEmptyEnd = (state.line - nextLine) > 1 && state.isEmpty(state.line - 1)

    state.blkIndent = state.listIndent
    state.listIndent = oldListIndent
    state.tShift[nextLine] = oldTShift
    state.sCount[nextLine] = oldSCount
    state.tight = oldTight

    state.push('list_item_close', 'li', -1).markup = markerMarkup

    nextLine = state.line
    itemLines[1] = nextLine

    if (nextLine >= endLine)
      break

    //
    // Try to check if list is terminated or continued.
    //
    if (state.sCount[nextLine] < state.blkIndent)
      break

    // if it's indented more than 3 spaces, it should be a code block
    if (state.sCount[nextLine] - state.blkIndent >= 4)
      break

    if (!isOrdered) {
      const nextLineStart = bMarks[nextLine] + tShift[nextLine]
      const nextLineEnd = eMarks[nextLine]

      if (nextLineStart < nextLineEnd && src.charCodeAt(nextLineStart) === markerCharCode) {
        const afterMarker = nextLineStart + 1

        if (afterMarker >= nextLineEnd) {
          posAfterMarker = afterMarker
          continue
        }

        const nextChar = src.charCodeAt(afterMarker)
        if (nextChar === 0x09 || nextChar === 0x20) {
          if (markerCharCode !== 0x2D) {
            posAfterMarker = afterMarker
            continue
          }

          let probe = afterMarker + 1
          while (probe < nextLineEnd) {
            const ch = src.charCodeAt(probe)
            if (ch !== 0x09 && ch !== 0x20)
              break
            probe++
          }

          if (probe >= nextLineEnd || src.charCodeAt(probe) !== 0x2D) {
            posAfterMarker = afterMarker
            continue
          }
        }
      }
    }

    // fail if terminating block found
    let terminate = false
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true
        break
      }
    }
    if (terminate)
      break

    // fail if list has another type
    if (isOrdered) {
      posAfterMarker = skipOrderedListMarker(state, nextLine)
      if (posAfterMarker < 0)
        break
      start = bMarks[nextLine] + tShift[nextLine]
    }
    else {
      posAfterMarker = skipBulletListMarker(state, nextLine)
      if (posAfterMarker < 0)
        break
    }

    if (markerCharCode !== src.charCodeAt(posAfterMarker - 1))
      break
  }

  // Finalize list
  if (isOrdered) {
    state.push('ordered_list_close', 'ol', -1).markup = markerMarkup
  }
  else {
    state.push('bullet_list_close', 'ul', -1).markup = markerMarkup
  }

  listLines[1] = nextLine
  state.line = nextLine

  state.parentType = oldParentType

  // mark paragraphs tight if needed
  if (tight)
    markTightParagraphs(state, listTokIdx)

  return true
}

export default list
