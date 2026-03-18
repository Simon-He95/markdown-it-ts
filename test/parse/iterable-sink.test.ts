import { describe, expect, it } from 'vitest'
import MarkdownIt, { UnboundedBuffer } from '../../src'
import type { Token } from '../../src/common/token'

function para(n: number) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function buildDoc(targetChars: number) {
  let s = ''
  let i = 0
  while (s.length < targetChars) {
    s += para(i++)
  }
  return s
}

function chunkString(src: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < src.length; i += size) {
    chunks.push(src.slice(i, i + size))
  }
  return chunks
}

describe('iterable sink parsing', () => {
  it('streams parsed token chunks to a consumer without retaining the full token array', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt()
    const doc = buildDoc(350_000)
    const collected: Token[] = []

    const stats = md.parseIterableToSink(
      chunkString(doc, 193),
      (tokens) => {
        for (let i = 0; i < tokens.length; i++) collected.push(tokens[i])
      },
      {},
    )

    expect(md.renderer.render(collected, md.options, {}))
      .toEqual(baseline.render(doc))
    expect(stats.retainedTokens).toBe(false)
    expect(stats.parsedChunks).toBeGreaterThan(1)
  })

  it('supports append-only unbounded parsing with retainTokens disabled', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt()
    const doc = buildDoc(220_000)
    const collected: Token[] = []
    const buffer = new UnboundedBuffer(md, {
      mode: 'stream',
      retainTokens: false,
      onChunkTokens(tokens) {
        for (let i = 0; i < tokens.length; i++) collected.push(tokens[i])
      },
    })

    for (const chunk of chunkString(doc, 149)) {
      buffer.feed(chunk)
      buffer.flushAvailable({})
    }
    const finalTokens = buffer.flushForce({})

    expect(finalTokens).toEqual([])
    expect(buffer.peek()).toEqual([])
    expect(md.renderer.render(collected, md.options, {}))
      .toEqual(baseline.render(doc))
    expect(buffer.stats().retainedTokens).toBe(false)
  })
})
