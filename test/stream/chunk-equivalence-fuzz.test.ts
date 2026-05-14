import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { chunkedParse, getParseDiagnostics } from '../../src/experimental'

const blocks = [
  '# Heading',
  'Paragraph with **strong** and [link](https://example.com).',
  '- alpha\n- beta\n- gamma',
  '> quote\n> continued',
  '| a | b |\n| - | - |\n| 1 | 2 |',
  '```ts\nconst x = 1\n```',
  '<div>\nraw html\n</div>',
]

function makeDoc(seed: number): string {
  let doc = ''
  let state = seed
  let previousBlock = -1
  for (let i = 0; i < 24; i++) {
    state = (state * 1103515245 + 12345) >>> 0
    let blockIndex = state % blocks.length
    if ((blockIndex === 2 || blockIndex === 3) && blockIndex === previousBlock)
      blockIndex = (blockIndex + 1) % blocks.length
    doc += `${blocks[blockIndex]}\n\n`
    previousBlock = blockIndex
  }
  return doc
}

function splitAtPattern(src: string, seed: number): string[] {
  const chunks: string[] = []
  let offset = 0
  let state = seed
  while (offset < src.length) {
    state = (state * 1664525 + 1013904223) >>> 0
    const size = 1 + (state % 37)
    chunks.push(src.slice(offset, offset + size))
    offset += size
  }
  return chunks
}

function tokenShape(tokens: any[]): unknown[] {
  return tokens.map(token => ({
    type: token.type,
    tag: token.tag,
    nesting: token.nesting,
    content: token.content,
    attrs: token.attrs,
    children: token.children ? tokenShape(token.children) : null,
  }))
}

describe('chunk equivalence fuzz', () => {
  it('matches full token shape for chunk-local mixed blocks', () => {
    const md = markdownit({ html: true })
    const src = [
      '# Heading',
      '',
      'Paragraph with **strong** and [link](https://example.com).',
      '',
      '| a | b |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      '- alpha',
      '- beta',
      '- gamma',
      '',
      '```ts',
      'const x = 1',
      '```',
      '',
      '<div>',
      'raw html',
      '</div>',
      '',
    ].join('\n')
    const env: Record<string, unknown> = {}

    const chunkedTokens = chunkedParse(md, src, env, {
      maxChunkChars: 80,
      maxChunkLines: 4,
    })

    const diagnostics = getParseDiagnostics(env)
    expect(tokenShape(chunkedTokens)).toEqual(tokenShape(md.parse(src)))
    expect(diagnostics?.chunk?.fallback).not.toBe(true)
    expect(diagnostics?.chunk?.count).toBeGreaterThan(1)
  })

  for (const seed of [1, 7, 23, 42]) {
    it(`matches full parsing for safe mixed markdown seed ${seed}`, () => {
      const md = markdownit({ html: true })
      const src = makeDoc(seed)
      const env: Record<string, unknown> = {}

      const chunkedTokens = chunkedParse(md, src, env, {
        maxChunkChars: 80,
        maxChunkLines: 4,
      })

      const diagnostics = getParseDiagnostics(env)
      expect(md.renderer.render(chunkedTokens, md.options, env)).toBe(md.render(src))
      expect(md.renderIterable(splitAtPattern(src, seed))).toBe(md.render(src))
      expect(diagnostics?.chunk?.fallback).not.toBe(true)
      expect(diagnostics?.chunk?.count).toBeGreaterThan(1)
    })
  }
})
