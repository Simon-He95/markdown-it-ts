import { describe, expect, it, vi } from 'vitest'
import MarkdownIt, { EditableBuffer } from '../../src'

function para(n: number) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function buildDoc(blocks: number) {
  let s = ''
  for (let i = 0; i < blocks; i++)
    s += para(i)
  return s
}

describe('editable buffer', () => {
  it('matches baseline after middle replace, insert, delete, and append edits', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt()
    const doc = buildDoc(30)
    const buffer = new EditableBuffer(md, doc)

    buffer.parse({})

    const insertPos = doc.indexOf('Lorem ipsum')
    buffer.insert(insertPos, 'PREFIX ', {})

    const current1 = buffer.toString()
    const replaceStart = current1.indexOf('console.log(18)')
    buffer.replace(replaceStart, replaceStart + 'console.log(18)'.length, 'console.log("edited")', {})

    const current2 = buffer.toString()
    const deleteStart = current2.indexOf('- b\n')
    buffer.delete(deleteStart, deleteStart + '- b\n'.length, {})

    buffer.append('\n## Tail\n\nFinal line.\n', {})

    expect(md.renderer.render(buffer.peek(), md.options, {}))
      .toEqual(baseline.render(buffer.toString()))
  })

  it('reparses only a localized suffix for edits near the end of large documents', () => {
    const md = MarkdownIt()
    const doc = buildDoc(80)
    const buffer = new EditableBuffer(md, doc)
    buffer.parse({})

    const parseSpy = vi.spyOn(md.core, 'parse')
    const parseSourceSpy = vi.spyOn(md.core, 'parseSource')
    const marker = 'console.log(72)'
    const start = buffer.toString().indexOf(marker)
    const sliceSpy = vi.spyOn((buffer as any).source, 'slice')

    buffer.replace(start, start + marker.length, 'console.log("late-edit")', {})

    const largestSlice = sliceSpy.mock.calls.reduce((max, [from, to]) => {
      const end = typeof to === 'number' ? to : (buffer as any).source.length
      return Math.max(max, end - from)
    }, 0)

    expect(parseSourceSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy).not.toHaveBeenCalled()
    expect(buffer.stats().lastMode).toBe('localized')
    expect(buffer.stats().lastReparsedChars).toBeLessThan(doc.length / 2)
    expect(largestSlice).toBeLessThan(doc.length / 2)

    parseSpy.mockRestore()
    parseSourceSpy.mockRestore()
    sliceSpy.mockRestore()
  })
})
