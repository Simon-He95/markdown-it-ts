import { describe, expect, it } from 'vitest'
import { parse, parseInline } from '../src/parse'
import { render } from '../src/render'

describe('renderer', () => {
  it('renders emphasis inside paragraph', () => {
    const tokens = parse('Hello *world* from markdown-it-ts')
    const html = render(tokens as any)
    expect(html).toBe('<p>Hello <em>world</em> from markdown-it-ts</p>\n')
  })

  it('accepts raw markdown when using the helper', () => {
    const html = render('# Hello world')
    expect(html).toContain('<h1>Hello world</h1>')
  })

  it('inline parse produces strong token', () => {
    const inline = parseInline('inline **bold** text')
    const inlineToken = Array.isArray(inline) ? inline[0] : inline
    const hasStrong = !!inlineToken.children?.some((t: any) => t.type === 'strong_open')
    expect(hasStrong).toBe(true)
  })
})
