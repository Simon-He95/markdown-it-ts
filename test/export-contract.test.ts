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

  it('exposes cached stream parser without exposing low-level chunk cache internals', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

    expect(pkg.exports).toHaveProperty('./experimental')
    expect(pkg.exports).toHaveProperty('./stream/cached')
    expect(pkg.exports).not.toHaveProperty('./stream/cached_parser')
    expect(pkg.exports).not.toHaveProperty('./stream/chunk_cache')
  })

  it('keeps mutable chunk cache internals out of the experimental entry', async () => {
    const experimental = await import('../src/experimental')

    expect(experimental).toHaveProperty('CachedStreamParser')
    expect(experimental).not.toHaveProperty('ChunkTable')
    expect(experimental).not.toHaveProperty('cloneTokens')
    expect(experimental).not.toHaveProperty('materializeCachedTokens')
  })
})
