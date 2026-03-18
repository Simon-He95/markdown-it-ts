import { describe, expect, it, vi } from 'vitest'
import MarkdownIt, { PieceTable } from '../../src'

describe('piece table', () => {
  it('supports append, insert, replace, delete, and line lookups without flattening by default', () => {
    const table = new PieceTable('alpha\nbeta\n')

    table.append('gamma\n')
    table.insert(6, 'INSERT\n')
    table.replace(0, 5, 'ALPHA')
    table.delete(table.length - 6, table.length)

    expect(table.toString()).toBe('ALPHA\nINSERT\nbeta\n')
    expect(table.lineOfOffset(0)).toBe(0)
    expect(table.lineOfOffset(6)).toBe(1)
    expect(table.offsetOfLine(2)).toBe('ALPHA\nINSERT\n'.length)
    expect(table.stats().pieces).toBeGreaterThan(1)
    expect([...table.iterateRangeChunks(6, table.length, 4)].join('')).toBe('INSERT\nbeta\n')

    const view = table.view(6, table.length, 4)
    expect(view.length).toBe('INSERT\nbeta\n'.length)
    expect(view.charAt(0)).toBe('I')
    expect(view.indexOf('beta')).toBe('INSERT\n'.length)
    expect(view.slice(-5)).toBe('beta\n')
  })

  it('parses piece-table views without flattening the entire range first', () => {
    const md = MarkdownIt()
    const doc = '## Title\n\nalpha\n\n- a\n- b\n\n```js\nconsole.log(1)\n```\n'
    const table = new PieceTable(doc)
    const sliceSpy = vi.spyOn(table, 'slice')

    const state = md.core.parseSource(table.view(0, table.length, 16), {}, md)

    expect(md.renderer.render(state.tokens, md.options, {}))
      .toBe(MarkdownIt().render(doc))

    const largestSlice = sliceSpy.mock.calls.reduce((max, [start, end]) => {
      const to = typeof end === 'number' ? end : table.length
      return Math.max(max, to - start)
    }, 0)

    expect(largestSlice).toBeLessThan(table.length)

    sliceSpy.mockRestore()
  })

  it('falls back to normalized string parsing when a view contains CRLF or NULL', () => {
    const md = MarkdownIt()
    const doc = 'line 1\r\n\r\nline\0two\r'
    const table = new PieceTable(doc)
    const parseSpy = vi.spyOn(md.core, 'parse')

    const state = md.core.parseSource(table.view(), {}, md)

    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(md.renderer.render(state.tokens, md.options, {}))
      .toBe(MarkdownIt().render(doc))

    parseSpy.mockRestore()
  })
})
