import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

describe('InlineRuler.at compatibility', () => {
  it('replaces an inline ruler rule and invalidates the cached rule list', () => {
    const md = MarkdownIt()

    expect(md.render('*x*')).toBe('<p><em>x</em></p>\n')

    md.inline.ruler.at('emphasis', (state: any, silent?: boolean) => {
      if (silent)
        return false

      if (state.src.charCodeAt(state.pos) !== 0x2A)
        return false

      state.pending += '!'
      state.pos++
      return true
    })

    expect(md.render('*x*')).toBe('<p>!x!</p>\n')
  })

  it('replaces an inline ruler2 post-process rule and invalidates the cached rule list', () => {
    const md = MarkdownIt()

    expect(md.render('*x*')).toBe('<p><em>x</em></p>\n')

    md.inline.ruler2.at('fragments_join', (state: any) => {
      for (let i = 0; i < state.tokens.length; i++) {
        const token = state.tokens[i]
        if (token.type === 'text')
          token.content = token.content.replace(/x/g, 'y')
      }
    })

    expect(md.render('*x*')).toBe('<p><em>y</em></p>\n')
  })

  it('throws for missing inline ruler names', () => {
    const md = MarkdownIt()

    expect(() => {
      md.inline.ruler.at('__missing_inline_rule__', () => false)
    }).toThrow(/__missing_inline_rule__/)
  })

  it('throws for missing inline ruler2 names', () => {
    const md = MarkdownIt()

    expect(() => {
      md.inline.ruler2.at('__missing_inline2_rule__', () => {})
    }).toThrow(/__missing_inline2_rule__/)
  })
})
