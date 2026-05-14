import { describe, expect, it } from 'vitest'
import markdownit, { chunkedParse, EditableBuffer, UnboundedBuffer } from '../../src/index'
import { parseStringUnbounded } from '../../src/stream/unbounded'

function renderTokens(md: ReturnType<typeof markdownit>, tokens: any[], env: Record<string, unknown>) {
  return md.renderer.render(tokens, md.options, env)
}

const corpus = [
  {
    name: 'blank-separated mixed blocks',
    src: [
      '# Title',
      '',
      'Paragraph with [link](https://example.com).',
      '',
      '- one',
      '- two',
      '',
      '> quote',
      '> continued',
      '',
      '| a | b |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      '```ts',
      'const x = 1',
      '```',
      '',
      '<section>',
      '<p>raw html</p>',
      '</section>',
      '',
    ].join('\n'),
  },
  {
    name: 'forced-boundary bullet list',
    src: Array.from({ length: 30 }, (_, index) => `- item ${index + 1}`).join('\n'),
    expectChunkFallback: true,
  },
  {
    name: 'forced-boundary blockquote',
    src: Array.from({ length: 30 }, (_, index) => `> quoted line ${index + 1}`).join('\n'),
    expectChunkFallback: true,
  },
  {
    name: 'forced-boundary html block',
    src: [
      '<div>',
      ...Array.from({ length: 30 }, (_, index) => `<span>${index + 1}</span>`),
      '</div>',
    ].join('\n'),
    expectChunkFallback: true,
  },
]

describe('stream parser differential correctness', () => {
  for (const entry of corpus) {
    it(`chunkedParse matches full render for ${entry.name}`, () => {
      const md = markdownit({ html: true })
      const env: Record<string, unknown> = {}
      const tokens = chunkedParse(md, entry.src, env, {
        maxChunkChars: 40,
        maxChunkLines: 2,
        fenceAware: true,
      })

      expect(renderTokens(md, tokens, env)).toBe(md.render(entry.src))
      if (entry.expectChunkFallback) {
        expect((env as any).__mdtsChunkInfo).toMatchObject({
          fallback: true,
          fallbackReason: 'unsafe-chunk-boundary',
        })
      }
    })

    it(`parseStringUnbounded matches full render for ${entry.name}`, () => {
      const md = markdownit({ html: true })
      const env: Record<string, unknown> = {}
      const tokens = parseStringUnbounded(md, entry.src, env, {
        maxChunkChars: 40,
        maxChunkLines: 2,
      })

      expect(renderTokens(md, tokens, env)).toBe(md.render(entry.src))
    })
  }

  it('EditableBuffer matches full render after edits', () => {
    const md = markdownit({ html: true })
    const src = [
      '# Title',
      '',
      '- alpha',
      '- beta',
      '- gamma',
      '',
      '> old quote',
      '',
      '```js',
      'console.log("old")',
      '```',
      '',
    ].join('\n')
    const env: Record<string, unknown> = {}
    const buffer = new EditableBuffer(md, src)

    buffer.parse(env)

    const listEdit = buffer.toString().indexOf('beta')
    buffer.replace(listEdit, listEdit + 'beta'.length, 'beta updated', env)

    const fenceEdit = buffer.toString().indexOf('"old"')
    buffer.replace(fenceEdit, fenceEdit + '"old"'.length, '"new"', env)

    expect(renderTokens(md, buffer.peek(), env)).toBe(md.render(buffer.toString()))
  })

  it('UnboundedBuffer.flushAvailable does not commit forced nonblank boundaries', () => {
    const md = markdownit()
    const src = Array.from({ length: 30 }, (_, index) => `- item ${index + 1}`).join('\n')
    const buffer = new UnboundedBuffer(md, {
      maxChunkChars: 40,
      maxChunkLines: 2,
    })

    buffer.feed(src)

    expect(buffer.flushAvailable({})).toBeNull()
    expect(buffer.peek()).toHaveLength(0)
    expect(buffer.pendingText()).toBe(src)
  })

  it('UnboundedBuffer.flushIfBoundary falls back to one chunk when internal boundaries are unsafe', () => {
    const md = markdownit()
    const src = `${Array.from({ length: 30 }, (_, index) => `- item ${index + 1}`).join('\n')}\n\n`
    const env: Record<string, unknown> = {}
    const buffer = new UnboundedBuffer(md, {
      maxChunkChars: 40,
      maxChunkLines: 2,
    })

    buffer.feed(src)
    const tokens = buffer.flushIfBoundary(env)!

    expect(renderTokens(md, tokens, env)).toBe(md.render(src))
  })
})
