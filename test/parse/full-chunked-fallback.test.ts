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
})
