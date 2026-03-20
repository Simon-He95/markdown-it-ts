import { describe, expect, it } from 'vitest'
import MarkdownIt, { StreamBuffer } from '../../src'

function normalizeTokens(tokens: any[]): any[] {
  return tokens.map(token => ({
    type: token.type,
    tag: token.tag,
    attrs: token.attrs,
    map: token.map,
    nesting: token.nesting,
    level: token.level,
    content: token.content,
    markup: token.markup,
    info: token.info,
    meta: token.meta,
    block: token.block,
    hidden: token.hidden,
    children: token.children ? normalizeTokens(token.children) : null,
  }))
}

describe('stream/full token parity', () => {
  it('preserves token shape and compatibility fields across full parse and stream append', () => {
    const doc = `# Title

- one
- two

| left | center |
|:-----|:------:|
| a | b |

Paragraph with [link](https://example.com), ![img](https://example.com/a.png "title"), and \`code\`.

> quote
> still quote

\`\`\`js
console.log(1)
\`\`\`
`

    const full = MarkdownIt()
    const stream = MarkdownIt({ stream: true })
    const buffer = new StreamBuffer(stream)

    for (const line of doc.split('\n')) {
      buffer.feed(`${line}\n`)
      buffer.flushIfBoundary()
    }

    const fullTokens = full.parse(doc, {})
    const streamTokens = buffer.flushForce({})

    expect(normalizeTokens(streamTokens)).toEqual(normalizeTokens(fullTokens))
  })
})
