import { describe, expect, it } from 'vitest'
import { parse, parseInline } from '../src/parse'
import { render, renderAsync } from '../src/render'
import markdownIt from '../src'

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

  it('renderAsync matches sync output without async rules', async () => {
    const tokens = parse('Paragraph with `code` and **strong** text')
    const syncHtml = render(tokens as any)
    await expect(renderAsync(tokens as any)).resolves.toBe(syncHtml)
  })

  it('renderAsync awaits async highlight rules', async () => {
    const src = '```js\nconsole.log(1)\n```'
    const html = await renderAsync(src, {
      highlight: async (str: string, lang: string) => `<span data-lang="${lang}">${str.toUpperCase()}</span>`,
    })
    expect(html).toContain('<span data-lang="js">')
  })

  it('does not mutate fence attrs when adding the language class', () => {
    const tokens = parse('```js\nconsole.log(1)\n```') as any[]
    const fence = tokens.find(token => token.type === 'fence')

    fence.attrs = [['data-test', '1']]

    const html = render(tokens as any)

    expect(html).toContain('<code data-test="1" class="language-js">')
    expect(fence.attrs).toEqual([['data-test', '1']])
  })

  it('joins escaped punctuation back into a single text child', () => {
    const tokens = parse('foo\\!bar') as any[]
    const inline = tokens.find(token => token.type === 'inline')

    expect(inline.children).toHaveLength(1)
    expect(inline.children[0].type).toBe('text')
    expect(inline.children[0].content).toBe('foo!bar')
  })

  it('sync render throws when async rule output is provided', () => {
    expect(() => render('```js\n1\n```', {
      highlight: async () => '<span>async</span>',
    } as any)).toThrowError(/renderAsync/)
  })

  it('MarkdownIt.renderAsync wires through renderer async support', async () => {
    const md = markdownIt()
    md.set({
      highlight: async (code: string) => `<mark>${code.trim()}</mark>`,
    })
    const html = await md.renderAsync('```txt\nhello\n```')
    expect(html).toContain('<mark>hello')
  })
})
