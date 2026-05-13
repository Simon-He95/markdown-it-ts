import { describe, expect, it } from 'vitest'
import markdownit from '../src/index'

describe('ruler API compatibility', () => {
  it('supports inline.ruler.at(name, fn) replacement', () => {
    const md = markdownit()

    md.inline.ruler.at('text', (state: any, silent?: boolean) => {
      const start = state.pos
      const end = state.posMax

      if (!silent) {
        const token = state.push('text', '', 0)
        token.content = `#${state.src.slice(start, end)}#`
      }

      state.pos = end
      return true
    })

    expect(md.renderInline('abc')).toBe('#abc#')
  })

  it('does not bypass replaced inline text rule in block rendering', () => {
    const md = markdownit()

    md.inline.ruler.at('text', (state: any, silent?: boolean) => {
      const start = state.pos
      const end = state.posMax

      if (!silent) {
        const token = state.push('text', '', 0)
        token.content = `#${state.src.slice(start, end)}#`
      }

      state.pos = end
      return true
    })

    expect(md.render('abc')).toBe('<p>#abc#</p>\n')
  })

  it('supports inline.ruler2.at(name, fn) replacement', () => {
    const md = markdownit()
    let called = false

    md.inline.ruler2.at('fragments_join', () => {
      called = true
    })

    md.renderInline('a *b* c')

    expect(called).toBe(true)
  })

  it('throws when replacing missing inline rule', () => {
    const md = markdownit()

    expect(() => {
      md.inline.ruler.at('missing_rule', () => true)
    }).toThrow('Parser rule not found: missing_rule')
  })

  it('keeps getter behavior for inline.ruler.at(name)', () => {
    const md = markdownit()
    const rule = md.inline.ruler.at('text')

    expect(rule?.name).toBe('text')
    expect(typeof rule?.fn).toBe('function')
  })

  it('inline.ruler.at(name) getter does not expose mutable internal rule', () => {
    const md = markdownit()
    const rule = md.inline.ruler.at('text') as any

    expect(rule?.name).toBe('text')

    try {
      rule.fn = () => true
    }
    catch {}

    expect(md.render('abc')).toBe('<p>abc</p>\n')
  })
})
