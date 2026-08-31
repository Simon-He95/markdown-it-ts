import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'
import { getParseDiagnostics, renderStockFast } from '../../src/experimental'

function renderNormal(src: string): string {
  const localMd = MarkdownIt()
  void localMd.renderer
  return localMd.render(src)
}

describe('experimental renderStockFast', () => {
  it('renders the stock paragraph-heavy subset without token materialization', () => {
    const src = `## Section 0

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.

- a
- b
- c

\`\`\`js
console.log(0)
\`\`\`

`

    expect(renderStockFast(src)).toBe(renderNormal(src))
  })

  it('uses the stock fast path from default render without materializing renderer', () => {
    const localMd = MarkdownIt()
    const src = '# Fast\n\nPlain text\n'

    expect(localMd.render(src)).toBe(renderStockFast(src))
    expect(Object.getOwnPropertyDescriptor(localMd, 'renderer')?.get).toBeTypeOf('function')
  })

  it('uses the stock fast path with explicit env renders', () => {
    const localMd = MarkdownIt()
    const env = {}

    expect(localMd.render('# Fast\n', env)).toBe('<h1>Fast</h1>\n')
    expect(Object.getOwnPropertyDescriptor(localMd, 'renderer')?.get).toBeTypeOf('function')
    expect(getParseDiagnostics(env)?.strategy?.area).toBe('render')
    expect(getParseDiagnostics(env)?.strategy?.path).toBe('stock-fast')
    expect(getParseDiagnostics(env)?.stockFast).toMatchObject({
      area: 'render',
      attempted: true,
      matched: true,
      headings: 1,
      blocks: 1,
    })
    expect(getParseDiagnostics(env)?.stockFast?.attemptMs).toBeGreaterThanOrEqual(0)
  })

  it('uses the stock fast path from renderAsync', async () => {
    const localMd = MarkdownIt()
    const env = {}

    await expect(localMd.renderAsync('# Fast\n', env)).resolves.toBe('<h1>Fast</h1>\n')
    expect(Object.getOwnPropertyDescriptor(localMd, 'renderer')?.get).toBeTypeOf('function')
    expect(getParseDiagnostics(env)?.strategy?.area).toBe('render')
    expect(getParseDiagnostics(env)?.strategy?.path).toBe('stock-fast')
  })

  it('keeps custom renderer rules on the normal render path', () => {
    const localMd = MarkdownIt()
    localMd.renderer.rules.text = () => 'custom'

    expect(localMd.render('Plain text\n')).toBe('<p>custom</p>\n')
  })

  it('keeps custom renderer rules on the normal renderAsync path', async () => {
    const localMd = MarkdownIt()
    localMd.renderer.rules.text = () => 'custom'

    await expect(localMd.renderAsync('Plain text\n')).resolves.toBe('<p>custom</p>\n')
  })

  it('keeps parse overrides on the normal render path', () => {
    const localMd = MarkdownIt()
    ;(localMd as any).parse = () => {
      throw new Error('parse override called')
    }

    expect(() => localMd.render('# Fast\n')).toThrow('parse override called')
  })

  it('escapes fenced code content like the stock renderer', () => {
    const src = `# Code sample

\`\`\`
if (a < b && c > d) {
  console.log("ok")
}
\`\`\`
`

    expect(renderStockFast(src)).toBe(renderNormal(src))
  })

  it('parses fenced code info like the stock renderer', () => {
    const src = '```  js title  \nconsole.log(1)\n```\n'

    expect(renderStockFast(src)).toBe(renderNormal(src))
    expect(renderStockFast('``` js`bad\nx\n```\n')).toBeNull()
  })

  it('escapes quotes in plain inline text like the stock renderer', () => {
    const src = '# "Quoted"\n\nPlain "text"\n\n- "item"\n'

    expect(renderStockFast(src)).toBe(renderNormal(src))
  })

  it('renders repeated blank lines like the stock renderer', () => {
    const src = '# A\n\n\nPlain text  \n\n- a\n- b\n\n\n```js\nx\n```\n\n'

    expect(renderStockFast(src)).toBe(renderNormal(src))
  })

  it('renders repeated paragraphs and tight lists like the stock renderer', () => {
    const src = 'Plain text\n\n- a\n- b\n\nPlain text\n\n- a\n- b\n'

    expect(renderStockFast(src)).toBe(renderNormal(src))
  })

  it('records stock renderer cache hits for repeated paragraphs, lists, and fence languages', () => {
    const localMd = MarkdownIt()
    const env = {}
    const src = 'Plain text\n\n- a\n- b\n\n```js\none\n```\n\nPlain text\n\n- a\n- b\n\n```js\ntwo\n```\n'

    localMd.render(src, env)

    expect(getParseDiagnostics(env)?.stockFast).toMatchObject({
      area: 'render',
      attempted: true,
      matched: true,
      paragraphs: 2,
      lists: 2,
      fences: 2,
      paragraphCacheHits: 1,
      paragraphCacheMisses: 1,
      listCacheHits: 1,
      listCacheMisses: 1,
      fenceCacheHits: 1,
      fenceCacheMisses: 1,
    })
  })

  it('counts the first unlabelled fence as a cache miss and the second as a hit', () => {
    const localMd = MarkdownIt()
    const env = {}

    localMd.render('```\none\n```\n\n```\ntwo\n```\n', env)

    expect(getParseDiagnostics(env)?.stockFast).toMatchObject({
      area: 'render',
      matched: true,
      fences: 2,
      fenceCacheHits: 1,
      fenceCacheMisses: 1,
    })
  })

  it('preserves stock fallback diagnostics after token rendering', () => {
    const localMd = MarkdownIt()
    const env = {}

    expect(localMd.render('Plain text\n\nLate **strong** text\n', env)).toContain('<strong>strong</strong>')
    expect(getParseDiagnostics(env)?.strategy).toMatchObject({ area: 'parse', path: 'plain' })
    expect(getParseDiagnostics(env)?.stockFast).toMatchObject({
      area: 'render',
      attempted: true,
      matched: false,
      fallbackReason: 'unsupported-stock-subset',
      paragraphs: 1,
      blocks: 1,
    })
  })

  it('returns null for markdown that needs inline parsing', () => {
    expect(renderStockFast('Hello **world**\n')).toBeNull()
    expect(renderStockFast('- [link](https://example.com)\n')).toBeNull()
    expect(renderStockFast('A & B\n')).toBeNull()
  })

  it('returns null for unsupported block shapes', () => {
    expect(renderStockFast('  indented\n')).toBeNull()
    expect(renderStockFast('```\nunterminated\n')).toBeNull()
    expect(renderStockFast('---\n')).toBeNull()
    expect(renderStockFast('line one\nline two\n')).toBeNull()
    expect(renderStockFast('- a\n\n- b\n')).toBeNull()
  })
})
