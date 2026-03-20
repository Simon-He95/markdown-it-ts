import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownItOriginal from 'markdown-it'
import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

function readFixture(name: string): string {
  return fs.readFileSync(path.join(ROOT, 'fixtures', name), 'utf8')
}

const fixtureCases: Array<{
  name: string
  text: string
  options?: Record<string, unknown>
  assert?: (html: string) => void
}> = [
  { name: 'heading', text: readFixture('block-heading.md') },
  { name: 'lheading', text: readFixture('block-lheading.md') },
  { name: 'hr', text: readFixture('block-hr.md') },
  { name: 'blockquote', text: readFixture('block-bq-flat.md') },
  { name: 'list', text: readFixture('block-list-flat.md') },
  { name: 'list-nested', text: readFixture('block-list-nested.md') },
  { name: 'fence', text: readFixture('block-fences.md') },
  { name: 'code-block', text: readFixture('block-code.md') },
  { name: 'html-block', text: readFixture('block-html.md'), options: { html: true } },
  { name: 'table', text: readFixture('block-tables.md') },
  { name: 'reference', text: readFixture('block-ref-list.md') },
  {
    name: 'links',
    text: readFixture('inline-links-flat.md'),
    assert(html) {
      expect(html).toContain('href="%5C%3E%5C%3E%5C%3E')
      expect(html).toContain('title="\\\'\\\'\\\'')
      expect(html).toContain('href="%5C)%5C)%5C)')
    },
  },
  { name: 'links-nested', text: readFixture('inline-links-nested.md') },
  { name: 'backticks', text: readFixture('inline-backticks.md') },
  {
    name: 'entity',
    text: readFixture('inline-entity.md'),
    assert(html) {
      expect(html).toContain('&amp;copy;')
      expect(html).toContain('&amp;AElig;')
      expect(html).toContain('&amp;ClockwiseContourIntegral;')
    },
  },
  { name: 'escape', text: readFixture('inline-escape.md') },
  { name: 'html-inline', text: readFixture('inline-html.md'), options: { html: true } },
  { name: 'autolink', text: readFixture('inline-autolink.md') },
  { name: 'emphasis', text: readFixture('inline-em-nested.md') },
  { name: 'newline', text: readFixture('inline-newlines.md') },
  { name: 'image', text: '![alt](https://example.com/a.png "title")' },
  { name: 'strikethrough', text: 'A ~~deprecated~~ word.' },
]

describe('family e2e parity', () => {
  for (const { name, text, options, assert } of fixtureCases) {
    it(`matches markdown-it for ${name}`, () => {
      const ours = MarkdownIt(options ?? {})
      const html = ours.render(text)

      if (assert) {
        assert(html)
        return
      }

      const upstream = new MarkdownItOriginal(options ?? {})
      expect(html).toBe(upstream.render(text))
    })
  }
})
