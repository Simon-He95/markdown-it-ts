import { describe, expect, it } from 'vitest'
import markdownit from '../../src'
import { Token } from '../../src/common/token'
import { State } from '../../src/parse/state'
import { StateBlock } from '../../src/parse/parser_block/state_block'
import { StateInline } from '../../src/parse/parser_inline/state_inline'

function compatPlugin(md: ReturnType<typeof markdownit>) {
  md.core.ruler.push('compat_probe', (state: State) => {
    const token = new state.Token('html_block', '', 0)
    token.content = '<!--compat-probe-->\n'
    token.map = [0, 1]
    token.meta = { compat: true }
    state.tokens.unshift(token)
  })
}

describe('token/state compatibility', () => {
  it('preserves the full Token field shape', () => {
    const token = new Token('text', '', 0)
    const requiredKeys = [
      'type',
      'tag',
      'attrs',
      'map',
      'nesting',
      'level',
      'children',
      'content',
      'markup',
      'info',
      'meta',
      'block',
      'hidden',
    ] as const

    for (const key of requiredKeys)
      expect(Object.prototype.hasOwnProperty.call(token, key)).toBe(true)

    expect(token.attrs).toBeNull()
    expect(token.map).toBeNull()
    expect(token.children).toBeNull()
    expect(token.content).toBe('')
    expect(token.markup).toBe('')
    expect(token.info).toBe('')
    expect(token.meta).toBeNull()
    expect(token.block).toBe(false)
    expect(token.hidden).toBe(false)
  })

  it('keeps State.prototype.Token compatible', () => {
    const state = new State('hello', markdownit(), {})
    const token = new state.Token('text', '', 0)
    token.content = 'hello'

    expect(token).toBeInstanceOf(Token)
    expect(token.content).toBe('hello')
  })

  it('keeps StateBlock.prototype.Token compatible', () => {
    const md = markdownit()
    const state = new StateBlock('# title\n', md, {}, [])
    const token = new state.Token('heading_open', 'h1', 1)

    expect(token).toBeInstanceOf(Token)
    expect(token.tag).toBe('h1')
  })

  it('keeps StateInline.prototype.Token compatible', () => {
    const md = markdownit()
    const state = new StateInline('**bold**', md, {}, [])
    const token = new state.Token('text', '', 0)
    token.content = 'inline'

    expect(token).toBeInstanceOf(Token)
    expect(token.content).toBe('inline')
  })

  it('supports plugins that construct tokens via state.Token and mutate token fields', () => {
    const md = markdownit().use(compatPlugin as any)
    const html = md.render('hello')

    expect(html.startsWith('<!--compat-probe-->')).toBe(true)
    expect(html).toContain('<p>hello</p>')
  })
})
