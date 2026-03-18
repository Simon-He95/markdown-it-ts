import { describe, expect, it, vi } from 'vitest'
import MarkdownIt, { PieceTable } from '../../src'

describe('inline source views', () => {
  it('parses piece-table source views through ParserInline without flattening the full input', () => {
    const md = MarkdownIt()
    const doc = 'prefix [link](https://example.com "title") and ![alt](img.png) with `code` plus \\\\*escape\\\\*'
    const table = new PieceTable(doc)
    const sliceSpy = vi.spyOn(table, 'slice')

    const baselineTokens: any[] = []
    md.inline.parse(doc, md, {}, baselineTokens)

    const viewTokens: any[] = []
    md.inline.parseSource(table.view(0, table.length, 12), md, {}, viewTokens)

    expect(md.renderer.render(baselineTokens, md.options, {}))
      .toBe(md.renderer.render(viewTokens, md.options, {}))

    const largestSlice = sliceSpy.mock.calls.reduce((max, [start, end]) => {
      const to = typeof end === 'number' ? end : table.length
      return Math.max(max, to - start)
    }, 0)

    expect(largestSlice).toBeLessThan(doc.length)

    sliceSpy.mockRestore()
  })

  it('handles entity, html_inline, and linkify with bounded source slices', () => {
    const md = MarkdownIt({ html: true, linkify: true })
    const doc = 'lead &amp; <span title="x > y">tag</span> https://example.com/path?q=1&v=2 trail'
    const table = new PieceTable(doc)
    const sliceSpy = vi.spyOn(table, 'slice')

    const baselineTokens: any[] = []
    md.inline.parse(doc, md, {}, baselineTokens)

    const viewTokens: any[] = []
    md.inline.parseSource(table.view(0, table.length, 10), md, {}, viewTokens)

    expect(md.renderer.render(baselineTokens, md.options, {}))
      .toBe(md.renderer.render(viewTokens, md.options, {}))

    const largestSlice = sliceSpy.mock.calls.reduce((max, [start, end]) => {
      const to = typeof end === 'number' ? end : table.length
      return Math.max(max, to - start)
    }, 0)

    expect(largestSlice).toBeLessThan(doc.length)

    sliceSpy.mockRestore()
  })
})
