import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
export interface ChunkedOptions {
  maxChunkChars?: number // hard limit per chunk by characters
  maxChunkLines?: number // hard limit per chunk by lines
  fenceAware?: boolean // avoid splitting inside fenced code blocks
  maxChunks?: number // optional cap on number of chunks; if exceeded, ranges are rebalanced
}

export interface ChunkRange {
  start: number
  end: number
  lineCount: number
}

const DEFAULTS: Required<Omit<ChunkedOptions, 'maxChunks'>> & { maxChunks?: number } = {
  maxChunkChars: 10_000,
  maxChunkLines: 200,
  fenceAware: true,
  maxChunks: undefined,
}

/**
 * Chunk a markdown document on reasonably safe boundaries (blank-line separated)
 * and parse each chunk separately, then merge token streams with line map offsets.
 *
 * This is experimental and aims to speed up very large documents by reducing the
 * cost of parsing one huge string at once, at the price of some orchestration.
 */
export function chunkedParse(md: MarkdownIt, src: string, env: Record<string, unknown> = {}, opts?: ChunkedOptions): Token[] {
  const options = { ...DEFAULTS, ...(opts || {}) }
  let ranges = splitIntoChunkRanges(src, options)

  // Enforce maxChunks by rebalancing adjacent chunks instead of merging
  // the entire remainder into the final chunk.
  if (options.maxChunks && ranges.length > options.maxChunks) {
    ranges = rebalanceChunkRanges(ranges, options.maxChunks)
  }

  let lineOffset = 0
  const out: Token[] = []

  // Expose diagnostic chunk info on env for tooling/benchmarks
  try {
    ;(env as any).__mdtsChunkInfo = {
      count: ranges.length,
      maxChunkChars: options.maxChunkChars,
      maxChunkLines: options.maxChunkLines,
    }
  }
  catch {}

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]
    const ch = src.slice(range.start, range.end)
    const state = md.core.parse(ch, env, md)
    const tokens = state.tokens
    if (lineOffset !== 0 && tokens.length) {
      shiftTokenLines(tokens, lineOffset)
    }
    appendTokens(out, tokens)
    lineOffset += range.lineCount
  }

  return out
}

/**
 * Split text into chunks by blank lines without breaking fenced code blocks.
 * Keeps chunk sizes under maxChunkChars/maxChunkLines where possible.
 */
export function splitIntoChunks(src: string, opts: Required<Omit<ChunkedOptions, 'maxChunks'>> & { maxChunks?: number }): string[] {
  const ranges = splitIntoChunkRanges(src, opts)
  const chunks = new Array<string>(ranges.length)
  for (let i = 0; i < ranges.length; i++) {
    chunks[i] = src.slice(ranges[i].start, ranges[i].end)
  }
  return chunks
}

export function splitIntoChunkRanges(
  src: string,
  opts: Required<Omit<ChunkedOptions, 'maxChunks'>> & { maxChunks?: number },
  final = true,
): ChunkRange[] {
  const chunks: ChunkRange[] = []
  let charCount = 0
  let lineCount = 0
  let chunkStart = 0
  let chunkLines = 0
  // Track distance from last blank line to avoid unbounded chunk growth
  let sinceBlankLines = 0
  let sinceBlankChars = 0
  let inFence: { marker: '`' | '~', length: number } | null = null

  function flush(end: number) {
    if (end <= chunkStart)
      return
    chunks.push({
      start: chunkStart,
      end,
      lineCount: chunkLines,
    })
    chunkStart = end
    charCount = 0
    lineCount = 0
    chunkLines = 0
  }

  for (let lineStart = 0; lineStart < src.length;) {
    let lineEnd = src.indexOf('\n', lineStart)
    let lineEndWithNl = lineEnd
    if (lineEnd === -1) {
      lineEnd = src.length
      lineEndWithNl = src.length
    }
    else {
      lineEndWithNl = lineEnd + 1
    }

    const blank = isBlankLine(src, lineStart, lineEnd)

    if (opts.fenceAware) {
      // Detect fence start/end without regex to avoid backtracking and unused groups.
      // Lines that start (after optional indentation) with >= 3 backticks or tildes.
      let p = lineStart
      // skip spaces and tabs
      while (p < lineEnd) {
        const c = src.charCodeAt(p)
        if (c === 0x20 /* space */ || c === 0x09 /* tab */)
          p++
        else break
      }
      const ch = src[p]
      if (ch === '`' || ch === '~') {
        let q = p
        while (q < lineEnd && src[q] === ch) q++
        const runLen = q - p
        if (runLen >= 3) {
          if (!inFence) {
            inFence = { marker: ch as '`' | '~', length: runLen }
          }
          else if (inFence.marker === ch && runLen >= inFence.length) {
            inFence = null
          }
        }
      }
    }

    const lineWithNlLen = lineEndWithNl - lineStart
    charCount += lineWithNlLen
    lineCount += 1
    chunkLines += 1

    // update blank distance trackers
    if (blank) {
      sinceBlankLines = 0
      sinceBlankChars = 0
    }
    else {
      sinceBlankLines += 1
      sinceBlankChars += lineWithNlLen
    }

    const atBlankBoundary = blank
    const sizeExceeded = charCount >= opts.maxChunkChars || lineCount >= opts.maxChunkLines

    if (sizeExceeded && !inFence) {
      // Prefer flushing at blank-line boundaries when size exceeded
      if (atBlankBoundary) {
        flush(lineEndWithNl)
      }
      else {
        // Fallback: if we've exceeded size and haven't seen a blank for a while,
        // force a flush to prevent pathological chunk growth.
        const maxSinceBlankLines = Math.max(10, Math.floor(opts.maxChunkLines * 0.5))
        const maxSinceBlankChars = Math.max(opts.maxChunkChars, 8000)
        if (sinceBlankLines >= maxSinceBlankLines || sinceBlankChars >= maxSinceBlankChars) {
          flush(lineEndWithNl)
        }
      }
    }

    lineStart = lineEndWithNl
  }

  if (final)
    flush(src.length)
  return chunks
}

function shiftTokenLines(tokens: Token[], offset: number): void {
  if (offset === 0)
    return
  const stack: Token[] = []
  for (let i = tokens.length - 1; i >= 0; i--) stack.push(tokens[i])
  while (stack.length) {
    const t = stack.pop()!
    if (t.map) {
      t.map[0] += offset
      t.map[1] += offset
    }
    if (t.children) {
      for (let i = t.children.length - 1; i >= 0; i--) stack.push(t.children[i])
    }
  }
}

function appendTokens(out: Token[], tokens: Token[]): void {
  for (let i = 0; i < tokens.length; i++) {
    out.push(tokens[i])
  }
}

function rebalanceChunkRanges(chunks: ChunkRange[], maxChunks: number): ChunkRange[] {
  if (chunks.length <= maxChunks)
    return chunks

  const out: ChunkRange[] = []
  let index = 0

  for (let group = 0; group < maxChunks; group++) {
    const groupsLeft = maxChunks - group
    const chunksLeft = chunks.length - index
    const take = Math.ceil(chunksLeft / groupsLeft)
    const slice = chunks.slice(index, index + take)
    let lineCount = 0
    for (let i = 0; i < slice.length; i++) {
      lineCount += slice[i].lineCount
    }
    out.push({
      start: slice[0].start,
      end: slice[slice.length - 1].end,
      lineCount,
    })
    index += take
  }

  return out
}

function isBlankLine(src: string, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    const ch = src.charCodeAt(i)
    if (ch !== 0x20 && ch !== 0x09 && ch !== 0x0D)
      return false
  }
  return true
}
