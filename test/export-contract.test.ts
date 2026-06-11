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

  it('keeps low-level chunk cache APIs behind the experimental entry', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

    expect(pkg.exports).toHaveProperty('./experimental')
    expect(pkg.exports).not.toHaveProperty('./stream/cached_parser')
    expect(pkg.exports).not.toHaveProperty('./stream/chunk_cache')
  })
})
