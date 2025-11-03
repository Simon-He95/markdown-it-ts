import { describe, expect, it } from 'vitest'
import { parse } from '../../src/parse'

describe('core linkify', () => {
  it('converts plain http url to link tokens', () => {
    const src = 'Visit http://example.com now'
    const state = parse(src) as any[]
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
})
