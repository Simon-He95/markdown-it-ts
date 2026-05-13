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
      fallbackReason: 'reference-definition',
    })
  })

  it('falls back to full parse when editing inside an existing reference definition line', () => {
    const md = markdownit()
    const src = [
      '[before][ref]',
      '',
      'middle',
      '',
      '[ref]: https://old.example',
      '',
      'tail',
      '',
    ].join('\n')

    const buffer = new EditableBuffer(md, src)
    const env: Record<string, unknown> = {}

    buffer.parse()

    const start = buffer.toString().indexOf('old.example')
    buffer.replace(start, start + 'old.example'.length, 'new.example', env)

    const html = md.renderer.render(buffer.peek(), md.options, env)

    expect(html).toBe(md.render(buffer.toString()))
    expect(buffer.stats().lastMode).toBe('full')
    expect((env as any).__mdtsEditableInfo).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('falls back to full parse when editing a reference usage after an existing reference definition', () => {
    const md = markdownit()
    const src = [
      '[ref]: https://example.com',
      '',
      'plain',
      '',
    ].join('\n')

    const buffer = new EditableBuffer(md, src)
    const env: Record<string, unknown> = {}

    buffer.parse(env)

    const start = buffer.toString().indexOf('plain')
    buffer.replace(start, start + 'plain'.length, '[x][ref]', env)

    const html = md.renderer.render(buffer.peek(), md.options, env)

    expect(html).toBe(md.render(buffer.toString()))
    expect(buffer.stats().lastMode).toBe('full')
    expect((env as any).__mdtsEditableInfo).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })
})
