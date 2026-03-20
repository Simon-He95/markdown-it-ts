import { describe, expect, it } from 'vitest'
import markdownit from '../../src'

describe('autolink regression', () => {
  it('keeps angle-bracket email autolinks working with normalize hooks', () => {
    const md = markdownit()
    md.normalizeLink = (url: string) => {
      expect(url).toContain('example.com')
      return 'LINK'
    }
    md.normalizeLinkText = (url: string) => {
      expect(url).toContain('example.com')
      return 'TEXT'
    }

    expect(md.render('<foo@example.com>')).toBe('<p><a href="LINK">TEXT</a></p>\n')
  })

  it('keeps angle-bracket url autolinks working with normalize hooks', () => {
    const md = markdownit()
    md.normalizeLink = (url: string) => {
      expect(url).toContain('example.com')
      return 'LINK'
    }
    md.normalizeLinkText = (url: string) => {
      expect(url).toContain('example.com')
      return 'TEXT'
    }

    expect(md.render('<http://example.com>')).toBe('<p><a href="LINK">TEXT</a></p>\n')
  })

  it('respects validateLink returning false for angle-bracket autolinks', () => {
    const md = markdownit()
    md.validateLink = () => false

    expect(md.render('<foo@example.com>')).toBe('<p>&lt;foo@example.com&gt;</p>\n')
    expect(md.render('<http://example.com>')).toBe('<p>&lt;http://example.com&gt;</p>\n')
  })

  it('does not blow up on pathological nested angle brackets', () => {
    const md = markdownit()
    expect(md.render(`${'<'.repeat(20000)}>`)).toContain('&lt;')
  })
})
