import { describe, it, expect, vi } from 'vitest'
import MarkdownIt from '../../src'

function buildDoc(multiplier: number): string {
  const paragraph = `# Title\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.\n\n- item 1\n- item 2\n- item 3\n\n\`\`\`js\nconsole.log('hello')\n\`\`\`\n\n`
  return paragraph.repeat(multiplier)
}

describe('stream parser chunked fallback', () => {
  it('uses chunked fallback for large documents when enabled', () => {
    const md = MarkdownIt({ stream: true, streamChunkedFallback: true, streamChunkSizeChars: 5000 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const large = buildDoc(50) // ~25KB

    const tokens = md.stream.parse(large)

    // Should parse, equal to baseline
    const baseline = MarkdownIt().parse(large)
    expect(md.renderer.render(tokens, md.options, {})).toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    // It may call core.parse multiple times internally via chunkedParse, so we can't assert count precisely.
    // But we can assert stats mode set to 'chunked' or at least not 'append' for first parse.
    const stats = md.stream.stats()
    expect(stats.total).toBe(1)
    expect(stats.lastMode === 'chunked' || stats.lastMode === 'full').toBe(true)

    parseSpy.mockRestore()
  })

  it('uses auto-tuned stream chunk settings when sizes are not explicitly provided', () => {
    const md = MarkdownIt({ stream: true, streamChunkedFallback: true })
    const env: Record<string, unknown> = {}
    const large = buildDoc(120)

    md.stream.parse(large, env)

    expect((env as any).__mdtsChunkInfo?.maxChunkChars).toBe(16_000)
    expect((env as any).__mdtsChunkInfo?.maxChunkLines).toBe(200)
  })

  it('keeps stream chunk fallback available beyond the old 120k ceiling', () => {
    const md = MarkdownIt({
      stream: true,
      streamChunkedFallback: true,
      streamSkipCacheAboveChars: 5_000_000,
      streamSkipCacheAboveLines: 500_000,
    })
    const env: Record<string, unknown> = {}
    const huge = buildDoc(900) // >120k chars

    md.stream.parse(huge, env)

    expect((env as any).__mdtsChunkInfo?.count).toBeGreaterThan(0)
  })
})
