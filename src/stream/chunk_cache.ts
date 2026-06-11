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
// Content fingerprint metadata.
// Exact sourceText comparison below is the correctness check; this metadata is
// kept for callers that need a cheap content summary.
// ---------------------------------------------------------------------------

const FINGERPRINT_FIRST = 16
const FINGERPRINT_LAST = 16

function extractFirstChars(s: string, start: number, end: number, count: number): string {
  const max = Math.min(start + count, end)
  return s.slice(start, max)
}

function extractLastChars(s: string, start: number, end: number, count: number): string {
  const min = Math.max(start, end - count)
  return s.slice(min, end)
}

export interface ContentFingerprint {
  /** FNV-1a 32-bit hash. */
  hash: number
  /** Character length of the chunk content. */
  length: number
  /** First FINGERPRINT_FIRST characters. */
  first: string
  /** Last FINGERPRINT_LAST characters. */
  last: string
}

export function computeContentFingerprint(src: string, start: number, end: number): ContentFingerprint {
  return {
    hash: fnv1a32(src, start, end),
    length: end - start,
    first: extractFirstChars(src, start, end, FINGERPRINT_FIRST),
    last: extractLastChars(src, start, end, FINGERPRINT_LAST),
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedChunk {
  startOffset: number
  endOffset: number
  startLine: number
  lineCount: number
  /** Original source slice for deterministic cache lookup verification. */
  sourceText: string
  /** Content fingerprint metadata for callers that need a compact summary. */
  fingerprint: ContentFingerprint
  /**
   * Tokens stored with chunk-local line coordinates (line 0 = chunk start).
   * Consumers must clone + shift to materialize with global line offsets.
   */
  tokens: Token[]
  /** Generation when this chunk was stored. Must match table generation to be valid. */
  generation: number
  /** Character length of the original source slice (fingerprint.length). */
  charLength: number
  /** Number of tokens in this chunk (for memory tracking). */
  tokenCount: number
}

export interface HardBoundary {
  /** UTF-16 code-unit offset just past the newline ending the blank line. */
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
// ChunkTable memory limits
// ---------------------------------------------------------------------------

export interface ChunkTableLimits {
  /** Maximum number of chunks. Default: 256. */
  maxChunks?: number
  /** Maximum total characters across all cached chunks. Default: 2,000,000. */
  maxTotalChars?: number
  /** Maximum total tokens across all cached chunks. Default: 100,000. */
  maxTotalTokens?: number
}

const DEFAULT_CHUNK_TABLE_LIMITS: Required<ChunkTableLimits> = {
  maxChunks: 256,
  maxTotalChars: 2_000_000,
  maxTotalTokens: 100_000,
}

// ---------------------------------------------------------------------------
// ChunkTable
// ---------------------------------------------------------------------------

export class ChunkTable {
  /** Offset-range keyed map for direct lookup and LRU recency. */
  private map = new Map<string, CachedChunk>()
  /** Content keyed map for unchanged chunks that move after middle edits. */
  private contentMap = new Map<string, CachedChunk[]>()
  /** Sorted array for ordered iteration and range invalidation. */
  private list: CachedChunk[] = []

  /** Monotonically increasing generation. Incremented on full invalidation. */
  private generation = 0

  /** Memory tracking. */
  private totalChars = 0
  private totalTokens = 0
  private limits: Required<ChunkTableLimits>

  constructor(limits?: ChunkTableLimits) {
    this.limits = { ...DEFAULT_CHUNK_TABLE_LIMITS }
    if (limits)
      this.updateLimits(limits)
  }

  lookup(range: SafeChunkRange, src: string): CachedChunk | null {
    const key = offsetKey(range.start, range.end)
    const cached = this.map.get(key)
    if (cached) {
      // Generation check: if table was invalidated, all old chunks are stale.
      if (cached.generation !== this.generation) {
        this.evict(cached, key)
      }
      else if (
        cached.sourceText.length === range.end - range.start
        && regionEquals(src, range.start, cached.sourceText)
      ) {
        return this.useAtCurrentRange(cached, range)
      }
      else {
        this.evict(cached, key)
      }
    }

    return this.lookupByContent(range, src)
  }

  store(chunk: CachedChunk): void {
    const key = offsetKey(chunk.startOffset, chunk.endOffset)

    // Remove existing entry at same key.
    const existing = this.map.get(key)
    if (existing) {
      this.evict(existing, key)
    }

    // Stamp with current generation.
    chunk.generation = this.generation

    // Track memory.
    this.totalChars += chunk.charLength
    this.totalTokens += chunk.tokenCount

    this.map.set(key, chunk)
    this.addToContentIndex(chunk)

    // Insert in sorted order.
    const last = this.list[this.list.length - 1]
    if (!last || chunk.startOffset >= last.startOffset) {
      this.list.push(chunk)
    }
    else {
      let lo = 0
      let hi = this.list.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (this.list[mid].startOffset < chunk.startOffset)
          lo = mid + 1
        else
          hi = mid
      }
      this.list.splice(lo, 0, chunk)
    }

    // Enforce limits.
    this.enforceLimits()
  }

  invalidateRange(start: number, end: number): void {
    const toRemove: Array<{ chunk: CachedChunk, key: string }> = []
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i]
      if (c.endOffset > start && c.startOffset < end) {
        toRemove.push({ chunk: c, key: offsetKey(c.startOffset, c.endOffset) })
        this.list.splice(i, 1)
      }
    }
    for (const { chunk, key } of toRemove) {
      this.map.delete(key)
      this.removeFromContentIndex(chunk)
      this.totalChars -= chunk.charLength
      this.totalTokens -= chunk.tokenCount
    }
  }

  /**
   * Increment generation and clear all cached chunks immediately.
   */
  invalidateAll(): void {
    this.generation++
    // Clear immediately to free memory.
    this.map.clear()
    this.contentMap.clear()
    this.list.length = 0
    this.totalChars = 0
    this.totalTokens = 0
  }

  clear(): void {
    this.map.clear()
    this.contentMap.clear()
    this.list.length = 0
    this.totalChars = 0
    this.totalTokens = 0
    // Do NOT reset generation — that would make newly stored chunks
    // incompatible with the rest of the system. clear() is for reset;
    // invalidateAll() is for generation bump.
  }

  /**
   * Update memory limits. Triggers enforcement if the new limits are tighter.
   * Does NOT invalidate existing chunks — only evicts overflow entries.
   */
  updateLimits(limits: ChunkTableLimits): void {
    this.limits = {
      maxChunks: limits.maxChunks ?? this.limits.maxChunks,
      maxTotalChars: limits.maxTotalChars ?? this.limits.maxTotalChars,
      maxTotalTokens: limits.maxTotalTokens ?? this.limits.maxTotalTokens,
    }
    this.enforceLimits()
  }

  /** Current generation value. */
  get currentGeneration(): number {
    return this.generation
  }

  get size(): number {
    return this.list.length
  }

  get totalCharCount(): number {
    return this.totalChars
  }

  get totalTokenCount(): number {
    return this.totalTokens
  }

  getChunks(): readonly CachedChunk[] {
    return this.list.slice()
  }

  // ---- Private ----

  private evict(chunk: CachedChunk, key: string): void {
    this.map.delete(key)
    this.removeFromContentIndex(chunk)
    this.totalChars -= chunk.charLength
    this.totalTokens -= chunk.tokenCount
    // Remove from sorted list.
    const idx = this.list.indexOf(chunk)
    if (idx !== -1)
      this.list.splice(idx, 1)
  }

  private enforceLimits(): void {
    while (
      this.list.length > this.limits.maxChunks
      || this.totalChars > this.limits.maxTotalChars
      || this.totalTokens > this.limits.maxTotalTokens
    ) {
      if (this.list.length === 0)
        break
      const key = this.map.keys().next().value
      const oldest = key ? this.map.get(key) : undefined
      if (!key || !oldest)
        break
      this.evict(oldest, key)
    }
  }

  private lookupByContent(range: SafeChunkRange, src: string): CachedChunk | null {
    const fingerprint = computeContentFingerprint(src, range.start, range.end)
    const bucket = this.contentMap.get(contentKey(fingerprint))
    if (!bucket)
      return null

    for (let i = bucket.length - 1; i >= 0; i--) {
      const cached = bucket[i]
      const key = offsetKey(cached.startOffset, cached.endOffset)
      if (cached.generation !== this.generation) {
        this.evict(cached, key)
        continue
      }
      if (
        cached.sourceText.length === range.end - range.start
        && regionEquals(src, range.start, cached.sourceText)
      ) {
        return this.useAtCurrentRange(cached, range)
      }
    }

    return null
  }

  private useAtCurrentRange(cached: CachedChunk, range: SafeChunkRange): CachedChunk {
    if (
      cached.startOffset === range.start
      && cached.endOffset === range.end
      && cached.startLine === range.startLine
      && cached.lineCount === range.lineCount
    ) {
      this.refresh(cached)
      return cached
    }

    const current: CachedChunk = {
      ...cached,
      startOffset: range.start,
      endOffset: range.end,
      startLine: range.startLine,
      lineCount: range.lineCount,
    }
    this.evict(cached, offsetKey(cached.startOffset, cached.endOffset))
    this.store(current)
    return current
  }

  private refresh(chunk: CachedChunk): void {
    const key = offsetKey(chunk.startOffset, chunk.endOffset)
    if (this.map.get(key) !== chunk)
      return
    this.map.delete(key)
    this.map.set(key, chunk)
  }

  private addToContentIndex(chunk: CachedChunk): void {
    const key = contentKey(chunk.fingerprint)
    const bucket = this.contentMap.get(key)
    if (bucket) {
      bucket.push(chunk)
    }
    else {
      this.contentMap.set(key, [chunk])
    }
  }

  private removeFromContentIndex(chunk: CachedChunk): void {
    const key = contentKey(chunk.fingerprint)
    const bucket = this.contentMap.get(key)
    if (!bucket)
      return
    const idx = bucket.indexOf(chunk)
    if (idx !== -1)
      bucket.splice(idx, 1)
    if (bucket.length === 0)
      this.contentMap.delete(key)
  }
}

function offsetKey(startOffset: number, endOffset: number): string {
  return `${startOffset}:${endOffset}`
}

function contentKey(fingerprint: ContentFingerprint): string {
  return `${fingerprint.hash}:${fingerprint.length}:${fingerprint.first.length}:${fingerprint.first}:${fingerprint.last.length}:${fingerprint.last}`
}

function regionEquals(src: string, start: number, text: string): boolean {
  if (start < 0 || start + text.length > src.length)
    return false
  for (let i = 0; i < text.length; i++) {
    if (src.charCodeAt(start + i) !== text.charCodeAt(i))
      return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Internal: line representation
// ---------------------------------------------------------------------------

interface RawLine {
  start: number // UTF-16 code-unit index of line start
  end: number // UTF-16 code-unit index of '\n' (exclusive), or src.length
  endWithNl: number // UTF-16 code-unit index just past '\n', or src.length
  blank: boolean
  insideFence: boolean
}

// ---------------------------------------------------------------------------
// Hard-boundary detection
//
// A "hard boundary" is a blank line that does NOT sit inside a fenced code
// block AND does NOT separate lines belonging to the same container (list,
// blockquote, table, setext heading, HTML block). Tokens on either side of a
// hard boundary are parse-independent and can be safely cached.
//
// Conservative approach: we only mark a blank line as hard when we are
// confident no container spans it. False negatives (treating a hard boundary
// as soft) only reduce cache hits; false positives would produce wrong output.
// ---------------------------------------------------------------------------

export function detectHardBoundaries(src: string): HardBoundary[] {
  const len = src.length
  if (len === 0)
    return []

  const lines = collectLines(src)
  // Pre-classify all lines so containerSpansBlankLine can look up quickly.
  const classes = lines.map(l => classifyLine(src, l))
  const boundaries: HardBoundary[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!line.blank || line.insideFence)
      continue

    if (!containerSpansBlankLine(lines, classes, i, src)) {
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
      ranges.push({ start: 0, end: src.length, startLine: 0, lineCount: countLineSpan(src) })
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
        lineCount: countLineSpan(seg),
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
      lineCount: countLineSpan(seg),
    })
  }

  // Merge undersized ranges
  ranges = mergeSmallRanges(ranges, minChars)
  return ranges
}

function countLineSpan(src: string): number {
  if (src.length === 0)
    return 0
  return countLines(src) + (src.charCodeAt(src.length - 1) === 0x0A ? 0 : 1)
}

// ---------------------------------------------------------------------------
// Dirty range neighbor expansion
//
// Given a set of "dirty" chunks (identified by content change), expand the
// dirty set to include neighbors until we reach stable boundaries on both
// sides. This ensures that edit-induced boundary changes don't leave stale
// chunks between dirty and clean regions.
// ---------------------------------------------------------------------------

/**
 * Expand a set of dirty chunk indices to include neighbors until stable
 * boundaries are reached. A "stable boundary" is one where the boundary
 * between chunks exists in both old and new boundary sets.
 */
export function expandDirtyRange(
  dirtyIndices: Set<number>,
  totalChunks: number,
  expandLeft: number = 1,
  expandRight: number = 1,
): Set<number> {
  if (dirtyIndices.size === 0 || totalChunks === 0)
    return dirtyIndices

  const expanded = new Set(dirtyIndices)

  // Expand left
  for (let pass = 0; pass < expandLeft; pass++) {
    const toAdd: number[] = []
    for (const idx of expanded) {
      if (idx > 0 && !expanded.has(idx - 1)) {
        toAdd.push(idx - 1)
      }
    }
    for (const idx of toAdd) expanded.add(idx)
  }

  // Expand right
  for (let pass = 0; pass < expandRight; pass++) {
    const toAdd: number[] = []
    for (const idx of expanded) {
      if (idx < totalChunks - 1 && !expanded.has(idx + 1)) {
        toAdd.push(idx + 1)
      }
    }
    for (const idx of toAdd) expanded.add(idx)
  }

  return expanded
}

// ---------------------------------------------------------------------------
// Token utilities
// ---------------------------------------------------------------------------

export function shiftTokenLines(tokens: Token[], offset: number): void {
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

export function appendTokens(out: Token[], tokens: Token[]): void {
  for (let i = 0; i < tokens.length; i++) out.push(tokens[i])
}

export function cloneTokens(tokens: Token[]): Token[] {
  const TokenClass = tokens.length > 0
    ? (tokens[0].constructor as typeof Token)
    : Token
  return tokens.map(t => cloneOneToken(t, TokenClass))
}

/**
 * Materialize cached tokens into the caller's coordinate space.
 * Always clones first, then shifts. Never mutates cached tokens.
 */
export function materializeCachedTokens(
  cached: CachedChunk,
  lineOffset: number,
): Token[] {
  const cloned = cloneTokens(cached.tokens)
  if (lineOffset !== 0) {
    shiftTokenLines(cloned, lineOffset)
  }
  return cloned
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
    if (!hasNl)
      lineEnd = src.length

    const blank = isBlank(src, lineStart, lineEnd)

    // Detect fence open/close on this line
    let isFenceLine = false
    if (!blank) {
      let p = lineStart
      while (p < lineEnd) {
        const c = src.charCodeAt(p)
        if (c === 0x20 || c === 0x09)
          p++
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
            }
            else if (fenceMarker === ch && q - p >= fenceLength) {
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

    if (!hasNl)
      break
    lineStart = lineEnd + 1
  }

  return lines
}

function isBlank(src: string, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    const c = src.charCodeAt(i)
    if (c !== 0x20 && c !== 0x09 && c !== 0x0D)
      return false
  }
  return true
}

interface LineClass {
  isBlockquote: boolean
  isListItem: boolean
  isSetextUnderline: boolean
  isTableRow: boolean
  isHtmlBlockContinuation: boolean
  indent: number
}

function classifyLine(src: string, line: RawLine): LineClass {
  let indent = 0
  let p = line.start

  while (p < line.end) {
    const c = src.charCodeAt(p)
    if (c === 0x20) {
      indent++
      p++
    }
    else if (c === 0x09) {
      indent += 4 - (indent % 4)
      p++
    }
    else {
      break
    }
  }

  if (p >= line.end) {
    return { isBlockquote: false, isListItem: false, isSetextUnderline: false, isTableRow: false, isHtmlBlockContinuation: false, indent }
  }

  const ch = src.charCodeAt(p)

  // Blockquote
  if (ch === 0x3E /* > */) {
    return { isBlockquote: true, isListItem: false, isSetextUnderline: false, isTableRow: false, isHtmlBlockContinuation: false, indent }
  }

  // Unordered list: '- ', '* ', '+ '
  if (ch === 0x2D || ch === 0x2A || ch === 0x2B) {
    if (p + 1 < line.end) {
      const next = src.charCodeAt(p + 1)
      if (next === 0x20 || next === 0x09) {
        return { isBlockquote: false, isListItem: true, isSetextUnderline: false, isTableRow: false, isHtmlBlockContinuation: false, indent }
      }
    }
  }

  // Ordered list: digit(s) + '. ' or digit(s) + ') '
  if (ch >= 0x30 && ch <= 0x39) {
    let q = p + 1
    while (q < line.end && src.charCodeAt(q) >= 0x30 && src.charCodeAt(q) <= 0x39) q++
    if (q < line.end) {
      const marker = src.charCodeAt(q)
      if (marker === 0x2E /* . */ || marker === 0x29 /* ) */) {
        if (q + 1 < line.end) {
          const after = src.charCodeAt(q + 1)
          if (after === 0x20 || after === 0x09) {
            return { isBlockquote: false, isListItem: true, isSetextUnderline: false, isTableRow: false, isHtmlBlockContinuation: false, indent }
          }
        }
      }
    }
  }

  // Setext heading underline: line of '=' or '-' (≥1 char), optionally with trailing whitespace
  if (ch === 0x3D /* = */ || ch === 0x2D /* - */) {
    // '-' is checked above for list items; if indent is >= 2 and the rest of the
    // line is all same char, it's a setext underline, not a list item.
    // But we already caught '- ' as list item. Here we check for setext underline
    // which is ALL same character (dash or equal) with only trailing spaces.
    let q = p
    while (q < line.end && src.charCodeAt(q) === ch) q++
    // After the run, only spaces/tabs allowed
    let after = q
    while (after < line.end) {
      const ac = src.charCodeAt(after)
      if (ac !== 0x20 && ac !== 0x09 && ac !== 0x0D)
        break
      after++
    }
    if (after >= line.end && q > p) {
      // Line consists entirely of the same char + trailing whitespace → setext underline
      return { isBlockquote: false, isListItem: false, isSetextUnderline: true, isTableRow: false, isHtmlBlockContinuation: false, indent }
    }
  }

  // Table row detection: line contains '|' as a structural character.
  // A table row starts with optional whitespace + '|' or contains '|' in the content.
  // We check within the first few chars for a pipe.
  {
    let s = p
    while (s < line.end) {
      if (src.charCodeAt(s) === 0x7C /* | */) {
        // Also check if this might be a separator row (| --- | --- |)
        // But for container detection, any row with | is a table row.
        return { isBlockquote: false, isListItem: false, isSetextUnderline: false, isTableRow: true, isHtmlBlockContinuation: false, indent }
      }
      s++
    }
  }

  return { isBlockquote: false, isListItem: false, isSetextUnderline: false, isTableRow: false, isHtmlBlockContinuation: false, indent }
}

/**
 * Check if a container (list/blockquote/table/setext/html-block) spans the
 * blank line at `blankIdx`. Conservative: returns true if the blank line MIGHT
 * be inside a container.
 */
function containerSpansBlankLine(
  lines: RawLine[],
  classes: LineClass[],
  blankIdx: number,
  src: string,
): boolean {
  // Find previous non-blank line
  let prevIdx = blankIdx - 1
  while (prevIdx >= 0 && lines[prevIdx].blank) prevIdx--
  if (prevIdx < 0)
    return false

  // Find next non-blank line
  let nextIdx = blankIdx + 1
  while (nextIdx < lines.length && lines[nextIdx].blank) nextIdx++
  if (nextIdx >= lines.length)
    return false

  const prevLine = lines[prevIdx]
  const prev = classes[prevIdx]
  const next = classes[nextIdx]

  // Inside fence → container definitely spans (but caller already filters by insideFence)
  if (prevLine.insideFence)
    return true

  // Blockquote: prev starts with '>', next also starts with '>'
  if (prev.isBlockquote && next.isBlockquote)
    return true

  // Setext heading: prev is a paragraph/heading content, next is a setext underline.
  // The blank line between heading text and its underline must NOT be split.
  if (next.isSetextUnderline && !prev.isBlockquote && !prev.isListItem) {
    // Check: prev should be non-blank content above a setext underline.
    // The prev line and the underline are part of the same heading.
    return true
  }

  // Setext heading: if prev is a setext underline, the next line could be
  // continuation (unlikely, but be safe).
  if (prev.isSetextUnderline) {
    // After a setext underline, containers are reset. This is safe to split.
    // But if the next line is also setext-like or blockquote? Actually after
    // setext underline the heading is terminated. But to be safe, if next is
    // also content-looking, we treat as continuation. No — setext terminates.
    // Only block if both sides are clearly unrelated.
    // Return false = not a container span = safe to split.
  }

  // Table: prev or next is a table row
  if (prev.isTableRow && next.isTableRow)
    return true

  // HTML block continuation: if prev and next are inside the same HTML block
  // (detected by checking if both lines are part of an HTML block type).
  // We use a heuristic: if the preceding context contains an HTML block opener
  // that hasn't been closed, treat the blank line as inside the HTML block.
  // For now, check if both lines look like HTML content.
  if (isInsideHtmlBlock(lines, classes, blankIdx, src))
    return true

  if (prev.indent >= 4 && next.indent >= 4 && !prev.isBlockquote && !next.isBlockquote && !prev.isListItem && !next.isListItem)
    return true

  // List: prev is a list marker, next is a list marker or indented
  if (prev.isListItem) {
    if (next.isListItem)
      return true
    if (next.indent >= 2 && !next.isBlockquote)
      return true
  }

  // Indented continuation: prev is indented (list continuation), look further back
  if (prev.indent >= 2 && !prev.isBlockquote && !prev.isListItem) {
    let lookBack = prevIdx - 1
    while (lookBack >= 0 && lines[lookBack].blank) lookBack--
    if (lookBack >= 0) {
      const earlier = classes[lookBack]
      if (earlier.isListItem && (next.isListItem || (next.indent >= 2 && !next.isBlockquote))) {
        return true
      }
    }
  }

  // Also check: lookBack is itself an indented continuation
  if (prev.indent >= 2 && !prev.isBlockquote && !prev.isListItem) {
    let lookBack = prevIdx - 1
    while (lookBack >= 0 && lines[lookBack].blank) lookBack--
    if (lookBack >= 0) {
      const earlier2 = classes[lookBack]
      if (earlier2.indent >= 2 && !earlier2.isListItem && !earlier2.isBlockquote) {
        // Go further back
        let lb2 = lookBack - 1
        while (lb2 >= 0 && lines[lb2].blank) lb2--
        if (lb2 >= 0) {
          const e3 = classes[lb2]
          if (e3.isListItem && (next.isListItem || (next.indent >= 2 && !next.isBlockquote))) {
            return true
          }
        }
      }
    }
  }

  return false
}

/** Heuristic check: is the blank line inside a raw HTML block that closes by tag. */
function isInsideHtmlBlock(
  _lines: RawLine[],
  _classes: LineClass[],
  blankIdx: number,
  src: string,
): boolean {
  // Scan backwards from the blank line looking for HTML block start.
  // An HTML block starts at a line that begins with specific tags.
  // We scan back up to 50 lines looking for an unclosed HTML block.
  const MAX_SCAN_LINES = 50

  // Find the byte offset of the blank line
  let lineStart = 0
  let lineIdx = 0
  while (lineIdx < blankIdx && lineStart < src.length) {
    const nl = src.indexOf('\n', lineStart)
    if (nl === -1)
      break
    lineStart = nl + 1
    lineIdx++
  }

  // Scan backwards to find HTML block start
  const scanStart = Math.max(0, blankIdx - MAX_SCAN_LINES)
  for (let i = blankIdx - 1; i >= scanStart; i--) {
    // Find line i's start
    let ls = 0
    let li = 0
    while (li < i && ls < src.length) {
      const nl = src.indexOf('\n', ls)
      if (nl === -1)
        break
      ls = nl + 1
      li++
    }
    if (li !== i)
      break

    const le = src.indexOf('\n', ls)
    const lineEnd = le === -1 ? src.length : le

    const lineStr = src.slice(ls, lineEnd)
    const htmlBlock = getHtmlBlockStart(lineStr)
    if (htmlBlock) {
      if (!hasHtmlBlockClose(src, lineEnd, lineStart, htmlBlock)) {
        return true
      }
    }
  }

  return false
}

interface HtmlBlockStart {
  kind: 'tag' | 'comment' | 'processing' | 'declaration' | 'cdata'
  tagName?: string
}

function getHtmlBlockStart(line: string): HtmlBlockStart | null {
  const trimmed = line.trimStart()
  const tagMatch = /^<(pre|script|style|textarea)\b/i.exec(trimmed)
  if (tagMatch) {
    const tagName = tagMatch[1].toLowerCase()
    if (new RegExp(`</${tagName}\\s*>`, 'i').test(trimmed))
      return null
    return { kind: 'tag', tagName: tagMatch[1].toLowerCase() }
  }
  if (trimmed.startsWith('<!--'))
    return trimmed.includes('-->', 4) ? null : { kind: 'comment' }
  if (trimmed.startsWith('<?'))
    return trimmed.includes('?>', 2) ? null : { kind: 'processing' }
  if (trimmed.startsWith('<![CDATA['))
    return trimmed.includes(']]>', 9) ? null : { kind: 'cdata' }
  if (/^<![A-Z]/i.test(trimmed))
    return trimmed.includes('>', 2) ? null : { kind: 'declaration' }
  return null
}

function hasHtmlBlockClose(src: string, openEnd: number, closeBefore: number, block: HtmlBlockStart): boolean {
  const body = src.slice(openEnd, closeBefore)
  switch (block.kind) {
    case 'tag': {
      const closeRe = new RegExp(`</${block.tagName}\\s*>`, 'i')
      return closeRe.test(body)
    }
    case 'comment':
      return body.includes('-->')
    case 'processing':
      return body.includes('?>')
    case 'declaration':
      return body.includes('>')
    case 'cdata':
      return body.includes(']]>')
  }
}

function mergeSmallRanges(ranges: SafeChunkRange[], minChars: number): SafeChunkRange[] {
  if (ranges.length <= 1)
    return ranges
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
