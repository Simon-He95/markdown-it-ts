import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { EditableBuffer, getParseDiagnostics } from '../../src/experimental'

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
    expect(getParseDiagnostics(env)?.editable).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('falls back to full parse when inserting multiline reference definitions', () => {
    const md = markdownit()
    const buffer = new EditableBuffer(md, '[x][ref]\n\nplain\n')
    const env: Record<string, unknown> = {}

    buffer.parse()
    buffer.append('\n[ref]:\n  https://example.com\n', env)

    const html = md.renderer.render(buffer.peek(), md.options, env)

    expect(html).toBe(md.render(buffer.toString()))
    expect(html).toContain('href="https://example.com"')
    expect(buffer.stats().lastMode).toBe('full')
    expect(getParseDiagnostics(env)?.editable).toMatchObject({
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
    expect(getParseDiagnostics(env)?.editable).toMatchObject({
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
    expect(getParseDiagnostics(env)?.editable).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('refreshes reference definitions when reusing the same env object', () => {
    const md = markdownit()
    const src = [
      '[x][ref]',
      '',
      '[ref]: https://old.example',
      '',
    ].join('\n')

    const buffer = new EditableBuffer(md, src)
    const env: Record<string, unknown> = {}

    buffer.parse(env)

    const start = buffer.toString().indexOf('old.example')
    buffer.replace(start, start + 'old.example'.length, 'new.example', env)

    const html = md.renderer.render(buffer.peek(), md.options, env)

    expect(html).toBe(md.render(buffer.toString()))
    expect(html).toContain('href="https://new.example"')
    expect(html).not.toContain('https://old.example')
  })

  it('clears stale editable diagnostics when reusing env for non-fallback operations', () => {
    const md = markdownit()
    const buffer = new EditableBuffer(md, '[x][ref]\n\nplain\n')
    const env: Record<string, unknown> = {}

    buffer.parse()
    buffer.append('\n[ref]: https://example.com\n', env)

    expect(getParseDiagnostics(env)?.editable).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })

    buffer.reset('alpha\n\nbeta\n')
    buffer.parse(env)
    expect(getParseDiagnostics(env)?.editable).toBeUndefined()

    const start = buffer.toString().indexOf('beta')
    buffer.replace(start, start + 'beta'.length, 'beta updated', env)
    expect(getParseDiagnostics(env)?.editable).toBeUndefined()
  })

  it('restores user-provided env.references after clearing mdts-owned global state', () => {
    const md = markdownit()
    const env: Record<string, any> = {
      references: {
        EXT: {
          href: 'https://external.example',
          title: '',
        },
      },
    }
    const withDefinition = [
      '[external][ext]',
      '',
      '[local]: https://local.example',
      '',
    ].join('\n')
    const buffer = new EditableBuffer(md, withDefinition)

    buffer.parse(env)
    const firstHtml = md.renderer.render(buffer.peek(), md.options, env)

    expect(firstHtml).toContain('href="https://external.example"')

    const withoutDefinition = [
      '[external][ext]',
      '',
      '[local][local]',
      '',
    ].join('\n')
    buffer.reset(withoutDefinition)
    buffer.parse(env)

    const html = md.renderer.render(buffer.peek(), md.options, env)

    expect(html).toContain('href="https://external.example"')
    expect(html).not.toContain('https://local.example')
  })

  it('clears stale reference definitions after reset when reusing env', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}
    const buffer = new EditableBuffer(
      md,
      '[x][ref]\n\n[ref]: https://old.example\n',
    )

    buffer.parse(env)

    buffer.reset('[x][ref]\n')
    buffer.parse(env)

    const html = md.renderer.render(buffer.peek(), md.options, env)

    expect(html).toBe(md.render('[x][ref]\n'))
    expect(html).not.toContain('https://old.example')
  })

  it('clears multiline reference definitions detected through piece-table chunks', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}
    const buffer = new EditableBuffer(md, '[x][foo bar]\n\n[foo\n')

    buffer.append('bar]: https://old.example\n\n', env)
    buffer.parse(env)

    buffer.reset('[x][foo bar]\n')
    buffer.parse(env)

    const html = md.renderer.render(buffer.peek(), md.options, env)

    expect(html).toBe(md.render('[x][foo bar]\n'))
    expect(html).not.toContain('https://old.example')
  })
})
