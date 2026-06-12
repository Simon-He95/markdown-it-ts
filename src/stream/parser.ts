import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import type { GlobalMarkdownStateReason } from '../parse/global_state'
import type { ParserCore } from '../parse/parser_core'
import { countLines } from '../common/utils'
import { detectGlobalMarkdownState, getKnownGlobalMarkdownState, resetKnownGlobalMarkdownState, runWithKnownGlobalMarkdownState } from '../parse/global_state'
import { beginParseDiagnostics, getParseDiagnostics, setStrategyDiagnostics } from '../parse/strategy_diagnostics'
import { recommendStreamChunkStrategy } from '../support/chunk_recommend'
import { chunkedParse } from './chunked'
import { getAutoUnboundedDecision, parseStringUnbounded, shouldAutoUseUnbounded } from './unbounded'

interface StreamCache {
  src: string
  tokens: Token[]
  env: Record<string, unknown>
  // Cache line count to avoid recounting
  lineCount?: number
  lastSegment?: StreamSegment | null
  globalStateReason?: GlobalMarkdownStateReason | null
  globalStateCarry?: string
}

interface StreamSegment {
  tokenStart: number
  tokenEnd: number
  lineStart: number
  lineEnd: number
  srcOffset: number
}

const EMPTY_TOKENS: Token[] = []
const GLOBAL_STATE_APPEND_SCAN_WINDOW = 4096

function appendedHasBlockConstructs(s: string): boolean {
  const len = s.length
  let lineStart = 0
  while (lineStart <= len) {
    let lineEnd = s.indexOf('\n', lineStart)
    if (lineEnd === -1)
      lineEnd = len
    const hasLineBreak = lineEnd < len

    let p = lineStart
    let indent = 0
    while (p < lineEnd) {
      const c = s.charCodeAt(p)
      if (c === 0x20 /* space */) {
        indent++
        p++
        if (indent >= 4)
          return true
        continue
      }
      if (c === 0x09 /* tab */) {
        indent += 4 - (indent % 4)
        p++
        if (indent >= 4)
          return true
        continue
      }
      break
    }

    if (p < lineEnd) {
      const ch = s.charCodeAt(p)
      switch (ch) {
        case 0x23: { // #
          let q = p
          while (q < lineEnd && s.charCodeAt(q) === 0x23) q++
          const runLen = q - p
          if (runLen > 0 && runLen <= 6) {
            if (q < lineEnd) {
              const next = s.charCodeAt(q)
              if (next === 0x20 || next === 0x09 || next === 0x0D)
                return true
            }
            else if (q === lineEnd && hasLineBreak) {
              return true
            }
          }
          break
        }
        case 0x3E: { // >
          const nextPos = p + 1
          if (nextPos < lineEnd) {
            const next = s.charCodeAt(nextPos)
            if (next === 0x20 || next === 0x09 || next === 0x0D)
              return true
          }
          else if (nextPos === lineEnd && hasLineBreak) {
            return true
          }
          break
        }
        case 0x2D: // -
        case 0x2A: // *
        case 0x2B: { // +
          const nextPos = p + 1
          if (nextPos < lineEnd) {
            const next = s.charCodeAt(nextPos)
            if (next === 0x20 || next === 0x09 || next === 0x0D)
              return true
          }
          else if (nextPos === lineEnd && hasLineBreak) {
            return true
          }
          break
        }
        case 0x60: // `
        case 0x7E: { // ~
          let q = p
          while (q < lineEnd && s.charCodeAt(q) === ch) q++
          if (q - p >= 3)
            return true
          break
        }
        default: {
          if (ch >= 0x30 && ch <= 0x39) {
            let q = p + 1
            while (q < lineEnd) {
              const d = s.charCodeAt(q)
              if (d < 0x30 || d > 0x39)
                break
              q++
            }
            if (q < lineEnd && s.charCodeAt(q) === 0x2E) {
              const nextPos = q + 1
              if (nextPos < lineEnd) {
                const next = s.charCodeAt(nextPos)
                if (next === 0x20 || next === 0x09 || next === 0x0D)
                  return true
              }
              else if (nextPos === lineEnd && hasLineBreak) {
                return true
              }
            }
          }
          break
        }
      }
    }

    if (lineEnd === len)
      break
    lineStart = lineEnd + 1
  }
  return false
}

function attrsEqual(a?: [string, string][] | null, b?: [string, string][] | null): boolean {
  if (!a && !b)
    return true
  if (!a || !b || a.length !== b.length)
    return false
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1])
      return false
  }
  return true
}

function childrenEqual(a?: Token[] | null, b?: Token[] | null): boolean {
  if (!a && !b)
    return true
  if (!a || !b || a.length !== b.length)
    return false
  for (let i = 0; i < a.length; i++) {
    if (!tokenEquals(a[i], b[i]))
      return false
  }
  return true
}

function tokenEquals(x: Token | undefined, y: Token | undefined): boolean {
  if (!x || !y)
    return false
  if (x.type !== y.type)
    return false
  const xMap = x.map
  const yMap = y.map
  if (!!xMap !== !!yMap)
    return false
  if (xMap && yMap && (xMap[0] !== yMap[0] || xMap[1] !== yMap[1]))
    return false
  if (x.tag !== y.tag || x.nesting !== y.nesting)
    return false
  if (x.markup !== y.markup || x.info !== y.info)
    return false
  if (x.block !== y.block || x.hidden !== y.hidden)
    return false
  if (!attrsEqual(x.attrs, y.attrs))
    return false
  if (!childrenEqual(x.children, y.children))
    return false
  return (x.content || '') === (y.content || '')
}

export interface StreamStats {
  total: number
  cacheHits: number
  appendHits: number
  unboundedAppendHits?: number
  tailHits: number
  fullParses: number
  resets: number
  chunkedParses?: number
  lastMode: 'idle' | 'cache' | 'append' | 'tail' | 'full' | 'reset' | 'chunked'
}

function makeEmptyStats(): StreamStats {
  return {
    total: 0,
    cacheHits: 0,
    appendHits: 0,
    unboundedAppendHits: 0,
    tailHits: 0,
    fullParses: 0,
    resets: 0,
    chunkedParses: 0,
    lastMode: 'idle',
  }
}

export class StreamParser {
  private readonly core: ParserCore
  private cache: StreamCache | null = null
  private stats: StreamStats = makeEmptyStats()

  // Only use stream optimization for documents larger than this threshold
  private readonly MIN_SIZE_FOR_OPTIMIZATION = 1000 // characters
  // Allow caching for most real-world docs; skip only for extremely large payloads
  private readonly DEFAULT_SKIP_CACHE_CHARS = 1_000_000
  private readonly DEFAULT_SKIP_CACHE_LINES = 100_000
  // Keep the default path plain for small/medium stream inputs, but start
  // chunking slightly earlier so 1M append-heavy workloads do not spend their
  // first large step on a full parse before switching to tail reparses.
  private readonly IMPLICIT_STREAM_CHUNK_MIN_CHARS = 160_000
  // Container-merge pays off only when the tail list is already sizeable.
  private readonly MIN_LIST_LINES_FOR_MERGE = 80
  private readonly MIN_LIST_CHARS_FOR_MERGE = 800
  private readonly MIN_TABLE_LINES_FOR_MERGE = 48
  private readonly MIN_TABLE_CHARS_FOR_MERGE = 1200
  private readonly MIN_UNBOUNDED_APPEND_TOTAL_CHARS = 500_000
  private readonly MIN_UNBOUNDED_APPEND_CHARS = 64_000
  private readonly MIN_UNBOUNDED_APPEND_LINES = 700

  // (reserved for future adaptive strategy metrics)

  constructor(core: ParserCore) {
    this.core = core
  }

  reset(): void {
    this.cache = null
    this.stats.resets += 1
    this.stats.lastMode = 'reset'
  }

  resetStats(): void {
    const { resets } = this.stats
    this.stats = makeEmptyStats()
    this.stats.resets = resets
  }

  parse(src: string, env: Record<string, unknown> | undefined, md: MarkdownIt): Token[] {
    const envProvided = env
    const cached = this.cache
    beginParseDiagnostics(envProvided ?? cached?.env)

    // Only update the cache on the very first parse or when the current
    // source ends at a safe block boundary (double newline). This prevents
    if (!cached || (envProvided && envProvided !== cached.env)) {
      const workingEnv = envProvided ?? {}

      // Allow chunked for first parse when enabled and large enough
      const explicitChunkFallbackSetting = !!(md as any).__explicitStreamChunkFallbackSetting
      const canImplicitLargeInput = typeof (md as any).__canUseImplicitLargeInputStrategy === 'function'
        ? (md as any).__canUseImplicitLargeInputStrategy()
        : true
      const wantsChunking = !!md.options?.streamChunkedFallback
      const allowImplicitChunk = !explicitChunkFallbackSetting && canImplicitLargeInput
      const chunkedEnabled = wantsChunking || allowImplicitChunk
      const chunkAdaptive = md.options?.streamChunkAdaptive !== false
      const targetChunks = md.options?.streamChunkTargetChunks ?? 8
      const chunkSizeCharsCfg = md.options?.streamChunkSizeChars
      const chunkSizeLinesCfg = md.options?.streamChunkSizeLines
      const chunkMaxChunksCfg = md.options?.streamChunkMaxChunks
      const explicitChunkConfig = !!(md as any).__explicitStreamChunkConfig
      const auto = md.options?.autoTuneChunks !== false
      const chunkFenceAware = md.options?.streamChunkFenceAware ?? true

      const largeCachePolicy = md.options?.streamLargeCachePolicy ?? 'retain'
      const skipCacheChars = md.options?.streamSkipCacheAboveChars ?? this.DEFAULT_SKIP_CACHE_CHARS
      const skipCacheLines = md.options?.streamSkipCacheAboveLines ?? this.DEFAULT_SKIP_CACHE_LINES
      let srcLineCount: number | undefined
      let shouldSkipLargeCache = false
      if (largeCachePolicy === 'skip') {
        shouldSkipLargeCache = src.length >= skipCacheChars
        if (!shouldSkipLargeCache && skipCacheLines !== undefined) {
          srcLineCount = countLines(src)
          shouldSkipLargeCache = srcLineCount >= skipCacheLines
        }
      }

      if (shouldSkipLargeCache) {
        const parsed = this.parseFullDocument(src, workingEnv, md, srcLineCount, false)
        this.stats.total += 1
        this.stats.fullParses += 1
        this.stats.lastMode = 'full'
        setStrategyDiagnostics(workingEnv, { area: 'stream', path: 'stream-full', reason: 'skip-cache-large-one-shot', unbounded: !!getParseDiagnostics(workingEnv)?.unbounded })
        return parsed.tokens
      }
      else if (chunkedEnabled) {
        const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : (v > hi ? hi : v)
        if (srcLineCount === undefined)
          srcLineCount = countLines(src)
        const recommendation = auto && !explicitChunkConfig
          ? recommendStreamChunkStrategy(src.length, srcLineCount, md.options)
          : null
        const useChars = recommendation?.maxChunkChars
          ?? (chunkAdaptive ? clamp(Math.ceil(src.length / targetChunks), 8000, 64_000) : (chunkSizeCharsCfg ?? 10000))
        const useLines = recommendation?.maxChunkLines
          ?? (chunkAdaptive ? clamp(Math.ceil(srcLineCount / targetChunks), 150, 700) : (chunkSizeLinesCfg ?? 200))
        const useMaxChunks = recommendation?.maxChunks
          ?? (chunkAdaptive ? clamp(Math.ceil(src.length / 64_000), targetChunks, 32) : chunkMaxChunksCfg)
        // Avoid chunked fallback for character-by-character growth (no trailing newline)
        const hasTrailingNewline = src.length > 0 && src.charCodeAt(src.length - 1) === 0x0A
        const shouldAutoChunk = allowImplicitChunk
          && src.length >= this.IMPLICIT_STREAM_CHUNK_MIN_CHARS
          && recommendation?.strategy !== 'plain'
        if ((wantsChunking || shouldAutoChunk)
          && (src.length >= (useChars * 2) || srcLineCount >= (useLines * 2))
          && hasTrailingNewline) {
          const tokens = chunkedParse(md, src, workingEnv, {
            maxChunkChars: useChars,
            maxChunkLines: useLines,
            fenceAware: recommendation?.fenceAware ?? chunkFenceAware,
            maxChunks: useMaxChunks,
          })
          this.cache = { src, tokens, env: workingEnv, lineCount: srcLineCount, lastSegment: undefined, globalStateReason: detectGlobalMarkdownState(src) }
          this.updateCacheLineCount(this.cache, srcLineCount)
          this.recordChunkedParseResult(
            workingEnv,
            wantsChunking ? 'explicit-initial-large-doc' : 'default-initial-large-doc',
          )
          return tokens
        }
      }

      // initial parse
      const parsed = this.parseFullDocument(src, workingEnv, md, srcLineCount)
      srcLineCount = parsed.lineCount

      this.cache = { src, tokens: parsed.tokens, env: workingEnv, lineCount: srcLineCount, lastSegment: undefined, globalStateReason: detectGlobalMarkdownState(src) }
      this.updateCacheLineCount(this.cache, srcLineCount)
      this.stats.total += 1
      this.stats.fullParses += 1
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(workingEnv, { area: 'stream', path: 'stream-full', reason: 'initial-parse', unbounded: !!getParseDiagnostics(workingEnv)?.unbounded })
      return parsed.tokens
    }

    if (src === cached.src) {
      this.stats.total += 1
      this.stats.cacheHits += 1
      this.stats.lastMode = 'cache'
      setStrategyDiagnostics(cached.env, { area: 'stream', path: 'stream-cache', reason: 'same-source' })
      return cached.tokens
    }

    const appendDelta = src.startsWith(cached.src)
      ? src.slice(cached.src.length)
      : null
    let cachedGlobalStateReason = cached.globalStateReason
    if (cachedGlobalStateReason === undefined) {
      cachedGlobalStateReason = detectGlobalMarkdownState(cached.src)
      cached.globalStateReason = cachedGlobalStateReason
    }
    const currentGlobalStateReason = cachedGlobalStateReason
      ? null
      : (appendDelta !== null ? this.detectGlobalStateForAppend(cached, appendDelta) : detectGlobalMarkdownState(src))
    const nextGlobalStateReason = cachedGlobalStateReason || currentGlobalStateReason
    if (nextGlobalStateReason) {
      const fallbackEnv = envProvided ?? cached.env
      resetKnownGlobalMarkdownState(fallbackEnv)
      const fallbackGlobalStateReason = detectGlobalMarkdownState(src)
      const parsed = this.parseFullDocument(src, fallbackEnv, md)
      const nextTokens = parsed.tokens
      const lineCount = parsed.lineCount

      this.cache = {
        src,
        tokens: nextTokens,
        env: fallbackEnv,
        lineCount,
        lastSegment: undefined,
        globalStateReason: fallbackGlobalStateReason,
      }
      this.updateCacheLineCount(this.cache, lineCount)
      this.stats.total += 1
      this.stats.fullParses += 1
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(fallbackEnv, {
        area: 'stream',
        path: 'stream-full',
        reason: `global-state:${nextGlobalStateReason}`,
        unbounded: !!getParseDiagnostics(fallbackEnv)?.unbounded,
      })
      return nextTokens
    }

    // For small documents growing from scratch, optimization overhead is not worth it
    // But if we already have a cache, always try to optimize (user is editing)
    const threshold = md.options?.streamOptimizationMinSize ?? this.MIN_SIZE_FOR_OPTIMIZATION
    const isGrowingFromSmall = cached.src.length < threshold && src.length < threshold * 1.5

    if (isGrowingFromSmall && !src.startsWith(cached.src)) {
      // Small document with non-append edit - just reparse
      const fallbackEnv = envProvided ?? cached.env
      const parsed = this.parseFullDocument(src, fallbackEnv, md)
      const nextTokens = parsed.tokens
      const lineCount = parsed.lineCount
      this.cache = { src, tokens: nextTokens, env: fallbackEnv, lineCount, lastSegment: undefined, globalStateReason: detectGlobalMarkdownState(src) }
      this.updateCacheLineCount(this.cache, lineCount)
      this.stats.total += 1
      this.stats.fullParses += 1
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(fallbackEnv, { area: 'stream', path: 'stream-full', reason: 'small-non-append', unbounded: !!getParseDiagnostics(fallbackEnv)?.unbounded })
      return nextTokens
    }

    // inspect appended detection
    const appended = this.getAppendedSegment(cached, src, appendDelta)
    // debug info suppressed
    if (appended && !this.shouldPreferTailReparseForAppend(cached)) {
      // (no-op) appended preview suppressed
      // Fast-path: reuse existing tokens when new input is a clean append that starts on a fresh line.
      // This is conservative; edits requiring cross-block context still fall back to a full parse below.
      // Special-case: a single trailing newline closes the last line but doesn't
      // produce new tokens; we only need to extend end line maps for trailing blocks.
      // no special-casing for single newline here; we only append when we have
      // full line(s) content that end with a newline.

      // Try a context-aware parse: include a few lines from the end of the
      // cached source to give the block parser enough context when deciding
      // about boundaries (setext, admonitions, lists, fences, etc.). If we
      // can't confidently slice the tokens that belong to appended portion,
      // fall back to parsing appended alone.
      const cachedLineCount = cached.lineCount ?? countLines(cached.src)

      // Choose an adaptive context window based on appended size. Keep it
      // small to limit reparse cost but large enough to cover common
      // cross-line constructs.
      let ctxLines = 3
      if (appended.length > 5000)
        ctxLines = 8
      else if (appended.length > 1000)
        ctxLines = 6
      else if (appended.length > 200)
        ctxLines = 4

      // Ensure we don't request more context lines than we have cached
      ctxLines = Math.min(ctxLines, cachedLineCount)

      let appendedState = null
      let appendedStateMayOverlap = false
      // Context-parse strategy configuration (chars | lines | constructs)
      const ctxStrategy = (md.options?.streamContextParseStrategy as string) ?? 'chars'
      const CONTEXT_PARSE_MIN_CHARS = md.options?.streamContextParseMinChars ?? 200
      const CONTEXT_PARSE_MIN_LINES = md.options?.streamContextParseMinLines ?? 2

      let appendedLineCount: number | undefined
      const countAppendedLines = () => {
        if (appendedLineCount === undefined)
          appendedLineCount = countLines(appended)
        return appendedLineCount
      }

      const canDirectParseAppend = this.canDirectlyParseAppend(cached)
      const useUnboundedAppend = canDirectParseAppend && this.shouldUseUnboundedAppend(src, cached, appended)

      // Decide whether to attempt a context-aware parse based on strategy
      let shouldAttemptContext = false
      if (!canDirectParseAppend) {
        switch (ctxStrategy) {
          case 'lines': {
            shouldAttemptContext = countAppendedLines() >= CONTEXT_PARSE_MIN_LINES
            break
          }
          case 'constructs': {
            if (appended.length >= CONTEXT_PARSE_MIN_CHARS) {
              shouldAttemptContext = true
              break
            }
            if (appendedHasBlockConstructs(appended)) {
              shouldAttemptContext = true
              break
            }
            shouldAttemptContext = countAppendedLines() >= CONTEXT_PARSE_MIN_LINES
            break
          }
          case 'chars':
          default:
            shouldAttemptContext = appended.length >= CONTEXT_PARSE_MIN_CHARS
        }
      }

      // Only attempt context-aware parse when we have a positive ctx window
      // and the strategy indicates it's worthwhile.
      if (ctxLines > 0 && shouldAttemptContext) {
        // Build a small context string: last N lines of cached.src + appended
        const contextPrefix = this.getTailLines(cached.src, ctxLines)
        const ctxSrc = contextPrefix + appended

        try {
          const ctxState = this.core.parse(ctxSrc, cached.env, md)
          const ctxTokens = ctxState.tokens

          // Find the first token whose source range extends into the appended
          // region. Tokens ending exactly at ctxLines belong only to context.
          const idx = ctxTokens.findIndex(t => t.map && typeof t.map[1] === 'number' && t.map[1] > ctxLines)
          if (idx !== -1) {
            // Extract appended tokens and shift their line maps so they align
            // with the global cached line indices.
            const appendedTokens = ctxTokens.slice(idx)
            const shiftBy = cachedLineCount - ctxLines
            if (shiftBy !== 0)
              this.shiftTokenLines(appendedTokens, shiftBy)
            appendedState = { tokens: appendedTokens }
            appendedStateMayOverlap = true
          }
        }
        catch {
          // If context parse fails for any reason, we'll fall back below.
          appendedState = null
        }
      }
      else {
        appendedState = null
      }

      // Fallback: if context-aware extraction did not yield appended tokens,
      // parse appended alone and shift it by cached line count.
      if (!appendedState) {
        const lineOffset = cachedLineCount
        if (useUnboundedAppend) {
          appendedState = {
            tokens: parseStringUnbounded(md, appended, cached.env, { mode: 'stream' }),
          }
          if (lineOffset > 0)
            this.shiftTokenLines(appendedState.tokens, lineOffset)
        }
        else {
          const simpleState = this.core.parse(appended, cached.env, md)
          if (lineOffset > 0)
            this.shiftTokenLines(simpleState.tokens, lineOffset)
          appendedState = simpleState
        }
      }

      // Conservative merge: if the last cached token and the first appended token
      // are both inline tokens, merge their content/children to avoid splitting
      // inline content across flush boundaries which can change rendered HTML.
      let appendedTokenStart = 0
      if (cached.tokens.length > 0 && appendedState.tokens.length > 0) {
        const lastCached = cached.tokens[cached.tokens.length - 1]
        const firstApp = appendedState.tokens[0]
        try {
          if (lastCached.type === 'inline' && firstApp.type === 'inline') {
            if (firstApp.children && firstApp.children.length > 0) {
              if (!lastCached.children)
                lastCached.children = []
              this.appendTokens(lastCached.children, firstApp.children)
            }
            lastCached.content = (lastCached.content || '') + (firstApp.content || '')
            appendedTokenStart = 1
          }
        }
        catch {
          // Be conservative on error: fall back to simple push below
          appendedTokenStart = 0
        }
        // NOTE: previously had an aggressive paragraph-merge heuristic here that
        // attempted to splice an appended paragraph inline into the previous
        // paragraph. That heuristic caused distinct paragraphs to be concatenated
        // (breaking blank-line boundaries). Removing that rule preserves
        // paragraph boundaries while keeping the safer inline-token merge above.
      }

      // Append remaining tokens into cache
      const appendStart = cached.tokens.length
      if (appendedState.tokens.length > appendedTokenStart) {
        // Avoid duplicating tokens that are already present at the end of the cache.
        // If the beginning of appendedState.tokens matches a trailing sequence in
        // cached.tokens, drop the matching prefix from appendedState.tokens.
        const a = appendedState.tokens
        if (appendedStateMayOverlap) {
          const cachedTail = cached.tokens
          const maxCheck = Math.min(cachedTail.length, a.length - appendedTokenStart)

          let dup = 0
          for (let n = maxCheck; n > 0; n--) {
            let ok = true
            for (let i = 0; i < n; i++) {
              const tailToken = cachedTail[cachedTail.length - n + i]
              const prefToken = a[appendedTokenStart + i]
              if (!tokenEquals(tailToken, prefToken)) {
                ok = false
                break
              }
            }
            if (ok) {
              dup = n
              break
            }
          }

          if (dup > 0)
            appendedTokenStart += dup
        }

        if (a.length > appendedTokenStart)
          this.appendTokens(cached.tokens, a, appendedTokenStart)
      }

      // Update cache with new src and line count
      cached.src = src
      cached.globalStateReason = null
      const appendedLines = appendedLineCount ?? countAppendedLines()
      cached.lineCount = cachedLineCount + appendedLines
      if (cached.tokens.length > appendStart) {
        const appendedLastSegment = this.getLastSegment(cached.tokens, src, appendStart, cached.tokens.length, src.length - appended.length, cachedLineCount)
        if (appendedLastSegment) {
          cached.lastSegment = appendedLastSegment
        }
        else {
          cached.lastSegment = undefined
        }
      }
      else {
        cached.lastSegment = undefined
      }

      this.stats.total += 1
      this.stats.appendHits += 1
      if (useUnboundedAppend)
        this.stats.unboundedAppendHits = (this.stats.unboundedAppendHits || 0) + 1
      this.stats.lastMode = 'append'
      setStrategyDiagnostics(cached.env, {
        area: 'stream',
        path: useUnboundedAppend ? 'stream-unbounded-append' : 'stream-append',
        reason: useUnboundedAppend ? 'large-delta' : 'safe-append',
        unbounded: useUnboundedAppend,
      })
      return cached.tokens
    }

    const fallbackEnv = envProvided ?? cached.env

    const tailReparsed = this.tryTailSegmentReparse(src, cached, fallbackEnv, md)
    if (tailReparsed) {
      this.stats.total += 1
      this.stats.tailHits += 1
      this.stats.lastMode = 'tail'
      setStrategyDiagnostics(fallbackEnv, { area: 'stream', path: 'stream-tail', reason: 'tail-reparse' })
      return tailReparsed
    }

    // Optional: use chunked parse as a fallback for very large documents
    const explicitChunkFallbackSetting = !!(md as any).__explicitStreamChunkFallbackSetting
    const canImplicitLargeInput = typeof (md as any).__canUseImplicitLargeInputStrategy === 'function'
      ? (md as any).__canUseImplicitLargeInputStrategy()
      : true
    const wantsChunking = !!md.options?.streamChunkedFallback
    const allowImplicitChunk = !explicitChunkFallbackSetting && !appended && canImplicitLargeInput
    const chunkedEnabled = wantsChunking || allowImplicitChunk
    const chunkAdaptive = md.options?.streamChunkAdaptive !== false
    const targetChunks = md.options?.streamChunkTargetChunks ?? 8
    const chunkSizeCharsCfg = md.options?.streamChunkSizeChars
    const chunkSizeLinesCfg = md.options?.streamChunkSizeLines
    const chunkMaxChunksCfg = md.options?.streamChunkMaxChunks
    const explicitChunkConfig = !!(md as any).__explicitStreamChunkConfig
    const auto = md.options?.autoTuneChunks !== false
    const chunkFenceAware = md.options?.streamChunkFenceAware ?? true

    let srcLineCount2: number | undefined = appended && cached.lineCount !== undefined
      ? cached.lineCount + countLines(appended)
      : undefined
    if (chunkedEnabled) {
      if (srcLineCount2 === undefined)
        srcLineCount2 = countLines(src)
      const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : (v > hi ? hi : v)
      const recommendation = auto && !explicitChunkConfig
        ? recommendStreamChunkStrategy(src.length, srcLineCount2, md.options)
        : null
      const useChars = recommendation?.maxChunkChars
        ?? (chunkAdaptive ? clamp(Math.ceil(src.length / targetChunks), 8000, 64_000) : (chunkSizeCharsCfg ?? 10000))
      const useLines = recommendation?.maxChunkLines
        ?? (chunkAdaptive ? clamp(Math.ceil(srcLineCount2 / targetChunks), 150, 700) : (chunkSizeLinesCfg ?? 200))
      const useMaxChunks = recommendation?.maxChunks
        ?? (chunkAdaptive ? clamp(Math.ceil(src.length / 64_000), targetChunks, 32) : chunkMaxChunksCfg)
      const hasTrailingNewline2 = src.length > 0 && src.charCodeAt(src.length - 1) === 0x0A
      const shouldAutoChunk = allowImplicitChunk
        && src.length >= this.IMPLICIT_STREAM_CHUNK_MIN_CHARS
        && recommendation?.strategy !== 'plain'
      if ((wantsChunking || shouldAutoChunk)
        && (src.length >= (useChars * 2) || srcLineCount2 >= (useLines * 2))
        && hasTrailingNewline2) {
        const tokens = chunkedParse(md, src, fallbackEnv, {
          maxChunkChars: useChars,
          maxChunkLines: useLines,
          fenceAware: recommendation?.fenceAware ?? chunkFenceAware,
          maxChunks: useMaxChunks,
        })
        this.cache = { src, tokens, env: fallbackEnv, lineCount: srcLineCount2, lastSegment: undefined, globalStateReason: detectGlobalMarkdownState(src) }
        this.updateCacheLineCount(this.cache, srcLineCount2)
        this.recordChunkedParseResult(
          fallbackEnv,
          wantsChunking ? 'explicit-fallback-large-doc' : 'default-fallback-large-doc',
        )
        return tokens
      }
    }

    // full fallback parse
    const parsed = this.parseFullDocument(src, fallbackEnv, md, srcLineCount2)
    const nextTokens = parsed.tokens
    srcLineCount2 = parsed.lineCount
    this.cache = { src, tokens: nextTokens, env: fallbackEnv, lineCount: srcLineCount2, lastSegment: undefined, globalStateReason: detectGlobalMarkdownState(src) }
    this.updateCacheLineCount(this.cache, srcLineCount2)
    this.stats.total += 1
    this.stats.fullParses += 1
    this.stats.lastMode = 'full'
    setStrategyDiagnostics(fallbackEnv, { area: 'stream', path: 'stream-full', reason: 'fallback-full', unbounded: !!getParseDiagnostics(fallbackEnv)?.unbounded })
    return nextTokens
  }

  private recordChunkedParseResult(
    env: Record<string, unknown>,
    chunkReason: string,
  ): void {
    const chunkInfo = getParseDiagnostics(env)?.chunk
    const fallbackReason = chunkInfo?.fallback
      ? String(chunkInfo.fallbackReason || 'global-state')
      : null

    this.stats.total += 1

    if (fallbackReason) {
      this.stats.fullParses += 1
      this.stats.lastMode = 'full'

      setStrategyDiagnostics(env, {
        area: 'stream',
        path: 'stream-full',
        reason: `global-state:${fallbackReason}`,
        unbounded: !!getParseDiagnostics(env)?.unbounded,
      })

      return
    }

    this.stats.chunkedParses = (this.stats.chunkedParses || 0) + 1
    this.stats.lastMode = 'chunked'

    setStrategyDiagnostics(env, {
      area: 'stream',
      path: 'stream-chunked',
      chunked: true,
      reason: chunkReason,
    })
  }

  private parseFullDocument(
    src: string,
    env: Record<string, unknown>,
    md: MarkdownIt,
    knownLineCount?: number,
    needLineCount = true,
  ): { tokens: Token[], lineCount: number } {
    const currentGlobalStateReason = detectGlobalMarkdownState(src)
    if (getKnownGlobalMarkdownState(env))
      resetKnownGlobalMarkdownState(env)

    const canUseAutoUnbounded = typeof (md as any).__canUseImplicitLargeInputStrategy === 'function'
      ? (md as any).__canUseImplicitLargeInputStrategy()
      : true
    const autoUnboundedDecision = canUseAutoUnbounded
      ? getAutoUnboundedDecision(md, src.length, knownLineCount)
      : 'no'
    if (autoUnboundedDecision === 'yes') {
      const tokens = parseStringUnbounded(md, src, env)
      setStrategyDiagnostics(env, { area: 'stream', path: 'stream-full', reason: 'auto-unbounded-char-threshold', unbounded: true })
      return {
        tokens,
        lineCount: knownLineCount ?? (needLineCount ? countLines(src) : 0),
      }
    }

    let lineCount = knownLineCount
    if (autoUnboundedDecision === 'need-lines') {
      lineCount = countLines(src)
      if (shouldAutoUseUnbounded(md, src.length, lineCount)) {
        const tokens = parseStringUnbounded(md, src, env)
        setStrategyDiagnostics(env, { area: 'stream', path: 'stream-full', reason: 'auto-unbounded-line-threshold', unbounded: true })
        return { tokens, lineCount }
      }
    }

    if (lineCount === undefined)
      lineCount = needLineCount ? countLines(src) : 0

    const tokens = runWithKnownGlobalMarkdownState(env, currentGlobalStateReason, () => {
      return this.core.parse(src, env, md).tokens
    })

    return { tokens, lineCount }
  }

  private shouldUseUnboundedAppend(src: string, _cached: StreamCache, appended: string): boolean {
    if (!appended)
      return false

    const totalChars = src.length
    if (totalChars < this.MIN_UNBOUNDED_APPEND_TOTAL_CHARS && appended.length < this.MIN_UNBOUNDED_APPEND_CHARS)
      return false

    if (appended.length >= this.MIN_UNBOUNDED_APPEND_CHARS)
      return true

    return countLines(appended) >= this.MIN_UNBOUNDED_APPEND_LINES
  }

  private getAppendedSegment(cache: StreamCache, next: string, knownAppend?: string | null): string | null {
    const prev = cache.src
    if (knownAppend === null)
      return null
    if (knownAppend === undefined && !next.startsWith(prev))
      return null

    if (!prev.endsWith('\n'))
      return null

    const segment = knownAppend ?? next.slice(prev.length)
    if (!segment)
      return null

    const segLen = segment.length
    if (segment.charCodeAt(segLen - 1) !== 0x0A /* \n */)
      return null

    let newlineCount = 0
    let firstLineBreak = -1
    for (let i = 0; i < segLen; i++) {
      if (segment.charCodeAt(i) === 0x0A) {
        if (firstLineBreak === -1)
          firstLineBreak = i
        newlineCount++
        if (newlineCount >= 2)
          break
      }
    }
    if (newlineCount < 2)
      return null

    // Prevent setext heading underlines from using the fast-path since they
    // retroactively change the previous line's block type.
    const firstLine = firstLineBreak === -1 ? segment : segment.slice(0, firstLineBreak)
    const trimmedFirstLine = firstLine.trim()

    if (trimmedFirstLine.length === 0)
      return null

    if (/^[-=]+$/.test(trimmedFirstLine)) {
      const prevWithoutTrailingNewline = prev.slice(0, -1)
      const lastBreak = prevWithoutTrailingNewline.lastIndexOf('\n')
      const previousLine = prevWithoutTrailingNewline.slice(lastBreak + 1)
      if (previousLine.trim().length > 0)
        return null
    }

    // Heuristic safety: if previous content ends inside an open fenced code block,
    // avoid append fast-path since closing fence in appended segment would
    // retroactively change prior tokens.
    if (this.endsInsideOpenFence(prev) || this.cacheEndsWithOpenFence(cache))
      return null

    if (this.mayContainReferenceDefinition(segment))
      return null

    return segment
  }

  private cacheEndsWithOpenFence(cache: StreamCache): boolean {
    const lastSegment = this.ensureLastSegment(cache)
    if (!lastSegment)
      return false

    const token = cache.tokens[lastSegment.tokenStart]
    if (token?.type !== 'fence' || !token.map || !token.markup)
      return false

    const closingLine = token.map[1] - 1
    if (closingLine <= token.map[0])
      return true

    const lineStart = this.getLineStartOffset(cache.src, closingLine)
    let lineEnd = cache.src.indexOf('\n', lineStart)
    if (lineEnd === -1)
      lineEnd = cache.src.length

    return !this.isFenceCloseLine(cache.src, lineStart, lineEnd, token.markup)
  }

  private tryTailSegmentReparse(
    src: string,
    cached: StreamCache,
    env: Record<string, unknown>,
    md: MarkdownIt,
  ): Token[] | null {
    const lastSegment = this.ensureLastSegment(cached)
    if (!lastSegment)
      return null

    // No reusable prefix means we'd just be reparsing the entire document again.
    if (lastSegment.srcOffset <= 0 && lastSegment.tokenStart <= 0)
      return null

    const stablePrefix = cached.src.slice(0, lastSegment.srcOffset)
    if (!src.startsWith(stablePrefix))
      return null

    const prevTail = cached.src.slice(lastSegment.srcOffset)
    const nextTail = src.slice(lastSegment.srcOffset)
    if (nextTail === prevTail)
      return null

    const appended = src.startsWith(cached.src)
      ? src.slice(cached.src.length)
      : null
    if (appended) {
      const merged = this.tryContainerTailAppendMerge(src, cached, env, md, lastSegment, appended)
      if (merged)
        return merged
    }

    // Localized suffix reparses are safe for appends as long as the tail anchor
    // remains stable; the retroactive constructs below still fall back.
    if (this.mayContainReferenceDefinition(prevTail) || this.mayContainReferenceDefinition(nextTail))
      return null

    try {
      const tailState = this.core.parse(nextTail, env, md)
      const localLastSegment = this.getLastSegment(tailState.tokens, nextTail)
      if (lastSegment.lineStart > 0)
        this.shiftTokenLines(tailState.tokens, lastSegment.lineStart)

      cached.src = src
      cached.env = env
      cached.globalStateReason = null
      cached.globalStateCarry = undefined
      cached.tokens.length = lastSegment.tokenStart
      this.appendTokens(cached.tokens, tailState.tokens)
      cached.lineCount = lastSegment.lineStart + countLines(nextTail)
      if (localLastSegment) {
        cached.lastSegment = {
          tokenStart: lastSegment.tokenStart + localLastSegment.tokenStart,
          tokenEnd: lastSegment.tokenStart + localLastSegment.tokenEnd,
          lineStart: lastSegment.lineStart + localLastSegment.lineStart,
          lineEnd: lastSegment.lineStart + localLastSegment.lineEnd,
          srcOffset: lastSegment.srcOffset + localLastSegment.srcOffset,
        }
      }
      else {
        cached.lastSegment = null
      }
      return cached.tokens
    }
    catch {
      return null
    }
  }

  // Get the last N lines (by newline count) without splitting the full string.
  // Matches cached.src.split('\n').slice(-n).join('\n') semantics.
  private getTailLines(src: string, lineCount: number): string {
    if (lineCount <= 0)
      return ''

    let remaining = lineCount
    for (let i = src.length - 1; i >= 0; i--) {
      if (src.charCodeAt(i) === 0x0A /* \n */) {
        remaining--
        if (remaining === 0)
          return src.slice(i + 1)
      }
    }

    return src
  }

  // Detect if the given text ends while still inside an open fenced code block.
  // Scans backwards in a bounded window for performance.
  private endsInsideOpenFence(text: string): boolean {
    const WINDOW = 4000
    const start = text.length > WINDOW ? text.length - WINDOW : 0
    const firstScan = this.scanFenceState(text, start, start > 0 && text.charCodeAt(start - 1) !== 0x0A)
    if (!firstScan.inside || start === 0 || firstScan.firstFenceLineStart < 0)
      return firstScan.inside

    const contextStart = this.findPreviousFenceLineStart(text, firstScan.firstFenceLineStart, WINDOW)
    if (contextStart < 0)
      return true

    return this.scanFenceState(text, contextStart).inside
  }

  private scanFenceState(text: string, start: number, skipFirstPartialLine = false): { inside: boolean, firstFenceLineStart: number } {
    const len = text.length
    let inFence: { marker: number, length: number } | null = null
    let firstFenceLineStart = -1
    let lineStart = start
    let partialLine = skipFirstPartialLine
    while (lineStart <= len) {
      let lineEnd = text.indexOf('\n', lineStart)
      if (lineEnd === -1)
        lineEnd = len

      const marker = partialLine ? null : this.getFenceLineMarker(text, lineStart, lineEnd)
      if (marker) {
        if (firstFenceLineStart < 0)
          firstFenceLineStart = lineStart
        if (!inFence) {
          inFence = marker
        }
        else if (inFence.marker === marker.marker && marker.length >= inFence.length) {
          inFence = null
        }
      }

      if (lineEnd === len)
        break
      partialLine = false
      lineStart = lineEnd + 1
    }
    return { inside: inFence !== null, firstFenceLineStart }
  }

  private findPreviousFenceLineStart(text: string, before: number, window: number): number {
    const searchStart = before > window ? before - window : 0
    let lineEnd = before - 1
    if (lineEnd >= 0 && text.charCodeAt(lineEnd) === 0x0A)
      lineEnd--

    while (lineEnd >= searchStart) {
      let lineStart = lineEnd
      while (lineStart > searchStart && text.charCodeAt(lineStart - 1) !== 0x0A)
        lineStart--

      if (this.getFenceLineMarker(text, lineStart, lineEnd + 1))
        return lineStart

      lineEnd = lineStart - 2
    }

    return -1
  }

  private getFenceMarker(text: string, pos: number, lineEnd: number): { marker: number, length: number } | null {
    if (pos >= lineEnd)
      return null

    const ch = text.charCodeAt(pos)
    if (ch !== 0x60 /* ` */ && ch !== 0x7E /* ~ */)
      return null

    let q = pos
    while (q < lineEnd && text.charCodeAt(q) === ch) q++
    const runLen = q - pos
    return runLen >= 3 ? { marker: ch, length: runLen } : null
  }

  private getFenceLineMarker(text: string, lineStart: number, lineEnd: number): { marker: number, length: number } | null {
    let pos = lineStart
    let indent = 0
    while (pos < lineEnd && indent < 4) {
      const ch = text.charCodeAt(pos)
      if (ch === 0x20 /* space */) {
        pos++
        indent++
        continue
      }
      if (ch === 0x09 /* tab */) {
        indent += 4 - (indent % 4)
        pos++
        continue
      }
      break
    }
    if (indent >= 4)
      return null

    return this.getFenceMarker(text, pos, lineEnd)
  }

  private isFenceCloseLine(text: string, lineStart: number, lineEnd: number, markup: string): boolean {
    let pos = lineStart
    let indent = 0
    while (pos < lineEnd && text.charCodeAt(pos) === 0x20 /* space */ && indent < 4) {
      pos++
      indent++
    }
    if (indent >= 4)
      return false

    const marker = markup.charCodeAt(0)
    let runEnd = pos
    while (runEnd < lineEnd && text.charCodeAt(runEnd) === marker)
      runEnd++
    if (runEnd - pos < markup.length)
      return false

    for (let i = runEnd; i < lineEnd; i++) {
      const ch = text.charCodeAt(i)
      if (ch !== 0x20 /* space */ && ch !== 0x09 /* tab */ && ch !== 0x0D /* \r */)
        return false
    }

    return true
  }

  public peek(): Token[] {
    return this.cache?.tokens ?? EMPTY_TOKENS
  }

  public getStats(): StreamStats {
    return { ...this.stats }
  }

  // countLines moved to common utils for reuse

  private appendTokens(target: Token[], source: Token[], start = 0, end = source.length): void {
    for (let i = start; i < end; i++)
      target.push(source[i])
  }

  private updateCacheLineCount(cache: StreamCache, lineCount?: number): void {
    cache.lineCount = lineCount ?? countLines(cache.src)
    cache.lastSegment = undefined
    cache.globalStateCarry = undefined
  }

  private detectGlobalStateForAppend(cache: StreamCache, appended: string): GlobalMarkdownStateReason | null {
    if (cache.globalStateReason)
      return cache.globalStateReason

    const carry = cache.globalStateCarry ?? cache.src.slice(-GLOBAL_STATE_APPEND_SCAN_WINDOW)
    const text = carry + appended
    const reason = detectGlobalMarkdownState(text)

    cache.globalStateCarry = text.length > GLOBAL_STATE_APPEND_SCAN_WINDOW
      ? text.slice(text.length - GLOBAL_STATE_APPEND_SCAN_WINDOW)
      : text
    if (reason)
      cache.globalStateReason = reason

    return reason
  }

  private ensureLastSegment(cache: StreamCache): StreamSegment | null {
    if (cache.lastSegment !== undefined)
      return cache.lastSegment

    cache.lastSegment = this.getLastSegment(cache.tokens, cache.src)
    return cache.lastSegment
  }

  private getLastSegment(
    tokens: Token[],
    src: string,
    tokenStart = 0,
    tokenEnd = tokens.length,
    knownSrcOffset?: number,
    knownLineStart?: number,
  ): StreamSegment | null {
    if (tokenEnd <= tokenStart)
      return null

    let lineStart = Number.POSITIVE_INFINITY
    let lineEnd = -1
    let depth = 0

    for (let i = tokenEnd - 1; i >= tokenStart; i--) {
      const token = tokens[i]
      if (token.map) {
        if (token.map[0] < lineStart)
          lineStart = token.map[0]
        if (token.map[1] > lineEnd)
          lineEnd = token.map[1]
      }

      if (token.nesting < 0) {
        depth += -token.nesting
        continue
      }

      if (token.nesting > 0) {
        depth -= token.nesting
        if (token.level === 0 && depth <= 0) {
          const resolvedStart = Number.isFinite(lineStart)
            ? lineStart
            : (token.map?.[0] ?? 0)
          const resolvedEnd = lineEnd >= resolvedStart
            ? lineEnd
            : (token.map?.[1] ?? resolvedStart)
          return {
            tokenStart: i,
            tokenEnd,
            lineStart: resolvedStart,
            lineEnd: resolvedEnd,
            srcOffset: this.getLineStartOffset(src, resolvedStart, knownSrcOffset, knownLineStart),
          }
        }
        continue
      }

      if (token.level === 0 && depth === 0) {
        const resolvedStart = Number.isFinite(lineStart)
          ? lineStart
          : (token.map?.[0] ?? 0)
        const resolvedEnd = lineEnd >= resolvedStart
          ? lineEnd
          : (token.map?.[1] ?? resolvedStart)
        return {
          tokenStart: i,
          tokenEnd,
          lineStart: resolvedStart,
          lineEnd: resolvedEnd,
          srcOffset: this.getLineStartOffset(src, resolvedStart, knownSrcOffset, knownLineStart),
        }
      }
    }

    return null
  }

  private getLineStartOffset(src: string, line: number, knownSrcOffset?: number, knownLineStart?: number): number {
    if (knownSrcOffset !== undefined && knownLineStart !== undefined && line >= knownLineStart)
      return this.getLineStartOffsetFrom(src, knownSrcOffset, line - knownLineStart)

    if (line <= 0)
      return 0

    let remaining = line
    let pos = -1
    while (remaining > 0) {
      pos = src.indexOf('\n', pos + 1)
      if (pos === -1)
        return src.length
      remaining--
    }
    return pos + 1
  }

  private getLineStartOffsetFrom(src: string, startOffset: number, lineDelta: number): number {
    if (lineDelta <= 0)
      return startOffset

    let remaining = lineDelta
    let pos = startOffset - 1
    while (remaining > 0) {
      pos = src.indexOf('\n', pos + 1)
      if (pos === -1)
        return src.length
      remaining--
    }
    return pos + 1
  }

  private mayContainReferenceDefinition(src: string): boolean {
    if (!src.includes(']:'))
      return false

    return /(?:^|\n)[ \t]{0,3}\[[^\]\n]+\]:/.test(src)
  }

  private canDirectlyParseAppend(cache: StreamCache): boolean {
    if (!this.endsWithBlankLine(cache.src))
      return false

    const lastSegment = this.ensureLastSegment(cache)
    if (!lastSegment)
      return false

    const lastToken = cache.tokens[lastSegment.tokenStart]
    switch (lastToken?.type) {
      case 'paragraph_open':
      case 'heading_open':
      case 'fence':
      case 'code_block':
      case 'html_block':
      case 'hr':
      case 'table_open':
        return true
      default:
        return false
    }
  }

  private tryContainerTailAppendMerge(
    src: string,
    cached: StreamCache,
    env: Record<string, unknown>,
    md: MarkdownIt,
    lastSegment: StreamSegment,
    appended: string,
  ): Token[] | null {
    if (!appended || this.mayContainReferenceDefinition(appended))
      return null

    const lastToken = cached.tokens[lastSegment.tokenStart]
    switch (lastToken?.type) {
      case 'bullet_list_open':
      case 'ordered_list_open':
        return this.tryListTailAppendMerge(src, cached, env, md, lastSegment, appended, lastToken)
      case 'table_open':
        return this.tryTableTailAppendMerge(src, cached, env, md, lastSegment, appended, lastToken)
      default:
        return null
    }
  }

  private tryListTailAppendMerge(
    src: string,
    cached: StreamCache,
    env: Record<string, unknown>,
    md: MarkdownIt,
    lastSegment: StreamSegment,
    appended: string,
    listOpen: Token,
  ): Token[] | null {
    if (cached.src.length === 0 || cached.src.charCodeAt(cached.src.length - 1) !== 0x0A)
      return null

    const segmentLineSpan = lastSegment.lineEnd - lastSegment.lineStart
    const segmentChars = cached.src.length - lastSegment.srcOffset
    if (segmentLineSpan < this.MIN_LIST_LINES_FOR_MERGE && segmentChars < this.MIN_LIST_CHARS_FOR_MERGE)
      return null

    const closeType = listOpen.type === 'bullet_list_open' ? 'bullet_list_close' : 'ordered_list_close'
    let parsed: Token[]
    try {
      parsed = this.core.parse(appended, env, md).tokens
    }
    catch {
      return null
    }
    if (!this.isSingleTopLevelContainer(parsed, listOpen.type, closeType, listOpen.markup))
      return null

    const inserted = parsed.slice(1, -1)
    if (inserted.length === 0)
      return null

    const lineOffset = cached.lineCount ?? countLines(cached.src)
    if (lineOffset > 0)
      this.shiftTokenLines(inserted, lineOffset)

    const existingMode = this.getListParagraphMode(cached.tokens, lastSegment.tokenStart, cached.tokens.length, listOpen.level)
    const appendedMode = this.getListParagraphMode(parsed, 0, parsed.length, 0)
    const nextLoose = existingMode === 'loose'
      || appendedMode === 'loose'
      || this.endsWithBlankLine(cached.src)
      || ((parsed[0]?.map?.[0] ?? 0) > 0)

    if (nextLoose) {
      this.setListParagraphVisibility(cached.tokens, lastSegment.tokenStart, cached.tokens.length, listOpen.level, false)
      this.setListParagraphVisibility(inserted, 0, inserted.length, listOpen.level, false)
    }

    cached.tokens.splice(cached.tokens.length - 1, 0, ...inserted)
    cached.src = src
    cached.env = env
    cached.globalStateReason = null
    const nextLineCount = lineOffset + countLines(appended)
    cached.lineCount = nextLineCount
    const nextDocLineCount = this.getDocLineCount(src, nextLineCount)
    if (listOpen.map)
      listOpen.map[1] = nextDocLineCount
    cached.lastSegment = {
      tokenStart: lastSegment.tokenStart,
      tokenEnd: cached.tokens.length,
      lineStart: lastSegment.lineStart,
      lineEnd: nextDocLineCount,
      srcOffset: lastSegment.srcOffset,
    }
    return cached.tokens
  }

  private tryTableTailAppendMerge(
    src: string,
    cached: StreamCache,
    env: Record<string, unknown>,
    md: MarkdownIt,
    lastSegment: StreamSegment,
    appended: string,
    tableOpen: Token,
  ): Token[] | null {
    if (cached.src.length === 0 || cached.src.charCodeAt(cached.src.length - 1) !== 0x0A)
      return null
    if (/(?:^|\n)[ \t]*\n/.test(appended))
      return null

    const segmentLineSpan = lastSegment.lineEnd - lastSegment.lineStart
    const segmentChars = cached.src.length - lastSegment.srcOffset
    if (segmentLineSpan < this.MIN_TABLE_LINES_FOR_MERGE && segmentChars < this.MIN_TABLE_CHARS_FOR_MERGE)
      return null

    const tableContext = this.getTableHeaderContext(cached.src.slice(lastSegment.srcOffset))
    if (!tableContext)
      return null

    const syntheticSrc = `${tableContext}${appended}`
    let parsed: Token[]
    try {
      parsed = this.core.parse(syntheticSrc, env, md).tokens
    }
    catch {
      return null
    }
    if (!this.isSingleTopLevelContainer(parsed, 'table_open', 'table_close'))
      return null
    if ((parsed[0]?.map?.[1] ?? -1) !== this.getDocLineCount(syntheticSrc))
      return null

    const parsedSection = this.getTableBodySection(parsed, 0, parsed.length, 0)
    const cachedSection = this.getTableBodySection(cached.tokens, lastSegment.tokenStart, cached.tokens.length, tableOpen.level)
    if (!parsedSection || !cachedSection || parsedSection.tbodyOpenIndex < 0 || parsedSection.tbodyCloseIndex < 0)
      return null

    const inserted = cachedSection.tbodyOpenIndex >= 0
      ? parsed.slice(parsedSection.tbodyOpenIndex + 1, parsedSection.tbodyCloseIndex)
      : parsed.slice(parsedSection.tbodyOpenIndex, parsedSection.tbodyCloseIndex + 1)
    if (inserted.length === 0)
      return null

    const lineOffset = lastSegment.lineEnd - 2
    if (lineOffset !== 0)
      this.shiftTokenLines(inserted, lineOffset)

    const insertAt = cachedSection.tbodyCloseIndex >= 0
      ? cachedSection.tbodyCloseIndex
      : cachedSection.tableCloseIndex
    const previousLineCount = cached.lineCount ?? countLines(cached.src)
    cached.tokens.splice(insertAt, 0, ...inserted)
    cached.src = src
    cached.env = env
    cached.globalStateReason = null
    const nextLineCount = previousLineCount + countLines(appended)
    cached.lineCount = nextLineCount

    const nextDocLineCount = this.getDocLineCount(src, nextLineCount)
    if (tableOpen.map)
      tableOpen.map[1] = nextDocLineCount
    if (cachedSection.tbodyOpenIndex >= 0) {
      const tbodyOpen = cached.tokens[cachedSection.tbodyOpenIndex]
      if (tbodyOpen?.map)
        tbodyOpen.map[1] = nextDocLineCount
    }

    cached.lastSegment = {
      tokenStart: lastSegment.tokenStart,
      tokenEnd: cached.tokens.length,
      lineStart: lastSegment.lineStart,
      lineEnd: nextDocLineCount,
      srcOffset: lastSegment.srcOffset,
    }
    return cached.tokens
  }

  private getTableHeaderContext(src: string): string | null {
    const firstBreak = src.indexOf('\n')
    if (firstBreak < 0)
      return null

    const secondBreak = src.indexOf('\n', firstBreak + 1)
    if (secondBreak < 0)
      return null

    return src.slice(0, secondBreak + 1)
  }

  private getTableBodySection(
    tokens: Token[],
    start: number,
    end: number,
    tableLevel: number,
  ): { tableCloseIndex: number, tbodyOpenIndex: number, tbodyCloseIndex: number } | null {
    if (start < 0 || start >= end || tokens[start]?.type !== 'table_open')
      return null

    let tableCloseIndex = -1
    for (let i = end - 1; i > start; i--) {
      const token = tokens[i]
      if (token.type === 'table_close' && token.level === tableLevel) {
        tableCloseIndex = i
        break
      }
    }
    if (tableCloseIndex < 0)
      return null

    let tbodyOpenIndex = -1
    let tbodyCloseIndex = -1
    for (let i = start + 1; i < tableCloseIndex; i++) {
      const token = tokens[i]
      if (token.type === 'tbody_open' && token.level === tableLevel + 1) {
        tbodyOpenIndex = i
        break
      }
    }
    if (tbodyOpenIndex >= 0) {
      for (let i = tableCloseIndex - 1; i > tbodyOpenIndex; i--) {
        const token = tokens[i]
        if (token.type === 'tbody_close' && token.level === tableLevel + 1) {
          tbodyCloseIndex = i
          break
        }
      }
      if (tbodyCloseIndex < 0)
        return null
    }

    return { tableCloseIndex, tbodyOpenIndex, tbodyCloseIndex }
  }

  private isSingleTopLevelContainer(
    tokens: Token[],
    openType: string,
    closeType: string,
    markup?: string,
  ): boolean {
    if (tokens.length < 2)
      return false

    const first = tokens[0]
    const last = tokens[tokens.length - 1]
    if (first.type !== openType || last.type !== closeType || first.level !== 0 || last.level !== 0)
      return false

    if (markup !== undefined && first.markup !== markup)
      return false

    let depth = 0
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.level === 0 && i > 0 && i < tokens.length - 1 && depth === 0)
        return false

      if (token.nesting > 0)
        depth += token.nesting
      else if (token.nesting < 0)
        depth += token.nesting
    }

    return depth === 0
  }

  private getListParagraphMode(
    tokens: Token[],
    start: number,
    end: number,
    listLevel: number,
  ): 'tight' | 'loose' | 'none' {
    let sawHidden = false
    let sawVisible = false
    const paragraphLevel = listLevel + 2

    for (let i = start; i < end; i++) {
      const token = tokens[i]
      if (token.type !== 'paragraph_open' || token.level !== paragraphLevel)
        continue
      if (token.hidden)
        sawHidden = true
      else
        sawVisible = true
      if (sawHidden && sawVisible)
        return 'loose'
    }

    if (sawVisible)
      return 'loose'
    if (sawHidden)
      return 'tight'
    return 'none'
  }

  private setListParagraphVisibility(
    tokens: Token[],
    start: number,
    end: number,
    listLevel: number,
    hidden: boolean,
  ): void {
    const paragraphLevel = listLevel + 2
    for (let i = start; i < end; i++) {
      const token = tokens[i]
      if ((token.type === 'paragraph_open' || token.type === 'paragraph_close') && token.level === paragraphLevel)
        token.hidden = hidden
    }
  }

  private shouldPreferTailReparseForAppend(cache: StreamCache): boolean {
    const lastSegment = this.ensureLastSegment(cache)
    if (!lastSegment)
      return false

    const lastToken = cache.tokens[lastSegment.tokenStart]
    switch (lastToken?.type) {
      case 'bullet_list_open':
      case 'ordered_list_open':
      case 'blockquote_open':
      case 'table_open':
        return true
      case 'paragraph_open':
      case 'code_block':
      case 'html_block':
        return !this.endsWithBlankLine(cache.src)
      default:
        return false
    }
  }

  private endsWithBlankLine(src: string): boolean {
    const len = src.length
    if (len < 2 || src.charCodeAt(len - 1) !== 0x0A)
      return false

    let pos = len - 2
    while (pos >= 0) {
      const ch = src.charCodeAt(pos)
      if (ch === 0x20 || ch === 0x09) {
        pos--
        continue
      }
      return ch === 0x0A
    }

    return true
  }

  private getDocLineCount(src: string, lineCount = countLines(src)): number {
    if (src.length === 0)
      return 0
    return src.charCodeAt(src.length - 1) === 0x0A ? lineCount : lineCount + 1
  }

  private shiftTokenLines(tokens: Token[], offset: number): void {
    if (offset === 0)
      return

    let stack: Token[] | null = null

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (token.map) {
        token.map[0] += offset
        token.map[1] += offset
      }

      if (token.children) {
        stack ??= []
        for (let i = token.children.length - 1; i >= 0; i--) {
          stack.push(token.children[i])
        }

        while (stack.length > 0) {
          const child = stack.pop()!
          if (child.map) {
            child.map[0] += offset
            child.map[1] += offset
          }
          if (child.children) {
            for (let i = child.children.length - 1; i >= 0; i--)
              stack.push(child.children[i])
          }
        }
      }
    }
  }

  // (no-op placeholder: extendEndingLine removed as unused)
}

export default StreamParser
