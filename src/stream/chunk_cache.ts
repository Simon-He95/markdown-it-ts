import { Token } from '../common/token'
import { countLines } from '../common/utils'

// ---------------------------------------------------------------------------
// FNV-1a 32-bit hash
// ---------------------------------------------------------------------------
function fnv1a32(s: string, start: number, end: number): number {
  let h = 0x811C9DC5 | 0
  for (let i = start; i < end; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function computeSourceHash(src: string, start: number, end: number): number {
  return fnv1a32(src, start, end)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedChunk {
  startOffset: number
  endOffset: number
  startLine: number
  lineCount: number
  sourceHash: number
  tokens: Token[]
}

export interface HardBoundary {
  /** Byte offset just past the newline ending the blank line. */
  offset: number
  /** 0-based line number of the blank line. */
  line: number
}

export interface SafeChunkRange {
  start: number
  end: number
  startLine: number
  lineCount: number
}

// ---------------------------------------------------------------------------
// Internal: line representation
// ---------------------------------------------------------------------------

interface RawLine {
  start: number       // byte offset of line start
  end: number         // byte offset of '\n' (exclusive), or src.length
  endWithNl: number   // byte offset just past '\n', or src.length
  blank: boolean
  insideFence: boolean
}

// ---------------------------------------------------------------------------
// Hard-boundary detection
//
// A "hard boundary" is a blank line that does NOT sit inside a fenced code
// block AND does NOT separate lines belonging to the same list or blockquote
// container. Tokens on either side of a hard boundary are parse-independent
// and can be safely cached.
//
// Conservative approach: we only mark a blank line as hard when we are
// confident no container spans it. False negatives (treating a hard boundary
// as soft) only reduce cache hits; false positives would produce wrong output.
// ---------------------------------------------------------------------------

export function detectHardBoundaries(src: string): HardBoundary[] {
  const len = src.length
  if (len === 0) return []

  const lines = collectLines(src)
  const boundaries: HardBoundary[] = []
  let consecutiveBlank = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.blank) {
      consecutiveBlank++
    } else {
      consecutiveBlank = 0
    }

    if (!line.blank || line.insideFence) continue

    // Double blank line → always a hard boundary.
    // In CommonMark, two consecutive blank lines terminate all containers.
    const isDoubleBlank = consecutiveBlank >= 2

    if (isDoubleBlank) {
      boundaries.push({ offset: line.endWithNl, line: i })
      continue
    }

    // Single blank line: check if a container spans it.
    if (!containerSpansBlankLine(lines, i, src)) {
      boundaries.push({ offset: line.endWithNl, line: i })
    }
  }

  return boundaries
}

// ---------------------------------------------------------------------------
// Safe chunk ranges
// ---------------------------------------------------------------------------

export function splitIntoSafeChunkRanges(
  src: string,
  boundaries: HardBoundary[],
  opts?: { minChars?: number },
): SafeChunkRange[] {
  const minChars = opts?.minChars ?? 500
  let ranges: SafeChunkRange[] = []

  if (boundaries.length === 0) {
    if (src.length > 0) {
      ranges.push({ start: 0, end: src.length, startLine: 0, lineCount: countLines(src) })
    }
    return ranges
  }

  let prevOffset = 0
  let prevLine = 0

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i]
    if (b.offset > prevOffset) {
      const seg = src.slice(prevOffset, b.offset)
      ranges.push({
        start: prevOffset,
        end: b.offset,
        startLine: prevLine,
        lineCount: countLines(seg),
      })
    }
    prevOffset = b.offset
    prevLine = b.line + 1
  }

  // Trailing segment
  if (prevOffset < src.length) {
    const seg = src.slice(prevOffset)
    ranges.push({
      start: prevOffset,
      end: src.length,
      startLine: prevLine,
      lineCount: countLines(seg),
    })
  }

  // Merge undersized ranges
  ranges = mergeSmallRanges(ranges, minChars)
  return ranges
}

// ---------------------------------------------------------------------------
// ChunkTable
// ---------------------------------------------------------------------------

export class ChunkTable {
  /** Map keyed by `${startOffset}:${endOffset}` for O(1) lookup. */
  private map = new Map<string, CachedChunk>()
  /** Sorted array for ordered iteration and range invalidation. */
  private list: CachedChunk[] = []

  lookup(startOffset: number, src: string, endOffset: number): CachedChunk | null {
    const key = `${startOffset}:${endOffset}`
    const cached = this.map.get(key)
    if (!cached) return null
    const currentHash = computeSourceHash(src, startOffset, endOffset)
    if (cached.sourceHash !== currentHash) {
      // Content changed — evict stale entry.
      this.map.delete(key)
      this.list = this.list.filter(c => c !== cached)
      return null
    }
    return cached
  }

  store(chunk: CachedChunk): void {
    const key = `${chunk.startOffset}:${chunk.endOffset}`
    // Remove existing entry at same key.
    const existing = this.map.get(key)
    if (existing) {
      this.map.delete(key)
      this.list = this.list.filter(c => c !== existing)
    }
    this.map.set(key, chunk)
    // Insert in sorted order.
    let i = 0
    while (i < this.list.length && this.list[i].startOffset < chunk.startOffset) i++
    this.list.splice(i, 0, chunk)
  }

  invalidateRange(start: number, end: number): void {
    const toRemove: CachedChunk[] = []
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i]
      if (c.endOffset > start && c.startOffset < end) {
        toRemove.push(c)
        this.list.splice(i, 1)
      }
    }
    for (const c of toRemove) {
      this.map.delete(`${c.startOffset}:${c.endOffset}`)
    }
  }

  clear(): void {
    this.map.clear()
    this.list.length = 0
  }

  get size(): number {
    return this.list.length
  }

  getChunks(): readonly CachedChunk[] {
    return this.list
  }
}

// ---------------------------------------------------------------------------
// Token utilities
// ---------------------------------------------------------------------------

export function shiftTokenLines(tokens: Token[], offset: number): void {
  if (offset === 0) return
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

export function appendTokens(out: Token[], tokens: Token[]): void {
  for (let i = 0; i < tokens.length; i++) out.push(tokens[i])
}

export function cloneTokens(tokens: Token[]): Token[] {
  const TokenClass = tokens.length > 0
    ? (tokens[0].constructor as typeof Token)
    : Token
  return tokens.map(t => cloneOneToken(t, TokenClass))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function collectLines(src: string): RawLine[] {
  const lines: RawLine[] = []
  let lineStart = 0
  let fenceMarker: number | null = null
  let fenceLength = 0

  while (lineStart < src.length) {
    let lineEnd = src.indexOf('\n', lineStart)
    const hasNl = lineEnd !== -1
    if (!hasNl) lineEnd = src.length

    const blank = isBlank(src, lineStart, lineEnd)

    // Detect fence open/close on this line
    let isFenceLine = false
    if (!blank) {
      let p = lineStart
      while (p < lineEnd) {
        const c = src.charCodeAt(p)
        if (c === 0x20 || c === 0x09) p++
        else break
      }
      if (p < lineEnd) {
        const ch = src.charCodeAt(p)
        if (ch === 0x60 /* ` */ || ch === 0x7E /* ~ */) {
          let q = p
          while (q < lineEnd && src.charCodeAt(q) === ch) q++
          if (q - p >= 3) {
            isFenceLine = true
            if (fenceMarker === null) {
              fenceMarker = ch
              fenceLength = q - p
            } else if (fenceMarker === ch && q - p >= fenceLength) {
              fenceMarker = null
              fenceLength = 0
            }
          }
        }
      }
    }

    const insideFence = fenceMarker !== null && !isFenceLine

    lines.push({
      start: lineStart,
      end: lineEnd,
      endWithNl: hasNl ? lineEnd + 1 : lineEnd,
      blank,
      insideFence,
    })

    if (!hasNl) break
    lineStart = lineEnd + 1
  }

  return lines
}

function isBlank(src: string, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    const c = src.charCodeAt(i)
    if (c !== 0x20 && c !== 0x09 && c !== 0x0D) return false
  }
  return true
}

/**
 * Check if a container (list/blockquote) spans the blank line at `blankIdx`.
 * Conservative: returns true if the blank line MIGHT be inside a container.
 */
function containerSpansBlankLine(lines: RawLine[], blankIdx: number, src: string): boolean {
  // Find previous non-blank line
  let prevIdx = blankIdx - 1
  while (prevIdx >= 0 && lines[prevIdx].blank) prevIdx--
  if (prevIdx < 0) return false

  // Find next non-blank line
  let nextIdx = blankIdx + 1
  while (nextIdx < lines.length && lines[nextIdx].blank) nextIdx++
  if (nextIdx >= lines.length) return false

  const prev = lines[prevIdx]
  const next = lines[nextIdx]

  // Inside fence → container definitely spans (but caller already filters by insideFence)
  if (prev.insideFence) return true

  const prevInfo = classifyLine(src, prev)
  const nextInfo = classifyLine(src, next)

  // Blockquote: prev starts with '>', next also starts with '>'
  if (prevInfo.isBlockquote && nextInfo.isBlockquote) return true

  // List: prev is a list marker, next is a list marker or indented
  if (prevInfo.isListItem) {
    if (nextInfo.isListItem) return true
    if (nextInfo.indent >= 2) return true
  }

  // Indented continuation: prev is indented (list continuation), look further back
  if (prevInfo.indent >= 2 && !prevInfo.isBlockquote && !prevInfo.isListItem) {
    let lookBack = prevIdx - 1
    while (lookBack >= 0 && lines[lookBack].blank) lookBack--
    if (lookBack >= 0) {
      const earlier = classifyLine(src, lines[lookBack])
      if (earlier.isListItem && (nextInfo.isListItem || nextInfo.indent >= 2)) {
        return true
      }
    }
  }

  // Also check: lookBack is itself an indented continuation
  if (prevInfo.indent >= 2 && !prevInfo.isBlockquote && !prevInfo.isListItem) {
    let lookBack = prevIdx - 1
    while (lookBack >= 0 && lines[lookBack].blank) lookBack--
    if (lookBack >= 0) {
      const earlier2 = classifyLine(src, lines[lookBack])
      if (earlier2.indent >= 2 && !earlier2.isListItem && !earlier2.isBlockquote) {
        // Go further back
        let lb2 = lookBack - 1
        while (lb2 >= 0 && lines[lb2].blank) lb2--
        if (lb2 >= 0) {
          const e3 = classifyLine(src, lines[lb2])
          if (e3.isListItem && (nextInfo.isListItem || nextInfo.indent >= 2)) {
            return true
          }
        }
      }
    }
  }

  return false
}

interface LineClass {
  isBlockquote: boolean
  isListItem: boolean
  indent: number
}

function classifyLine(src: string, line: RawLine): LineClass {
  let indent = 0
  let p = line.start

  while (p < line.end) {
    const c = src.charCodeAt(p)
    if (c === 0x20) { indent++; p++ }
    else if (c === 0x09) { indent += 4 - (indent % 4); p++ }
    else break
  }

  if (p >= line.end) {
    return { isBlockquote: false, isListItem: false, indent }
  }

  const ch = src.charCodeAt(p)

  // Blockquote
  if (ch === 0x3E /* > */) {
    return { isBlockquote: true, isListItem: false, indent }
  }

  // Unordered list: '- ', '* ', '+ '
  if (ch === 0x2D || ch === 0x2A || ch === 0x2B) {
    if (p + 1 < line.end) {
      const next = src.charCodeAt(p + 1)
      if (next === 0x20 || next === 0x09) {
        return { isBlockquote: false, isListItem: true, indent }
      }
    }
  }

  // Ordered list: digit(s) + '. '
  if (ch >= 0x30 && ch <= 0x39) {
    let q = p + 1
    while (q < line.end && src.charCodeAt(q) >= 0x30 && src.charCodeAt(q) <= 0x39) q++
    if (q < line.end && src.charCodeAt(q) === 0x2E /* . */) {
      if (q + 1 < line.end) {
        const after = src.charCodeAt(q + 1)
        if (after === 0x20 || after === 0x09) {
          return { isBlockquote: false, isListItem: true, indent }
        }
      }
    }
  }

  return { isBlockquote: false, isListItem: false, indent }
}

function mergeSmallRanges(ranges: SafeChunkRange[], minChars: number): SafeChunkRange[] {
  if (ranges.length <= 1) return ranges
  const merged: SafeChunkRange[] = []
  let i = 0
  while (i < ranges.length) {
    let j = i
    let totalChars = ranges[i].end - ranges[i].start
    while (j + 1 < ranges.length && totalChars < minChars) {
      j++
      totalChars += ranges[j].end - ranges[j].start
    }
    const first = ranges[i]
    const last = ranges[j]
    merged.push({
      start: first.start,
      end: last.end,
      startLine: first.startLine,
      lineCount: last.startLine - first.startLine + last.lineCount,
    })
    i = j + 1
  }
  return merged
}

function cloneOneToken(t: Token, TokenClass: typeof Token): Token {
  const c = new TokenClass(t.type, t.tag, t.nesting) as Token
  c.attrs = t.attrs ? t.attrs.map(([k, v]) => [k, v] as [string, string]) : null
  c.map = t.map ? [t.map[0], t.map[1]] : null
  c.level = t.level
  c.children = t.children ? cloneTokens(t.children) : null
  c.content = t.content
  c.markup = t.markup
  c.info = t.info
  c.meta = t.meta
  c.block = t.block
  c.hidden = t.hidden
  return c
}
