import MarkdownItOriginal from 'markdown-it'
import { describe, expect, it } from 'vitest'
import { parseStockFastAstJson, renderStockFast } from '../../src/experimental'
import MarkdownIt from '../../src/index'

describe('stock block parser compatibility', () => {
  const md = MarkdownIt()
  const full = MarkdownIt().use(() => {})
  const upstream = MarkdownItOriginal()

  it.each([
    '1. a\n',
    '2. b\n',
    '1) a\n',
    'text\n\n1. a\n',
    '1. a\n2. b\n',
    '1.',
    '123456789)\tx',
    '1234567890. x',
    '1.2',
    '1.\u00A0x',
    '- a\ncontinuation',
    '- a\n2. b',
    '-   a',
    '- a  \n- b',
    '- ',
    '- a\n\n-',
    '- a\n\n-\tb',
    '# ',
    '# \tq\t',
    '# q\t#\t',
    '\u00A0 ',
    '\u00A0q\t',
    'q\u00A0 ',
    '> \u00A0q\n',
    '- \u00A0q\u00A0',
    '# \u00A0q\u00A0 #',
    '\u00A0q\n===',
    '\u00A0q\nq\u00A0\n===',
    '```f&ouml;&ouml;\nx\n```',
    '```foo\\+bar\nx\n```',
    '```\u00A0js\u00A0meta\nx\n```',
    '```js title`bad\nx\n```',
    '```js\nx\n  ```\nq\n```',
    '```js\nx\n````\nq\n```',
  ])('matches full block parsing and upstream HTML for %j', async (src) => {
    const expected = upstream.render(src)

    expect(md.render(src)).toBe(expected)
    await expect(md.renderAsync(src)).resolves.toBe(expected)
    expect(md.parse(src)).toEqual(full.parse(src))
  })

  it.each([
    '1. a',
    'text\n\n2) b',
    '1.',
    '- a\ncontinuation',
    '- a  ',
    '- a\n\n-\tb',
    '# ',
  ])('defers unsupported blocks in the experimental fast paths for %j', (src) => {
    expect(renderStockFast(src)).toBeNull()
    expect(parseStockFastAstJson(src)).toBeNull()
  })

  it('preserves Unicode spaces in the experimental AST', () => {
    expect(JSON.parse(parseStockFastAstJson('# \t\u00A0q\u00A0\t#\n\n\u00A0q\u00A0 \n')).children).toEqual([
      { type: 'heading', depth: 1, children: [{ type: 'text', value: '\u00A0q\u00A0' }] },
      { type: 'paragraph', children: [{ type: 'text', value: '\u00A0q\u00A0' }] },
    ])
  })

  it('ends a fenced code block at an indented, longer closing fence', () => {
    const src = '```js\nx\n  ````\n\nq'
    expect(JSON.parse(parseStockFastAstJson(src)).children).toEqual([
      { type: 'code', lang: 'js', value: 'x\n' },
      { type: 'paragraph', children: [{ type: 'text', value: 'q' }] },
    ])
  })

  it('decodes the code fence language and metadata in the experimental AST', () => {
    const src = '```f&ouml;&ouml; meta\\+\u00A0\nx\n```'
    expect(JSON.parse(parseStockFastAstJson(src)).children).toEqual([
      { type: 'code', lang: 'föö', meta: 'meta+\u00A0', value: 'x\n' },
    ])
  })
})
