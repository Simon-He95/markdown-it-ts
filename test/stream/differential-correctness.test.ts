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

  it('stream parser matches full render across deterministic edit sequence', () => {
    const streamMd = markdownit({
      html: true,
      linkify: true,
      stream: true,
      streamOptimizationMinSize: 0,
    })
    const fullMd = markdownit({ html: true, linkify: true })
    const env: Record<string, unknown> = {}
    const snippets = [
      'Inserted paragraph with **strong text** and [a link](https://example.com).\n\n',
      '- inserted item one\n- inserted item two\n\n',
      '> inserted quote\n> continued quote\n\n',
      '```ts\nconst inserted = true\n```\n\n',
      '| a | b |\n| - | - |\n| 1 | 2 |\n\n',
      '| left | right |\n|:-----|------:|\n| a | b |\n\n',
      '![alt text](https://example.com/img.png "title")\n\n',
      '### Inserted heading\n\n',
    ]
    let rng = 0x5eed1234
    const random = () => {
      rng = (rng * 1664525 + 1013904223) >>> 0
      return rng / 0x100000000
    }
    const lineBoundaries = (src: string) => {
      const offsets = [0]
      for (let index = 0; index < src.length; index++) {
        if (src.charCodeAt(index) === 0x0A)
          offsets.push(index + 1)
      }
      if (offsets[offsets.length - 1] !== src.length)
        offsets.push(src.length)
      return offsets
    }
    const renderWithStream = (src: string) => {
      const tokens = streamMd.stream.parse(src, env)
      return renderTokens(streamMd, tokens, env)
    }
    const firstDiffIndex = (left: string, right: string) => {
      const length = Math.min(left.length, right.length)
      for (let index = 0; index < length; index++) {
        if (left.charCodeAt(index) !== right.charCodeAt(index))
          return index
      }
      return left.length === right.length ? -1 : length
    }
    const history: string[] = []
    const assertMatches = (src: string, step: number, edit = 'initial parse') => {
      const actual = renderWithStream(src)
      const expected = fullMd.render(src)
      if (actual !== expected) {
        const diffAt = firstDiffIndex(actual, expected)
        throw new Error([
          `stream render differed from full render at edit step ${step} (${edit})`,
          `source length: ${src.length}`,
          `diff at: ${diffAt}`,
          `recent edits: ${history.slice(-8).join(' | ')}`,
          `source tail: ${src.slice(-500)}`,
          `actual: ${actual.slice(Math.max(0, diffAt - 80), diffAt + 160)}`,
          `expected: ${expected.slice(Math.max(0, diffAt - 80), diffAt + 160)}`,
        ].join('\n'))
      }
    }

    let current = Array.from({ length: 32 }, (_, index) => [
      `## Section ${index + 1}`,
      '',
      `Paragraph ${index + 1} with [site](https://example.com/${index + 1}) and *emphasis*.`,
      '',
      '- alpha',
      '- beta',
      '',
    ].join('\n')).join('\n')

    assertMatches(current, 0)

    for (let step = 1; step <= 80; step++) {
      const snippet = snippets[Math.floor(random() * snippets.length)]
      const op = Math.floor(random() * 3)
      const boundaries = lineBoundaries(current)

      if (op === 0) {
        current += snippet
        const edit = `append ${JSON.stringify(snippet)}`
        history.push(`${step}: ${edit}`)
        assertMatches(current, step, edit)
        continue
      }
      else if (op === 1) {
        const offset = boundaries[Math.floor(random() * boundaries.length)]
        current = `${current.slice(0, offset)}${snippet}${current.slice(offset)}`
        const edit = `insert ${JSON.stringify(snippet)} at ${offset}`
        history.push(`${step}: ${edit}`)
        assertMatches(current, step, edit)
        continue
      }
      else {
        const startIndex = Math.floor(random() * Math.max(1, boundaries.length - 1))
        const endIndex = Math.min(boundaries.length - 1, startIndex + 1 + Math.floor(random() * 4))
        const start = boundaries[startIndex]
        const end = boundaries[endIndex]
        if (end > start && current.length - (end - start) > 200)
          current = `${current.slice(0, start)}${snippet}${current.slice(end)}`
        const edit = `replace ${start}:${end} with ${JSON.stringify(snippet)}`
        history.push(`${step}: ${edit}`)
        assertMatches(current, step, edit)
        continue
      }
    }
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
