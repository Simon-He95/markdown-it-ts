/**
 * Block rule: lheading (---, ===)
 */

import type { StateBlock } from '../../parse/parser_block/state_block'
import { canUseParagraphTerminatorFastPath, couldTerminateParagraph } from './paragraph_terminator_fast'

const HEADING_TAGS = ['', 'h1', 'h2']

export function lheading(state: StateBlock, startLine: number, endLine: number): boolean {
  const terminatorRules = state.md.block.ruler.getRulesForState(state, 'paragraph')
  const src = state.src
  const bMarks = state.bMarks
  const tShift = state.tShift
  const eMarks = state.eMarks
  const sCount = state.sCount
  const blkIndent = state.blkIndent
  const canUseFastTerminatorHint = canUseParagraphTerminatorFastPath(state)

  // if it's indented more than 3 spaces, it should be a code block
  if (sCount[startLine] - blkIndent >= 4)
    return false

  const oldParentType = state.parentType
  state.parentType = 'paragraph' // use paragraph to match terminatorRules

  // jump line-by-line until empty one or EOF
  let level = 0
  let marker: number | undefined
  let nextLine = startLine + 1

  for (; nextLine < endLine; nextLine++) {
    const lineStart = bMarks[nextLine] + tShift[nextLine]
    const max = eMarks[nextLine]

    if (lineStart >= max)
      break

    // this would be a code block normally, but after paragraph
    // it's considered a lazy continuation regardless of what's there
    if (sCount[nextLine] - blkIndent > 3)
      continue

    //
    // Check for underline in setext header
    //
    if (sCount[nextLine] >= blkIndent) {
      marker = src.charCodeAt(lineStart)

      if (marker === 0x2D /* - */ || marker === 0x3D /* = */) {
        let pos = lineStart + 1
        let markerEnd = pos

        while (pos < max && src.charCodeAt(pos) === marker)
          pos++
        markerEnd = pos

        while (pos < max) {
          const ch = src.charCodeAt(pos)
          if (ch !== 0x09 && ch !== 0x20)
            break
          pos++
        }

        if (pos >= max) {
          level = (marker === 0x3D /* = */ ? 1 : 2)
          break
        }

        if (markerEnd - lineStart > 1)
          continue
      }
    }

    // quirk for blockquotes, this line should already be checked by that rule
    if (sCount[nextLine] < 0)
      continue

    if (canUseFastTerminatorHint && !couldTerminateParagraph(src, lineStart, max))
      continue

    // Some tags can terminate paragraph without empty line.
    let terminate = false
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true
        break
      }
    }
    if (terminate)
      break
  }

  if (!level) {
    // Didn't find valid underline
    return false
  }

  let content: string
  if (nextLine === startLine + 1) {
    const lineStart = bMarks[startLine] + tShift[startLine]
    let lineEnd = eMarks[startLine]

    while (lineEnd > lineStart) {
      const ch = src.charCodeAt(lineEnd - 1)
      if (ch !== 0x09 && ch !== 0x20)
        break
      lineEnd--
    }

    content = src.slice(lineStart, lineEnd)
  }
  else {
    content = state.getLines(startLine, nextLine, blkIndent, false).trim()
  }

  state.line = nextLine + 1
  const markup = marker === 0x3D /* = */ ? '=' : '-'

  const token_o = state.push('heading_open', HEADING_TAGS[level], 1)
  token_o.markup = markup
  token_o.map = [startLine, state.line]

  const token_i = state.push('inline', '', 0)
  token_i.content = content
  token_i.map = [startLine, state.line - 1]
  token_i.children = []

  const token_c = state.push('heading_close', HEADING_TAGS[level], -1)
  token_c.markup = markup

  state.parentType = oldParentType

  return true
}

export default lheading
