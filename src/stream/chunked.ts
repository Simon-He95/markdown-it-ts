import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'

export interface ChunkedOptions {
  maxChunkChars?: number // hard limit per chunk by characters
  maxChunkLines?: number // hard limit per chunk by lines
  fenceAware?: boolean // avoid splitting inside fenced code blocks
  maxChunks?: number // optional cap on number of chunks; remainder is merged into last
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
  let chunks = splitIntoChunks(src, options)

  // Enforce maxChunks by merging tail chunks if needed
  if (options.maxChunks && chunks.length > options.maxChunks) {
    const keep = options.maxChunks - 1
    const head = chunks.slice(0, keep)
    const tailMerged = chunks.slice(keep).join('\n')
    chunks = [...head, tailMerged]
  }

  let lineOffset = 0
  const out: Token[] = []

  for (const ch of chunks) {
    const state = md.core.parse(ch, env, md)
    const tokens = state.tokens
    if (lineOffset !== 0 && tokens.length) {
      shiftTokenLines(tokens, lineOffset)
    }
    out.push(...tokens)
    lineOffset += countLines(ch)
  }

  return out
}

/**
 * Split text into chunks by blank lines without breaking fenced code blocks.
 * Keeps chunk sizes under maxChunkChars/maxChunkLines where possible.
 */
export function splitIntoChunks(src: string, opts: Required<Omit<ChunkedOptions, 'maxChunks'>> & { maxChunks?: number }): string[] {
  const lines = src.split('\n')
  const chunks: string[] = []

  let buf: string[] = []
  let charCount = 0
  let lineCount = 0
  // Track distance from last blank line to avoid unbounded chunk growth
  let sinceBlankLines = 0
  let sinceBlankChars = 0
  let inFence: { marker: '`' | '~', length: number } | null = null

  function flush() {
    if (buf.length > 0) {
      chunks.push(buf.join('\n'))
      buf = []
      charCount = 0
      lineCount = 0
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (opts.fenceAware) {
      // Detect fence start/end without regex to avoid backtracking and unused groups.
      // Lines that start (after optional indentation) with >= 3 backticks or tildes.
      let p = 0
      // skip spaces and tabs
      while (p < line.length) {
        const c = line.charCodeAt(p)
        if (c === 0x20 /* space */ || c === 0x09 /* tab */)
          p++
        else break
      }
      const ch = line[p]
      if (ch === '`' || ch === '~') {
        let q = p
        while (q < line.length && line[q] === ch) q++
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

    buf.push(line)
    const lineWithNlLen = line.length + 1 // include newline
    charCount += lineWithNlLen
    lineCount += 1

    // update blank distance trackers
    if (trimmed.length === 0) {
      sinceBlankLines = 0
      sinceBlankChars = 0
    }
    else {
      sinceBlankLines += 1
      sinceBlankChars += lineWithNlLen
    }

    const atBlankBoundary = trimmed.length === 0
    const sizeExceeded = charCount >= opts.maxChunkChars || lineCount >= opts.maxChunkLines

    if (sizeExceeded && !inFence) {
      // Prefer flushing at blank-line boundaries when size exceeded
      if (atBlankBoundary) {
        flush()
      }
      else {
        // Fallback: if we've exceeded size and haven't seen a blank for a while,
        // force a flush to prevent pathological chunk growth.
        const maxSinceBlankLines = Math.max(10, Math.floor(opts.maxChunkLines * 0.5))
        const maxSinceBlankChars = Math.max(opts.maxChunkChars, 8000)
        if (sinceBlankLines >= maxSinceBlankLines || sinceBlankChars >= maxSinceBlankChars) {
          flush()
        }
      }
    }
  }

  flush()
  return chunks
}

function countLines(input: string): number {
  if (input.length === 0)
    return 0
  let count = 0
  let pos = -1
  while ((pos = input.indexOf('\n', pos + 1)) !== -1) count++
  return count
}

function shiftTokenLines(tokens: Token[], offset: number): void {
  if (offset === 0)
    return
  const stack: Token[] = [...tokens]
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
