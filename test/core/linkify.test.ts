import { describe, expect, it } from 'vitest'
import createMarkdownIt from '../../src'

describe('core linkify', () => {
  it('converts plain http url to link tokens', () => {
    const md = createMarkdownIt({ linkify: true })
    const src = 'Visit http://example.com now'
    const state = md.parse(src, {}) as any[]
    console.log({ state })
    debugger
    // find first inline token
    const inline = state.find((t: any) => t.type === 'inline')
    expect(inline).toBeDefined()
    const types = inline.children.map((c: any) => c.type)
    // should contain a link_open/text/link_close sequence
    const hasLinkOpen = types.includes('link_open')
    const hasLinkClose = types.includes('link_close')
    expect(hasLinkOpen).toBe(true)
    expect(hasLinkClose).toBe(true)

    // find link_open token and check attrs
    const open = inline.children.find((c: any) => c.type === 'link_open')
    expect(open).toBeDefined()
    const href = open.attrs && open.attrs.find((a: any) => a[0] === 'href')
    expect(href).toBeDefined()
    expect(href[1]).toContain('http://example.com')
  })

  it('linkify trailing asterisks pattern (CVE-2026-2327)', () => {
    const md = createMarkdownIt({ linkify: true })
    // This pattern would cause ReDoS with the old regex implementation
    // https://github.com/markdown-it/markdown-it/commit/4b4bbcae5e0990a5b172378e507b33a59012ed26
    const result = md.render('https://test.com?' + '*'.repeat(70000) + 'a')
    expect(result).toBeTruthy()
  }, 500)
})
