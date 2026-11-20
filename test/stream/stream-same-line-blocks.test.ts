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

function pushParagraph(state: any, content: string, line: number) {
  const open = state.push('paragraph_open', 'p', 1)
  open.map = [line, line + 1]
  const inline = state.push('inline', '', 0)
  inline.content = content
  inline.map = [line, line + 1]
  inline.children = []
  state.push('paragraph_close', 'p', -1)
}

// Emits a paragraph and a container that absorbs the following lines, both
// starting on the same line (a fenced container directly after text).
function sameLineContainerPlugin(md: MarkdownIt) {
  md.block.ruler.before('paragraph', 'same_line_container', (state: any, startLine: number, endLine: number, silent: boolean) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const match = /^@@container@@(.*)$/.exec(state.src.slice(start, max))
    if (!match)
      return false
    if (silent)
      return true

    pushParagraph(state, match[1].trim(), startLine)

    let closeLine = -1
    const body: string[] = []
    for (let current = startLine + 1; current < endLine; current++) {
      const lineStart = state.bMarks[current] + state.tShift[current]
      const line = state.src.slice(lineStart, state.eMarks[current])
      if (line.trim() === ':::') {
        closeLine = current
        break
      }
      body.push(line)
    }

    const open = state.push('container_open', 'div', 1)
    open.map = [startLine, closeLine < 0 ? endLine : closeLine + 1]
    open.markup = ':::'
    const inline = state.push('inline', '', 0)
    inline.content = body.join('\n')
    inline.map = [startLine + 1, closeLine < 0 ? endLine : closeLine]
    inline.children = []
    state.push('container_close', 'div', -1)

    state.line = closeLine < 0 ? endLine : closeLine + 1
    return true
  })
}

// Emits a list and a paragraph, both starting on the same line. The trailing
// paragraph can be long enough to reach the list append-merge thresholds.
function sameLineListPlugin(md: MarkdownIt) {
  md.block.ruler.before('paragraph', 'same_line_list', (state: any, startLine: number, _endLine: number, silent: boolean) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const match = /^@@list@@(.*)$/.exec(state.src.slice(start, max))
    if (!match)
      return false
    if (silent)
      return true

    const listOpen = state.push('bullet_list_open', 'ul', 1)
    listOpen.map = [startLine, startLine + 1]
    listOpen.markup = '-'
    const itemOpen = state.push('list_item_open', 'li', 1)
    itemOpen.map = [startLine, startLine + 1]
    const paragraphOpen = state.push('paragraph_open', 'p', 1)
    paragraphOpen.map = [startLine, startLine + 1]
    paragraphOpen.hidden = true
    const inline = state.push('inline', '', 0)
    inline.content = 'item'
    inline.map = [startLine, startLine + 1]
    inline.children = []
    state.push('paragraph_close', 'p', -1)
    state.push('list_item_close', 'li', -1)
    state.push('bullet_list_close', 'ul', -1)

    const rest = match[1].trim()
    if (rest)
      pushParagraph(state, rest, startLine)

    state.line = startLine + 1
    return true
  })
}

const signature = (tokens: any[]) => tokens.map(token => `${token.type}:${token.content ?? ''}:${token.map ?? ''}`)

// Emits two paragraphs with identical inline text from one line, so a tail
// anchor cannot rely on the trailing content alone.
function doubleParagraphPlugin(md: MarkdownIt) {
  md.block.ruler.before('paragraph', 'double_paragraph', (state: any, startLine: number, _endLine: number, silent: boolean) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const match = /^@@double@@\s*(.*)$/.exec(state.src.slice(start, max))
    if (!match)
      return false
    if (silent)
      return true

    pushParagraph(state, match[1].trim(), startLine)
    pushParagraph(state, match[1].trim(), startLine)
    state.line = startLine + 1
    return true
  })
}

// Emits a zero-height marker token (`map = [line, line]`) between a leaf and a
// paragraph that both start on the same line.
function sameLineZeroHeightPlugin(md: MarkdownIt, useMap: boolean) {
  md.block.ruler.before('paragraph', 'same_line_zero_height', (state: any, startLine: number, _endLine: number, silent: boolean) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const match = /^@@zero@@(.*)$/.exec(state.src.slice(start, max))
    if (!match)
      return false
    if (silent)
      return true

    const leaf = state.push('same_line_leaf', 'div', 0)
    leaf.block = true
    leaf.content = 'zero'
    leaf.map = [startLine, startLine + 1]

    const marker = state.push('line_marker', 'span', 0)
    marker.block = true
    marker.map = useMap ? [startLine, startLine] : null

    pushParagraph(state, match[1].trim(), startLine)
    state.line = startLine + 1
    return true
  })
}

const streamChunks = (chunks: string[], usePlugin: (md: MarkdownIt) => void, options: Record<string, unknown> = {}) => {
  const md = MarkdownIt({ stream: true, ...options }).use(usePlugin)
  const reference = MarkdownIt().use(usePlugin)
  let source = ''
  for (const chunk of chunks) {
    source += chunk
    expect(signature(md.stream.parse(source)), `source ${JSON.stringify(source)}`).toEqual(signature(reference.parse(source, {})))
  }
}

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

  it('keeps appending inside the container when a paragraph shares its line', () => {
    streamChunks(['Intro\n\n@@container@@ lead\nbody line\n\n', 'next text\n\n', 'End\n'], sameLineContainerPlugin)
  })

  it('does not merge appended items into a list that is not the last block', () => {
    // The first chunk deliberately ends inside the line so the next parse goes
    // through the tail reparse instead of the append fast path.
    streamChunks([`Intro\n\n@@list@@ ${'word '.repeat(200)}\n`, '\n- another item\n\n', 'End\n'], sameLineListPlugin)
  })

  it('does not duplicate blocks split by a zero-height token on the same line', () => {
    const doc = 'Intro\n\n@@zero@@ tail text\n\nEnd'
    for (const useMap of [true, false]) {
      const md = MarkdownIt({ stream: true })
      md.use(md => sameLineZeroHeightPlugin(md, useMap))
      const reference = MarkdownIt()
      reference.use(md => sameLineZeroHeightPlugin(md, useMap))
      for (let end = 1; end <= doc.length; end++) {
        const prefix = doc.slice(0, end)
        expect(signature(md.stream.parse(prefix)), `useMap=${useMap} prefix ${JSON.stringify(prefix)}`).toEqual(signature(reference.parse(prefix, {})))
      }
    }
  })

  it('keeps both same-line blocks on the untrusted tail path', () => {
    // A post-block core rule makes token maps untrusted; the tail anchor then
    // has to cope with two paragraphs whose inline content is identical.
    const untrusted = { streamTailLocalPostBlockRules: true } as Record<string, unknown>
    const stream = MarkdownIt({ stream: true, ...untrusted }).use(doubleParagraphPlugin)
    stream.core.ruler.after('inline', 'noop_post', () => {})
    const reference = MarkdownIt().use(doubleParagraphPlugin)

    stream.stream.parse('Intro\n\n@@double@@ sa')
    expect(signature(stream.stream.append('m'))).toEqual(signature(reference.parse('Intro\n\n@@double@@ sam', {})))

    const doc = 'Intro\n\n@@double@@ sam\n\nEnd'
    const prefixStream = MarkdownIt({ stream: true, ...untrusted }).use(doubleParagraphPlugin)
    prefixStream.core.ruler.after('inline', 'noop_post', () => {})
    for (let end = 1; end <= doc.length; end++) {
      const prefix = doc.slice(0, end)
      expect(signature(prefixStream.stream.parse(prefix)), `prefix ${JSON.stringify(prefix)}`).toEqual(signature(reference.parse(prefix, {})))
    }
  })
})
