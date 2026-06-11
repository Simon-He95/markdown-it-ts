import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import type { GlobalMarkdownStateReason } from '../parse/global_state'
import type { ParserCore } from '../parse/parser_core'
import type { ChunkTableLimits, SafeChunkRange } from './chunk_cache'
import { detectGlobalMarkdownState, getKnownGlobalMarkdownState, resetKnownGlobalMarkdownState, runWithKnownGlobalMarkdownState } from '../parse/global_state'
import {
  beginParseDiagnostics,
  setStrategyDiagnostics,
} from '../parse/strategy_diagnostics'
import {
  appendTokens,
  ChunkTable,
  cloneTokens,
  computeContentFingerprint,
  detectHardBoundaries,
  expandDirtyRange,
  materializeCachedTokens,
  shiftTokenLines,
  splitIntoSafeChunkRanges,
} from './chunk_cache'

interface ParserRuleVersions {
  core: number
  block: number
  inline: number
  inline2: number
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface CachedStreamStats {
  total: number
  cacheHits: number
  appendHits: number // aliased for compatibility
  unboundedAppendHits?: number
  tailHits: number // aliased
  fullParses: number
  resets: number
  chunkedParses: number
  chunkHits: number // specific to CachedStreamParser
  chunkMisses: number // specific to CachedStreamParser
  appendedChunks: number // specific to CachedStreamParser
  invalidations: number // number of times the cache was invalidated
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
//   - Same source without global env state → instant full-source cache hit.
//   - Append (src.startsWith(cachedSrc)) → reuses cached prefix chunks,
//     parses the cached tail plus appended segment.
//   - Non-append edit → finds hard boundaries, reuses unchanged chunks,
//     re-parses changed ones + neighbors.
//   - Global markdown state (references, footnotes, abbr) → full fallback.
//   - Plugin usage disables chunk caching (conservative env safety).
//
// Cache safety notes:
//   - Cached sourceText is compared exactly before reusing chunk tokens.
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
  private fullCache: {
    src: string
    tokens: Token[]
    env: Record<string, unknown>
    globalStateReason: GlobalMarkdownStateReason | null
  } | null = null

  // Last known source and token array.
  private lastSrc = ''
  private lastTokens: Token[] = []

  // Minimum chars for a document to use chunking.
  private readonly MIN_CHUNK_CHARS = 500
  private readonly MIN_SAFE_CHUNK_CHARS = 1

  // Whether any plugin has been registered (env-sensitive).
  private pluginUsed = false
  private unsafeRuleChange = false

  // Whether the parser has been invalidated (will be reset on next parse).
  private invalidated = false

  // Stored limits used to create/recreate the ChunkTable.
  private tableLimits: ChunkTableLimits | undefined

  private ruleVersions: ParserRuleVersions | null = null

  constructor(core: ParserCore, limits?: ChunkTableLimits) {
    this.core = core
    this.tableLimits = limits
    this.table = new ChunkTable(limits)
  }

  // ---- Public API ----

  parse(src: string, env: Record<string, unknown> | undefined, md: MarkdownIt): Token[] {
    this.ensureRuleVersions(md)

    // If invalidated (e.g. by md.set/enable/disable/use), reset internal state.
    if (this.invalidated) {
      this.doReset()
    }

    const envProvided = env
    const cached = this.fullCache
    const workingEnv = envProvided ?? cached?.env ?? {}

    beginParseDiagnostics(workingEnv)
    this.stats.total++

    const globalStateReason = detectGlobalMarkdownState(src)

    // 1. Same source → full cache hit
    if (
      cached
      && !this.pluginUsed
      && !this.unsafeRuleChange
      && src === cached.src
      && (!envProvided || envProvided === cached.env)
      && !cached.globalStateReason
      && !globalStateReason
    ) {
      this.stats.cacheHits++
      this.stats.lastMode = 'cache'
      setStrategyDiagnostics(workingEnv, { area: 'stream', path: 'stream-cache', reason: 'same-source' })
      return cached.tokens
    }

    // 2. Global state → full fallback (reference, footnote, abbreviation definitions)
    if (globalStateReason) {
      const tokens = this.fullParse(src, workingEnv, md, globalStateReason)
      this.stats.fullParses++
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(workingEnv, {
        area: 'stream',
        path: 'stream-full',
        reason: `global-state:${globalStateReason}`,
      })
      return tokens
    }
    if (getKnownGlobalMarkdownState(workingEnv))
      resetKnownGlobalMarkdownState(workingEnv)

    if (this.pluginUsed || this.unsafeRuleChange) {
      const tokens = this.fullParse(src, workingEnv, md, null)
      this.stats.fullParses++
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(workingEnv, {
        area: 'stream',
        path: 'stream-full',
        reason: this.pluginUsed ? 'plugin-used' : 'rule-changed',
      })
      return tokens
    }

    // 4. Append detection (only for documents large enough that the
    //    context window doesn't cover the entire source).
    if (
      this.lastSrc
      && src.startsWith(this.lastSrc)
      && this.lastSrc.endsWith('\n')
      && this.lastSrc.length >= 200
    ) {
      const appended = src.slice(this.lastSrc.length)
      if (appended && appended.charCodeAt(appended.length - 1) === 0x0A) {
        if (this.endsInsideOpenFence(this.lastSrc))
          return this.handleFullParse(src, workingEnv, md)
        return this.handleAppend(src, workingEnv, md)
      }
    }

    // 5. Non-append or small document → chunk-aware parse
    return this.handleFullParse(src, workingEnv, md)
  }

  peek(): Token[] {
    return this.lastTokens
  }

  reset(): void {
    const resets = this.stats.resets + 1
    this.doReset()
    this.stats = makeEmptyStats()
    this.stats.resets = resets
    this.stats.lastMode = 'reset'
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
   * Update the ChunkTable's memory limits. If the parser is currently live
   * (not invalidated), the existing table's limits are updated in-place and
   * overflow entries evicted. Otherwise the new limits take effect on the
   * next doReset().
   */
  reconfigureTable(limits: ChunkTableLimits): void {
    this.tableLimits = {
      ...this.tableLimits,
      ...(limits.maxChunks === undefined ? {} : { maxChunks: limits.maxChunks }),
      ...(limits.maxTotalChars === undefined ? {} : { maxTotalChars: limits.maxTotalChars }),
      ...(limits.maxTotalTokens === undefined ? {} : { maxTotalTokens: limits.maxTotalTokens }),
    }
    if (!this.invalidated) {
      this.table.updateLimits(limits)
    }
    // If invalidated, doReset() will create a fresh table with these limits.
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

  setUnsafeRuleChange(): void {
    this.unsafeRuleChange = true
    this.invalidate()
  }

  noteSafeRuleChange(md: MarkdownIt): void {
    this.ruleVersions = this.readRuleVersions(md)
    this.invalidate()
  }

  getStats(): CachedStreamStats {
    return { ...this.stats }
  }

  resetStats(): void {
    const { resets } = this.stats
    this.stats = makeEmptyStats()
    this.stats.resets = resets
  }

  // ---- Private ----

  private ensureRuleVersions(md: MarkdownIt): void {
    const next = this.readRuleVersions(md)
    const previous = this.ruleVersions

    if (!previous) {
      this.ruleVersions = next
      return
    }

    if (
      next.core !== previous.core
      || next.block !== previous.block
      || next.inline !== previous.inline
      || next.inline2 !== previous.inline2
    ) {
      this.unsafeRuleChange = true
      if (!this.invalidated)
        this.invalidate()
      this.ruleVersions = next
    }
  }

  private readRuleVersions(md: MarkdownIt): ParserRuleVersions {
    return {
      core: md.core.ruler.version,
      block: md.block.ruler.version,
      inline: md.inline.ruler.version,
      inline2: md.inline.ruler2.version,
    }
  }

  private doReset(): void {
    // Recreate the ChunkTable so any stale limits from a previous
    // md.set() / reconfigureTable() are replaced.
    this.table = new ChunkTable(this.tableLimits)
    this.fullCache = null
    this.lastSrc = ''
    this.lastTokens = []
    this.invalidated = false
  }

  private handleAppend(
    src: string,
    env: Record<string, unknown>,
    md: MarkdownIt,
  ): Token[] {
    const chunks = this.table.getChunks()

    if (chunks.length > 0) {
      // ---- Chunk-anchored reparse ----
      // Re-parse from the start of the last chunk so we have full context
      // and can cache the new tail properly.
      return this.handleChunkAnchoredAppend(src, env, md, chunks)
    }

    return this.handleFullParse(src, env, md)
  }

  /** Append using the last cached chunk as re-parse anchor. */
  private handleChunkAnchoredAppend(
    src: string,
    env: Record<string, unknown>,
    md: MarkdownIt,
    chunks: ReadonlyArray<{ startOffset: number, startLine: number }>,
  ): Token[] {
    const lastChunk = chunks[chunks.length - 1]
    const anchorSrcOffset = lastChunk.startOffset
    const anchorLine = lastChunk.startLine
    const anchorTokenCount = this.findSplitIndex(this.lastTokens, anchorLine)

    // The tail includes the last chunk + appended text.
    const tailSrc = src.slice(anchorSrcOffset)
    const tailBoundaries = detectHardBoundaries(tailSrc)
    const tailRanges = splitIntoSafeChunkRanges(tailSrc, tailBoundaries, { minChars: this.MIN_SAFE_CHUNK_CHARS })

    // Build new token array: prefix (unchanged chunks) + re-parsed tail.
    const newTokens = this.lastTokens.slice(0, anchorTokenCount)

    // Invalidate old chunks in the re-parsed region.
    this.table.invalidateRange(anchorSrcOffset, src.length)

    let storedChunks = 0
    for (const range of tailRanges) {
      const chunkSrc = tailSrc.slice(range.start, range.end)
      const state = this.core.parse(chunkSrc, env, md)
      const localTokens = state.tokens
      const globalLineOffset = anchorLine + range.startLine
      const materialized = cloneTokens(localTokens)
      if (globalLineOffset > 0)
        shiftTokenLines(materialized, globalLineOffset)
      appendTokens(newTokens, materialized)

      const globalStart = anchorSrcOffset + range.start
      const globalEnd = anchorSrcOffset + range.end
      this.storeChunk(
        src,
        globalStart,
        globalEnd,
        globalLineOffset,
        range.lineCount,
        localTokens,
      )
      storedChunks++
    }

    this.lastTokens = newTokens
    this.stats.appendedChunks += storedChunks
    this.stats.appendHits++

    this.fullCache = { src, tokens: newTokens, env, globalStateReason: null }
    this.lastSrc = src
    this.stats.lastMode = 'append'
    setStrategyDiagnostics(env, {
      area: 'stream',
      path: 'stream-append',
      reason: 'chunk-anchored-append',
    })
    return newTokens
  }

  private endsInsideOpenFence(text: string): boolean {
    const WINDOW = 4000
    const start = text.length > WINDOW ? text.length - WINDOW : 0
    const chunk = text.slice(start)
    const len = chunk.length
    let inFence: { marker: number, length: number } | null = null
    let lineStart = 0

    while (lineStart <= len) {
      let lineEnd = chunk.indexOf('\n', lineStart)
      if (lineEnd === -1)
        lineEnd = len

      let p = lineStart
      while (p < lineEnd) {
        const c = chunk.charCodeAt(p)
        if (c === 0x20 || c === 0x09)
          p++
        else break
      }

      if (p < lineEnd) {
        const ch = chunk.charCodeAt(p)
        if (ch === 0x60 || ch === 0x7E) {
          let q = p
          while (q < lineEnd && chunk.charCodeAt(q) === ch) q++
          const runLen = q - p
          if (runLen >= 3) {
            if (!inFence)
              inFence = { marker: ch, length: runLen }
            else if (inFence.marker === ch && runLen >= inFence.length)
              inFence = null
          }
        }
      }

      if (lineEnd === len)
        break
      lineStart = lineEnd + 1
    }

    return inFence !== null
  }

  /**
   * Find the split index in tokens: the first token whose map starts
   * at or after `line`. At a hard boundary, no token spans across it,
   * so this correctly separates the prefix from the re-parsed tail.
   */
  private findSplitIndex(tokens: Token[], line: number): number {
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.map && t.map[0] >= line)
        return i
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
      const tokens = this.fullParse(src, env, md, null)
      this.stats.fullParses++
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(env, { area: 'stream', path: 'stream-full', reason: 'small-doc' })
      return tokens
    }

    // Find hard boundaries and split into safe ranges.
    const boundaries = detectHardBoundaries(src)
    const ranges = splitIntoSafeChunkRanges(src, boundaries, { minChars: this.MIN_SAFE_CHUNK_CHARS })

    // If no boundaries were found (or document is one big chunk), do a full parse.
    if (ranges.length <= 1) {
      const tokens = this.fullParse(src, env, md, null)
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
    const nextTable = new ChunkTable(this.tableLimits)
    let lineOffset = 0
    let hasCacheHits = false
    let hasCacheMisses = false

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i]
      const isDirty = expandedDirty.has(i)

      if (!isDirty) {
        // Try cache first for clean chunks.
        const cached = this.table.lookup(range, src)

        if (cached) {
          // Materialize cached tokens with global line offset.
          const materialized = materializeCachedTokens(cached, lineOffset)
          appendTokens(out, materialized)
          nextTable.store({ ...cached, generation: 0 })
          hasCacheHits = true
          this.stats.chunkHits++
        }
        else {
          // Cache miss — parse and store.
          const ch = src.slice(range.start, range.end)
          const state = this.core.parse(ch, env, md)
          // Tokens from core.parse have local line coords (line 0 = chunk start).
          const localTokens = state.tokens

          // Materialize for output (clone + shift).
          const materialized = cloneTokens(localTokens)
          if (lineOffset > 0)
            shiftTokenLines(materialized, lineOffset)
          appendTokens(out, materialized)
          hasCacheMisses = true
          this.stats.chunkMisses++

          // Store with LOCAL coordinates, not shifted.
          this.storeChunk(
            src,
            range.start,
            range.end,
            range.startLine,
            range.lineCount,
            localTokens,
            nextTable,
          )
        }
      }
      else {
        // Dirty chunk — always re-parse.
        const ch = src.slice(range.start, range.end)
        const state = this.core.parse(ch, env, md)
        const localTokens = state.tokens

        // Materialize for output (clone + shift).
        const materialized = cloneTokens(localTokens)
        if (lineOffset > 0)
          shiftTokenLines(materialized, lineOffset)
        appendTokens(out, materialized)
        hasCacheMisses = true
        this.stats.chunkMisses++

        // Store with LOCAL coordinates.
        this.storeChunk(
          src,
          range.start,
          range.end,
          range.startLine,
          range.lineCount,
          localTokens,
          nextTable,
        )
      }

      lineOffset += range.lineCount
    }

    // Update state
    this.table = nextTable
    this.fullCache = { src, tokens: out, env, globalStateReason: null }
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
    }
    else if (hasCacheHits) {
      this.stats.lastMode = 'chunked'
      setStrategyDiagnostics(env, {
        area: 'stream',
        path: 'stream-chunked',
        reason: 'partial-cached',
        chunked: true,
      })
    }
    else {
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
      const cached = this.table.lookup(range, src)
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
    table = this.table,
  ): void {
    const fingerprint = computeContentFingerprint(src, startOffset, endOffset)
    const tokenCount = countAllTokens(tokens)

    table.store({
      startOffset,
      endOffset,
      startLine,
      lineCount,
      fingerprint,
      sourceText: src.slice(startOffset, endOffset),
      tokens,
      generation: 0, // will be overwritten by ChunkTable.store()
      charLength: fingerprint.length,
      tokenCount,
    })
  }

  private fullParse(
    src: string,
    env: Record<string, unknown>,
    md: MarkdownIt,
    globalStateReason: GlobalMarkdownStateReason | null,
  ): Token[] {
    const tokens = runWithKnownGlobalMarkdownState(env, globalStateReason, () => {
      return this.core.parse(src, env, md).tokens
    })
    this.fullCache = { src, tokens, env, globalStateReason }
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
