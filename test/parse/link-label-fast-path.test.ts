import MarkdownItOriginal from 'markdown-it'
import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

const cases: Array<{
  name: string
  text: string
  options?: Record<string, unknown>
}> = [
  {
    name: 'plain label',
    text: '[plain label](https://example.com)',
  },
  {
    name: 'escaped closing bracket',
    text: '[escaped \\] bracket](https://example.com)',
  },
  {
    name: 'code span containing closing bracket',
    text: '[`code ]` label](https://example.com)',
  },
  {
    name: 'html span containing closing bracket',
    text: '[<span data-x=\"]\">html</span> label](https://example.com)',
    options: { html: true },
  },
  {
    name: 'nested image inside link label',
    text: '[![alt](https://example.com/a.png)](https://example.com)',
  },
]

describe('link label fast path parity', () => {
  for (const { name, text, options } of cases) {
    it(`matches markdown-it for ${name}`, () => {
      const ours = MarkdownIt(options ?? {})
      const upstream = new MarkdownItOriginal(options ?? {})

      expect(ours.render(text)).toBe(upstream.render(text))
    })
  }
})
