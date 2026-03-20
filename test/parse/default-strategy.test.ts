import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

function para(n: number) {
  return `## Section ${n}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.

- alpha
- beta
- gamma

\`\`\`js
console.log(${n})
\`\`\`

`
}

function buildDoc(targetChars: number) {
  let s = ''
  let i = 0
  while (s.length < targetChars)
    s += para(i++)
  return s
}

describe('default strategy selection', () => {
  it('keeps medium one-shot inputs on the plain path', () => {
    const md = MarkdownIt()
    const doc = buildDoc(60_000)
    const env: Record<string, unknown> = {}

    md.parse(doc, env)

    expect((env as any).__mdtsStrategyInfo?.path).toBe('plain')
    expect((env as any).__mdtsChunkInfo).toBeUndefined()
  })

  it('uses full-chunk automatically for long one-shot inputs', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt({ fullChunkedFallback: false, autoUnbounded: false })
    const doc = buildDoc(600_000)
    const env: Record<string, unknown> = {}

    const html = md.render(doc, env)

    expect(html).toBe(baseline.render(doc))
    expect((env as any).__mdtsStrategyInfo?.path).toBe('full-chunk')
    expect((env as any).__mdtsChunkInfo?.count).toBeGreaterThan(0)
  })

  it('uses stream-chunked automatically for large initial stream inputs', () => {
    const md = MarkdownIt({ stream: true })
    const baseline = MarkdownIt()
    const doc = buildDoc(300_000)
    const env: Record<string, unknown> = {}

    const tokens = md.stream.parse(doc, env)

    expect(md.renderer.render(tokens, md.options, env)).toBe(baseline.render(doc))
    expect((env as any).__mdtsStrategyInfo?.path).toBe('stream-chunked')
    expect((env as any).__mdtsChunkInfo?.count).toBeGreaterThan(0)
  })

  it('uses unbounded-backed append for large pure append deltas', () => {
    const md = MarkdownIt({ stream: true })
    const baseline = MarkdownIt()
    const env: Record<string, unknown> = {}
    let doc = buildDoc(550_000)

    md.stream.parse(doc, env)

    doc += buildDoc(120_000)
    const tokens = md.stream.parse(doc, env)

    expect(md.renderer.render(tokens, md.options, env)).toBe(baseline.render(doc))
    expect((env as any).__mdtsStrategyInfo?.path).toBe('stream-unbounded-append')
    expect(md.stream.stats().unboundedAppendHits).toBeGreaterThanOrEqual(1)
  })
})
