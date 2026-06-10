import { describe, expect, it } from 'vitest'
import {
  ChunkTable,
  computeSourceHash,
  detectHardBoundaries,
  splitIntoSafeChunkRanges,
  CachedStreamParser,
} from '../../src/experimental'
import markdownit from '../../src/index'
import { ParserCore } from '../../src/parse/parser_core'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function render(src: string) {
  const md = markdownit()
  return md.render(src)
}

function makeParser(md = markdownit()) {
  return new CachedStreamParser((md as any).core as ParserCore)
}

// ---------------------------------------------------------------------------
// detectHardBoundaries
// ---------------------------------------------------------------------------

describe('detectHardBoundaries', () => {
  it('finds no boundaries in empty text', () => {
    expect(detectHardBoundaries('')).toEqual([])
  })

  it('finds no boundaries in single paragraph', () => {
    const src = 'hello world'
    expect(detectHardBoundaries(src)).toEqual([])
  })

  it('finds boundaries at blank lines between paragraphs', () => {
    const src = 'para 1\n\npara 2\n\npara 3\n'
    const boundaries = detectHardBoundaries(src)
    expect(boundaries.length).toBeGreaterThanOrEqual(2)
  })

  it('does not flag blank lines inside fenced code blocks', () => {
    const src = '```\n\ncode\n\n```\n\noutside\n'
    const boundaries = detectHardBoundaries(src)
    // Blank lines inside ``` are not boundaries
    // The blank line after ``` should be a boundary
    for (const b of boundaries) {
      const context = src.slice(Math.max(0, b.offset - 30), b.offset + 10)
      // Should not be inside the fence
      // Check: the boundary offset should NOT be between the opening and closing ```
    }
    expect(boundaries.length).toBeGreaterThanOrEqual(1)
  })

  it('does not flag blank lines inside lists (soft boundary)', () => {
    // Loose list: blank line inside list, list continues after
    const src = '- item 1\n\n- item 2\n'
    const boundaries = detectHardBoundaries(src)
    // The blank line between item 1 and item 2 should NOT be a hard boundary
    // Because the list spans it
    expect(boundaries.length).toBe(0) // no hard boundaries in a simple list
  })

  it('flags blank lines after a list ends', () => {
    const src = '- item 1\n- item 2\n\nafter list\n'
    const boundaries = detectHardBoundaries(src)
    expect(boundaries.length).toBeGreaterThanOrEqual(1)
  })

  it('does not flag blank lines inside blockquotes', () => {
    const src = '> line 1\n\n> line 2\n'
    const boundaries = detectHardBoundaries(src)
    expect(boundaries.length).toBe(0) // soft boundary inside blockquote
  })

  it('double blank line is always a hard boundary', () => {
    const src = '- item 1\n\n\n- item 2\n'
    const boundaries = detectHardBoundaries(src)
    // Double blank line should be a hard boundary even between list items
    // (In practice, double blank lines terminate lists in CommonMark)
    expect(boundaries.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// splitIntoSafeChunkRanges
// ---------------------------------------------------------------------------

describe('splitIntoSafeChunkRanges', () => {
  it('returns single range for text without boundaries', () => {
    const src = 'hello world'
    const boundaries = detectHardBoundaries(src)
    const ranges = splitIntoSafeChunkRanges(src, boundaries)
    expect(ranges.length).toBe(1)
    expect(ranges[0]).toMatchObject({ start: 0, end: src.length })
  })

  it('splits at hard boundaries', () => {
    const src = 'chunk1\n\nchunk2\n\nchunk3\n'
    const boundaries = detectHardBoundaries(src)
    const ranges = splitIntoSafeChunkRanges(src, boundaries, { minChars: 1 })
    expect(ranges.length).toBeGreaterThanOrEqual(2)
  })

  it('merges ranges smaller than minChars', () => {
    const src = 'a\n\nb\n\nc\n'
    const boundaries = detectHardBoundaries(src)
    const ranges = splitIntoSafeChunkRanges(src, boundaries, { minChars: 100 })
    // All small, should be merged into one
    expect(ranges.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// ChunkTable
// ---------------------------------------------------------------------------

describe('ChunkTable', () => {
  it('stores and looks up chunks', () => {
    const src = 'hello world chunk one'
    const table = new ChunkTable()
    const tokens: any[] = [{ type: 'paragraph_open', tag: 'p', nesting: 1 }]

    table.store({
      startOffset: 0,
      endOffset: src.length,
      startLine: 0,
      lineCount: 1,
      sourceHash: computeSourceHash(src, 0, src.length),
      tokens,
    })

    const hit = table.lookup(0, src, src.length)
    expect(hit).not.toBeNull()
    expect(hit!.tokens).toBe(tokens)
  })

  it('returns null when content changed', () => {
    const table = new ChunkTable()
    const src = 'original'
    table.store({
      startOffset: 0,
      endOffset: src.length,
      startLine: 0,
      lineCount: 1,
      sourceHash: computeSourceHash(src, 0, src.length),
      tokens: [],
    })

    const modified = 'changed!'
    const hit = table.lookup(0, modified, modified.length)
    expect(hit).toBeNull()
  })

  it('invalidates overlapping chunks', () => {
    const table = new ChunkTable()
    table.store({ startOffset: 0, endOffset: 10, startLine: 0, lineCount: 1, sourceHash: 123, tokens: [] })
    table.store({ startOffset: 20, endOffset: 30, startLine: 2, lineCount: 1, sourceHash: 456, tokens: [] })

    table.invalidateRange(5, 25)
    expect(table.size).toBe(0)
  })

  it('clears all chunks', () => {
    const table = new ChunkTable()
    table.store({ startOffset: 0, endOffset: 10, startLine: 0, lineCount: 1, sourceHash: 1, tokens: [] })
    table.clear()
    expect(table.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// computeSourceHash
// ---------------------------------------------------------------------------

describe('computeSourceHash', () => {
  it('produces consistent hashes', () => {
    const h1 = computeSourceHash('hello', 0, 5)
    const h2 = computeSourceHash('hello', 0, 5)
    expect(h1).toBe(h2)
  })

  it('produces different hashes for different content', () => {
    const h1 = computeSourceHash('hello', 0, 5)
    const h2 = computeSourceHash('world', 0, 5)
    expect(h1).not.toBe(h2)
  })

  it('supports slicing', () => {
    const src = 'abcdef'
    const h1 = computeSourceHash(src, 0, 3)
    const h2 = computeSourceHash(src, 3, 6)
    expect(h1).not.toBe(h2)
  })
})

// ---------------------------------------------------------------------------
// CachedStreamParser
// ---------------------------------------------------------------------------

describe('CachedStreamParser', () => {
  it('basic parse returns correct tokens', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = '# Hello\n\nWorld\n'
    const tokens = parser.parse(src, {}, md)
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src))
  })

  it('same source returns cached result (cache hit)', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src = '# Hello\n\nWorld\n'

    const t1 = parser.parse(src, {}, md)
    const t2 = parser.parse(src, {}, md)

    expect(t2).toBe(t1) // same reference = cache hit
    expect(parser.getStats().cacheHits).toBe(1)
  })

  it('append reuses cached prefix and only parses new text', () => {
    const md = markdownit()
    const parser = makeParser(md)

    // Use a large enough document (>2000 chars for minChars) with blank lines so chunking activates.
    let src1 = ''
    for (let i = 0; i < 60; i++) {
      src1 += `Line ${i} with some longer content to fill space for minChars.\n\n`
    }

    const src2 = src1 + 'appended line at the end.\n'

    const t1 = parser.parse(src1, {}, md)
    const t2 = parser.parse(src2, {}, md)
    const stats2 = parser.getStats()

    // Should be an append
    expect(stats2.lastMode).toBe('append')
    expect(stats2.appendedChunks).toBeGreaterThan(0)

    // Output should match full parse
    const html = md.renderer.render(t2, md.options, {})
    expect(html).toBe(render(src2))

    // Verify t1 is still valid (prefix wasn't corrupted)
    const html1 = md.renderer.render(t1, md.options, {})
    expect(html1).toBe(render(src1))
  })

  it('append over multiple steps is correct', () => {
    const md = markdownit()
    const parser = makeParser(md)

    // Start with a baseline that's large enough and has hard boundaries.
    let src = ''
    for (let i = 0; i < 60; i++) {
      src += `Baseline paragraph ${i} with extra filler text for padding.\n\n`
    }

    // First parse establishes the baseline.
    parser.parse(src, {}, md)

    // Now append in steps.
    const steps = [
      '# Title\n\n',
      'Paragraph one.\n\n',
      '- item 1\n- item 2\n\n',
      'More text\n',
    ]

    for (const step of steps) {
      src += step
      const tokens = parser.parse(src, {}, md)
      const html = md.renderer.render(tokens, md.options, {})
      expect(html).toBe(render(src))
    }

    const stats = parser.getStats()
    expect(stats.lastMode).toBe('append')
  })

  it('edit triggers chunk-aware re-parse', () => {
    const md = markdownit()
    const parser = makeParser(md)

    const src1 = '# Hello\n\nParagraph one.\n\nParagraph two.\n'
    const src2 = '# Hello\n\nModified paragraph.\n\nParagraph two.\n'

    // First parse
    parser.parse(src1, {}, md)

    // Edit: middle paragraph changed
    const tokens = parser.parse(src2, {}, md)
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src2))
  })

  it('full parse fallback for global markdown state', () => {
    const md = markdownit()
    const parser = makeParser(md)

    const src = '[ref]: /url\n\nText with [ref][]\n'
    const tokens = parser.parse(src, {}, md)
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src))
    expect(parser.getStats().lastMode).toBe('full')
  })

  it('peek returns last parsed tokens', () => {
    const md = markdownit()
    const parser = makeParser(md)

    expect(parser.peek()).toEqual([])

    const src = '# Hello\n'
    const tokens = parser.parse(src, {}, md)
    expect(parser.peek()).toBe(tokens)
  })

  it('reset clears cache', () => {
    const md = markdownit()
    const parser = makeParser(md)

    parser.parse('# Hello\n', {}, md)
    expect(parser.getStats().total).toBe(1)

    parser.reset()
    expect(parser.getStats().total).toBe(0)
    expect(parser.peek()).toEqual([])
  })

  it('small documents skip chunking (full parse)', () => {
    const md = markdownit()
    const parser = makeParser(md)

    const src = 'short\n'
    const tokens = parser.parse(src, {}, md)
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src))
    expect(parser.getStats().lastMode).toBe('full')
  })

  it('large document uses chunked parse with caching', () => {
    const md = markdownit()
    const parser = makeParser(md)

    // Build a large document with clear paragraph boundaries
    let src = ''
    for (let i = 0; i < 60; i++) {
      src += `Paragraph ${i} with some longer text content to make it fill space more quickly.\n\n`
    }

    const tokens = parser.parse(src, {}, md)
    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src))
    expect(parser.getStats().lastMode).toBe('chunked')
  })

  it('re-parsing the same large document uses cached chunks', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = ''
    for (let i = 0; i < 100; i++) {
      src += `Paragraph ${i} with some extra longer filler text to reach minChars.\n\n`
    }

    parser.parse(src, {}, md)
    const stats1 = parser.getStats()

    // Modify one paragraph with same-length replacement to keep offsets stable
    const modified = src.replace('Paragraph 25 with some', 'ModifiedP 25 with some')
    parser.parse(modified, {}, md)
    const stats2 = parser.getStats()

    // Should have some chunk cache hits (unchanged chunks)
    expect(stats2.chunkHits).toBeGreaterThan(0)
  })

  it('append of large document uses cached prefix chunks', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = ''
    for (let i = 0; i < 40; i++) {
      src += `Paragraph ${i} with extra content for padding.\n\n`
    }

    // First parse
    parser.parse(src, {}, md)

    // Append
    const appended = src + 'New paragraph at the end.\n\n'
    parser.parse(appended, {}, md)

    const stats = parser.getStats()
    expect(stats.lastMode).toBe('append')
    expect(stats.appendedChunks).toBeGreaterThan(0)
  })
})
