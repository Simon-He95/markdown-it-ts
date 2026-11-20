import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

// A block rule that, like display-math plugins handling `$$x$$ trailing text`,
// emits two top-level blocks from a single source line: a leaf block for the
// delimited part and a paragraph for the text after it. Both carry the same
// starting line in `map`.
function sameLineBlocksPlugin(md: MarkdownIt) {
  md.block.ruler.before('paragraph', 'same_line_blocks', (state: any, startLine: number, _endLine: number, silent: boolean) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const line = state.src.slice(start, max)
    const match = /^@@([^@]+)@@(.*)$/.exec(line)
    if (!match)
      return false
    if (silent)
      return true

    const block = state.push('same_line_leaf', 'div', 0)
    block.block = true
    block.content = match[1]
    block.map = [startLine, startLine + 1]

    const rest = match[2].trim()
    if (rest) {
      const open = state.push('paragraph_open', 'p', 1)
      open.map = [startLine, startLine + 1]
      const inline = state.push('inline', '', 0)
      inline.content = rest
      inline.map = [startLine, startLine + 1]
      inline.children = []
      state.push('paragraph_close', 'p', -1)
    }

    state.line = startLine + 1
    return true
  })
}

const countLeaves = (tokens: { type: string }[]) => tokens.filter(token => token.type === 'same_line_leaf').length

describe('stream parser: several top-level blocks on one line', () => {
  it('does not duplicate the earlier block while the trailing paragraph grows', () => {
    const md = MarkdownIt({ stream: true }).use(sameLineBlocksPlugin)
    const reference = MarkdownIt().use(sameLineBlocksPlugin)
    const doc = 'Intro\n\n@@E=mc^2@@ where E is energy.\n\nEnd'

    for (let end = 1; end <= doc.length; end++) {
      const prefix = doc.slice(0, end)
      const tokens = md.stream.parse(prefix)
      const expected = reference.parse(prefix, {})
      expect(countLeaves(tokens), `prefix ${JSON.stringify(prefix)}`).toBe(countLeaves(expected))
      expect(tokens.map(token => token.type), `prefix ${JSON.stringify(prefix)}`).toEqual(expected.map(token => token.type))
    }
  })
})
