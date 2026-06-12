import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

describe('inline default dispatch fast path', () => {
  it('keeps render parity with the generic rule loop', () => {
    const cases = [
      'plain text with [brackets] but no link',
      '[x][ref]\n\n[ref]: https://example.com',
      '**bold** and [link](https://example.com)',
      '`code` <https://example.com> &amp;',
      'escaped \\* marker and soft\nbreak',
      '![alt](https://example.com/a.png "title")',
    ]

    for (const src of cases) {
      const fast = MarkdownIt()
      const generic = MarkdownIt()
      generic.inline.ruler.push('noop_fallback_rule', () => false)

      expect(fast.render(src)).toBe(generic.render(src))
    }
  })

  it('handles option-gated inline rules', () => {
    const html = '<span data-x="1">ok</span>'
    const htmlGeneric = MarkdownIt({ html: true })
    htmlGeneric.inline.ruler.push('noop_fallback_rule', () => false)
    expect(MarkdownIt({ html: true }).render(html))
      .toBe(htmlGeneric.render(html))

    const linkified = 'Visit https://example.com/path.'
    const linkifyGeneric = MarkdownIt({ linkify: true })
    linkifyGeneric.inline.ruler.push('noop_fallback_rule', () => false)
    expect(MarkdownIt({ linkify: true }).render(linkified))
      .toBe(linkifyGeneric.render(linkified))
    expect(MarkdownIt({ linkify: true }).render(linkified))
      .toContain('href="https://example.com/path"')
  })
})
