import { describe, expect, it } from 'vitest'
import markdownit from '../src/index'

import abbr from 'markdown-it-abbr'
import container from 'markdown-it-container'
import deflist from 'markdown-it-deflist'
import * as emojiModule from 'markdown-it-emoji'
import footnote from 'markdown-it-footnote'
import forInline from 'markdown-it-for-inline'
import ins from 'markdown-it-ins'
import mark from 'markdown-it-mark'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'

function unwrapPlugin(mod: any, preferred?: string): any {
  if (preferred && typeof mod?.[preferred] === 'function')
    return mod[preferred]

  if (typeof mod === 'function')
    return mod

  if (typeof mod?.default === 'function')
    return mod.default

  if (typeof mod?.full === 'function')
    return mod.full

  if (typeof mod?.light === 'function')
    return mod.light

  throw new TypeError('plugin module does not expose a function')
}

describe('markdown-it plugin compatibility matrix', () => {
  it('supports markdown-it-abbr', () => {
    const md = markdownit().use(unwrapPlugin(abbr))

    const html = md.render('*[HTML]: Hyper Text Markup Language\n\nHTML')

    expect(html).toBe('<p><abbr title="Hyper Text Markup Language">HTML</abbr></p>\n')
  })

  it('supports markdown-it-container', () => {
    const md = markdownit().use(unwrapPlugin(container), 'warning')

    const html = md.render('::: warning\nhello\n:::')

    expect(html).toContain('<div class="warning">')
    expect(html).toContain('<p>hello</p>')
    expect(html).toContain('</div>')
  })

  it('supports markdown-it-deflist', () => {
    const md = markdownit().use(unwrapPlugin(deflist))

    const html = md.render('Term\n: Definition')

    expect(html).toContain('<dl>')
    expect(html).toContain('<dt>Term</dt>')
    expect(html).toContain('<dd>Definition</dd>')
  })

  it('supports markdown-it-footnote', () => {
    const md = markdownit().use(unwrapPlugin(footnote))

    const html = md.render('hello[^note]\n\n[^note]: world')

    expect(html).toContain('footnote-ref')
    expect(html).toContain('<section class="footnotes">')
    expect(html).toContain('world')
  })

  it('supports markdown-it-ins', () => {
    const md = markdownit().use(unwrapPlugin(ins))

    expect(md.render('++inserted++')).toBe('<p><ins>inserted</ins></p>\n')
  })

  it('supports markdown-it-mark', () => {
    const md = markdownit().use(unwrapPlugin(mark))

    expect(md.render('==marked==')).toBe('<p><mark>marked</mark></p>\n')
  })

  it('supports markdown-it-sub', () => {
    const md = markdownit().use(unwrapPlugin(sub))

    expect(md.render('H~2~O')).toBe('<p>H<sub>2</sub>O</p>\n')
  })

  it('supports markdown-it-sup', () => {
    const md = markdownit().use(unwrapPlugin(sup))

    expect(md.render('x^2^')).toBe('<p>x<sup>2</sup></p>\n')
  })

  it('supports markdown-it-emoji', () => {
    const emoji = unwrapPlugin(emojiModule, 'full')
    const md = markdownit().use(emoji)

    const html = md.render(':smile:')

    expect(html).not.toContain(':smile:')
  })

  it('supports markdown-it-for-inline', () => {
    const md = markdownit({ linkify: true })

    md.use(
      unwrapPlugin(forInline),
      'link_target_blank',
      'link_open',
      (tokens: any[], idx: number) => {
        tokens[idx].attrSet('target', '_blank')
      },
    )

    const html = md.render('[x](https://example.com)')

    expect(html).toContain('target="_blank"')
  })
})
