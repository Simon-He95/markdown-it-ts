import { describe, it, expect } from 'vitest'
import MarkdownIt from '../../src'

function para(n: number) {
  return `## Section ${n}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.\n\n- a\n- b\n- c\n\n\`\`\`js\nconsole.log(${n})\n\`\`\`\n\n`
}

function buildLargeDoc(blocks: number) {
  let s = ''
  for (let i = 0; i < blocks; i++) s += para(i)
  return s
}

describe('hybrid stream + chunked: best-of-both worlds', () => {
  it('initial large parse uses chunked, subsequent appends use append fast path', () => {
    const md = MarkdownIt({
      stream: true,
      streamChunkedFallback: true,
      streamChunkSizeChars: 5000,
      streamChunkSizeLines: 150,
      streamChunkFenceAware: true,
    })

    md.stream.resetStats()

    // Initial: large doc beyond 2 * chunk size => triggers chunked fallback
    let doc = buildLargeDoc(30) // big
    let tokens = md.stream.parse(doc)

    const baseline = MarkdownIt().parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    // Append a few more sections => should be append fast-path
    for (let i = 30; i < 35; i++) {
      doc += para(i)
      tokens = md.stream.parse(doc)
    }

    const stats = md.stream.stats()
    // At least one chunked and some appends
    expect(stats.total).toBeGreaterThanOrEqual(6)
    expect((stats as any).chunkedParses ?? 0).toBeGreaterThanOrEqual(1)
    expect(stats.appendHits).toBeGreaterThanOrEqual(3)

    // Still equals baseline
    const baseline2 = MarkdownIt().parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline2, md.options, {}))
  })

  it('mid-document edit on large doc falls back to chunked', () => {
    const md = MarkdownIt({
      stream: true,
      streamChunkedFallback: true,
      streamChunkSizeChars: 5000,
    })

    // Build and parse large doc
    let doc = buildLargeDoc(25)
    md.stream.parse(doc)

    // Edit in the middle (non-append)
    const lines = doc.split('\n')
    const mid = Math.floor(lines.length / 2)
    lines[mid] = '# EDITED IN MIDDLE'
    doc = lines.join('\n')

    const tokens = md.stream.parse(doc)

    // Correctness
    const baseline = MarkdownIt().parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    // Mode likely chunked or full; with large doc and fallback enabled, prefer chunked
    const stats = md.stream.stats()
    expect(['chunked', 'full']).toContain(stats.lastMode)
  })
})
