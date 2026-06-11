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

  it('exposes cached stream parser and chunk table subpaths without exposing private internals', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

    expect(pkg.exports).toHaveProperty('./experimental')
    expect(pkg.exports).toHaveProperty('./stream/cached')
    expect(pkg.exports).toHaveProperty('./stream/chunk-table')
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

  it('keeps low-level chunk table internals out of the cached stream subpath', async () => {
    const cached = await import('../src/stream/cached')

    expect(cached).toHaveProperty('CachedStreamParser')
    expect(cached).not.toHaveProperty('ChunkCache')
    expect(cached).not.toHaveProperty('ChunkTable')
    expect(cached).not.toHaveProperty('computeSourceHash')
    expect(cached).not.toHaveProperty('detectHardBoundaries')
    expect(cached).not.toHaveProperty('splitIntoSafeChunkRanges')
  })

  it('exposes the chunk table subpath without token materialization helpers', async () => {
    const chunkTable = await import('../src/stream/chunk-table')

    expect(chunkTable).toHaveProperty('ChunkTable')
    expect(chunkTable).toHaveProperty('computeContentFingerprint')
    expect(chunkTable).not.toHaveProperty('cloneTokens')
    expect(chunkTable).not.toHaveProperty('materializeCachedTokens')
  })
})
