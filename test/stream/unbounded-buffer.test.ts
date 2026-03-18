import { describe, expect, it } from 'vitest'
import MarkdownIt, { UnboundedBuffer } from '../../src'

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

describe('unbounded buffer', () => {
  it('flushes completed blank-line chunks incrementally', () => {
    const md = MarkdownIt()
    const buffer = new UnboundedBuffer(md, { mode: 'stream' })
    const env: Record<string, unknown> = {}

    buffer.feed('# Title\n\n')
    expect(buffer.flushIfBoundary(env)).not.toBeNull()

    buffer.feed('Second paragraph starts here')
    expect(buffer.flushIfBoundary(env)).toBeNull()

    buffer.feed('\n\n')
    const tokens = buffer.flushIfBoundary(env)

    expect(tokens).not.toBeNull()
    expect(md.renderer.render(tokens!, md.options, env))
      .toEqual(MarkdownIt().render('# Title\n\nSecond paragraph starts here\n\n'))
  })

  it('keeps only a bounded pending tail while parsing large append-only sources', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt()
    const buffer = new UnboundedBuffer(md, { mode: 'stream' })
    const doc = buildDoc(600_000)
    let maxPending = 0

    for (const chunk of chunkString(doc, 257)) {
      buffer.feed(chunk)
      buffer.flushAvailable({})
      maxPending = Math.max(maxPending, buffer.stats().pendingChars)
    }

    const tokens = buffer.flushForce({})

    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baseline.render(doc))
    expect(maxPending).toBeLessThan(140_000)
    expect(buffer.stats().committedChars).toBe(doc.length)
    expect(buffer.pendingText()).toBe('')
  })
})
