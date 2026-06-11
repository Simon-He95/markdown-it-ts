import { describe, expect, it } from 'vitest'
import { CachedStreamParser } from '../../src/stream/cached'
import {
  ChunkTable,
  computeSourceHash,
  computeContentFingerprint,
  detectHardBoundaries,
  splitIntoSafeChunkRanges,
} from '../../src/stream/chunk_cache'
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
  const typedMd = md as any
  return new CachedStreamParser(typedMd.core as ParserCore, undefined, {
    core: typedMd.core.ruler.version,
    block: typedMd.block.ruler.version,
    inline: typedMd.inline.ruler.version,
    inline2: typedMd.inline.ruler2.version,
  })
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
    const open = src.indexOf('```')
    const close = src.indexOf('```', open + 3)

    for (const b of boundaries) {
      expect(b.offset).toBeGreaterThan(close)
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

  it('does not treat double blank lines inside lists as automatically hard', () => {
    const src = '- item 1\n\n\n- item 2\n'
    const boundaries = detectHardBoundaries(src)
    expect(boundaries.length).toBe(0)
  })

  it('does not flag double blank lines inside indented code blocks', () => {
    const src = '    a\n\n\n    b\n'
    const boundaries = detectHardBoundaries(src)
    expect(boundaries.length).toBe(0)
  })

  it('does not flag blank lines inside raw HTML blocks', () => {
    const src = '<script>\n\nconsole.log(1)\n\n</script>\n'
    const boundaries = detectHardBoundaries(src)
    expect(boundaries.length).toBe(0)
  })

  it('does not flag blank lines inside HTML block types 1-5', () => {
    const cases = [
      ['script', '<script>\n\nconsole.log(1)\n\n</script>\n\noutside\n', '</script>'],
      ['comment', '<!--\n\ncomment\n\n-->\n\noutside\n', '-->'],
      ['processing', '<?mdts\n\nvalue\n\n?>\n\noutside\n', '?>'],
      ['declaration', '<!DECL\n\nvalue\n\n>\n\noutside\n', '\n>\n'],
      ['cdata', '<![CDATA[\n\nvalue\n\n]]>\n\noutside\n', ']]>'],
    ] as const

    for (const [, src, closeMarker] of cases) {
      const boundaries = detectHardBoundaries(src)
      const close = src.indexOf(closeMarker)
      for (const boundary of boundaries) {
        expect(boundary.offset).toBeGreaterThan(close)
      }
    }
  })

  it('treats HTML block type 6/7 blank terminators as hard boundaries', () => {
    const cases = [
      ['type6', '<div>\ninside\n\noutside\n'],
      ['type7', '<custom-tag data-x="1">\ninside\n\noutside\n'],
    ] as const

    for (const [, src] of cases) {
      const blankEnd = src.indexOf('\n\n') + 2
      expect(detectHardBoundaries(src).some(boundary => boundary.offset === blankEnd)).toBe(true)
    }
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
      sourceText: src,
      fingerprint: computeContentFingerprint(src, 0, src.length),
      tokens,
      generation: 0,
      charLength: src.length,
      tokenWeight: 1,
    })

    const hit = table.lookup({ start: 0, end: src.length, startLine: 0, lineCount: 1 }, src)
    expect(hit).not.toBeNull()
    expect(hit!.tokens).toBe(tokens)
  })

  it('looks up unchanged content after offsets shift', () => {
    const src = 'prefix\n\nstable chunk content\n\nsuffix\n'
    const start = src.indexOf('stable')
    const end = src.indexOf('suffix')
    const table = new ChunkTable()
    const tokens: any[] = [{ type: 'paragraph_open', tag: 'p', nesting: 1 }]

    table.store({
      startOffset: start,
      endOffset: end,
      startLine: 2,
      lineCount: 2,
      sourceText: src.slice(start, end),
      fingerprint: computeContentFingerprint(src, start, end),
      tokens,
      generation: 0,
      charLength: end - start,
      tokenWeight: 1,
    })

    const inserted = 'inserted\n\n'
    const shifted = inserted + src
    const hit = table.lookup({
      start: start + inserted.length,
      end: end + inserted.length,
      startLine: 4,
      lineCount: 2,
    }, shifted)

    expect(hit).not.toBeNull()
    expect(hit!.tokens).toBe(tokens)
    expect(hit!.startOffset).toBe(start + inserted.length)
    expect(hit!.endOffset).toBe(end + inserted.length)
    expect(hit!.startLine).toBe(4)
  })

  it('keeps duplicate original ranges when content lookup reuses a shifted copy', () => {
    const chunk = 'stable repeated chunk content\n\n'
    const src = chunk + chunk
    const inserted = 'inserted\n\n'
    const shifted = inserted + src
    const table = new ChunkTable()

    table.store({
      startOffset: 0,
      endOffset: chunk.length,
      startLine: 0,
      lineCount: 2,
      sourceText: chunk,
      fingerprint: computeContentFingerprint(src, 0, chunk.length),
      tokens: [],
      generation: 0,
      charLength: chunk.length,
      tokenWeight: 0,
    })
    table.store({
      startOffset: chunk.length,
      endOffset: chunk.length * 2,
      startLine: 2,
      lineCount: 2,
      sourceText: chunk,
      fingerprint: computeContentFingerprint(src, chunk.length, chunk.length * 2),
      tokens: [],
      generation: 0,
      charLength: chunk.length,
      tokenWeight: 0,
    })

    const hit = table.lookup({
      start: inserted.length,
      end: inserted.length + chunk.length,
      startLine: 2,
      lineCount: 2,
    }, shifted)

    expect(hit).not.toBeNull()
    expect(table.size).toBe(3)
    expect(table.getChunks().map(c => c.startOffset).sort((a, b) => a - b)).toEqual([
      0,
      inserted.length,
      chunk.length,
    ])
  })

  it('returns null when content changed', () => {
    const table = new ChunkTable()
    const src = 'original'
    table.store({
      startOffset: 0,
      endOffset: src.length,
      startLine: 0,
      lineCount: 1,
      sourceText: src,
      fingerprint: computeContentFingerprint(src, 0, src.length),
      tokens: [],
      generation: 0,
      charLength: src.length,
      tokenWeight: 0,
    })

    const modified = 'changed!'
    const hit = table.lookup({ start: 0, end: modified.length, startLine: 0, lineCount: 1 }, modified)
    expect(hit).toBeNull()
  })

  it('invalidates overlapping chunks', () => {
    const table = new ChunkTable()
    const fp1 = computeContentFingerprint('aaaaaaaaaa', 0, 10)
    const fp2 = computeContentFingerprint('bbbbbbbbbb', 0, 10)
    table.store({ startOffset: 0, endOffset: 10, startLine: 0, lineCount: 1, sourceText: 'aaaaaaaaaa', fingerprint: fp1, tokens: [], generation: 0, charLength: 10, tokenWeight: 0 })
    table.store({ startOffset: 20, endOffset: 30, startLine: 2, lineCount: 1, sourceText: 'bbbbbbbbbb', fingerprint: fp2, tokens: [], generation: 0, charLength: 10, tokenWeight: 0 })

    table.invalidateRange(5, 25)
    expect(table.size).toBe(0)
  })

  it('clears all chunks', () => {
    const table = new ChunkTable()
    const fp = computeContentFingerprint('aaaaaaaaaa', 0, 10)
    table.store({ startOffset: 0, endOffset: 10, startLine: 0, lineCount: 1, sourceText: 'aaaaaaaaaa', fingerprint: fp, tokens: [], generation: 0, charLength: 10, tokenWeight: 0 })
    table.clear()
    expect(table.size).toBe(0)
  })

  it('returns a copy from getChunks', () => {
    const table = new ChunkTable()
    const src = 'aaaaaaaaaa'
    const fp = computeContentFingerprint(src, 0, src.length)
    table.store({ startOffset: 0, endOffset: src.length, startLine: 0, lineCount: 1, sourceText: src, fingerprint: fp, tokens: [], generation: 0, charLength: src.length, tokenWeight: 0 })

    ;(table.getChunks() as any).length = 0

    expect(table.size).toBe(1)
  })

  it('evicts least-recently-used chunks when maxChunks is exceeded', () => {
    const src = 'aaa\n\nbbb\n\nccc\n\nddd\n\n'
    const ranges = [
      [0, 5],
      [5, 10],
      [10, 15],
      [15, 20],
    ] as const
    const table = new ChunkTable({ maxChunks: 3 })

    for (let i = 0; i < 3; i++) {
      const [start, end] = ranges[i]
      table.store({
        startOffset: start,
        endOffset: end,
        startLine: i * 2,
        lineCount: 2,
        sourceText: src.slice(start, end),
        fingerprint: computeContentFingerprint(src, start, end),
        tokens: [],
        generation: 0,
        charLength: end - start,
        tokenWeight: 0,
      })
    }

    expect(table.lookup({ start: ranges[0][0], end: ranges[0][1], startLine: 0, lineCount: 2 }, src)).not.toBeNull()

    const [start, end] = ranges[3]
    table.store({
      startOffset: start,
      endOffset: end,
      startLine: 6,
      lineCount: 2,
      sourceText: src.slice(start, end),
      fingerprint: computeContentFingerprint(src, start, end),
      tokens: [],
      generation: 0,
      charLength: end - start,
      tokenWeight: 0,
    })

    expect(table.lookup({ start: ranges[0][0], end: ranges[0][1], startLine: 0, lineCount: 2 }, src)).not.toBeNull()
    expect(table.lookup({ start: ranges[1][0], end: ranges[1][1], startLine: 2, lineCount: 2 }, src)).toBeNull()
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
    const env = {}

    const t1 = parser.parse(src, env, md)
    const t2 = parser.parse(src, env, md)

    // Cache hit: same-source fast path returns the identical token array reference
    // via fullCache (not chunk-level cache), so reference equality holds.
    expect(t2).toBe(t1)
    expect(parser.getStats().cacheHits).toBe(1)
  })

  it('append reuses cached prefix and reparses the tail', () => {
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
    expect(stats2.appendHits).toBeGreaterThan(0)
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
    expect(stats.appendHits).toBeGreaterThan(0)
  })

  it('advances append tail chunks when new hard boundaries are available', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = ''
    for (let i = 0; i < 80; i++) {
      src += `Baseline paragraph ${i} with extra filler text for padding.\n\n`
    }

    parser.parse(src, {}, md)
    const initialChunks = (parser as any).table.getChunks()
    const initialLastStart = initialChunks[initialChunks.length - 1].startOffset

    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < 60; i++) {
        src += `Append ${round}.${i} with enough filler text to create safe chunk ranges.\n\n`
      }
      parser.parse(src, {}, md)
    }

    const chunks = (parser as any).table.getChunks()
    const lastStart = chunks[chunks.length - 1].startOffset
    expect(lastStart).toBeGreaterThan(initialLastStart)
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
    expect(parser.getStats().resets).toBe(1)
    expect(parser.getStats().lastMode).toBe('reset')
    expect(parser.peek()).toEqual([])
  })

  it('resetStats preserves reset count', () => {
    const parser = makeParser()

    parser.reset()
    parser.parse('# Hello\n', {}, markdownit())
    parser.resetStats()

    expect(parser.getStats().total).toBe(0)
    expect(parser.getStats().resets).toBe(1)
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

  it('re-parsing a large document with many chunks reuses unchanged ones', () => {
    const md = markdownit()
    const parser = makeParser(md)

    // Use a large enough document to produce many chunks (> expandLeft + expandRight + 1)
    // so that not all of them become dirty on a single-paragraph edit.
    let src = ''
    for (let i = 0; i < 200; i++) {
      src += `Paragraph ${i} with some extra longer filler text to reach minChars.\n\n`
    }

    parser.parse(src, {}, md)

    // Modify one paragraph with same-length replacement to keep offsets stable.
    // The dirty set will include the chunk containing paragraph 25 plus its
    // immediate neighbors (expandLeft=1, expandRight=1).
    const modified = src.replace('Paragraph 25 with some', 'ModifiedP 25 with some')
    parser.parse(modified, {}, md)
    const stats2 = parser.getStats()

    // With 200 paragraphs, chunks > 4; hitting at least 1 unchanged chunk is expected.
    expect(stats2.chunkHits).toBeGreaterThan(0)
  })

  it('reuses unchanged chunks after insertion before them', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = ''
    for (let i = 0; i < 200; i++) {
      src += `Paragraph ${i} with some extra longer filler text to reach minChars.\n\n`
    }

    parser.parse(src, {}, md)
    parser.resetStats()

    const inserted = 'Inserted paragraph before existing chunks.\n\n'
    const modified = inserted + src
    const tokens = parser.parse(modified, {}, md)
    const html = md.renderer.render(tokens, md.options, {})

    expect(html).toBe(render(modified))
    expect(parser.getStats().chunkHits).toBeGreaterThan(0)
  })

  it('append of large document uses cached prefix chunks', () => {
    const md = markdownit()
    const parser = makeParser(md)

    let src = ''
    for (let i = 0; i < 80; i++) {
      src += `Paragraph ${i} with extra content for padding.\n\n`
    }

    // First parse
    parser.parse(src, {}, md)

    // Append
    const appended = src + 'New paragraph at the end.\n\n'
    parser.parse(appended, {}, md)

    const stats = parser.getStats()
    expect(stats.lastMode).toBe('append')
    expect(stats.appendHits).toBeGreaterThan(0)
    expect(stats.appendedChunks).toBeGreaterThan(0)
  })

  it('falls back when appending without a cached chunk anchor', () => {
    const md = markdownit()
    const parser = makeParser(md)
    const src1 = `${'long paragraph '.repeat(60)}\n`
    const src2 = `${src1}appended paragraph\n`

    parser.parse(src1, {}, md)
    const tokens = parser.parse(src2, {}, md)

    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src2))
    expect(parser.getStats().lastMode).toBe('full')
    expect(parser.getStats().appendHits).toBe(0)
  })

  it('falls back when appending a closing fence to an open fenced block', () => {
    const md = markdownit()
    const parser = makeParser(md)
    let src1 = '```js\n'
    for (let i = 0; i < 80; i++) {
      src1 += `line ${i}\n`
    }
    const src2 = `${src1}\`\`\`\n\n`

    parser.parse(src1, {}, md)
    const tokens = parser.parse(src2, {}, md)

    const html = md.renderer.render(tokens, md.options, {})
    expect(html).toBe(render(src2))
    expect(parser.getStats().lastMode).not.toBe('append')
    expect(parser.getStats().appendHits).toBe(0)
  })
})
