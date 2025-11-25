import { describe, expect, it } from 'vitest'
import MarkdownIt, { StreamBuffer } from '../../src'

describe('stream parser (admonition across flush)', () => {
  it('handles ::: admonition blocks split across appended lines', () => {
    const md = MarkdownIt({ stream: true })
    const baseline = MarkdownIt()
    const buffer = new StreamBuffer(md)

    const doc = `Introduction paragraph.

::: warning
This is a warning line that may be split across flushes.
It contains multiple lines.
:::

Follow-up paragraph.
`

    const lines = doc.split('\n')
    for (let i = 0; i < lines.length; i++) {
      buffer.feed(lines[i] + '\n')
      buffer.flushIfBoundary()
    }

    const tokens = buffer.flushForce()
    const streamHtml = md.renderer.render(tokens, md.options, {})
    const baselineHtml = baseline.render(doc)

    const stripTags = (s: string) => s.replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/[\s\u00A0]+/g, ' ').trim()

    expect(stripTags(streamHtml)).toEqual(stripTags(baselineHtml))
  })
})
