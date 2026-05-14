import { fileURLToPath } from 'node:url'
import MarkdownItOriginal from 'markdown-it'
import { load } from 'markdown-it-testgen'
import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'

function normalize(text) {
  return text.replace(/<blockquote>\n<\/blockquote>/g, '<blockquote></blockquote>')
}

describe('CommonMark upstream fixture parity', () => {
  const md = markdownit('commonmark')
  const fixturePath = fileURLToPath(new URL('../fixtures/upstream/commonmark/good.txt', import.meta.url))
  const data = load(fixturePath, { sep: ['.'] })

  if (!data?.fixtures.length)
    throw new Error('CommonMark fixture file is empty')

  for (const fixture of data.fixtures) {
    it(fixture.header || `line ${fixture.first.range[0] - 1}`, () => {
      expect(md.render(fixture.first.text)).toBe(normalize(fixture.second.text))
    })
  }

  it('matches markdown-it commonmark preset rule switches outside the fixture corpus', () => {
    const upstream = MarkdownItOriginal('commonmark')
    const samples = [
      '~~strike~~',
      ['| a | b |', '| - | - |', '| 1 | 2 |'].join('\n'),
      '<span>raw</span>',
      'hard\\\nbreak',
    ]

    for (const sample of samples)
      expect(md.render(sample)).toBe(upstream.render(sample))
  })
})
