import { describe, it, expect } from 'vitest'
import markdownit, { withRenderer } from '../src/index'

describe('plugin injection (withRenderer)', () => {
  it('exposes render API by default', () => {
    const md = markdownit()
    expect(typeof md.render).toBe('function')
    expect(typeof md.renderInline).toBe('function')
    expect(md.renderer).toBeDefined()
    expect(md.renderInline('a *b* c')).toBe('a <em>b</em> c')
  })

  it('withRenderer is idempotent and returns the same instance', () => {
    const md = markdownit()
    const patched = withRenderer(md)
    expect(patched).toBe(md)
    expect(md.render('**x**')).toBe('<p><strong>x</strong></p>\n')
  })

  it('should allow custom highlight via options', () => {
    const md = markdownit({ highlight: (str, lang) => `<pre><code class="${lang}">${str}</code></pre>` })
  withRenderer(md)
    const html = md.render('```js\nconsole.log(1)\n```')
    // Note: fence content includes trailing newline, so highlight function receives 'console.log(1)\n'
    expect(html).toContain('<pre><code class="js">console.log(1)\n</code></pre>')
  })
})
