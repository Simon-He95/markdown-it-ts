import { describe, expect, it } from 'vitest'
import markdownit, { EditableBuffer } from '../../src/index'

describe('EditableBuffer correctness fallback', () => {
  it('falls back to full parse when inserting reference definitions', () => {
    const md = markdownit()
    const buffer = new EditableBuffer(md, '[x][ref]\n\nplain\n')
    const env: Record<string, unknown> = {}

    buffer.parse()
    buffer.append('\n[ref]: https://example.com\n', env)

    const html = md.renderer.render(buffer.peek(), md.options, env)

    expect(html).toBe(md.render(buffer.toString()))
    expect(buffer.stats().lastMode).toBe('full')
    expect((env as any).__mdtsEditableInfo).toMatchObject({
      fallback: true,
      fallbackReason: 'global-markdown-state-edit',
    })
  })
})
