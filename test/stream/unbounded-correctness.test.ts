import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { getParseDiagnostics, UnboundedBuffer } from '../../src/experimental'
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
    expect(getParseDiagnostics(env)?.unbounded).toMatchObject({
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
    expect(getParseDiagnostics(env)?.unbounded).toMatchObject({
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
    expect(getParseDiagnostics(env)?.unbounded).toMatchObject({
      fallback: true,
      fallbackReason: 'reference-definition',
    })
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

    const firstTokens = parseStringUnbounded(md, withDefinition, env, {
      maxChunkChars: 10,
      maxChunkLines: 1,
    })
    const firstHtml = md.renderer.render(firstTokens, md.options, env)

    expect(firstHtml).toContain('href="https://external.example"')

    const withoutDefinition = [
      '[external][ext]',
      '',
      '[local][local]',
      '',
    ].join('\n')
    const tokens = parseStringUnbounded(md, withoutDefinition, env, {
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

  it('clears mdts-owned references when UnboundedBuffer is used directly', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    const buffer = new UnboundedBuffer(md, {
      maxChunkChars: 10,
      maxChunkLines: 1,
    })

    buffer.feed('[x][ref]\n\n')
    buffer.feed('[ref]: https://old.example\n')
    buffer.flushForce(env)

    const html = md.render('[x][ref]\n', env)

    expect(html).toBe(md.render('[x][ref]\n'))
    expect(html).not.toContain('https://old.example')
  })

  it('records diagnostics when global-state fallback is disabled', () => {
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

    parseStringUnbounded(md, src, env, {
      maxChunkChars: 20,
      maxChunkLines: 2,
      fallbackOnGlobalState: false,
    })

    expect(getParseDiagnostics(env)?.unbounded?.fallback).not.toBe(true)
    expect(getParseDiagnostics(env)?.unbounded).toMatchObject({
      globalStateDetected: 'reference-definition',
      globalStateFallbackDisabled: true,
    })
  })
})
