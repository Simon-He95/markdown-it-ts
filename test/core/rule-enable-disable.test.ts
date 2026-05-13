import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

describe('MarkdownIt enable/disable rule validation', () => {
  it('does not throw when enabling an already-enabled valid rule', () => {
    const md = MarkdownIt()

    expect(() => md.enable('normalize')).not.toThrow()
    expect(md.render('# ok')).toBe('<h1>ok</h1>\n')
  })

  it('does not throw when disabling an already-disabled valid rule', () => {
    const md = MarkdownIt()

    md.disable('normalize')

    expect(() => md.disable('normalize')).not.toThrow()
  })

  it('reports invalid names even when another requested rule exists in multiple chains', () => {
    const md = MarkdownIt()

    expect(() => md.disable(['linkify', '__missing_rule__'])).toThrow(/__missing_rule__/)
  })

  it('ignores invalid names when ignoreInvalid is true', () => {
    const md = MarkdownIt()

    expect(() => md.disable(['linkify', '__missing_rule__'], true)).not.toThrow()
    expect(() => md.enable(['linkify', '__missing_rule__'], true)).not.toThrow()
  })

  it('can disable and re-enable inline rules without stale parser caches', () => {
    const md = MarkdownIt()

    expect(md.render('*x*')).toBe('<p><em>x</em></p>\n')

    md.disable('emphasis')
    expect(md.render('*x*')).toBe('<p>*x*</p>\n')

    md.enable('emphasis')
    expect(md.render('*x*')).toBe('<p><em>x</em></p>\n')
  })

  it('can disable and re-enable block rules without stale parser caches', () => {
    const md = MarkdownIt()
    const src = '| a | b |\n|---|---|\n| 1 | 2 |\n'

    expect(md.render(src)).toContain('<table>')

    md.disable('table')
    expect(md.render(src)).not.toContain('<table>')

    md.enable('table')
    expect(md.render(src)).toContain('<table>')
  })
})
