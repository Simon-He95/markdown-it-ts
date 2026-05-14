import { describe, expect, it } from 'vitest'
import markdownit from '../src/index'

describe('security defaults', () => {
  it('escapes raw HTML by default', () => {
    const html = markdownit().render('<script>alert(1)</script>')

    expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n')
  })

  it('passes raw HTML through when html is explicitly enabled', () => {
    const html = markdownit({ html: true }).render('<script>alert(1)</script>')

    expect(html).toBe('<script>alert(1)</script>')
  })

  it('blocks unsafe link protocols after normalization', () => {
    const md = markdownit()
    const samples = [
      '[x](javascript:alert)',
      '[x](JaVaScRiPt:alert)',
      '[x]( javascript:alert)',
      '[x](&#x6a;avascript:alert)',
      '[x](vbscript:alert)',
      '[x](file:///etc/passwd)',
      '[x](data:text/html;base64,PHNjcmlwdD4=)',
    ]

    for (const sample of samples)
      expect(md.render(sample)).not.toContain('<a ')
  })

  it('keeps image data URLs inside the default allow-list', () => {
    const html = markdownit().render('![x](data:image/png;base64,abc)')

    expect(html).toContain('<img src="data:image/png;base64,abc" alt="x">')
  })

  it('does not sanitize trusted plugin-authored attributes', () => {
    const md = markdownit().use((instance) => {
      instance.core.ruler.push('unsafe_attr_probe', (state) => {
        const token = state.tokens.find(item => item.type === 'paragraph_open')
        if (token) {
          token.attrSet('id', 'constructor')
          token.attrSet('onclick', 'alert(1)')
        }
      })
    })

    const html = md.render('hello')

    expect(html).toContain('id="constructor"')
    expect(html).toContain('onclick="alert(1)"')
  })
})
