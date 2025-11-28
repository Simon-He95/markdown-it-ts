import { expect, test } from 'vitest'
import MarkdownIt from '../src/index'

test('escaped < in link label is unescaped', () => {
  const md = MarkdownIt()
  const src = '### [\<ins>](https://github.com/markdown-it/markdown-it-ins)'
  const out = md.render(src)

  // The label should contain a literal '<ins>' (no backslash)
  expect(out).toContain('<h3><a href="https://github.com/markdown-it/markdown-it-ins">&lt;ins&gt;</a></h3>')
  // And it should not contain the backslash-escaped version
  expect(out).not.toContain('\<ins>')
})
