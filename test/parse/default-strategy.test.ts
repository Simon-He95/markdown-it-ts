import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'
import { getParseDiagnostics } from '../../src/experimental'

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

    expect(getParseDiagnostics(env)?.strategy?.path).toBe('plain')
    expect(getParseDiagnostics(env)?.chunk).toBeUndefined()
  })

  it('uses full-chunk automatically for long one-shot inputs', () => {
    const md = MarkdownIt()
    const baseline = MarkdownIt({ fullChunkedFallback: false, autoUnbounded: false })
    const doc = buildDoc(600_000)
    const env: Record<string, unknown> = {}

    const html = md.render(doc, env)

    expect(html).toBe(baseline.render(doc))
    expect(getParseDiagnostics(env)?.strategy?.path).toBe('full-chunk')
    expect(getParseDiagnostics(env)?.chunk?.count).toBeGreaterThan(0)
    expect(Object.keys(env).filter(key => key.startsWith('__mdts'))).toEqual([])
  })

  it('accepts experimental options through a namespaced option bag', () => {
    const md = MarkdownIt({
      experimental: {
        fullChunkedFallback: true,
        fullChunkThresholdChars: 0,
      },
    })
    const doc = buildDoc(300_000)
    const env: Record<string, unknown> = {}

    md.parse(doc, env)

    expect(getParseDiagnostics(env)?.strategy?.path).toBe('full-chunk')
    expect(getParseDiagnostics(env)?.chunk?.count).toBeGreaterThan(0)
  })

  it('accepts experimental options through set()', () => {
    const md = MarkdownIt()
    md.set({
      experimental: {
        fullChunkedFallback: true,
        fullChunkThresholdChars: 0,
      },
    })
    const doc = buildDoc(300_000)
    const env: Record<string, unknown> = {}

    md.parse(doc, env)

    expect(getParseDiagnostics(env)?.strategy?.path).toBe('full-chunk')
    expect(getParseDiagnostics(env)?.chunk?.count).toBeGreaterThan(0)
  })

  it('keeps implicit large-input strategies on the plain path after plugin use', () => {
    const md = MarkdownIt({ autoUnboundedThresholdChars: 200_000 })
      .use((instance) => {
        instance.renderer.rules.text = (tokens, idx) => tokens[idx].content
      })
    const doc = buildDoc(350_000)
    const env: Record<string, unknown> = {}

    md.parse(doc, env)

    expect(getParseDiagnostics(env)?.strategy?.path).toBe('plain')
    expect(getParseDiagnostics(env)?.chunk).toBeUndefined()
    expect(getParseDiagnostics(env)?.unbounded).toBeUndefined()
  })

  it('keeps implicit chunking on the plain path after parser ruler changes', () => {
    const md = MarkdownIt()
    md.core.ruler.after('inline', 'test_env_touch', (state: any) => {
      state.env.testEnvTouch = true
    })
    const doc = buildDoc(600_000)
    const env: Record<string, unknown> = {}

    md.parse(doc, env)

    expect(env.testEnvTouch).toBe(true)
    expect(getParseDiagnostics(env)?.strategy?.path).toBe('plain')
    expect(getParseDiagnostics(env)?.chunk).toBeUndefined()
  })

  it('still uses chunked parsing after plugin use when explicitly enabled', () => {
    const md = MarkdownIt({
      fullChunkedFallback: true,
      fullChunkThresholdChars: 0,
    }).use((instance) => {
      instance.renderer.rules.text = (tokens, idx) => tokens[idx].content
    })
    const doc = buildDoc(300_000)
    const env: Record<string, unknown> = {}

    md.parse(doc, env)

    expect(getParseDiagnostics(env)?.strategy?.path).toBe('full-chunk')
    expect(getParseDiagnostics(env)?.chunk?.count).toBeGreaterThan(0)
  })

  it('uses stream-chunked automatically for large initial stream inputs', () => {
    const md = MarkdownIt({ stream: true })
    const baseline = MarkdownIt()
    const doc = buildDoc(300_000)
    const env: Record<string, unknown> = {}

    const tokens = md.stream.parse(doc, env)

    expect(md.renderer.render(tokens, md.options, env)).toBe(baseline.render(doc))
    expect(getParseDiagnostics(env)?.strategy?.path).toBe('stream-chunked')
    expect(getParseDiagnostics(env)?.chunk?.count).toBeGreaterThan(0)
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
    expect(getParseDiagnostics(env)?.strategy?.path).toBe('stream-unbounded-append')
    expect(md.stream.stats().unboundedAppendHits).toBeGreaterThanOrEqual(1)
  })
})
