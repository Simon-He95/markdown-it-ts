import type { Token } from '../../src/common/token'
import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'
import { createDeltaStream, type StreamPatch } from '../../src/experimental'

function applyPatch(tokens: Token[], patch: StreamPatch): Token[] {
  tokens.splice(patch.tokenStart, patch.tokenDeleteCount, ...patch.tokens)
  return tokens
}

function splitWithSeed(src: string, seed: number): string[] {
  const chunks: string[] = []
  let pos = 0
  let state = seed
  while (pos < src.length) {
    state = (state * 1664525 + 1013904223) >>> 0
    const size = 1 + (state % 17)
    chunks.push(src.slice(pos, pos + size))
    pos += size
  }
  return chunks
}

function render(md: ReturnType<typeof MarkdownIt>, tokens: Token[]): string {
  return md.renderer.render(tokens, md.options, {})
}

describe('AI delta stream', () => {
  it('matches full render after arbitrary chunk splits', () => {
    const src = [
      '# Title',
      '',
      'Intro paragraph with **bold** text and `code`.',
      '',
      '```ts',
      'const value = 1',
      '```',
      '',
      '| name | value |',
      '| ---- | ----- |',
      '| a | b |',
      '',
      '- held until final',
      '- because lists can continue after blank lines',
      '',
    ].join('\n')

    for (const seed of [1, 2, 3, 42, 999]) {
      const md = MarkdownIt({ stream: true })
      const stream = createDeltaStream(md)
      const tokens: Token[] = []

      for (const delta of splitWithSeed(src, seed)) {
        const patch = stream.feed(delta)
        if (patch)
          applyPatch(tokens, patch)
      }

      const finalPatch = stream.flush({ final: true })
      if (finalPatch)
        applyPatch(tokens, finalPatch)

      expect(render(md, tokens)).toBe(md.render(src))
      expect(render(md, stream.peek())).toBe(md.render(src))
    }
  })

  it('does not flush unsafe reference-definition prefixes early', () => {
    const src = '[x][ref]\n\n[ref]: https://example.com\n\n'
    const md = MarkdownIt({ stream: true })
    const stream = md.stream.createDelta()
    const tokens: Token[] = []

    for (const delta of ['[x]', '[ref]\n\n', '[ref]: ', 'https://example.com\n\n']) {
      const patch = stream.feed(delta)
      expect(patch).toBeNull()
    }

    const finalPatch = stream.flush({ final: true })
    expect(finalPatch).not.toBeNull()
    applyPatch(tokens, finalPatch!)

    expect(render(md, tokens)).toBe(md.render(src))
    expect(render(md, tokens)).toContain('href="https://example.com"')
    expect(stream.stats().lastMode).toBe('full')
  })

  it('emits append patches for stable plain paragraph boundaries', () => {
    const md = MarkdownIt({ stream: true })
    const stream = createDeltaStream(md)
    const tokens: Token[] = []

    const first = stream.feed('First paragraph.\n\n')
    expect(first).toMatchObject({
      tokenStart: 0,
      tokenDeleteCount: 0,
      mode: 'append',
    })
    applyPatch(tokens, first!)

    expect(stream.feed('Second paragraph')).toBeNull()

    const finalPatch = stream.flush({ final: true })
    expect(finalPatch).toMatchObject({
      tokenStart: tokens.length,
      tokenDeleteCount: 0,
      mode: 'append',
    })
    applyPatch(tokens, finalPatch!)

    expect(render(md, tokens)).toBe(md.render('First paragraph.\n\nSecond paragraph'))
    expect(stream.stats().localizedParses).toBe(2)
    expect(stream.stats().fullParses).toBe(0)
  })
})
