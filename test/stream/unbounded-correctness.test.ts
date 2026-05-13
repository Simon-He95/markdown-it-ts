import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { parseStringUnbounded } from '../../src/stream/unbounded'

describe('parseStringUnbounded correctness', () => {
  it('falls back to full parse for reference definitions', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    const src = [
      '[later][x]',
      '',
      'plain text',
      '',
      '[x]: https://example.com',
      '',
    ].join('\n')

    const tokens = parseStringUnbounded(md, src, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })

    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(md.render(src))
    expect((env as any).__mdtsUnboundedInfo).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('falls back to full parse for escaped reference definition labels', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    const src = [
      '[later][\\]]',
      '',
      'plain text',
      '',
      '[\\]]: https://example.com',
      '',
    ].join('\n')

    const tokens = parseStringUnbounded(md, src, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })

    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(md.render(src))
    expect((env as any).__mdtsUnboundedInfo).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('falls back to full parse for multiline reference definitions', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    const src = [
      '[x][ref]',
      '',
      '[ref]:',
      '  https://example.com',
      '',
    ].join('\n')

    const tokens = parseStringUnbounded(md, src, env, {
      maxChunkChars: 8,
      maxChunkLines: 1,
    })

    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(md.render(src))
    expect(html).toContain('href="https://example.com"')
    expect((env as any).__mdtsUnboundedInfo).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('refreshes reference definitions when reusing the same env object', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}
    const oldSrc = [
      '[x][ref]',
      '',
      '[ref]: https://old.example',
      '',
    ].join('\n')
    const newSrc = oldSrc.replace('old.example', 'new.example')

    parseStringUnbounded(md, oldSrc, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })
    const tokens = parseStringUnbounded(md, newSrc, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(md.render(newSrc))
    expect(html).toContain('href="https://new.example"')
    expect(html).not.toContain('https://old.example')
  })

  it('clears stale reference definitions when current source has no definitions', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}
    const oldSrc = [
      '[x][ref]',
      '',
      '[ref]: https://old.example',
      '',
    ].join('\n')
    const newSrc = '[x][ref]\n'

    parseStringUnbounded(md, oldSrc, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })
    const tokens = parseStringUnbounded(md, newSrc, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(md.render(newSrc))
    expect(html).not.toContain('https://old.example')
  })
})
