import { describe, expect, it } from 'vitest'
import { CachedStreamParser } from '../../src/stream/cached'
import {
  ChunkTable,
  computeContentFingerprint,
  detectHardBoundaries,
  materializeCachedTokens,
} from '../../src/stream/chunk_cache'
import { getParseDiagnostics } from '../../src/experimental'
import markdownit, { type MarkdownIt, type MarkdownItOptions } from '../../src/index'
import { ParserCore } from '../../src/parse/parser_core'
import { Token } from '../../src/common/token'
import type { Token as TokenType } from '../../src/common/token'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function render(src: string, md = markdownit()) {
  return md.render(src)
}

function renderBaseline(src: string, options: MarkdownItOptions) {
  return markdownit({
    ...options,
    stream: false,
    streamChunkCache: false,
    experimental: {
      ...options.experimental,
      stream: false,
      streamChunkCache: false,
    },
  }).render(src)
}

function renderFull(src: string, md: MarkdownIt) {
  const wasEnabled = md.stream.enabled
  md.stream.enabled = false
  try {
    return md.render(src)
  }
  finally {
    md.stream.enabled = wasEnabled
  }
}

function makeParser(md = markdownit()) {
  const typedMd = md as any
  return new CachedStreamParser(typedMd.core as ParserCore, undefined, {
    core: typedMd.core.ruler.version,
    block: typedMd.block.ruler.version,
    inline: typedMd.inline.ruler.version,
    inline2: typedMd.inline.ruler2.version,
  })
}

/** Build a large markdown doc with paragraph boundaries (safe for chunking). */
function largeDoc(paragraphs: number): string {
  let src = ''
  for (let i = 0; i < paragraphs; i++) {
    src += `Paragraph ${i} with some extra longer filler text to reach minChars.\n\n`
  }
  return src
}

// ---------------------------------------------------------------------------
// P0-1: Options / rules invalidation
// ---------------------------------------------------------------------------

describe('Cache invalidation (P0-1)', () => {
  it('invalidates cache after md.set({ html: true })', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}<div>raw html</div>\n\n${largeDoc(80)}`

    // First parse to establish cache
    md.stream.parse(src, {})

    // Change option
    md.set({ html: true })

    // Parse again — should still produce correct output
    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(renderBaseline(src, md.options))
    expect(html).toContain('<div>raw html</div>')
  })

  it('direct CachedStreamParser invalidates after md.set({ html: true })', () => {
    const md = markdownit({ html: false })
    const parser = makeParser(md)
    const env: Record<string, unknown> = {}
    const src = `${largeDoc(120)}<div>raw html</div>\n\n${largeDoc(80)}`

    parser.parse(src, env, md)
    md.set({ html: true })

    const tokens = parser.parse(src, env, md)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(renderBaseline(src, md.options))
    expect(html).toContain('<div>raw html</div>')
    expect(parser.getStats().invalidations).toBeGreaterThan(0)
  })

  it('invalidates cache after md.set({ linkify: true })', () => {
    const md = markdownit({ stream: true, linkify: false, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}Visit https://example.com now.\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ linkify: true })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(renderBaseline(src, md.options))
    expect(html).toContain('<a href="https://example.com">https://example.com</a>')
  })

  it('invalidates cache after md.set({ breaks: true })', () => {
    const md = markdownit({ stream: true, breaks: false, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}soft\nbreak\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ breaks: true })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(renderBaseline(src, md.options))
    expect(html).toContain('<br>')
  })

  it('invalidates cache after md.set({ typographer: true })', () => {
    const md = markdownit({ stream: true, typographer: false, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}(c) -- test\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ typographer: true })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(renderBaseline(src, md.options))
    expect(html).not.toContain('(c)')
  })

  it('invalidates cache after md.set({ maxNesting: ... })', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}[\`foo\`]()\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ maxNesting: 1 })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(renderBaseline(src, md.options))
    expect(html).toContain('<a href="">`foo`</a>')
  })

  it('invalidates cache after md.set({ quotes: ... })', () => {
    const md = markdownit({ stream: true, typographer: true, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}She said "hello" and 'bye'.\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ quotes: ['[[', ']]', '{', '}'] })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(renderBaseline(src, md.options))
    expect(html).toContain('[[hello]]')
    expect(html).toContain('{bye}')
  })

  it('uses current render options after md.set({ langPrefix: ... })', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}\`\`\`ts\nconst x = 1\n\`\`\`\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ langPrefix: 'lang-' })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(renderBaseline(src, md.options))
    expect(html).toContain('class="lang-ts"')
  })

  it('invalidates cache after md.enable()', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = largeDoc(200)

    md.stream.parse(src, {})

    // Enable table rule (changes parser behavior)
    md.enable('table')

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(renderFull(src, md))
  })

  it('invalidates cache after md.disable()', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = largeDoc(200)

    md.stream.parse(src, {})

    md.disable('linkify')

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(renderFull(src, md))
  })

  it('continues using chunk cache after safe rule invalidation', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = largeDoc(300)
    const env: Record<string, unknown> = {}

    md.stream.parse(src, env)
    md.disable('table')
    md.stream.parse(src, env)
    md.stream.resetStats()

    const modified = src.replace('Paragraph 150 with some', 'ModifiedP 150 with some')
    const tokens = md.stream.parse(modified, env)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(renderFull(modified, md))
    expect(md.stream.stats().lastMode).toBe('chunked')
  })

  it('falls back after direct rule-version changes unless marked safe', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = largeDoc(300)
    const env: Record<string, unknown> = {}

    parser.parse(src, env, md)
    md.disable('table')
    parser.parse(src, env, md)
    parser.resetStats()

    const modified = src.replace('Paragraph 150 with some', 'ModifiedP 150 with some')
    const tokens = parser.parse(modified, env, md)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(renderFull(modified, md))
    expect(parser.getStats().lastMode).toBe('full')
  })

  it('re-enables direct chunk cache after explicit safe rule invalidation', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = largeDoc(300)
    const env: Record<string, unknown> = {}

    parser.parse(src, env, md)
    md.disable('table')
    parser.noteSafeRuleChange(md)
    parser.parse(src, env, md)
    parser.resetStats()

    const modified = src.replace('Paragraph 150 with some', 'ModifiedP 150 with some')
    const tokens = parser.parse(modified, env, md)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(renderFull(modified, md))
    expect(parser.getStats().lastMode).toBe('chunked')
    expect(parser.getStats().chunkHits).toBeGreaterThan(0)
  })

  it('disables chunk cache after md.use()', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = largeDoc(200)

    md.stream.parse(src, {})

    // Register a simple plugin (env-sensitive)
    md.use((md) => {
      // Plugin can write to env — chunk cache must be disabled
    })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(renderFull(src, md))

    // After plugin use, stats should show full parse (not chunked)
    const stats = md.stream.stats()
    expect(stats.lastMode).toBe('full')
  })

  it('disables chunk cache after md.use() and preserves plugin env writes', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = largeDoc(200)

    md.stream.parse(src, {})

    md.use((md) => {
      md.core.ruler.push('test_env_after_cache', (state) => {
        state.env.pluginRan = true
      })
    })

    const env: Record<string, unknown> = {}
    const tokens = md.stream.parse(src, env)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(renderFull(src, md))
    expect(env.pluginRan).toBe(true)
    expect(md.stream.stats().lastMode).toBe('full')
    expect(getParseDiagnostics(env)?.chunkCache).toMatchObject({
      enabled: false,
      fallback: true,
      fallbackReason: 'plugin-used',
    })
  })

  it('keeps regular stream append path after md.use()', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    md.use(() => {})

    const src = largeDoc(120)
    const next = `${src}Appended after plugin.\n\n`
    const env: Record<string, unknown> = {}

    md.stream.parse(src, env)
    md.stream.resetStats()
    const tokens = md.stream.parse(next, env)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(renderFull(next, md))
    expect(md.stream.stats().lastMode).toBe('append')
    expect(md.stream.stats().appendHits).toBeGreaterThan(0)
  })

  it('uses cached stream parser after enabling streamChunkCache with md.set()', () => {
    const md = markdownit({ stream: true })

    md.stream.parse('initial\n', {})
    md.set({ experimental: { streamChunkCache: true } })
    md.stream.parse(largeDoc(200), {})

    expect(md.stream.stats().lastMode).toBe('chunked')
  })

  it('exposes chunk cache diagnostics through parse diagnostics', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = largeDoc(220)
    const env: Record<string, unknown> = {}

    md.stream.parse(src, env)

    const initial = getParseDiagnostics(env)?.chunkCache
    expect(initial?.path).toBe('chunk-cache')
    expect(initial?.misses).toBeGreaterThan(0)
    expect(initial?.tableSize).toBeGreaterThan(0)

    const modified = src.replace('Paragraph 150 with some', 'ModifiedP 150 with some')
    md.stream.parse(modified, env)

    const next = getParseDiagnostics(env)?.chunkCache
    expect(next?.path).toBe('chunk-cache')
    expect(next?.hits).toBeGreaterThan(0)
    expect(next?.misses).toBeGreaterThan(0)
    expect(next?.tableSize).toBeGreaterThan(0)
    expect(next?.reusedChars).toBeGreaterThan(0)
    expect(next?.dirtyRangeChars).toBeGreaterThan(0)
    expect(next?.reparsedChars).toBe(next?.lastReparsedChars)
    expect(next?.lastReusedChars).toBe(next?.reusedChars)
    expect(next?.lastDirtyRangeChars).toBe(next?.dirtyRangeChars)
    expect(next?.lastShiftedTokenCount).toBe(next?.shiftedTokenCount)
    expect(next?.shiftedTokenCount).toBeGreaterThan(0)
    expect(next?.lastReparsedChars).toBeGreaterThan(0)
    expect(next?.lastReparsedChunks).toBeGreaterThan(0)
    expect(next?.hits).toBe(md.stream.stats().chunkHits)
    expect(next?.reusedChars).toBe(md.stream.stats().lastReusedChars)
    expect(next?.dirtyRangeChars).toBe(md.stream.stats().lastDirtyRangeChars)
    expect(next?.shiftedTokenCount).toBe(md.stream.stats().lastShiftedTokenCount)
  })

  it('coalesces short hard-boundary blocks by default', () => {
    const md = markdownit()
    const parser = makeParser(md)
    let src = ''
    for (let i = 0; i < 600; i++) {
      src += `short paragraph ${i}\n\n`
    }

    parser.parse(src, {}, md)

    const chunks = (parser as any).table.getChunks()
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.length).toBeLessThan(20)
    expect(chunks.length).toBeLessThan(detectHardBoundaries(src).length)
  })

  it('invalidates cache after direct ruler changes', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = '| a | b |\n| --- | --- |\n| c | d |\n'

    const before = md.renderer.render(md.stream.parse(src, {}), md.options, {})
    expect(before).toContain('<table>')

    md.block.ruler.disable(['table'])

    const after = md.renderer.render(md.stream.parse(src, {}), md.options, {})
    expect(after).not.toContain('<table>')
    expect(md.stream.stats().invalidations).toBeGreaterThan(0)
  })

  it('does not skip direct ruler env side effects when chunk cache is enabled', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })

    md.core.ruler.push('collect_blocks', (state) => {
      state.env.collectCount = (state.env.collectCount || 0) + 1
    })

    const src = largeDoc(200)
    const env1: Record<string, any> = {}
    const env2: Record<string, any> = {}

    md.stream.parse(src, env1)
    md.stream.parse(src, env2)

    expect(env1.collectCount).toBeDefined()
    expect(env2.collectCount).toBeDefined()
    expect(md.stream.stats().lastMode).toBe('full')
  })

  it('direct CachedStreamParser falls back after a custom rule is pushed over existing chunks', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = largeDoc(240)
    const env1: Record<string, any> = {}
    const env2: Record<string, any> = {}

    parser.parse(src, env1, md)
    md.core.ruler.push('collect_after_cache', (state) => {
      state.env.collectCount = (state.env.collectCount || 0) + 1
    })

    const modified = src.replace('Paragraph 120 with some', 'ModifiedP 120 with some')
    parser.parse(modified, env2, md)

    expect(env2.collectCount).toBeDefined()
    expect(parser.getStats().lastMode).toBe('full')
    expect(parser.getStats().chunkHits).toBe(0)
  })

  it('does not hide direct ruler env side effects behind a later safe rule change', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })

    md.core.ruler.push('collect_before_first_parse', (state) => {
      state.env.collectCount = (state.env.collectCount || 0) + 1
    })
    md.disable('table')

    const src = largeDoc(200)
    const env1: Record<string, any> = {}
    const env2: Record<string, any> = {}

    md.stream.parse(src, env1)
    md.stream.parse(src.replace('Paragraph 120 with some', 'ModifiedP 120 with some'), env2)

    expect(env1.collectCount).toBeDefined()
    expect(env2.collectCount).toBeDefined()
    expect(md.stream.stats().lastMode).toBe('full')
  })

  it('direct CachedStreamParser is conservative when rules existed before construction', () => {
    const md = markdownit()
    md.core.ruler.push('env_side_effect_before_constructor', (state) => {
      state.env.hit = (state.env.hit || 0) + 1
    })

    const parser = new CachedStreamParser((md as any).core as ParserCore)
    const src = largeDoc(200)
    const env1: Record<string, any> = {}
    const env2: Record<string, any> = {}

    parser.parse(src, env1, md)
    parser.parse(src, env2, md)

    expect(env1.hit).toBeDefined()
    expect(env2.hit).toBeDefined()
    expect(parser.getStats().lastMode).toBe('full')
  })

  it('keeps same-source cache when plugin fallback is active in direct parser', () => {
    const md = markdownit()
    md.core.ruler.push('plugin_side_effect_before_constructor', (state) => {
      state.env.hit = (state.env.hit || 0) + 1
    })

    const parser = new CachedStreamParser((md as any).core as ParserCore)
    const src = largeDoc(120)
    const env: Record<string, any> = {}

    const tokens1 = parser.parse(src, env, md)
    parser.resetStats()
    const tokens2 = parser.parse(src, env, md)

    expect(tokens2).toBe(tokens1)
    expect(env.hit).toBe(1)
    expect(parser.getStats().cacheHits).toBe(1)
    expect(parser.getStats().lastMode).toBe('cache')
    expect(getParseDiagnostics(env)?.chunkCache?.path).toBe('identity')
  })
})

// ---------------------------------------------------------------------------
// P0-2: Token.map offsets do not accumulate across repeated reuse
// ---------------------------------------------------------------------------

describe('Line map correctness (P0-2)', () => {
  it('does not accumulate token.map offsets after repeated reuse', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const env = {}

    const src1 = largeDoc(100)
    const t1 = parser.parse(src1, env, md)

    // Same doc again — should produce same map values
    const t2 = parser.parse(src1, env, md)
    for (let i = 0; i < t1.length; i++) {
      const a = t1[i]
      const b = t2[i]
      if (a.map && b.map) {
        expect(b.map[0]).toBe(a.map[0])
        expect(b.map[1]).toBe(a.map[1])
      }
    }
    expect(t2).toBe(t1) // same-source cache hit is identity
  })

  it('reuses duplicate-content chunks without sharing mutable token objects', () => {
    const parser = makeParser()
    const src = largeDoc(200)

    const tokens1 = parser.parse(src, {}, markdownit())

    // Modify a later paragraph so the early chunks should be cached hits
    const modified = src.replace('Paragraph 180 with some', 'ModifiedP 180 with some')
    const tokens2 = parser.parse(modified, {}, markdownit())

    // Find tokens from early paragraphs in both outputs.
    // They should be different objects (not shared references through cache).
    const findPara = (tokens: TokenType[], text: string): TokenType | null => {
      for (const t of tokens) {
        if (t.type === 'inline' && t.content?.includes(text)) return t
      }
      return null
    }

    const t1 = findPara(tokens1, 'Paragraph 10 with')
    const t2 = findPara(tokens2, 'Paragraph 10 with')

    expect(t1).not.toBeNull()
    expect(t2).not.toBeNull()
    // They should be different objects (cloned on materialization)
    expect(t2).not.toBe(t1)
  })

  it('keeps duplicate shifted chunk line maps aligned with full parse', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const duplicate = 'same paragraph with enough filler text to form a repeated chunk.\n\n'
    const src = `${largeDoc(80)}${duplicate}${duplicate}${largeDoc(80)}`

    parser.parse(src, {}, md)

    const shifted = `inserted before repeated paragraphs.\n\n${src}`
    const tokens = parser.parse(shifted, {}, md)
    const expected = md.parse(shifted, {})
    const collect = (items: TokenType[]) => items.filter(t => t.type === 'inline' && t.content === duplicate.trim())
    const actualDuplicates = collect(tokens)
    const expectedDuplicates = collect(expected)

    expect(actualDuplicates.length).toBe(2)
    expect(expectedDuplicates.length).toBe(2)
    expect(actualDuplicates.map(t => t.map)).toEqual(expectedDuplicates.map(t => t.map))
    expect(actualDuplicates[0]).not.toBe(actualDuplicates[1])
    expect(md.renderer.render(tokens, md.options, {})).toBe(render(shifted))
  })

  it('reuses repeated moved chunks without corrupting line maps', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const env = {}
    const makeChunk = (label: string) => `${label} ${'filler '.repeat(700)}\n\n`
    const repeated = `repeat paragraph with *emphasis* ${'stable '.repeat(700)}\n\n`
    const src = `${makeChunk('A')}${repeated}${makeChunk('B')}${repeated}${makeChunk('C')}`

    parser.parse(src, env, md)

    const modified = `${makeChunk('A')}${makeChunk('inserted')}${repeated}${makeChunk('B')}${repeated}${makeChunk('C')}`
    const tokens = parser.parse(modified, env, md)
    const expected = md.parse(modified, {})
    const collect = (items: TokenType[]) => items.filter(t => t.type === 'inline' && t.content?.startsWith('repeat paragraph with'))
    const actualDuplicates = collect(tokens)
    const expectedDuplicates = collect(expected)

    expect(actualDuplicates.length).toBe(2)
    expect(actualDuplicates.map(t => t.map)).toEqual(expectedDuplicates.map(t => t.map))
    expect(actualDuplicates[0].map).not.toEqual(actualDuplicates[1].map)
    expect(md.renderer.render(tokens, md.options, {})).toBe(render(modified))
    expect(parser.getStats().chunkHits).toBeGreaterThan(0)
  })

  it('handles edit before cached chunk and shifts downstream line maps correctly', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = largeDoc(200)

    parser.parse(src, {}, md)

    // Prepend content: moves all downstream lines up
    const prepended = 'Prepended line.\n\n' + src
    const tokens = parser.parse(prepended, {}, md)
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(prepended))
  })

  it('keeps chunk metadata current after shifted-content reuse before append', () => {
    const md = markdownit()
    const parser = makeParser(md)

    const src = largeDoc(200)
    parser.parse(src, {}, md)

    const shifted = 'prepended\n\n' + src
    parser.parse(shifted, {}, md)

    const appended = `${shifted}tail paragraph\n\n`
    const tokens = parser.parse(appended, {}, md)
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(render(appended))
  })

  it('stores cached token maps in chunk-local coordinates', () => {
    const md = markdownit()
    const parser = makeParser(md)

    parser.parse(largeDoc(200), {}, md)
    const chunks = (parser as any).table.getChunks()

    expect(chunks.length).toBeGreaterThan(0)
    for (const chunk of chunks) {
      for (const token of chunk.tokens) {
        if (!token.map)
          continue
        expect(token.map[0]).toBeGreaterThanOrEqual(0)
        expect(token.map[0]).toBeLessThan(chunk.lineCount)
        expect(token.map[1]).toBeLessThanOrEqual(chunk.lineCount)
      }
    }
  })

  it('stores correct lineCount for final chunk without trailing newline', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = `${largeDoc(120)}final paragraph without trailing newline`

    parser.parse(src, {}, md)
    const chunks = (parser as any).table.getChunks()
    const last = chunks[chunks.length - 1]

    expect(last.sourceText).toContain('final paragraph without trailing newline')
    expect(last.lineCount).toBeGreaterThanOrEqual(1)
    for (const token of last.tokens) {
      if (token.map)
        expect(token.map[1]).toBeLessThanOrEqual(last.lineCount)
    }
  })
})

// ---------------------------------------------------------------------------
// P0-3: Global markdown state
// ---------------------------------------------------------------------------

describe('Global markdown state fallback (P0-3)', () => {
  it('same-source cache works for reference-definition documents with stable env', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = '[ref]: /url\n\n[ref]\n'
    const env: Record<string, any> = {}

    const tokens1 = parser.parse(src, env, md)
    const tokens2 = parser.parse(src, env, md)

    expect(tokens2).toBe(tokens1)
    expect(env.references).toBeDefined()
    expect(parser.getStats().cacheHits).toBe(1)
    expect(parser.getStats().lastMode).toBe('cache')
  })

  it('same-source cache misses for global-state documents with a new env', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = '[ref]: /url\n\n[ref]\n'
    const env1: Record<string, any> = {}
    const env2: Record<string, any> = {}

    parser.parse(src, env1, md)
    parser.parse(src, env2, md)

    expect(env1.references).toBeDefined()
    expect(env2.references).toBeDefined()
    expect(parser.getStats().cacheHits).toBe(0)
    expect(parser.getStats().lastMode).toBe('full')
  })

  it('falls back to full parse when reference definition is present', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = '[ref]: /url\n\nText with [ref][]\n'

    md.stream.parse(src, {})
    const stats = md.stream.stats()
    expect(stats.lastMode).toBe('full')
  })

  it('reports the concrete chunk cache fallback reason for global state', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = `[ref]: /url\n\n${largeDoc(20)}Text with [ref][]\n\n`
    const env: Record<string, unknown> = {}

    md.stream.parse(src, env)

    expect(getParseDiagnostics(env)?.chunkCache).toMatchObject({
      path: 'fallback-full',
      enabled: false,
      fallback: true,
      fallbackReason: 'reference-definition',
    })
  })

  it('falls back to full parse when reference definition is added to previously clean doc', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const cleanSrc = 'Just some text.\n\nMore text.\n'

    md.stream.parse(cleanSrc, {})

    // Now add a reference definition
    const srcWithRef = '[ref]: /url\n\n' + cleanSrc
    md.stream.parse(srcWithRef, {})
    const stats = md.stream.stats()
    expect(stats.lastMode).toBe('full')
  })

  it('falls back when an appended reference definition affects earlier text', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const cleanSrc = `[foo][x]\n\n${largeDoc(120)}`
    const withRef = `${cleanSrc}[x]: https://example.com\n`

    md.stream.parse(cleanSrc, {})

    const tokens = md.stream.parse(withRef, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(renderBaseline(withRef, md.options))
    expect(html).toContain('<a href="https://example.com">foo</a>')
    expect(md.stream.stats().lastMode).toBe('full')
  })

  it('handles footnote definition', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = '[^1]: footnote definition\n\nText with [^1]\n'

    md.stream.parse(src, {})
    const stats = md.stream.stats()
    expect(stats.lastMode).toBe('full')
  })

  it('handles abbreviation definition', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    // The detectGlobalMarkdownState pattern already catches *[text]: syntax
    const src = '*[HTML]: Hyper Text Markup Language\n\nUsing HTML is fun.\n'

    md.stream.parse(src, {})
    const stats = md.stream.stats()
    // Should fall back because global state includes abbr definitions
    expect(stats.lastMode).toBe('full')
  })

  it('clears reference env state when a reused env parses a clean document', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const env: Record<string, unknown> = {}
    const refSrc = '[ref]: /url\n\n[ref]\n'
    const cleanSrc = '[ref]\n'

    md.stream.parse(refSrc, env)
    const tokens = md.stream.parse(cleanSrc, env)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(markdownit().render(cleanSrc))
  })

  it('does not reuse same-source cache across explicit env objects', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = '[x]: /url\n\n[x]\n'
    const env1: Record<string, any> = {}
    const env2: Record<string, any> = {}

    md.stream.parse(src, env1)
    md.stream.parse(src, env2)

    expect(env1.references).toBeDefined()
    expect(env2.references).toBeDefined()
    expect(md.stream.stats().lastMode).toBe('full')
  })
})

// ---------------------------------------------------------------------------
// P0-4: Env sensitivity
// ---------------------------------------------------------------------------

describe('Env sensitivity (P0-4)', () => {
  it('does not share cached chunks across different env objects', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = largeDoc(200)

    const env1 = {}
    const env2 = {}

    const t1 = parser.parse(src, env1, md)
    const t2 = parser.parse(src, env2, md)

    // Both should produce correct output
    const h1 = md.renderer.render(t1, md.options, env1)
    const h2 = md.renderer.render(t2, md.options, env2)
    expect(h1).toBe(h2)
    expect(h1).toBe(render(src))
  })

  it('invalidates chunk cache when the explicit env object changes', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = largeDoc(200)
    const modified = src.replace('Paragraph 150 with some', 'ModifiedP 150 with some')
    const env1: Record<string, unknown> = { marker: 'A' }
    const env2: Record<string, unknown> = { marker: 'B' }

    parser.parse(src, env1, md)
    parser.resetStats()
    parser.parse(modified, env2, md)

    expect(parser.getStats().invalidations).toBe(1)
    expect(parser.getStats().chunkHits).toBe(0)
    expect(parser.getStats().appendHits).toBe(0)
  })

  it('does not take the append path across different env objects', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = largeDoc(200)
    const appended = `${src}Appended with different env.\n\n`
    const env1: Record<string, unknown> = {}
    const env2: Record<string, unknown> = {}

    parser.parse(src, env1, md)
    parser.resetStats()
    parser.parse(appended, env2, md)

    expect(parser.getStats().invalidations).toBe(1)
    expect(parser.getStats().appendHits).toBe(0)
    expect(parser.getStats().chunkHits).toBe(0)
  })

  it('disables chunk cache when a plugin is registered before first stream parse', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    md.use((md) => {
      md.core.ruler.push('test_env_side_effect', (state) => {
        state.env.pluginRan = true
      })
    })

    const env: Record<string, unknown> = {}
    const tokens = md.stream.parse(largeDoc(200), env)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(renderFull(largeDoc(200), md))
    expect(env.pluginRan).toBe(true)
    expect(md.stream.stats().lastMode).toBe('full')
  })
})

// ---------------------------------------------------------------------------
// P0-5: Content fingerprint verification
// ---------------------------------------------------------------------------

describe('Content fingerprint (P0-5)', () => {
  it('detects content change by length mismatch', () => {
    const table = new ChunkTable()
    const src = 'hello world'
    const fp = computeContentFingerprint(src, 0, src.length)

    table.store({
      startOffset: 0, endOffset: src.length,
      startLine: 0, lineCount: 1,
      sourceText: src,
      fingerprint: fp,
      tokens: [],
      generation: table.currentGeneration,
      charLength: fp.length,
      tokenWeight: 0,
    })

    // Lookup with shorter content
    const hit = table.lookup({ start: 0, end: 'short'.length, startLine: 0, lineCount: 1 }, 'short')
    expect(hit).toBeNull()
  })

  it('detects content change by first/last char mismatch', () => {
    const table = new ChunkTable()
    // Two strings with same length and potentially colliding hash but different content.
    // We construct them carefully: same length, different first/last chars.
    const src1 = 'abcdefghijklmnopqrstuvwxyz01'
    const src2 = 'zbcdefghijklmnopqrstuvwxyz01' // different first char, same rest

    const fp = computeContentFingerprint(src1, 0, src1.length)

    table.store({
      startOffset: 0, endOffset: src1.length,
      startLine: 0, lineCount: 1,
      sourceText: src1,
      fingerprint: fp,
      tokens: [],
      generation: table.currentGeneration,
      charLength: fp.length,
      tokenWeight: 0,
    })

    // Hash might not collide, but fingerprint check covers all factors.
    const hit = table.lookup({ start: 0, end: src2.length, startLine: 0, lineCount: 1 }, src2)
    // Should be null if first/last differ even if hash somehow collided
    expect(hit).toBeNull()
  })

  it('rejects matching fingerprint metadata without exact source match', () => {
    const table = new ChunkTable()
    const src1 = 'same length original'
    const src2 = 'same length modified'
    const fp = computeContentFingerprint(src2, 0, src2.length)

    table.store({
      startOffset: 0, endOffset: src2.length,
      startLine: 0, lineCount: 1,
      sourceText: src1,
      fingerprint: fp,
      tokens: [],
      generation: table.currentGeneration,
      charLength: fp.length,
      tokenWeight: 0,
    })

    expect(table.lookup({ start: 0, end: src2.length, startLine: 0, lineCount: 1 }, src2)).toBeNull()
  })

  it('generation mismatch invalidates chunk', () => {
    const table = new ChunkTable()
    const src = 'hello'
    const fp = computeContentFingerprint(src, 0, src.length)

    table.store({
      startOffset: 0, endOffset: src.length,
      startLine: 0, lineCount: 1,
      sourceText: src,
      fingerprint: fp,
      tokens: [],
      generation: table.currentGeneration,
      charLength: fp.length,
      tokenWeight: 0,
    })

    // Bump generation
    table.invalidateAll()

    const hit = table.lookup({ start: 0, end: src.length, startLine: 0, lineCount: 1 }, src)
    expect(hit).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// P0-6: Hard boundary detection for setext, tables
// ---------------------------------------------------------------------------

describe('Hard boundary detection (P0-6)', () => {
  it('does not split setext headings', () => {
    const src = 'Heading\n=======\n\nAfter heading\n'
    const boundaries = detectHardBoundaries(src)
    // The blank line between 'Heading' and '=======' should NOT be a hard boundary
    // because '=======' is the setext underline.
    // But there's no blank line there... Let me construct correctly.
    // Actually setext heading: "Heading\\n=======\\n" — no blank line between them.
    // The blank line AFTER the setext underline should be a boundary.
    expect(boundaries.length).toBeGreaterThanOrEqual(1)
    // The boundary should be after the setext heading, not before.
    for (const b of boundaries) {
      // The offset should not be between 'Heading\n' and '=======\n'
      const afterHeading = src.indexOf('\n') + 1
      const afterSetext = src.indexOf('\n', afterHeading) + 1
      expect(b.offset).not.toBe(afterHeading) // not between heading and underline
    }
  })

  it('does not skip setext underline detection', () => {
    // The setext underline (all '='s or all '-'s) should NOT be treated as
    // a list item by classifyLine.
    const src = 'Title\n-------\n\nBody\n'
    const boundaries = detectHardBoundaries(src)
    // The boundary should be after '-------\n', not before.
    expect(boundaries.length).toBeGreaterThanOrEqual(1)
    for (const b of boundaries) {
      expect(b.offset).not.toBe(src.indexOf('\n') + 1) // not after "Title\n"
    }
  })

  it('recognizes table rows and prevents splitting inside tables', () => {
    const src = '| a | b |\n| --- | --- |\n| c | d |\n\nafter table\n'
    const boundaries = detectHardBoundaries(src)
    // The blank line AFTER the table should be a boundary.
    // Blank lines INSIDE the table (none here) should not be split.
    // There's no blank line inside the table, so boundaries should include
    // the one after the table.
    expect(boundaries.length).toBeGreaterThanOrEqual(1)
  })

  it('handles blockquote continuation across blank lines', () => {
    const src = '> line 1\n\n> line 2\n'
    const boundaries = detectHardBoundaries(src)
    // Blank line inside blockquote = soft boundary, not hard.
    expect(boundaries.length).toBe(0)
  })

  it('handles list continuation across blank lines (loose list)', () => {
    const src = '- item 1\n\n- item 2\n'
    const boundaries = detectHardBoundaries(src)
    // Blank line inside list = soft boundary.
    expect(boundaries.length).toBe(0)
  })

  it('handles tight list transition', () => {
    const src = '- item 1\n- item 2\n\nafter list\n'
    const boundaries = detectHardBoundaries(src)
    // Blank line AFTER the list is a hard boundary.
    expect(boundaries.length).toBeGreaterThanOrEqual(1)
  })

  it('fenced block spanning would-be chunk boundary does not split inside fence', () => {
    const src = '```\n\ncode content\n\nstill code\n```\n\nafter fence\n'
    const boundaries = detectHardBoundaries(src)
    // Blank lines inside fence are NOT hard boundaries.
    // Blank line after ``` (closing) IS a hard boundary.
    expect(boundaries.length).toBeGreaterThanOrEqual(1)
    for (const b of boundaries) {
      // Boundaries should be outside the fence region
      const inFence = src.indexOf('still code') > 0 && b.offset > src.indexOf('```\n') + 4 && b.offset < src.indexOf('\n```')
      if (inFence) {
        // This boundary is inside the fence — should not happen
        expect(b.offset).toBe(-1)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// P0-7: Dirty range neighbor expansion
// ---------------------------------------------------------------------------

describe('Dirty range expansion (P0-7)', () => {
  it('expands dirty chunk set to include neighbors on edit', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const env = {}

    const src = largeDoc(200)
    parser.parse(src, env, md)

    // Same-length middle edit — offsets stay stable so cached chunks can be found.
    const modified = src.replace('Paragraph 80 with some', 'ModifiedP 80 with some')
    parser.parse(modified, env, md)
    const stats = parser.getStats()

    // Middle chunk + its neighbors become dirty, but far-away chunks are clean.
    // With 200 paragraphs and many chunks, at least some should be cache hits.
    expect(stats.chunkHits).toBeGreaterThan(0)
  })

  it('keeps table body edits equivalent to full parse', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const env = {}
    const src = `${largeDoc(220)}| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |\n\n${largeDoc(220)}`

    parser.parse(src, env, md)

    const modified = src.replace('| 3 | 4 |', '| 30 | 40 |')
    const tokens = parser.parse(modified, env, md)
    const html = md.renderer.render(tokens, md.options, env)

    expect(html).toBe(render(modified))
    expect(parser.getStats().chunkHits).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// P0-9: Memory limits
// ---------------------------------------------------------------------------

describe('ChunkTable memory limits (P0-9)', () => {
  it('evicts least-recently-used chunks when maxChunks exceeded', () => {
    const table = new ChunkTable({ maxChunks: 3 })

    for (let i = 0; i < 10; i++) {
      const content = `chunk-${i}-content-here-with-some-more-text`
      table.store({
        startOffset: i * 100,
        endOffset: i * 100 + content.length,
        startLine: i * 2,
        lineCount: 2,
        sourceText: content,
        fingerprint: computeContentFingerprint(content, 0, content.length),
        tokens: [],
        generation: table.currentGeneration,
        charLength: content.length,
        tokenWeight: 0,
      })
    }

    expect(table.size).toBeLessThanOrEqual(3)
    expect(table.evictions).toBeGreaterThan(0)
  })

  it('evicts least-recently-used chunks when maxTotalChars exceeded', () => {
    const table = new ChunkTable({ maxTotalChars: 200, maxChunks: 100 })

    for (let i = 0; i < 20; i++) {
      const content = `chunk-${i}-content` // ~15 chars each
      table.store({
        startOffset: i * 100,
        endOffset: i * 100 + content.length,
        startLine: i * 2,
        lineCount: 2,
        sourceText: content,
        fingerprint: computeContentFingerprint(content, 0, content.length),
        tokens: [],
        generation: table.currentGeneration,
        charLength: content.length,
        tokenWeight: 0,
      })
    }

    expect(table.totalCharCount).toBeLessThanOrEqual(200)
  })

  it('accounts for recursive inline token weight when enforcing maxTotalTokens', () => {
    const md = markdownit({ linkify: true })
    const typedMd = md as any
    const parser = new CachedStreamParser(typedMd.core as ParserCore, { maxTotalTokens: 80 }, {
      core: typedMd.core.ruler.version,
      block: typedMd.block.ruler.version,
      inline: typedMd.inline.ruler.version,
      inline2: typedMd.inline.ruler2.version,
    })
    let src = ''
    for (let i = 0; i < 160; i++) {
      src += `Paragraph ${i} with [a link](https://example.com/${i}) and **strong text** repeated for weight.\n\n`
    }
    const env: Record<string, unknown> = {}

    parser.parse(src, env, md)

    expect(getParseDiagnostics(env)?.chunkCache?.totalCachedTokenWeight).toBeLessThanOrEqual(80)
  })
})

// ---------------------------------------------------------------------------
// Append correctness: deterministic test cases covering all container types
// ---------------------------------------------------------------------------

describe('Append correctness with containers', () => {
  it('produces correct output when appending lists to a chunked document', () => {
    const md = markdownit()
    const parser = makeParser(md)

    // Start with a large document to ensure chunking activates
    let src = largeDoc(100)
    parser.parse(src, {}, md)

    // Append a list and a paragraph
    src += '- item A\n- item B\n  - nested\n\n'
    src += 'Follow-up paragraph.\n'

    const tokens = parser.parse(src, {}, md)
    const actual = md.renderer.render(tokens, md.options, {})
    const expected = render(src)
    expect(actual).toBe(expected)
  })

  it('produces correct output when appending blockquotes to a chunked document', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = largeDoc(100)
    parser.parse(src, {}, md)

    src += '> A blockquote line\n> continues here\n\n'
    src += 'After blockquote.\n'

    const tokens = parser.parse(src, {}, md)
    const actual = md.renderer.render(tokens, md.options, {})
    const expected = render(src)
    expect(actual).toBe(expected)
  })

  it('produces correct output when appending fenced code blocks', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = largeDoc(100)
    parser.parse(src, {}, md)

    src += '```\nfenced\ncode\nblock\n```\n\n'
    src += 'After fence.\n'

    const tokens = parser.parse(src, {}, md)
    const actual = md.renderer.render(tokens, md.options, {})
    const expected = render(src)
    expect(actual).toBe(expected)
  })

  it('produces correct output when appending tables', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = largeDoc(100)
    parser.parse(src, {}, md)

    src += '| a | b |\n|---|---|\n| 1 | 2 |\n\n'
    src += 'After table.\n'

    const tokens = parser.parse(src, {}, md)
    const actual = md.renderer.render(tokens, md.options, {})
    const expected = render(src)
    expect(actual).toBe(expected)
  })

  it('produces correct output when appending headings to a chunked document', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = largeDoc(100)
    parser.parse(src, {}, md)

    src += '# Appended heading\n\n'
    src += 'Content after heading.\n'

    const tokens = parser.parse(src, {}, md)
    const actual = md.renderer.render(tokens, md.options, {})
    const expected = render(src)
    expect(actual).toBe(expected)
  })

  it('handles multiple consecutive appends with mixed element types', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = largeDoc(100)
    parser.parse(src, {}, md)

    const appends = [
      '# Title\n\n',
      '- item 1\n- item 2\n  - sub\n\n',
      '> blockquote\n\n',
      '```\ncode\n```\n\n',
      '| x | y |\n|---|---|\n| a | b |\n\n',
      'Final paragraph.\n',
    ]

    for (const a of appends) {
      src += a
      const tokens = parser.parse(src, {}, md)
      const actual = md.renderer.render(tokens, md.options, {})
      const expected = render(src)
      expect(actual).toBe(expected)
    }
  })
})

describe('streamChunkCache integration with StreamParser append paths', () => {
  const cases = [
    ['tight list', '- item A\n- item B\n\n'],
    ['loose list', '- item A\n\n- item B\n\n'],
    ['table', '| a | b |\n|---|---|\n| 1 | 2 |\n\n'],
    ['blockquote', '> quote line\n>\n> next line\n\n'],
  ] as const

  for (const [name, append] of cases) {
    it(`keeps append parity for ${name}`, () => {
      const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
      const src = largeDoc(120)
      const next = src + append
      const env = {}

      md.stream.parse(src, env)
      const tokens = md.stream.parse(next, env)
      const html = md.renderer.render(tokens, md.options, env)
      const stats = md.stream.stats()

      expect(html).toBe(renderBaseline(next, md.options))
      expect(stats.lastMode).toBe('append')
      expect(stats.appendHits).toBeGreaterThan(0)
    })
  }
})

// ---------------------------------------------------------------------------
// materializeCachedTokens utility
// ---------------------------------------------------------------------------

describe('materializeCachedTokens', () => {
  it('clones and shifts tokens, leaving cached tokens unmodified', () => {
    const src = 'hello world'
    const fp = computeContentFingerprint(src, 0, src.length)

    // Create a simple token with a map
    const original = new Token('paragraph_open', 'p', 1)
    original.map = [0, 1]
    original.children = [
      new Token('inline', '', 0),
    ]
    original.children[0].map = [0, 1]

    const cached = {
      startOffset: 0,
      endOffset: src.length,
      startLine: 0,
      lineCount: 1,
      sourceText: src,
      fingerprint: fp,
      tokens: [original],
      generation: 0,
      charLength: fp.length,
      tokenWeight: 2, // paragraph_open + inline
    }

    const materialized = materializeCachedTokens(cached, 10)

    // Materialized tokens should have shifted maps
    expect(materialized[0].map).toEqual([10, 11])
    expect(materialized[0].children![0].map).toEqual([10, 11])

    // Original cached tokens should have unchanged maps
    expect(original.map).toEqual([0, 1])
    expect(original.children![0].map).toEqual([0, 1])

    // Materialized should be different objects
    expect(materialized[0]).not.toBe(original)
  })
})
