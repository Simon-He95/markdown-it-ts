import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'
import { getParseDiagnostics } from '../../src/experimental'
import { parseStockFast, parseStockFastAstJson } from '../../src/parse/stock_fast'

function serialize(tokens: any[]): any[] {
  return tokens.map(token => ({
    type: token.type,
    tag: token.tag,
    attrs: token.attrs,
    map: token.map,
    nesting: token.nesting,
    level: token.level,
    children: token.children ? serialize(token.children) : token.children,
    content: token.content,
    markup: token.markup,
    info: token.info,
    meta: token.meta,
    block: token.block,
    hidden: token.hidden,
  }))
}

function normalParse(src: string) {
  return MarkdownIt().use(() => {}).parse(src, {})
}

describe('stock parse fast path', () => {
  it('matches normal token output for the stock paragraph-heavy subset', () => {
    const src = `## Section 0

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.

- a
- b
- c

\`\`\`js
console.log(0)
\`\`\`

`

    expect(serialize(parseStockFast(src)!)).toEqual(serialize(normalParse(src)))
  })

  it('matches normal token output for trailing list blank maps', () => {
    const src = '- a\n- b\n\nnext\n'

    expect(serialize(parseStockFast(src)!)).toEqual(serialize(normalParse(src)))
  })

  it('matches normal token output across repeated blank lines', () => {
    const src = '# A\n\n\nPlain text  \n\n- a\n- b\n\n\n```js\nx\n```\n\n'

    expect(serialize(parseStockFast(src)!)).toEqual(serialize(normalParse(src)))
  })

  it('matches normal token output for fenced code info', () => {
    const src = '```  js title  \nconsole.log(1)\n```\n'

    expect(serialize(parseStockFast(src)!)).toEqual(serialize(normalParse(src)))
    expect(parseStockFast('``` js`bad\nx\n```\n')).toBeNull()
  })

  it('emits stock mdast JSON for the supported subset', () => {
    const src = [
      '## Section 0',
      '',
      'Lorem ipsum dolor sit amet.',
      '',
      '- a',
      '- b',
      '- c',
      '',
      '```  js title  ',
      'console.log(0)',
      '```',
      '',
    ].join('\n')

    expect(JSON.parse(parseStockFastAstJson(src)!)).toEqual({
      type: 'root',
      children: [
        {
          type: 'heading',
          depth: 2,
          children: [{ type: 'text', value: 'Section 0' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Lorem ipsum dolor sit amet.' }],
        },
        {
          type: 'list',
          ordered: false,
          spread: false,
          children: [
            {
              type: 'listItem',
              spread: false,
              children: [{ type: 'paragraph', children: [{ type: 'text', value: 'a' }] }],
            },
            {
              type: 'listItem',
              spread: false,
              children: [{ type: 'paragraph', children: [{ type: 'text', value: 'b' }] }],
            },
            {
              type: 'listItem',
              spread: false,
              children: [{ type: 'paragraph', children: [{ type: 'text', value: 'c' }] }],
            },
          ],
        },
        {
          type: 'code',
          lang: 'js',
          meta: 'title',
          value: 'console.log(0)\n',
        },
      ],
    })
  })

  it('escapes supported stock mdast JSON inline text when needed', () => {
    expect(JSON.parse(parseStockFastAstJson('# A "quote"\n\nplain\ttab\n')!)).toEqual({
      type: 'root',
      children: [
        {
          type: 'heading',
          depth: 1,
          children: [{ type: 'text', value: 'A "quote"' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'plain\ttab' }],
        },
      ],
    })
  })

  it('returns null for unsupported stock mdast JSON shapes', () => {
    expect(JSON.parse(parseStockFastAstJson('  \n# A\n')!)).toEqual({
      type: 'root',
      children: [
        {
          type: 'heading',
          depth: 1,
          children: [{ type: 'text', value: 'A' }],
        },
      ],
    })
    expect(parseStockFastAstJson('line one\nline two\n')).toBeNull()
    expect(parseStockFastAstJson('- a\n\n- b\n')).toBeNull()
    expect(parseStockFastAstJson('Hello **world**\n')).toBeNull()
    expect(parseStockFastAstJson('  indented\n')).toBeNull()
    expect(parseStockFastAstJson('```\nunterminated\n')).toBeNull()
  })

  it('does not share mutable token state across stock parses', () => {
    const first = parseStockFast('# Heading\n\nPlain text\n')!
    const second = parseStockFast('# Heading\n\nPlain text\n')!

    first[0].map![0] = 99
    first[1].children![0].content = 'mutated'

    expect(second[0].map).toEqual([0, 1])
    expect(second[1].children![0].content).toBe('Heading')
  })

  it('uses the stock parse path from default parse', () => {
    const md = MarkdownIt()
    const env = {}

    expect(md.parse('# Fast\n\nPlain text\n', env)).toEqual(parseStockFast('# Fast\n\nPlain text\n'))
    expect(getParseDiagnostics(env)?.strategy?.path).toBe('stock-fast')
    expect(getParseDiagnostics(env)?.stockFast).toMatchObject({
      area: 'parse',
      attempted: true,
      matched: true,
      headings: 1,
      paragraphs: 1,
      blocks: 2,
      paragraphCacheHits: 0,
      paragraphCacheMisses: 0,
      paragraphCacheBypasses: 1,
    })
    expect(getParseDiagnostics(env)?.stockFast?.attemptMs).toBeGreaterThanOrEqual(0)
  })

  it('records a late stock parse fallback before using the general parser', () => {
    const md = MarkdownIt()
    const env = {}

    md.parse('# Fast\n\nPlain text\n\nLate **strong** text\n', env)

    expect(getParseDiagnostics(env)?.strategy?.path).toBe('plain')
    expect(getParseDiagnostics(env)?.stockFast).toMatchObject({
      area: 'parse',
      attempted: true,
      matched: false,
      fallbackReason: 'unsupported-stock-subset',
      headings: 1,
      paragraphs: 1,
      blocks: 2,
    })
  })

  it('keeps plugin instances on the normal parse path', () => {
    const md = MarkdownIt().use(() => {})
    const env = {}

    md.parse('# Fast\n', env)
    expect(getParseDiagnostics(env)?.strategy?.path).toBe('plain')
  })

  it('returns null for unsupported markdown shapes', () => {
    expect(parseStockFast('line one\nline two\n')).toBeNull()
    expect(parseStockFast('- a\n\n- b\n')).toBeNull()
    expect(parseStockFast('Hello **world**\n')).toBeNull()
    expect(parseStockFast('  indented\n')).toBeNull()
    expect(parseStockFast('```\nunterminated\n')).toBeNull()
  })
})
