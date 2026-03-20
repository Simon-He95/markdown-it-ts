import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

function mathBlockPlugin(md: any) {
  md.block.ruler.before('fence', 'math_block_test', (state: any, startLine: number, endLine: number, silent: boolean) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const opener = state.src.slice(start, max).trim()

    if (opener !== '$$')
      return false

    let nextLine = startLine + 1
    for (; nextLine < endLine; nextLine++) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
      const lineMax = state.eMarks[nextLine]
      if (state.src.slice(lineStart, lineMax).trim() === '$$')
        break
    }

    if (nextLine >= endLine)
      return false

    if (silent)
      return true

    const token = state.push('math_block', 'math', 0)
    token.block = true
    token.content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false)
    token.markup = '$$'
    token.map = [startLine, nextLine + 1]
    state.line = nextLine + 1
    return true
  }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] })
}

function containerPlugin(md: any) {
  md.block.ruler.before('fence', 'vmr_container_test', (state: any, startLine: number, endLine: number, silent: boolean) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]
    const opener = state.src.slice(start, max).trim()

    if (!opener.startsWith(':::'))
      return false

    let nextLine = startLine + 1
    for (; nextLine < endLine; nextLine++) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
      const lineMax = state.eMarks[nextLine]
      if (state.src.slice(lineStart, lineMax).trim() === ':::')
        break
    }

    if (nextLine >= endLine)
      return false

    if (silent)
      return true

    const token = state.push('vmr_container', 'div', 0)
    token.block = true
    token.info = opener.slice(3).trim()
    token.content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false)
    token.map = [startLine, nextLine + 1]
    state.line = nextLine + 1
    return true
  }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] })
}

describe('plugin block terminator interop', () => {
  it('keeps custom math-style block rules working after paragraphs', () => {
    const md = MarkdownIt().use(mathBlockPlugin)
    const tokens = md.parse('Intro paragraph\n$$\nE = mc^2\n$$\n', {})
    const mathBlocks = tokens.filter((token: any) => token.type === 'math_block')

    expect(mathBlocks).toHaveLength(1)
    expect(mathBlocks[0].content).toContain('E = mc^2')
  })

  it('keeps custom block rules working inside list items', () => {
    const md = MarkdownIt().use(mathBlockPlugin)
    const src = '- item\n\n  $$\n  paid_rate = paid_users / views\n  $$\n'
    const tokens = md.parse(src, {})
    const mathBlocks = tokens.filter((token: any) => token.type === 'math_block')

    expect(mathBlocks).toHaveLength(1)
    expect(mathBlocks[0].content).toContain('paid_rate = paid_users / views')
  })

  it('keeps custom container-style rules from being swallowed by the preceding paragraph', () => {
    const md = MarkdownIt().use(containerPlugin)
    const tokens = md.parse('Above text\n::: viewcode:plain-text\nhello\n:::\n', {})
    const paragraph = tokens.find((token: any) => token.type === 'inline' && token.content === 'Above text')
    const container = tokens.find((token: any) => token.type === 'vmr_container')

    expect(paragraph).toBeDefined()
    expect(container).toBeDefined()
    expect(container.info).toBe('viewcode:plain-text')
    expect(container.content).toContain('hello')
  })
})
