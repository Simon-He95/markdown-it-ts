import { describe, expect, it } from 'vitest'
import createMarkdownIt from '../../src'

describe('core linkify', () => {
  it('converts plain http url to link tokens', () => {
    const md = createMarkdownIt({ linkify: true })
    const src = 'Visit http://example.com now'
    const state = md.parse(src, {}) as any[]
    const inline = state.find((t: any) => t.type === 'inline')

    expect(inline).toBeDefined()
    expect(inline.children.map((c: any) => c.type)).toContain('link_open')
    expect(inline.children.map((c: any) => c.type)).toContain('link_close')

    const open = inline.children.find((c: any) => c.type === 'link_open')
    expect(open).toBeDefined()

    const href = open.attrs && open.attrs.find((a: any) => a[0] === 'href')
    expect(href).toBeDefined()
    expect(href[1]).toContain('http://example.com')
  })

  it('keeps preceding CJK text outside fuzzy bare-domain links', () => {
    const md = createMarkdownIt({ linkify: true })
    const src = '用户现在想要一个超链接到www.baidu.com'
    const state = md.parse(src, {}) as any[]
    const inline = state.find((t: any) => t.type === 'inline')

    expect(inline).toBeDefined()
    expect(inline.children.map((c: any) => [c.type, c.content])).toEqual([
      ['text', '用户现在想要一个超链接到'],
      ['link_open', ''],
      ['text', 'www.baidu.com'],
      ['link_close', ''],
    ])

    const open = inline.children.find((c: any) => c.type === 'link_open')
    const href = open.attrs && open.attrs.find((a: any) => a[0] === 'href')
    expect(href).toEqual(['href', 'http://www.baidu.com'])
  })

  it('does not change fully qualified links after CJK text', () => {
    const md = createMarkdownIt({ linkify: true })
    const src = '用户现在想要一个超链接到https://www.baidu.com'

    expect(md.render(src)).toBe('<p>用户现在想要一个超链接到<a href="https://www.baidu.com">https://www.baidu.com</a></p>\n')
  })
})
