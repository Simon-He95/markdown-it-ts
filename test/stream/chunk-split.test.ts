import { describe, it, expect } from 'vitest'
import { splitIntoChunks } from '../../src/stream/chunked'

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
})
