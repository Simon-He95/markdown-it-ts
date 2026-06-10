import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import type { ParserCore } from '../parse/parser_core'
import { countLines } from '../common/utils'
import { detectGlobalMarkdownState } from '../parse/global_state'
import {
  beginParseDiagnostics,
  setStrategyDiagnostics,
} from '../parse/strategy_diagnostics'
import {
  appendTokens,
  CachedChunk,
  ChunkTable,
  cloneTokens,
  computeSourceHash,
  detectHardBoundaries,
  shiftTokenLines,
  splitIntoSafeChunkRanges,
} from './chunk_cache'

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface CachedStreamStats {
  total: number
  cacheHits: number       // entire source matched
  chunkHits: number       // individual chunk cache hits
  chunkMisses: number     // chunks that needed re-parsing
  fullParses: number      // full-document fallback
  chunkedParses: number   // multi-chunk parse without cache hits
  appendedChunks: number  // new chunks from append
  lastMode: 'idle' | 'cache' | 'append' | 'chunked' | 'full'
}

function makeEmptyStats(): CachedStreamStats {
  return {
    total: 0,
    cacheHits: 0,
    chunkHits: 0,
    chunkMisses: 0,
    fullParses: 0,
    chunkedParses: 0,
    appendedChunks: 0,
    lastMode: 'idle',
  }
}

// ---------------------------------------------------------------------------
// CachedStreamParser
//
// A stream parser that maintains a per-chunk token cache. Designed for
// append-heavy workloads (AI output, logs, chat) where the document prefix
// stabilises and only the tail grows.
//
// Key behaviours:
//   - Same source → instant cache hit (O(1)).
//   - Append (src.startsWith(cachedSrc)) → reuses cached prefix chunks,
//     only parses the new appended segment.
//   - Non-append edit → finds hard boundaries, reuses unchanged chunks,
//     re-parses changed ones.
//   - Global markdown state (references, footnotes, abbr) → full fallback.
// ---------------------------------------------------------------------------

export class CachedStreamParser {
  private readonly core: ParserCore
  private table = new ChunkTable()
  private stats: CachedStreamStats = makeEmptyStats()

  // Full-source cache (same as StreamParser) for the "identical source" fast-path.
  private fullCache: { src: string; tokens: Token[] } | null = null

  // Last known source and token array.
  private lastSrc = ''
  private lastTokens: Token[] = []

  // Minimum chars for a document to use chunking.
  private readonly MIN_CHUNK_CHARS = 500

  // Maximum chunks in the table before we evict oldest.
  private readonly MAX_CHUNKS = 256

  constructor(core: ParserCore) {
    this.core = core
  }

  // ---- Public API ----

  parse(src: string, env: Record<string, unknown> = {}, md: MarkdownIt): Token[] {
    beginParseDiagnostics(env)
    this.stats.total++

    // 1. Same source → full cache hit
    if (this.fullCache && src === this.fullCache.src) {
      this.stats.cacheHits++
      this.stats.lastMode = 'cache'
      setStrategyDiagnostics(env, { area: 'stream', path: 'stream-cache', reason: 'same-source' })
      return this.fullCache.tokens
    }

    // 2. Global state → full fallback
    const globalStateReason = detectGlobalMarkdownState(src)
    if (globalStateReason) {
      const tokens = this.fullParse(src, env, md)
      this.stats.fullParses++
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(env, {
        area: 'stream',
        path: 'stream-full',
        reason: `global-state:${globalStateReason}`,
      })
      return tokens
    }

    // 3. Append detection (only for documents large enough that the
    //    context window doesn't cover the entire source).
    if (
      this.lastSrc &&
      src.startsWith(this.lastSrc) &&
      this.lastSrc.endsWith('\n') &&
      this.lastSrc.length >= 200
    ) {
      const appended = src.slice(this.lastSrc.length)
      if (appended && appended.charCodeAt(appended.length - 1) === 0x0A) {
        return this.handleAppend(src, appended, env, md)
      }
    }

    // 4. Non-append or small document → chunk-aware parse
    return this.handleFullParse(src, env, md)
  }

  peek(): Token[] {
    return this.lastTokens
  }

  reset(): void {
    this.table.clear()
    this.fullCache = null
    this.lastSrc = ''
    this.lastTokens = []
    this.stats = makeEmptyStats()
  }

  getStats(): CachedStreamStats {
    return { ...this.stats }
  }

  // ---- Private ----

  private handleAppend(
    src: string,
    appended: string,
    env: Record<string, unknown>,
    md: MarkdownIt,
  ): Token[] {
    const cachedLineCount = countLines(this.lastSrc)
    const chunks = this.table.getChunks()

    if (chunks.length > 0) {
      // ---- Chunk-anchored reparse ----
      // Re-parse from the start of the last chunk so we have full context
      // and can cache the new tail properly.
      return this.handleChunkAnchoredAppend(src, appended, env, md, cachedLineCount, chunks)
    }

    // ---- No cached chunks: context-based tail reparse ----
    // Fall back to a lightweight context-aware append (same strategy
    // as the existing StreamParser).
    const ctxLines = Math.min(4, Math.max(1, cachedLineCount - 1))
    const contextPrefix = this.getTailLines(this.lastSrc, ctxLines)
    const contextLineCount = countLines(contextPrefix)

    const combined = contextPrefix + appended
    const ctxState = this.core.parse(combined, env, md)
    const ctxTokens = ctxState.tokens

    const splitIdx = ctxTokens.findIndex(
      t => t.map && typeof t.map[1] === 'number' && t.map[1] > contextLineCount,
    )

    let appendedTokens: Token[]
    if (splitIdx !== -1) {
      appendedTokens = ctxTokens.slice(splitIdx)
      const shiftBy = cachedLineCount - contextLineCount
      if (shiftBy > 0) shiftTokenLines(appendedTokens, shiftBy)
    } else {
      appendedTokens = []
    }

    // Truncate the context region from lastTokens.
    const contextStartLine = cachedLineCount - contextLineCount
    const splitIndex = this.findSplitIndex(this.lastTokens, contextStartLine)
    const newTokens = this.lastTokens.slice(0, splitIndex)
    appendTokens(newTokens, appendedTokens)

    // Invalidate trailing range in chunk table.
    const trailStart = Math.max(0, this.lastSrc.length - contextPrefix.length)
    this.table.invalidateRange(trailStart, src.length)

    // Cache the new trailing segment.
    if (appendedTokens.length > 0) {
      this.table.store({
        startOffset: this.lastSrc.length,
        endOffset: src.length,
        startLine: cachedLineCount,
        lineCount: countLines(appended),
        sourceHash: computeSourceHash(src, this.lastSrc.length, src.length),
        tokens: cloneTokens(appendedTokens),
      })
      this.stats.appendedChunks++
    }

    this.fullCache = { src, tokens: newTokens }
    this.lastSrc = src
    this.lastTokens = newTokens
    this.stats.lastMode = 'append'
    setStrategyDiagnostics(env, {
      area: 'stream',
      path: 'stream-append',
      reason: 'context-append',
    })
    return newTokens
  }

  /** Append using the last cached chunk as re-parse anchor. */
  private handleChunkAnchoredAppend(
    src: string,
    appended: string,
    env: Record<string, unknown>,
    md: MarkdownIt,
    cachedLineCount: number,
    chunks: readonly CachedChunk[],
  ): Token[] {
    const lastChunk = chunks[chunks.length - 1]
    const anchorSrcOffset = lastChunk.startOffset
    const anchorLine = lastChunk.startLine
    const anchorTokenCount = this.findSplitIndex(this.lastTokens, anchorLine)

    // The tail includes the last chunk + appended text.
    const tailSrc = src.slice(anchorSrcOffset)
    const tailState = this.core.parse(tailSrc, env, md)
    const tailTokens = tailState.tokens

    if (anchorLine > 0) {
      shiftTokenLines(tailTokens, anchorLine)
    }

    // Build new token array: prefix (unchanged chunks) + re-parsed tail.
    const newTokens = this.lastTokens.slice(0, anchorTokenCount)
    appendTokens(newTokens, tailTokens)
    this.lastTokens = newTokens

    // Invalidate old chunks in the re-parsed region.
    this.table.invalidateRange(anchorSrcOffset, src.length)

    // Cache new chunks for the re-parsed tail.
    const tailBoundaries = detectHardBoundaries(tailSrc)
    const tailRanges = splitIntoSafeChunkRanges(tailSrc, tailBoundaries, { minChars: 500 })
    for (const range of tailRanges) {
      const globalStart = anchorSrcOffset + range.start
      const globalEnd = anchorSrcOffset + range.end
      this.table.store({
        startOffset: globalStart,
        endOffset: globalEnd,
        startLine: anchorLine + range.startLine,
        lineCount: range.lineCount,
        sourceHash: computeSourceHash(src, globalStart, globalEnd),
        tokens: cloneTokens(tailState.tokens),
      })
    }
    this.stats.appendedChunks++

    this.fullCache = { src, tokens: newTokens }
    this.lastSrc = src
    this.stats.lastMode = 'append'
    setStrategyDiagnostics(env, {
      area: 'stream',
      path: 'stream-append',
      reason: 'chunk-anchored-append',
    })
    return newTokens
  }

  /** Get the last N lines from a string, preserving trailing newline. */
  private getTailLines(src: string, lineCount: number): string {
    if (lineCount <= 0 || src.length === 0) return ''
    const hasTrailingNl = src.charCodeAt(src.length - 1) === 0x0A
    const parts = src.split('\n')
    const contentLines = hasTrailingNl ? parts.slice(0, -1) : parts
    const start = Math.max(0, contentLines.length - lineCount)
    const result = contentLines.slice(start).join('\n')
    return hasTrailingNl ? result + '\n' : result
  }

  /**
   * Find the split index in tokens: the first token whose map starts
   * at or after `line`. At a hard boundary, no token spans across it,
   * so this correctly separates the prefix from the re-parsed tail.
   */
  private findSplitIndex(tokens: Token[], line: number): number {
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.map && t.map[0] >= line) return i
    }
    return tokens.length
  }

  private handleFullParse(
    src: string,
    env: Record<string, unknown>,
    md: MarkdownIt,
  ): Token[] {
    // For small documents, just do a full parse (chunk overhead not worth it).
    if (src.length < this.MIN_CHUNK_CHARS) {
      const tokens = this.fullParse(src, env, md)
      this.stats.fullParses++
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(env, { area: 'stream', path: 'stream-full', reason: 'small-doc' })
      return tokens
    }

    // Find hard boundaries and split into safe ranges.
    const boundaries = detectHardBoundaries(src)
    const ranges = splitIntoSafeChunkRanges(src, boundaries, { minChars: 500 })

    // If no boundaries were found (or document is one big chunk), do a full parse.
    if (ranges.length <= 1) {
      const tokens = this.fullParse(src, env, md)
      this.stats.fullParses++
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(env, {
        area: 'stream',
        path: 'stream-full',
        reason: 'no-safe-boundaries',
      })
      return tokens
    }

    // Reconstruct from cached + newly parsed chunks.
    const out: Token[] = []
    let lineOffset = 0
    let hasCacheHits = false
    let hasCacheMisses = false

    for (const range of ranges) {
      const cached = this.table.lookup(range.start, src, range.end)

      if (cached) {
        // Reuse cached tokens (they have local line numbers)
        const reused = cloneTokens(cached.tokens)
        if (lineOffset > 0) {
          shiftTokenLines(reused, lineOffset)
        }
        appendTokens(out, reused)
        hasCacheHits = true
        this.stats.chunkHits++
      } else {
        // Parse and cache
        const ch = src.slice(range.start, range.end)
        const state = this.core.parse(ch, env, md)
        const tokens = state.tokens

        if (lineOffset > 0) {
          shiftTokenLines(tokens, lineOffset)
        }
        appendTokens(out, tokens)
        hasCacheMisses = true
        this.stats.chunkMisses++

        // Store in cache (local line numbers)
        this.table.store({
          startOffset: range.start,
          endOffset: range.end,
          startLine: range.startLine,
          lineCount: range.lineCount,
          sourceHash: computeSourceHash(src, range.start, range.end),
          tokens: cloneTokens(state.tokens),
        })

        // Limit table size: evict oldest chunks instead of clearing all.
        if (this.table.size > this.MAX_CHUNKS) {
          const chunks = this.table.getChunks()
          const evictCount = Math.floor(this.MAX_CHUNKS / 4)
          for (let i = 0; i < evictCount && i < chunks.length; i++) {
            this.table.invalidateRange(chunks[i].startOffset, chunks[i].endOffset)
          }
        }
      }

      lineOffset += range.lineCount
    }

    // Update state
    this.fullCache = { src, tokens: out }
    this.lastSrc = src
    this.lastTokens = out

    if (hasCacheHits && !hasCacheMisses) {
      this.stats.lastMode = 'chunked'
      setStrategyDiagnostics(env, {
        area: 'stream',
        path: 'stream-chunked',
        reason: 'all-cached',
        chunked: true,
      })
    } else if (hasCacheHits) {
      this.stats.lastMode = 'chunked'
      setStrategyDiagnostics(env, {
        area: 'stream',
        path: 'stream-chunked',
        reason: 'partial-cached',
        chunked: true,
      })
    } else {
      this.stats.chunkedParses++
      this.stats.lastMode = 'chunked'
      setStrategyDiagnostics(env, {
        area: 'stream',
        path: 'stream-chunked',
        reason: 'no-cache-hits',
        chunked: true,
      })
    }

    return out
  }

  private fullParse(src: string, env: Record<string, unknown>, md: MarkdownIt): Token[] {
    const state = this.core.parse(src, env, md)
    const tokens = state.tokens
    this.fullCache = { src, tokens }
    this.lastSrc = src
    this.lastTokens = tokens
    return tokens
  }
}

export default CachedStreamParser
