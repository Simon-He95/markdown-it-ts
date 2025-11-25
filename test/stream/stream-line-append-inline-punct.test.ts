import { describe, expect, it } from 'vitest'
import MarkdownIt, { StreamBuffer } from '../../src'

describe('stream parser (inline punctuation across flush)', () => {
  it('handles inline punctuation and bracketed expressions split across flushes', () => {
    const md = MarkdownIt({ stream: true })
    const baseline = MarkdownIt()
    const buffer = new StreamBuffer(md)

    const doc = `Here is an inline expression that may be split:
\n[f(x) = f(a) + f'(a)(x-a) + ...]\n
Next paragraph text.
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
