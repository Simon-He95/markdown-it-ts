import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { chunkedParse, getParseDiagnostics } from '../../src/experimental'
import abbr from 'markdown-it-abbr'
import footnote from 'markdown-it-footnote'

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
    expect(getParseDiagnostics(result.env)?.chunk).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('falls back to full parse for escaped reference definition labels', () => {
    const src = [
      '[later][\\]]',
      '',
      'plain text',
      '',
      '[\\]]: https://example.com',
      '',
    ].join('\n')

    const result = renderChunked(src)

    expect(result.html).toBe(result.full)
    expect(getParseDiagnostics(result.env)?.chunk).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('falls back to full parse for multiline reference definitions', () => {
    const src = [
      '[x][ref]',
      '',
      '[ref]:',
      '  https://example.com',
      '',
    ].join('\n')

    const result = renderChunked(src, {
      maxChunkChars: 8,
      maxChunkLines: 1,
    })

    expect(result.html).toBe(result.full)
    expect(result.html).toContain('href="https://example.com"')
    expect(getParseDiagnostics(result.env)?.chunk).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('preserves user-provided env.references when global-state fallback runs', () => {
    const md = markdownit()
    const env: Record<string, any> = {
      references: {
        EXT: {
          href: 'https://external.example',
          title: '',
        },
      },
    }
    const src = [
      '[external][ext]',
      '',
      '[local]: https://local.example',
      '',
    ].join('\n')

    const tokens = chunkedParse(md, src, env, {
      maxChunkChars: 10,
      maxChunkLines: 1,
    })
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toContain('href="https://external.example"')
    expect(env.references.EXT.href).toBe('https://external.example')
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

    chunkedParse(md, withDefinition, env, {
      maxChunkChars: 10,
      maxChunkLines: 1,
    })

    const withoutDefinition = [
      '[external][ext]',
      '',
      '[local][local]',
      '',
    ].join('\n')
    const tokens = chunkedParse(md, withoutDefinition, env, {
      maxChunkChars: 10,
      maxChunkLines: 1,
    })
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toContain('href="https://external.example"')
    expect(html).not.toContain('https://local.example')
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

    chunkedParse(md, oldSrc, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })
    const tokens = chunkedParse(md, newSrc, env, {
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

    chunkedParse(md, oldSrc, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })
    const tokens = chunkedParse(md, newSrc, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
    })
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(md.render(newSrc))
    expect(html).not.toContain('https://old.example')
  })

  it('falls back to full parse for footnote definitions', () => {
    const md = markdownit().use(footnote as any)
    const env: Record<string, unknown> = {}
    const src = [
      'hello[^a]',
      '',
      '[^a]: world',
      '',
    ].join('\n')

    const tokens = chunkedParse(md, src, env, {
      maxChunkChars: 10,
      maxChunkLines: 1,
    })

    expect(md.renderer.render(tokens, md.options, env)).toBe(md.render(src))
    expect(getParseDiagnostics(env)?.chunk).toMatchObject({
      fallback: true,
      fallbackReason: 'footnote-definition',
    })
  })

  it('falls back to full parse for abbreviation definitions', () => {
    const md = markdownit().use(abbr as any)
    const env: Record<string, unknown> = {}
    const src = [
      '*[HTML]: Hyper Text Markup Language',
      '',
      'HTML',
      '',
    ].join('\n')

    const tokens = chunkedParse(md, src, env, {
      maxChunkChars: 10,
      maxChunkLines: 1,
    })

    expect(md.renderer.render(tokens, md.options, env)).toBe(md.render(src))
    expect(getParseDiagnostics(env)?.chunk).toMatchObject({
      fallback: true,
      fallbackReason: 'abbreviation-definition',
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

    expect(getParseDiagnostics(result.env)?.chunk?.fallback).not.toBe(true)
    expect(getParseDiagnostics(result.env)?.chunk).toMatchObject({
      globalStateDetected: 'reference-definition',
      globalStateFallbackDisabled: true,
    })
  })
})
