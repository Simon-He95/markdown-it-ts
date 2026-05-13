import { describe, expect, it } from 'vitest'
import markdownit, { chunkedParse } from '../../src/index'

function renderChunked(src: string, opts: Parameters<typeof chunkedParse>[3] = {}) {
  const md = markdownit()
  const env: Record<string, unknown> = {}

  const tokens = chunkedParse(md, src, env, {
    maxChunkChars: 20,
    maxChunkLines: 2,
    fenceAware: true,
    ...opts,
  })

  return {
    html: md.renderer.render(tokens, md.options, env),
    env,
    full: md.render(src),
  }
}

describe('chunkedParse correctness', () => {
  it('matches full parse for ordinary chunk-safe markdown', () => {
    const src = [
      '# Title',
      '',
      'Paragraph one.',
      '',
      '- a',
      '- b',
      '',
      '```ts',
      'const x = 1',
      '```',
      '',
    ].join('\n')

    const result = renderChunked(src)

    expect(result.html).toBe(result.full)
  })

  it('falls back to full parse for reference definitions', () => {
    const src = [
      '[later][x]',
      '',
      'plain text',
      '',
      '[x]: https://example.com',
      '',
    ].join('\n')

    const result = renderChunked(src)

    expect(result.html).toBe(result.full)
    expect((result.env as any).__mdtsChunkInfo).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('allows explicit opt-out from global-state fallback', () => {
    const src = [
      '[later][x]',
      '',
      'plain text',
      '',
      '[x]: https://example.com',
      '',
    ].join('\n')

    const result = renderChunked(src, {
      fallbackOnGlobalState: false,
    })

    expect((result.env as any).__mdtsChunkInfo?.fallback).not.toBe(true)
  })
})
