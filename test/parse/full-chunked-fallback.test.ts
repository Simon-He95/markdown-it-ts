import { describe, it, expect } from 'vitest'
import MarkdownIt from '../../src'
import { getParseDiagnostics } from '../../src/experimental'

function para(n: number) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function buildLargeDoc(blocks: number) {
  let s = ''
  for (let i = 0; i < blocks; i++) s += para(i)
  return s
}

function buildHugeDoc(targetChars: number) {
  let s = ''
  let i = 0
  while (s.length < targetChars) {
    s += para(i++)
  }
  return s
}

function expectGlobalStateFallbackDiagnostics(env: Record<string, unknown>) {
  const diagnostics = getParseDiagnostics(env)
  expect(diagnostics?.chunk).toMatchObject({
    fallback: true,
    fallbackReason: 'reference-definition',
  })
  expect(diagnostics?.strategy).toMatchObject({
    area: 'parse',
    path: 'plain',
    reason: 'global-state:reference-definition',
  })
  expect(diagnostics?.strategy?.chunked).toBeUndefined()
}

describe('full parse: chunked fallback correctness', () => {
  it('uses chunked for large docs when enabled (char threshold)', () => {
    const md = MarkdownIt({
      stream: false,
      fullChunkedFallback: true,
      fullChunkThresholdChars: 10_000, // low threshold to trigger
      fullChunkSizeChars: 5_000,
      fullChunkSizeLines: 150,
      fullChunkFenceAware: true,
    })

    const doc = buildLargeDoc(20)
    const tokens = md.parse(doc, {})

    // correctness vs baseline
    const baseline = MarkdownIt().parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))
  })

  it('uses chunked for large docs when enabled (line threshold) and respects maxChunks', () => {
    const md = MarkdownIt({
      stream: false,
      fullChunkedFallback: true,
      fullChunkThresholdLines: 200, // trigger by lines
      fullChunkSizeChars: 2000,
      fullChunkSizeLines: 80,
      fullChunkMaxChunks: 4,
    })

    const doc = buildLargeDoc(30)
    const tokens = md.parse(doc, {})

    const baseline = MarkdownIt().parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))
  })

  it('parses million-char documents with chunked fallback without overflowing the stack', () => {
    const md = MarkdownIt({
      stream: false,
      fullChunkedFallback: true,
      fullChunkThresholdChars: 0,
      fullChunkAdaptive: false,
      fullChunkSizeChars: 8000,
      fullChunkSizeLines: 100,
      fullChunkMaxChunks: 8,
    })

    const doc = buildHugeDoc(1_000_000)
    const tokens = md.parse(doc, {})
    const baseline = MarkdownIt().parse(doc)

    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))
  })

  it('uses auto-tuned full chunk settings when chunk sizes are not explicitly provided', () => {
    const md = MarkdownIt({
      stream: false,
      fullChunkedFallback: true,
    })

    const doc = buildHugeDoc(18_000)
    const env: Record<string, unknown> = {}
    md.parse(doc, env)

    expect(getParseDiagnostics(env)?.chunk?.maxChunkChars).toBe(24_000)
    expect(getParseDiagnostics(env)?.chunk?.maxChunkLines).toBe(200)
  })

  it('uses the tuned large-doc chunk config in auto mode before the plain-parse cutoff', () => {
    const md = MarkdownIt({
      stream: false,
      fullChunkedFallback: true,
    })

    const doc = buildHugeDoc(1_000_000)
    const env: Record<string, unknown> = {}
    md.parse(doc, env)

    expect(getParseDiagnostics(env)?.chunk?.maxChunkChars).toBe(64_000)
    expect(getParseDiagnostics(env)?.chunk?.maxChunkLines).toBe(700)
    expect(getParseDiagnostics(env)?.chunk?.count).toBe(16)
  })

  it('reports plain diagnostics when auto-tuned full chunk falls back for global state', () => {
    const md = MarkdownIt({
      stream: false,
      fullChunkedFallback: true,
      fullChunkThresholdChars: 0,
    })
    const env: Record<string, unknown> = {}

    md.parse('[x][ref]\n\n[ref]: https://old.example\n', env)

    expectGlobalStateFallbackDiagnostics(env)
  })

  it('reports plain diagnostics when explicit full chunk falls back for global state', () => {
    const md = MarkdownIt({
      stream: false,
      fullChunkedFallback: true,
      fullChunkThresholdChars: 0,
      fullChunkSizeChars: 5000,
      fullChunkSizeLines: 150,
    })
    const env: Record<string, unknown> = {}

    md.parse('[x][ref]\n\n[ref]: https://old.example\n', env)

    expectGlobalStateFallbackDiagnostics(env)
  })
})
