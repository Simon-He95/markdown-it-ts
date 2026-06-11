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
  cloneTokens,
  computeContentFingerprint,
  detectHardBoundaries,
  expandDirtyRange,
  materializeCachedTokens,
  shiftTokenLines,
  splitIntoSafeChunkRanges,
} from './chunk_cache'
import type { ChunkTableLimits, SafeChunkRange } from './chunk_cache'
import { ChunkTable } from './chunk_cache'

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface CachedStreamStats {
  total: number
  cacheHits: number
  appendHits: number        // aliased for compatibility
  unboundedAppendHits?: number
  tailHits: number           // aliased
  fullParses: number
  resets: number
  chunkedParses: number
  chunkHits: number          // specific to CachedStreamParser
  chunkMisses: number        // specific to CachedStreamParser
  appendedChunks: number     // specific to CachedStreamParser
  invalidations: number       // number of times the cache was invalidated
  lastMode: 'idle' | 'cache' | 'append' | 'tail' | 'full' | 'reset' | 'chunked'
}

function makeEmptyStats(): CachedStreamStats {
  return {
    total: 0,
    cacheHits: 0,
    appendHits: 0,
    unboundedAppendHits: 0,
    tailHits: 0,
    fullParses: 0,
    resets: 0,
    chunkedParses: 0,
    chunkHits: 0,
    chunkMisses: 0,
    appendedChunks: 0,
    invalidations: 0,
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
//     re-parses changed ones + neighbors.
//   - Global markdown state (references, footnotes, abbr) → full fallback.
//   - Plugin usage disables chunk caching (conservative env safety).
//
// Cache correctness guarantees:
//   - Content fingerprint (hash + length + first/last chars) prevents
//     collision-based false positives.
//   - Generation-based invalidation ensures stale chunks are evicted after
//     md.set(), md.enable(), md.disable(), or md.use().
//   - Cached tokens retain chunk-local line maps; materialization clones
//     and shifts to the caller's coordinate space.
//   - Dirty range neighbor expansion prevents boundary-change artifacts
//     on middle edits.
// ---------------------------------------------------------------------------

export class CachedStreamParser {
  private readonly core: ParserCore
  private table: ChunkTable
  private stats: CachedStreamStats = makeEmptyStats()

  // Full-source cache (same as StreamParser) for the "identical source" fast-path.
  private fullCache: { src: string; tokens: Token[] } | null = null

  // Last known source and token array.
  private lastSrc = ''
  private lastTokens: Token[] = []

  // Minimum chars for a document to use chunking.
  private readonly MIN_CHUNK_CHARS = 500

  // Whether any plugin has been registered (env-sensitive).
  private pluginUsed = false

  // Whether the parser has been invalidated (will be reset on next parse).
  private invalidated = false

  constructor(core: ParserCore, limits?: ChunkTableLimits) {
    this.core = core
    this.table = new ChunkTable(limits)
  }

  // ---- Public API ----

  parse(src: string, env: Record<string, unknown> = {}, md: MarkdownIt): Token[] {
    beginParseDiagnostics(env)
    this.stats.total++

    // If invalidated (e.g. by md.set/enable/disable/use), reset internal state.
    if (this.invalidated) {
      this.doReset()
    }

    // 1. Same source → full cache hit
    if (this.fullCache && src === this.fullCache.src) {
      this.stats.cacheHits++
      this.stats.lastMode = 'cache'
      setStrategyDiagnostics(env, { area: 'stream', path: 'stream-cache', reason: 'same-source' })
      return this.fullCache.tokens
    }

    // 2. Global state → full fallback (reference, footnote, abbreviation definitions)
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

    // 3. Plugin usage disables chunk caching to protect env side effects.
    //    When a plugin writes to env, skipping a chunk's parse would lose that data.
    if (this.pluginUsed) {
      const tokens = this.fullParse(src, env, md)
      this.stats.fullParses++
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(env, {
        area: 'stream',
        path: 'stream-full',
        reason: 'plugin-used',
      })
      return tokens
    }

    // 4. Append detection (only for documents large enough that the
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

    // 5. Non-append or small document → chunk-aware parse
    return this.handleFullParse(src, env, md)
  }

  peek(): Token[] {
    return this.lastTokens
  }

  reset(): void {
    this.doReset()
    this.stats = makeEmptyStats()
  }

  /**
   * Signal that external state (options, plugins, rules) has changed.
   * The next parse() call will clear all caches and rebuild from scratch.
   */
  invalidate(): void {
    this.invalidated = true
    this.stats.invalidations++
  }

  /**
   * Mark that a plugin has been registered. When true, chunk caching is
   * disabled to protect env side effects.
   */
  setPluginUsed(used: boolean): void {
    this.pluginUsed = used
    if (used) {
      this.invalidate()
    }
  }

  getStats(): CachedStreamStats {
    return { ...this.stats }
  }

  resetStats(): void {
    this.stats = makeEmptyStats()
  }

  // ---- Private ----

  private doReset(): void {
    this.table.invalidateAll()
    this.fullCache = null
    this.lastSrc = ''
    this.lastTokens = []
    this.invalidated = false
  }

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
    // Fall back to a lightweight context-aware append.
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
      this.storeChunk(
        src, this.lastSrc.length, src.length,
        cachedLineCount,
        countLines(appended),
        appendedTokens,
      )
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
    chunks: ReadonlyArray<{ startOffset: number; startLine: number }>,
  ): Token[] {
    const lastChunk = chunks[chunks.length - 1]
    const anchorSrcOffset = lastChunk.startOffset
    const anchorLine = lastChunk.startLine
    const anchorTokenCount = this.findSplitIndex(this.lastTokens, anchorLine)

    // The tail includes the last chunk + appended text, parsed with LOCAL coords.
    const tailSrc = src.slice(anchorSrcOffset)
    const tailState = this.core.parse(tailSrc, env, md)
    const tailTokens = tailState.tokens

    // Build new token array: prefix (unchanged chunks) + re-parsed tail.
    const newTokens = this.lastTokens.slice(0, anchorTokenCount)
    // Materialize tail tokens into global coordinates.
    const materializedTail = cloneTokens(tailTokens)
    if (anchorLine > 0) {
      shiftTokenLines(materializedTail, anchorLine)
    }
    appendTokens(newTokens, materializedTail)
    this.lastTokens = newTokens

    // Invalidate old chunks in the re-parsed region.
    this.table.invalidateRange(anchorSrcOffset, src.length)

    // Cache the new trailing segment (stored with local coords).
    if (tailTokens.length > 0) {
      this.storeChunk(
        src, anchorSrcOffset, src.length,
        anchorLine,
        countLines(tailSrc),
        tailTokens, // stored as-is (local coords)
      )
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
    const ranges = splitIntoSafeChunkRanges(src, boundaries, { minChars: 2000 })

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

    // ---- Middle edit: identify dirty chunks ----
    // We compare each range against the cache. If a chunk content has changed
    // (fingerprint mismatch), it and its neighbors are marked dirty.
    const dirtyIndices = this.findDirtyIndices(ranges, src)

    // Expand dirty set to include neighbors (P0-7: prevent boundary artifacts).
    const expandedDirty = expandDirtyRange(dirtyIndices, ranges.length, 1, 1)

    // Reconstruct from cached + newly parsed chunks.
    const out: Token[] = []
    let lineOffset = 0
    let hasCacheHits = false
    let hasCacheMisses = false

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i]
      const isDirty = expandedDirty.has(i)

      if (!isDirty) {
        // Try cache first for clean chunks.
        const cached = this.table.lookup(range.start, src, range.end)

        if (cached) {
          // Materialize cached tokens with global line offset.
          const materialized = materializeCachedTokens(cached, lineOffset)
          appendTokens(out, materialized)
          hasCacheHits = true
          this.stats.chunkHits++
        } else {
          // Cache miss — parse and store.
          const ch = src.slice(range.start, range.end)
          const state = this.core.parse(ch, env, md)
          // Tokens from core.parse have local line coords (line 0 = chunk start).
          const localTokens = state.tokens

          // Materialize for output (clone + shift).
          const materialized = cloneTokens(localTokens)
          if (lineOffset > 0) shiftTokenLines(materialized, lineOffset)
          appendTokens(out, materialized)
          hasCacheMisses = true
          this.stats.chunkMisses++

          // Store with LOCAL coordinates, not shifted.
          this.storeChunk(
            src, range.start, range.end,
            range.startLine, range.lineCount,
            localTokens,
          )
        }
      } else {
        // Dirty chunk — always re-parse.
        const ch = src.slice(range.start, range.end)
        const state = this.core.parse(ch, env, md)
        const localTokens = state.tokens

        // Materialize for output (clone + shift).
        const materialized = cloneTokens(localTokens)
        if (lineOffset > 0) shiftTokenLines(materialized, lineOffset)
        appendTokens(out, materialized)
        hasCacheMisses = true
        this.stats.chunkMisses++

        // Store with LOCAL coordinates.
        this.storeChunk(
          src, range.start, range.end,
          range.startLine, range.lineCount,
          localTokens,
        )
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

  /**
   * Compare each range against the cache table and return the set of indices
   * whose content has changed (fingerprint mismatch or no cache entry).
   */
  private findDirtyIndices(ranges: SafeChunkRange[], src: string): Set<number> {
    const dirty = new Set<number>()
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i]
      const cached = this.table.lookup(range.start, src, range.end)
      if (!cached) {
        dirty.add(i)
      }
      // If cached exists but fingerprint matches, it's clean.
      // (fingerprint already verified during lookup)
    }
    return dirty
  }

  /**
   * Store a chunk in the table. The tokens must have LOCAL line coordinates
   * (line 0 = chunk start). We compute a content fingerprint and count tokens
   * for memory tracking.
   */
  private storeChunk(
    src: string,
    startOffset: number,
    endOffset: number,
    startLine: number,
    lineCount: number,
    tokens: Token[],
  ): void {
    const fingerprint = computeContentFingerprint(src, startOffset, endOffset)
    const tokenCount = countAllTokens(tokens)

    this.table.store({
      startOffset,
      endOffset,
      startLine,
      lineCount,
      fingerprint,
      tokens,
      generation: 0, // will be overwritten by ChunkTable.store()
      charLength: fingerprint.length,
      tokenCount,
    })
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

/**
 * Recursively count all tokens including children.
 */
function countAllTokens(tokens: Token[]): number {
  let count = 0
  const stack = [...tokens]
  while (stack.length) {
    const t = stack.pop()!
    count++
    if (t.children && t.children.length > 0) {
      for (let i = t.children.length - 1; i >= 0; i--) {
        stack.push(t.children[i])
      }
    }
  }
  return count
}

export default CachedStreamParser
