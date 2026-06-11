import { describe, expect, it } from 'vitest'
import {
  ChunkTable,
  CachedStreamParser,
  computeContentFingerprint,
  detectHardBoundaries,
  materializeCachedTokens,
} from '../../src/experimental'
import markdownit from '../../src/index'
import { ParserCore } from '../../src/parse/parser_core'
import { Token } from '../../src/common/token'
import type { Token as TokenType } from '../../src/common/token'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function render(src: string, md = markdownit()) {
  return md.render(src)
}

function makeParser(md = markdownit()) {
  return new CachedStreamParser((md as any).core as ParserCore)
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
    expect(html).toBe(render(src, md))
    expect(html).toContain('<div>raw html</div>')
  })

  it('invalidates cache after md.set({ linkify: true })', () => {
    const md = markdownit({ stream: true, linkify: false, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}Visit https://example.com now.\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ linkify: true })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(render(src, md))
    expect(html).toContain('<a href="https://example.com">https://example.com</a>')
  })

  it('invalidates cache after md.set({ breaks: true })', () => {
    const md = markdownit({ stream: true, breaks: false, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}soft\nbreak\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ breaks: true })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(render(src, md))
    expect(html).toContain('<br>')
  })

  it('invalidates cache after md.set({ typographer: true })', () => {
    const md = markdownit({ stream: true, typographer: false, experimental: { streamChunkCache: true } })
    const src = `${largeDoc(120)}(c) -- test\n\n${largeDoc(80)}`

    md.stream.parse(src, {})
    md.set({ typographer: true })

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(render(src, md))
    expect(html).not.toContain('(c)')
  })

  it('invalidates cache after md.enable()', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = largeDoc(200)

    md.stream.parse(src, {})

    // Enable table rule (changes parser behavior)
    md.enable('table')

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src, md))
  })

  it('invalidates cache after md.disable()', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = largeDoc(200)

    md.stream.parse(src, {})

    md.disable('linkify')

    const tokens = md.stream.parse(src, {})
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src, md))
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
    expect(html).toBe(render(src, md))

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

    expect(html).toBe(render(src, md))
    expect(env.pluginRan).toBe(true)
    expect(md.stream.stats().lastMode).toBe('full')
  })

  it('uses cached stream parser after enabling streamChunkCache with md.set()', () => {
    const md = markdownit({ stream: true })

    md.stream.parse('initial\n', {})
    md.set({ experimental: { streamChunkCache: true } })
    md.stream.parse(largeDoc(200), {})

    expect(md.stream.stats().lastMode).toBe('chunked')
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
  it('falls back to full parse when reference definition is present', () => {
    const md = markdownit({ stream: true, experimental: { streamChunkCache: true } })
    const src = '[ref]: /url\n\nText with [ref][]\n'

    md.stream.parse(src, {})
    const stats = md.stream.stats()
    expect(stats.lastMode).toBe('full')
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

    expect(html).toBe(render(largeDoc(200), md))
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
      tokenCount: 0,
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
      tokenCount: 0,
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
      tokenCount: 0,
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
      tokenCount: 0,
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

    const src = largeDoc(200)
    parser.parse(src, {}, md)

    // Same-length middle edit — offsets stay stable so cached chunks can be found.
    const modified = src.replace('Paragraph 80 with some', 'ModifiedP 80 with some')
    parser.parse(modified, {}, md)
    const stats = parser.getStats()

    // Middle chunk + its neighbors become dirty, but far-away chunks are clean.
    // With 200 paragraphs and many chunks, at least some should be cache hits.
    expect(stats.chunkHits).toBeGreaterThan(0)
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
        tokenCount: 0,
      })
    }

    expect(table.size).toBeLessThanOrEqual(3)
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
        tokenCount: 0,
      })
    }

    expect(table.totalCharCount).toBeLessThanOrEqual(200)
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

      md.stream.parse(src, {})
      const tokens = md.stream.parse(next, {})
      const html = md.renderer.render(tokens, md.options, {})
      const stats = md.stream.stats()

      expect(html).toBe(render(next, md))
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
      tokenCount: 2, // paragraph_open + inline
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
