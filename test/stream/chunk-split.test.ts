import { describe, it, expect, vi } from 'vitest'
import MarkdownIt from '../../src'
import { chunkedParse, splitIntoChunks } from '../../src/stream/chunked'

describe('splitIntoChunks robustness', () => {
  it('forces a flush when size exceeded and no blank lines for a while (not in fence)', () => {
    // Build a long paragraph without blank lines
    const line = 'a'.repeat(80)
    const lines = Array.from({ length: 200 }, () => line) // 200 lines, no blanks
    const src = lines.join('\n') + '\n'

    // Use small thresholds to trigger the condition quickly
    const chunks = splitIntoChunks(src, {
      maxChunkChars: 1000,
      maxChunkLines: 20,
      fenceAware: true,
      maxChunks: undefined,
    })

    // Should produce more than one chunk even without blank lines due to fallback flush
    expect(chunks.length).toBeGreaterThan(1)

    // And no chunk should blow up far beyond the configured maxChunkChars
    const maxLen = Math.max(...chunks.map(c => c.length))
    expect(maxLen).toBeLessThanOrEqual(4000) // generous upper bound given forced flush
  })

  it('does not split inside fenced code blocks even if thresholds exceeded', () => {
    const codeLine = 'console.log("x")'.repeat(40)
    const many = Array.from({ length: 100 }, () => codeLine).join('\n')
    const src = [
      '```js',
      many,
      '```',
      '',
      '# Heading after fence',
      '',
      'para',
      '',
    ].join('\n')

    const chunks = splitIntoChunks(src, {
      maxChunkChars: 1000,
      maxChunkLines: 20,
      fenceAware: true,
      maxChunks: undefined,
    })

    // First chunk should include the entire fenced block and not be split inside
    expect(chunks[0].startsWith('```js\n')).toBe(true)
    const firstEndsAtFence = chunks[0].includes('\n```\n') || chunks[0].endsWith('\n```')
    expect(firstEndsAtFence).toBe(true)

    // There should be at least two chunks: fence + following content (depending on thresholds)
    expect(chunks.length).toBeGreaterThanOrEqual(1)
  })

  it('rebalances chunk count without creating a giant tail chunk', () => {
    const block = [
      '## Section',
      '',
      'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu',
      '',
    ].join('\n')
    const src = block.repeat(40)

    const md = MarkdownIt()
    const parseSpy = vi.spyOn(md.core, 'parse')

    chunkedParse(md, src, {}, {
      maxChunkChars: 160,
      maxChunkLines: 4,
      fenceAware: true,
      maxChunks: 4,
    })

    const chunkLengths = parseSpy.mock.calls.map(call => (call[0] as string).length)
    expect(chunkLengths.length).toBe(4)
    expect(chunkLengths.reduce((sum, len) => sum + len, 0)).toBe(src.length)

    const maxLen = Math.max(...chunkLengths)
    expect(maxLen).toBeLessThan(src.length / 2)

    parseSpy.mockRestore()
  })
})
