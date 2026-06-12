import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('root export contract', () => {
  it('keeps experimental helpers out of the stable root entry', async () => {
    const root = await import('../src')

    expect(Object.keys(root).sort()).toMatchInlineSnapshot(`
      [
        "Token",
        "default",
        "parse",
        "parseInline",
        "withRenderer",
      ]
    `)
  })

  it('keeps chunk cache APIs on the experimental entry only', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

    expect(pkg.exports).toHaveProperty('./experimental')
    expect(pkg.exports).not.toHaveProperty('./stream/cached')
    expect(pkg.exports).not.toHaveProperty('./stream/chunk-table')
    expect(pkg.exports).not.toHaveProperty('./stream/cached_parser')
    expect(pkg.exports).not.toHaveProperty('./stream/chunk_cache')
  })

  it('exposes experimental chunk cache APIs without mutable token helpers', async () => {
    const experimental = await import('../src/experimental')

    expect(experimental).toHaveProperty('CachedStreamParser')
    expect(experimental).toHaveProperty('ChunkTable')
    expect(experimental).not.toHaveProperty('ChunkCache')
    expect(experimental).not.toHaveProperty('cloneTokens')
    expect(experimental).not.toHaveProperty('materializeCachedTokens')
  })

  it('keeps low-level chunk table internals out of experimental', async () => {
    const experimental = await import('../src/experimental')

    expect(experimental).not.toHaveProperty('computeSourceHash')
    expect(experimental).not.toHaveProperty('computeContentFingerprint')
    expect(experimental).not.toHaveProperty('detectHardBoundaries')
    expect(experimental).not.toHaveProperty('splitIntoSafeChunkRanges')
    expect(experimental).not.toHaveProperty('cloneTokens')
    expect(experimental).not.toHaveProperty('materializeCachedTokens')
  })
})
