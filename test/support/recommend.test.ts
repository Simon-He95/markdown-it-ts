import { describe, expect, it } from 'vitest'
import { recommendFullChunkStrategy, recommendStreamChunkStrategy } from '../../src/support/chunk_recommend'

describe('chunk recommendation helpers', () => {
  it('full: uses discrete defaults through 5M, then plain for the largest one-shot payloads', () => {
    expect(recommendFullChunkStrategy(4_000).strategy).toBe('discrete')
    expect(recommendFullChunkStrategy(4_000).maxChunkChars).toBe(32000)

    expect(recommendFullChunkStrategy(20_000).maxChunkChars).toBe(24000)

    expect(recommendFullChunkStrategy(50_000).strategy).toBe('plain')
    expect(recommendFullChunkStrategy(100_000).strategy).toBe('plain')

    const r200 = recommendFullChunkStrategy(200_000)
    expect(r200.strategy).toBe('discrete')
    expect(r200.maxChunkChars).toBe(20000)

    const r500 = recommendFullChunkStrategy(500_000)
    expect(r500.strategy).toBe('discrete')
    expect(r500.maxChunkChars).toBe(64_000)
    expect(r500.maxChunkLines).toBe(700)
    expect(r500.maxChunks).toBe(16)

    const rBig = recommendFullChunkStrategy(1_000_000)
    expect(rBig.strategy).toBe('discrete')
    expect(rBig.maxChunkChars).toBe(64_000)
    expect(rBig.maxChunkLines).toBe(700)
    expect(rBig.maxChunks).toBe(16)

    const rHuge = recommendFullChunkStrategy(20_000_000)
    expect(rHuge.strategy).toBe('plain')
  })

  it('stream: uses discrete tuned configs through 5M, favoring larger bootstrap chunks for mid-sized docs', () => {
    const r4 = recommendStreamChunkStrategy(4_000)
    expect(r4.maxChunkChars).toBe(16000)
    expect(r4.maxChunks).toBe(8)

    const r20 = recommendStreamChunkStrategy(20_000)
    expect(r20.maxChunkChars).toBe(20_000)
    expect(r20.maxChunkLines).toBe(200)
    expect(r20.maxChunks).toBe(24)

    const r50 = recommendStreamChunkStrategy(50_000)
    expect(r50.maxChunkChars).toBe(20_000)
    expect(r50.maxChunkLines).toBe(200)
    expect(r50.maxChunks).toBe(24)

    const r100 = recommendStreamChunkStrategy(100_000)
    expect(r100.maxChunkChars).toBe(20_000)
    expect(r100.maxChunkLines).toBe(200)
    expect(r100.maxChunks).toBe(24)

    const r500 = recommendStreamChunkStrategy(500_000)
    expect(r500.maxChunkChars).toBe(64_000)
    expect(r500.maxChunkLines).toBe(700)
    expect(r500.maxChunks).toBe(32)

    const r1m = recommendStreamChunkStrategy(1_000_000)
    expect(r1m.strategy).toBe('discrete')
    expect(r1m.maxChunkChars).toBe(64_000)
    expect(r1m.maxChunkLines).toBe(700)
    expect(r1m.maxChunks).toBe(32)

    const rHuge = recommendStreamChunkStrategy(20_000_000)
    expect(rHuge.strategy).toBe('plain')
  })
})
