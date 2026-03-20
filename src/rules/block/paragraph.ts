/**
 * Block rule: paragraph
 */

import type { StateBlock } from '../../parse/parser_block/state_block'
import { canUseParagraphTerminatorFastPath, couldTerminateParagraph } from './paragraph_terminator_fast'

function isSpace(code: number): boolean {
  return code === 0x09 || code === 0x20
}

export function paragraph(state: StateBlock, startLine: number, endLine: number): boolean {
  const terminatorRules = state.md.block.ruler.getRulesForState(state, 'paragraph')
  const oldParentType = state.parentType
  const src = state.src
  const bMarks = state.bMarks
  const tShift = state.tShift
  const eMarks = state.eMarks
  const sCount = state.sCount
  const blkIndent = state.blkIndent
  const canUseFastTerminatorHint = canUseParagraphTerminatorFastPath(state)
  let nextLine = startLine + 1
  state.parentType = 'paragraph'

  // jump line-by-line until empty one or EOF
  for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
    // this would be a code block normally, but after paragraph
    // it's considered a lazy continuation regardless of what's there
    if (sCount[nextLine] - blkIndent > 3)
      continue

    // quirk for blockquotes, this line should already be checked by that rule
    if (sCount[nextLine] < 0)
      continue

    // In list items, sibling list markers are the hot-path paragraph
    // terminator; detect them before running the full terminator chain.
    if (oldParentType === 'list' && sCount[nextLine] >= blkIndent) {
      const start = bMarks[nextLine] + tShift[nextLine]
      const max = eMarks[nextLine]

      if (start < max) {
        const marker = src.charCodeAt(start)

        if (marker === 0x2A || marker === 0x2D || marker === 0x2B) {
          if (start + 1 >= max || isSpace(src.charCodeAt(start + 1)))
            break
        }
        else if (marker >= 0x30 && marker <= 0x39 && start + 1 < max) {
          let pos = start + 1

          for (;;) {
            if (pos >= max) {
              pos = -1
              break
            }

            const ch = src.charCodeAt(pos++)

            if (ch >= 0x30 && ch <= 0x39) {
              if (pos - start >= 10) {
                pos = -1
                break
              }
              continue
            }

            if ((ch === 0x29 || ch === 0x2E) && (pos >= max || isSpace(src.charCodeAt(pos)))) {
              break
            }

            pos = -1
            break
          }

          if (pos >= 0)
            break
        }
      }
    }

    const start = bMarks[nextLine] + tShift[nextLine]
    const max = eMarks[nextLine]

    if (canUseFastTerminatorHint && !couldTerminateParagraph(src, start, max))
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

  const content = state.getLines(startLine, nextLine, blkIndent, false).trim()

  state.line = nextLine

  const token_o = state.push('paragraph_open', 'p', 1)
  token_o.map = [startLine, state.line]

  const token_i = state.push('inline', '', 0)
  token_i.content = content
  token_i.map = [startLine, state.line]
  token_i.children = []

  state.push('paragraph_close', 'p', -1)

  state.parentType = oldParentType

  return true
}

export default paragraph
