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
})
