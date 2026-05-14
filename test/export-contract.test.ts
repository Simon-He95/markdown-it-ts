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
})
