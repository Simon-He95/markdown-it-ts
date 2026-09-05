import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import type { GlobalMarkdownStateReason } from '../parse/global_state'
import type { ParserCore } from '../parse/parser_core'
import { countLines } from '../common/utils'
import { detectGlobalMarkdownState, getKnownGlobalMarkdownState, resetKnownGlobalMarkdownState, runWithKnownGlobalMarkdownState } from '../parse/global_state'
import { ParserBlock } from '../parse/parser_block'
import { beginParseDiagnostics, getParseDiagnostics, setStrategyDiagnostics } from '../parse/strategy_diagnostics'
import { block } from '../rules/core/block'
import { inline } from '../rules/core/inline'
import { linkify } from '../rules/core/linkify'
import { normalize } from '../rules/core/normalize'
import { replacements } from '../rules/core/replacements'
import { smartquotes } from '../rules/core/smartquotes'
import { text_join } from '../rules/core/text_join'
import { recommendStreamChunkStrategy } from '../support/chunk_recommend'
import { chunkedParse } from './chunked'
import { getAutoUnboundedDecision, parseStringUnbounded, shouldAutoUseUnbounded } from './unbounded'

interface StreamCache {
  src: string
  tokens: Token[]
  env: Record<string, unknown>
  config: StreamParserConfig
  snapshotState?: StreamSnapshotState
  // Cache line count to avoid recounting
  lineCount?: number
  lastSegment?: StreamSegment | null
  lastSegmentVerified?: boolean
  normalizedSrc?: string
  hasFenceMarker?: boolean
  globalStateReason?: GlobalMarkdownStateReason | null
  globalStateCarry?: string
  boundary?: StreamBoundaryState
  lastSegmentSource?: string
}

interface StreamParserConfig {
  options: MarkdownIt['options']
  coreVersion: number
  blockVersion: number
  inlineVersion: number
  inline2Version: number
}

interface StreamSnapshotState {
  cache: StreamCache
}

interface StreamBoundaryState {
  currentLineNonBlank: boolean
  previousLineNonBlank: boolean
  endsWithNewline: boolean
  endsWithBlankLine: boolean
}

interface StreamSegment {
  tokenStart: number
  tokenEnd: number
  lineStart: number
  lineEnd: number
  srcOffset: number
}

export interface StreamSnapshot {
  readonly sourceLength: number
  readonly tokenCount: number
}

interface InternalStreamSnapshot extends StreamSnapshot {
  state: StreamSnapshotState
}

const EMPTY_TOKENS: Token[] = []
const GLOBAL_STATE_APPEND_SCAN_WINDOW = 4096

function copyOptions(options: MarkdownIt['options']): MarkdownIt['options'] {
  const copy = { ...options }
  if (Array.isArray(options.quotes))
    copy.quotes = [...options.quotes]
  if (options.experimental)
    copy.experimental = { ...options.experimental }
  return copy
}

function optionsEqual(left: MarkdownIt['options'], right: MarkdownIt['options']): boolean {
  const keys = Object.keys(right) as (keyof MarkdownIt['options'])[]
  if (Object.keys(left).length !== keys.length)
    return false

  return keys.every((key) => {
    if (!Object.hasOwn(left, key))
      return false

    const leftValue = left[key]
    const rightValue = right[key]
    if (Array.isArray(leftValue) && Array.isArray(rightValue))
      return leftValue.length === rightValue.length && leftValue.every((value, index) => Object.is(value, rightValue[index]))
    if (key === 'experimental' && leftValue && rightValue) {
      const leftExperimental = leftValue as NonNullable<MarkdownIt['options']['experimental']>
      const rightExperimental = rightValue as NonNullable<MarkdownIt['options']['experimental']>
      const experimentalKeys = Object.keys(rightExperimental) as (keyof typeof rightExperimental)[]
      return Object.keys(leftExperimental).length === experimentalKeys.length
        && experimentalKeys.every(option => Object.hasOwn(leftExperimental, option) && Object.is(leftExperimental[option], rightExperimental[option]))
    }
    return Object.is(leftValue, rightValue)
  })
}

function copyParserConfig(md: MarkdownIt): StreamParserConfig {
  return {
    options: copyOptions(md.options),
    coreVersion: md.core.ruler.version,
    blockVersion: md.block.ruler.version,
    inlineVersion: md.inline.ruler.version,
    inline2Version: md.inline.ruler2.version,
  }
}

function parserConfigEqual(config: StreamParserConfig, md: MarkdownIt): boolean {
  return optionsEqual(config.options, md.options)
    && config.coreVersion === md.core.ruler.version
    && config.blockVersion === md.block.ruler.version
    && config.inlineVersion === md.inline.ruler.version
    && config.inline2Version === md.inline.ruler2.version
}

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
  private readonly anchorBlock = new ParserBlock()
  private cache: StreamCache | null = null
  private readonly snapshots = new WeakSet<StreamSnapshot>()
  private stats: StreamStats = makeEmptyStats()
  private normalizeLineEndings = true
  private tokenMapsTrusted = true
  private allowUntrustedTailReuse = false

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

  snapshot(): StreamSnapshot | null {
    const cache = this.cache
    if (!cache)
      return null

    const state = cache.snapshotState ?? { cache }
    cache.snapshotState = state
    const snapshot: InternalStreamSnapshot = {
      state,
      get sourceLength() { return this.state.cache.src.length },
      get tokenCount() { return this.state.cache.tokens.length },
    }
    this.snapshots.add(snapshot)
    return snapshot
  }

  restore(snapshot: StreamSnapshot, md: MarkdownIt): Token[] {
    if (!this.snapshots.has(snapshot))
      throw new TypeError('Invalid stream snapshot')

    const internal = snapshot as InternalStreamSnapshot
    const cache = internal.state.cache
    this.cache = cache

    if (parserConfigEqual(cache.config, md))
      return cache.tokens

    return this.parse(cache.src, cache.env, md)
  }

  append(segment: string, env: Record<string, unknown> | undefined, md: MarkdownIt): Token[] {
    const cached = this.cache
    if (!cached)
      throw new Error('Stream append requires cached history; call stream.parse(fullSource) first')
    this.ensureBoundaryState(cached)
    return this.parse(cached.src + segment, env, md, segment)
  }

  parse(src: string, env: Record<string, unknown> | undefined, md: MarkdownIt, knownAppend?: string): Token[] {
    const previousCache = this.cache
    const priorEnv = previousCache?.env

    const coreRules = md.core.ruler.getNamedRules('')
    const lineNormalizerIndex = coreRules.findIndex(rule => rule.fn === normalize)
    const blockRuleIndex = coreRules.findIndex(rule => rule.fn === block)
    const namedNormalizeRule = coreRules.find(rule => rule.name === 'normalize')
    this.normalizeLineEndings = lineNormalizerIndex >= 0
      && blockRuleIndex >= 0
      && lineNormalizerIndex < blockRuleIndex
    const envProvided = env
    const configChanged = !!previousCache && !parserConfigEqual(previousCache.config, md)
    const customNormalize = namedNormalizeRule && namedNormalizeRule.fn !== normalize
    const nonstandardBuiltinNormalize = namedNormalizeRule && !this.normalizeLineEndings && src.includes('\r')
    const unknownPreBlockRule = blockRuleIndex < 0
      || coreRules.slice(0, blockRuleIndex).some(rule => rule.fn !== normalize)
    const unknownPostBlockRule = blockRuleIndex < 0
      || coreRules.slice(blockRuleIndex + 1).some(rule => (
        rule.fn !== inline
        && rule.fn !== linkify
        && rule.fn !== replacements
        && rule.fn !== smartquotes
        && rule.fn !== text_join
      ))
    this.tokenMapsTrusted = !unknownPostBlockRule
    this.allowUntrustedTailReuse = this.tokenMapsTrusted || md.options?.streamTailLocalPostBlockRules === true
    const cached = configChanged || customNormalize || nonstandardBuiltinNormalize || unknownPreBlockRule
      ? null
      : previousCache
    beginParseDiagnostics(envProvided ?? previousCache?.env ?? priorEnv)

    // Only update the cache on the very first parse or when the current
    // source ends at a safe block boundary (double newline). This prevents
    if (!cached || (envProvided && envProvided !== cached.env)) {
      const workingEnv = envProvided ?? previousCache?.env ?? priorEnv ?? {}

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

      if (shouldSkipLargeCache && knownAppend === undefined && !previousCache?.snapshotState) {
        const parsed = this.parseFullDocument(src, workingEnv, md, srcLineCount, false)
        this.cache = null
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
          const globalStateReason = (getParseDiagnostics(workingEnv)?.chunk?.globalStateDetected as GlobalMarkdownStateReason | undefined) ?? null
          const cache = this.setCache({ src, tokens, env: workingEnv, lineCount: srcLineCount, lastSegment: undefined, globalStateReason }, md)
          this.updateCacheLineCount(cache, srcLineCount)
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

      const cache = this.setCache({ src, tokens: parsed.tokens, env: workingEnv, lineCount: srcLineCount, lastSegment: undefined, globalStateReason: parsed.globalStateReason }, md)
      this.updateCacheLineCount(cache, srcLineCount)
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

    const appendDelta = knownAppend !== undefined
      ? knownAppend
      : (src.startsWith(cached.src) ? src.slice(cached.src.length) : null)
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
      const parsed = this.parseFullDocument(src, fallbackEnv, md)
      const nextTokens = parsed.tokens
      const lineCount = parsed.lineCount

      const cache = this.setCache({
        src,
        tokens: nextTokens,
        env: fallbackEnv,
        lineCount,
        lastSegment: undefined,
        globalStateReason: parsed.globalStateReason,
      }, md)
      this.updateCacheLineCount(cache, lineCount)
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

    if (isGrowingFromSmall && appendDelta === null) {
      // Small document with non-append edit - just reparse
      const fallbackEnv = envProvided ?? cached.env
      const parsed = this.parseFullDocument(src, fallbackEnv, md)
      const nextTokens = parsed.tokens
      const lineCount = parsed.lineCount
      const cache = this.setCache({ src, tokens: nextTokens, env: fallbackEnv, lineCount, lastSegment: undefined, globalStateReason: parsed.globalStateReason }, md)
      this.updateCacheLineCount(cache, lineCount)
      this.stats.total += 1
      this.stats.fullParses += 1
      this.stats.lastMode = 'full'
      setStrategyDiagnostics(fallbackEnv, { area: 'stream', path: 'stream-full', reason: 'small-non-append', unbounded: !!getParseDiagnostics(fallbackEnv)?.unbounded })
      return nextTokens
    }

    // inspect appended detection
    const cachedLastSegment = this.ensureLastSegment(cached, knownAppend !== undefined)
    const verifiedUntrustedTail = this.tokenMapsTrusted
      || (this.allowUntrustedTailReuse && (
        cached.lastSegmentVerified === true
        || !!(cachedLastSegment && this.hasVerifiedSegmentAnchor(cached, cachedLastSegment, md))
      ))
    const preferTailReparse = appendDelta !== null && this.shouldPreferTailReparseForAppend(cached, verifiedUntrustedTail)
    const appended = preferTailReparse || !this.tokenMapsTrusted
      ? null
      : this.getAppendedSegment(cached, src, appendDelta)
    // debug info suppressed
    if (appended) {
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
        const cachedTail = cached.tokens
        const a = appendedState.tokens
        const maxCheck = Math.min(cachedTail.length, a.length - appendedTokenStart)

        // Debug output suppressed in CI
        let dup = 0
        // Try longest prefix match
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

        if (a.length > appendedTokenStart)
          this.appendTokens(cached.tokens, a, appendedTokenStart)
      }

      // Update cache with new src and line count
      if (cached.boundary)
        this.updateBoundaryStateForAppend(cached, appended)
      else
        this.updateFenceMarkerCacheForAppend(cached, appended)
      cached.src = src
      cached.globalStateReason = null
      const appendedLines = appendedLineCount ?? countAppendedLines()
      cached.lineCount = cachedLineCount + appendedLines
      if (cached.tokens.length > appendStart) {
        const appendedLastSegment = this.getLastSegment(cached.tokens, src, appendStart, cached.tokens.length, src.length - appended.length, cachedLineCount)
        if (appendedLastSegment) {
          cached.lastSegment = appendedLastSegment
          const appendedOffset = src.length - appended.length
          cached.lastSegmentSource = appended.slice(Math.max(0, appendedLastSegment.srcOffset - appendedOffset))
        }
        else {
          cached.lastSegment = undefined
          cached.lastSegmentSource = undefined
        }
      }
      else {
        cached.lastSegment = undefined
        cached.lastSegmentSource = undefined
      }
      cached.lastSegmentVerified = undefined

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

    const tailReparsed = verifiedUntrustedTail
      ? this.tryTailSegmentReparse(src, cached, fallbackEnv, md, cachedLastSegment ?? undefined, appendDelta ?? undefined)
      : (this.allowUntrustedTailReuse ? this.tryUntrustedParagraphTailReparse(src, cached, fallbackEnv, md) : null)
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
        const globalStateReason = (getParseDiagnostics(fallbackEnv)?.chunk?.globalStateDetected as GlobalMarkdownStateReason | undefined) ?? null
        const cache = this.setCache({ src, tokens, env: fallbackEnv, lineCount: srcLineCount2, lastSegment: undefined, globalStateReason }, md)
        this.updateCacheLineCount(cache, srcLineCount2)
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
    const cache = this.setCache({ src, tokens: nextTokens, env: fallbackEnv, lineCount: srcLineCount2, lastSegment: undefined, globalStateReason: parsed.globalStateReason }, md)
    this.updateCacheLineCount(cache, srcLineCount2)
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
  ): { tokens: Token[], lineCount: number, globalStateReason: GlobalMarkdownStateReason | null } {
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
      const globalStateReason = (getParseDiagnostics(env)?.unbounded?.globalStateDetected as GlobalMarkdownStateReason | undefined) ?? null
      setStrategyDiagnostics(env, { area: 'stream', path: 'stream-full', reason: 'auto-unbounded-char-threshold', unbounded: true })
      return {
        tokens,
        lineCount: knownLineCount ?? (needLineCount ? countLines(src) : 0),
        globalStateReason,
      }
    }

    let lineCount = knownLineCount
    if (autoUnboundedDecision === 'need-lines') {
      lineCount = countLines(src)
      if (shouldAutoUseUnbounded(md, src.length, lineCount)) {
        const tokens = parseStringUnbounded(md, src, env)
        const globalStateReason = (getParseDiagnostics(env)?.unbounded?.globalStateDetected as GlobalMarkdownStateReason | undefined) ?? null
        setStrategyDiagnostics(env, { area: 'stream', path: 'stream-full', reason: 'auto-unbounded-line-threshold', unbounded: true })
        return { tokens, lineCount, globalStateReason }
      }
    }

    if (lineCount === undefined)
      lineCount = needLineCount ? countLines(src) : 0

    const currentGlobalStateReason = detectGlobalMarkdownState(src)
    const tokens = runWithKnownGlobalMarkdownState(env, currentGlobalStateReason, () => {
      return this.core.parse(src, env, md).tokens
    })

    return { tokens, lineCount, globalStateReason: currentGlobalStateReason }
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

    if (knownAppend !== undefined
      ? !this.ensureBoundaryState(cache).endsWithNewline
      : !prev.endsWith('\n')) {
      return null
    }

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
      let previousLineNonBlank: boolean
      if (knownAppend !== undefined) {
        previousLineNonBlank = this.ensureBoundaryState(cache).previousLineNonBlank
      }
      else {
        const prevWithoutTrailingNewline = prev.slice(0, -1)
        const lastBreak = prevWithoutTrailingNewline.lastIndexOf('\n')
        previousLineNonBlank = prevWithoutTrailingNewline.slice(lastBreak + 1).trim().length > 0
      }
      if (previousLineNonBlank)
        return null
    }

    // Heuristic safety: if previous content ends inside an open fenced code block,
    // avoid append fast-path since closing fence in appended segment would
    // retroactively change prior tokens.
    if (knownAppend !== undefined) {
      const lastSegment = this.ensureLastSegment(cache)
      if (lastSegment && this.segmentHasFence(cache, lastSegment)) {
        const scanStart = this.tokenMapsTrusted
          ? this.ensureSegmentSourceOffset(cache, lastSegment)
          : 0
        if (this.endsInsideOpenFence(prev, scanStart))
          return null
      }
    }
    else {
      const scanStart = this.tokenMapsTrusted
        ? (this.ensureLastSegment(cache)?.srcOffset ?? 0)
        : 0
      if ((this.tokenMapsTrusted || this.cacheHasFenceMarker(cache)) && this.endsInsideOpenFence(prev, scanStart))
        return null
    }

    if (this.mayContainReferenceDefinition(segment))
      return null

    return segment
  }

  private tryTailSegmentReparse(
    src: string,
    cached: StreamCache,
    env: Record<string, unknown>,
    md: MarkdownIt,
    segmentOverride?: StreamSegment,
    knownAppend?: string,
  ): Token[] | null {
    const lastSegment = segmentOverride ?? this.ensureLastSegment(cached)
    if (!lastSegment)
      return null

    const directAppend = knownAppend !== undefined
    if (directAppend)
      this.ensureSegmentSourceOffset(cached, lastSegment)

    // No reusable prefix means we'd just be reparsing the entire document again.
    if (lastSegment.srcOffset <= 0 && lastSegment.tokenStart <= 0)
      return null

    if (!directAppend) {
      const stablePrefix = cached.src.slice(0, lastSegment.srcOffset)
      if (!src.startsWith(stablePrefix))
        return null
    }

    const prevTail = directAppend
      ? (cached.lastSegmentSource ?? cached.src.slice(lastSegment.srcOffset))
      : cached.src.slice(lastSegment.srcOffset)
    const nextTail = directAppend ? prevTail + knownAppend : src.slice(lastSegment.srcOffset)
    if (nextTail === prevTail)
      return null

    const appended = directAppend
      ? knownAppend
      : (src.startsWith(cached.src) ? src.slice(cached.src.length) : null)
    const postBlockSrc = directAppend && this.tokenMapsTrusted
      ? src
      : this.getNormalizedUpdatedSource(cached, src, knownAppend)
    if (appended) {
      const merged = this.tryContainerTailAppendMerge(src, cached, env, md, lastSegment, appended, postBlockSrc)
      if (merged) {
        cached.lastSegmentSource = directAppend ? nextTail : undefined
        return merged
      }
    }

    // Localized suffix reparses are safe for appends as long as the tail anchor
    // remains stable; the retroactive constructs below still fall back.
    if (this.mayContainReferenceDefinition(prevTail) || this.mayContainReferenceDefinition(nextTail))
      return null

    try {
      const parsedTail = this.parseAtLineOffset(nextTail, env, md, lastSegment.lineStart, postBlockSrc)
      const tailState = parsedTail.state
      const localLastSegment = this.getLastSegment(
        tailState.tokens,
        nextTail,
        0,
        tailState.tokens.length,
        parsedTail.mapsShifted ? 0 : undefined,
        parsedTail.mapsShifted ? lastSegment.lineStart : undefined,
      )
      if (lastSegment.lineStart > 0 && !parsedTail.mapsShifted)
        this.shiftTokenLines(tailState.tokens, lastSegment.lineStart)

      if (appended) {
        if (directAppend)
          this.updateBoundaryStateForAppend(cached, appended)
        else
          this.updateFenceMarkerCacheForAppend(cached, appended)
      }
      else {
        cached.boundary = undefined
        cached.hasFenceMarker = undefined
      }
      cached.src = src
      cached.normalizedSrc = postBlockSrc
      cached.env = env
      cached.globalStateReason = null
      if (!directAppend || !appended)
        cached.globalStateCarry = undefined
      cached.tokens.length = lastSegment.tokenStart
      this.appendTokens(cached.tokens, tailState.tokens)
      cached.lineCount = lastSegment.lineStart + countLines(nextTail)
      if (localLastSegment) {
        cached.lastSegment = {
          tokenStart: lastSegment.tokenStart + localLastSegment.tokenStart,
          tokenEnd: lastSegment.tokenStart + localLastSegment.tokenEnd,
          lineStart: parsedTail.mapsShifted ? localLastSegment.lineStart : lastSegment.lineStart + localLastSegment.lineStart,
          lineEnd: parsedTail.mapsShifted ? localLastSegment.lineEnd : lastSegment.lineStart + localLastSegment.lineEnd,
          srcOffset: lastSegment.srcOffset + localLastSegment.srcOffset,
        }
        cached.lastSegmentSource = directAppend ? nextTail.slice(localLastSegment.srcOffset) : undefined
      }
      else {
        cached.lastSegment = null
        cached.lastSegmentSource = undefined
      }
      cached.lastSegmentVerified = undefined
      return cached.tokens
    }
    catch {
      return null
    }
  }

  private tryUntrustedParagraphTailReparse(
    src: string,
    cached: StreamCache,
    env: Record<string, unknown>,
    md: MarkdownIt,
  ): Token[] | null {
    if (cached.boundary ? cached.boundary.endsWithBlankLine : this.endsWithBlankLine(cached.src))
      return null

    const lastSegment = this.ensureLastSegment(cached)
    if (!lastSegment || cached.tokens[lastSegment.tokenStart]?.type !== 'paragraph_open')
      return null

    const inlineToken = cached.tokens
      .slice(lastSegment.tokenStart, lastSegment.tokenEnd)
      .find(token => token.type === 'inline')
    if (!inlineToken?.content)
      return null

    let contentEnd = cached.src.length
    while (contentEnd > 0) {
      const ch = cached.src.charCodeAt(contentEnd - 1)
      if (ch !== 0x0A /* \n */ && ch !== 0x0D /* \r */)
        break
      contentEnd--
    }

    const srcOffset = cached.src.lastIndexOf(inlineToken.content, contentEnd - inlineToken.content.length)
    if (srcOffset < 0 || srcOffset + inlineToken.content.length !== contentEnd)
      return null

    return this.tryTailSegmentReparse(src, cached, env, md, {
      ...lastSegment,
      lineStart: this.countSourceLineBreaks(cached.src, srcOffset),
      srcOffset,
    })
  }

  private countSourceLineBreaks(src: string, end: number): number {
    let count = 0
    for (let pos = 0; pos < end; pos++) {
      const ch = src.charCodeAt(pos)
      if (ch === 0x0A /* \n */) {
        count++
      }
      else if (this.normalizeLineEndings && ch === 0x0D /* \r */) {
        count++
        if (src.charCodeAt(pos + 1) === 0x0A /* \n */)
          pos++
      }
    }
    return count
  }

  private hasVerifiedSegmentAnchor(cache: StreamCache, segment: StreamSegment, md: MarkdownIt): boolean {
    if (segment.srcOffset < 0)
      this.ensureSegmentSourceOffset(cache, segment)
    const lineCount = cache.lineCount ?? countLines(cache.src)
    const docLineCount = this.getDocLineCount(cache.src, lineCount)
    const inRange = segment.lineStart >= 0
      && segment.lineStart <= segment.lineEnd
      && segment.lineEnd <= docLineCount
      && segment.srcOffset < cache.src.length
    if (!inRange)
      return false

    const tail = cache.src.slice(segment.srcOffset)
    try {
      const anchorMd = Object.create(md)
      Object.defineProperty(anchorMd, 'block', { value: this.anchorBlock })
      const state = this.core.createState(tail, {}, anchorMd)
      if (this.normalizeLineEndings)
        normalize(state)
      this.anchorBlock.parse(state.src, anchorMd, state.env, state.tokens)

      const parsedSegment = this.getLastSegment(state.tokens, tail)
      if (!parsedSegment || parsedSegment.tokenStart !== 0)
        return false

      const normalizedTail = typeof state.src === 'string' ? state.src : tail
      const parsedType = state.tokens[0]?.type
      const cachedType = cache.tokens[segment.tokenStart]?.type
      const compatibleTransform = (cachedType === 'table_open' && parsedType === 'paragraph_open' && /^\s*\|/.test(normalizedTail))
        || (cachedType === 'inline' && parsedType === 'html_block')
        || (cachedType === 'math_block' && parsedType === 'paragraph_open' && /^\s*\$\$\s*(?:\n|$)/.test(normalizedTail))
      if (parsedType !== cachedType && !compatibleTransform)
        return false

      const cachedContents = cache.tokens
        .slice(segment.tokenStart, segment.tokenEnd)
        .map(token => token.content)
        .filter(Boolean)
      let contentOffset = 0
      for (const content of cachedContents) {
        contentOffset = normalizedTail.indexOf(content, contentOffset)
        if (contentOffset < 0)
          return false
        contentOffset += content.length
      }
      return true
    }
    catch {
      return false
    }
  }

  private normalizeSource(src: string): string {
    return src.replace(/\r\n?/g, '\n').replace(/\0/g, '\uFFFD')
  }

  private cacheHasFenceMarker(cache: StreamCache): boolean {
    if (cache.hasFenceMarker === undefined)
      cache.hasFenceMarker = cache.src.includes('```') || cache.src.includes('~~~')
    return cache.hasFenceMarker
  }

  private updateFenceMarkerCacheForAppend(cache: StreamCache, appended: string): void {
    if (this.cacheHasFenceMarker(cache))
      return
    const boundary = cache.src.slice(-2) + appended
    cache.hasFenceMarker = boundary.includes('```') || boundary.includes('~~~')
  }

  private getNormalizedUpdatedSource(cache: StreamCache, next: string, knownAppend?: string): string {
    if (!this.normalizeLineEndings)
      return next
    if (knownAppend === undefined && !next.startsWith(cache.src))
      return this.normalizeSource(next)

    const normalizedCached = cache.normalizedSrc ?? this.normalizeSource(cache.src)
    const appended = knownAppend ?? next.slice(cache.src.length)
    let normalizedAppend = this.normalizeSource(appended)
    if (cache.src.endsWith('\r') && appended.startsWith('\n'))
      normalizedAppend = normalizedAppend.slice(1)
    return normalizedCached + normalizedAppend
  }

  private parseAtLineOffset(
    src: string,
    env: Record<string, unknown>,
    md: MarkdownIt,
    lineOffset: number,
    globalSrc?: string,
  ): { state: ReturnType<ParserCore['parse']>, mapsShifted: boolean } {
    if (this.tokenMapsTrusted || lineOffset <= 0)
      return { state: this.core.parse(src, env, md), mapsShifted: false }

    const state = this.core.createState(src, env, md)
    let mapsShifted = false
    this.core.process(state, (rule, currentState) => {
      if (!mapsShifted && rule.fn === block) {
        this.shiftTokenLines(currentState.tokens, lineOffset)
        if (globalSrc !== undefined)
          currentState.src = globalSrc
        mapsShifted = true
      }
    })
    return { state, mapsShifted }
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
  private endsInsideOpenFence(text: string, start: number): boolean {
    const chunk = text.slice(start)
    const len = chunk.length
    let inFence: { marker: number, length: number } | null = null
    let lineStart = 0
    while (lineStart < len) {
      let lineEnd = chunk.indexOf('\n', lineStart)
      if (this.normalizeLineEndings) {
        const carriageReturn = chunk.indexOf('\r', lineStart)
        if (carriageReturn >= 0 && (lineEnd === -1 || carriageReturn < lineEnd))
          lineEnd = carriageReturn
      }
      if (lineEnd === -1)
        lineEnd = len

      // Fences may be indented by at most three spaces.
      let p = lineStart
      let indent = 0
      while (p < lineEnd) {
        const c = chunk.charCodeAt(p)
        if (c === 0x20 /* space */) {
          p++
          indent++
          if (indent >= 4)
            break
        }
        else if (c === 0x09 /* tab */) {
          indent = 4
          break
        }
        else {
          break
        }
      }

      if (indent < 4 && p < lineEnd) {
        const ch = chunk.charCodeAt(p)
        if (ch === 0x60 /* ` */ || ch === 0x7E /* ~ */) {
          let q = p
          while (q < lineEnd && chunk.charCodeAt(q) === ch) q++
          const runLen = q - p
          if (runLen >= 3) {
            if (!inFence) {
              const nextBacktick = ch === 0x60 ? chunk.indexOf('`', q) : -1
              const hasBacktickInInfo = nextBacktick >= 0 && nextBacktick < lineEnd
              if (!hasBacktickInInfo)
                inFence = { marker: ch, length: runLen }
            }
            else if (inFence.marker === ch && runLen >= inFence.length) {
              let tail = q
              while (tail < lineEnd) {
                const c = chunk.charCodeAt(tail)
                if (c === 0x20 /* space */ || c === 0x09 /* tab */) {
                  tail++
                }
                else {
                  break
                }
              }
              if (tail === lineEnd) {
                inFence = null
              }
            }
          }
        }
      }

      if (lineEnd === len)
        break
      lineStart = lineEnd + (
        this.normalizeLineEndings
        && chunk.charCodeAt(lineEnd) === 0x0D /* \r */
        && chunk.charCodeAt(lineEnd + 1) === 0x0A /* \n */
          ? 2
          : 1
      )
    }
    return inFence !== null
  }

  public peek(): Token[] {
    return this.cache?.tokens ?? EMPTY_TOKENS
  }

  public hasCache(): boolean {
    return this.cache !== null
  }

  public getStats(): StreamStats {
    return { ...this.stats }
  }

  private setCache(cache: Omit<StreamCache, 'config' | 'snapshotState'>, md: MarkdownIt): StreamCache {
    const snapshotState = this.cache?.snapshotState
    const nextCache: StreamCache = {
      ...cache,
      config: copyParserConfig(md),
      snapshotState,
    }
    if (snapshotState)
      snapshotState.cache = nextCache
    this.cache = nextCache
    return nextCache
  }

  // countLines moved to common utils for reuse

  private appendTokens(target: Token[], source: Token[], start = 0, end = source.length): void {
    for (let i = start; i < end; i++)
      target.push(source[i])
  }

  private updateCacheLineCount(cache: StreamCache, lineCount?: number): void {
    cache.lineCount = lineCount ?? countLines(cache.src)
    cache.lastSegment = undefined
    cache.lastSegmentVerified = undefined
    cache.normalizedSrc = undefined
    cache.globalStateCarry = cache.src.slice(-GLOBAL_STATE_APPEND_SCAN_WINDOW)
    cache.boundary = undefined
    cache.lastSegmentSource = undefined
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

  private ensureLastSegment(cache: StreamCache, skipSourceOffset = false): StreamSegment | null {
    if (cache.lastSegment !== undefined)
      return cache.lastSegment

    cache.lastSegment = this.getLastSegment(cache.tokens, cache.src, 0, cache.tokens.length, undefined, undefined, skipSourceOffset)
    return cache.lastSegment
  }

  private getLastSegment(
    tokens: Token[],
    src: string,
    tokenStart = 0,
    tokenEnd = tokens.length,
    knownSrcOffset?: number,
    knownLineStart?: number,
    skipSourceOffset = false,
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
            srcOffset: skipSourceOffset ? -1 : this.getLineStartOffset(src, resolvedStart, knownSrcOffset, knownLineStart),
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
          srcOffset: skipSourceOffset ? -1 : this.getLineStartOffset(src, resolvedStart, knownSrcOffset, knownLineStart),
        }
      }
    }

    return null
  }

  private segmentHasFence(cache: StreamCache, segment: StreamSegment): boolean {
    const end = Math.min(segment.tokenEnd, cache.tokens.length)
    for (let i = segment.tokenStart; i < end; i++) {
      if (cache.tokens[i].type === 'fence')
        return true
    }
    return false
  }

  private ensureSegmentSourceOffset(cache: StreamCache, segment: StreamSegment): number {
    if (segment.srcOffset < 0) {
      const lineCount = cache.lineCount
      segment.srcOffset = lineCount !== undefined
        && segment.lineStart <= lineCount
        && segment.lineEnd <= lineCount + 1
        ? this.getLineStartOffsetFromEnd(cache.src, segment.lineStart, lineCount)
        : this.getLineStartOffset(cache.src, segment.lineStart)
    }
    return segment.srcOffset
  }

  private getLineStartOffsetFromEnd(src: string, line: number, lineCount: number): number {
    if (line <= 0)
      return 0

    let remaining = lineCount - line + 1
    let pos = src.length
    while (remaining > 0) {
      pos = src.lastIndexOf('\n', pos - 1)
      if (pos < 0)
        return 0
      remaining--
    }
    return pos + 1
  }

  private getLineStartOffset(src: string, line: number, knownSrcOffset?: number, knownLineStart?: number): number {
    if (knownSrcOffset !== undefined && knownLineStart !== undefined && line >= knownLineStart)
      return this.getLineStartOffsetFrom(src, knownSrcOffset, line - knownLineStart)

    return this.getLineStartOffsetFrom(src, 0, line)
  }

  private getLineStartOffsetFrom(src: string, startOffset: number, lineDelta: number): number {
    if (lineDelta <= 0)
      return startOffset

    let remaining = lineDelta
    let pos = startOffset
    while (pos < src.length) {
      const ch = src.charCodeAt(pos)
      if (ch === 0x0A /* \n */) {
        pos++
        remaining--
      }
      else if (this.normalizeLineEndings && ch === 0x0D /* \r */) {
        pos++
        if (pos < src.length && src.charCodeAt(pos) === 0x0A)
          pos++
        remaining--
      }
      else {
        pos++
        continue
      }

      if (remaining === 0)
        return pos
    }
    return src.length
  }

  private mayContainReferenceDefinition(src: string): boolean {
    if (!src.includes(']:'))
      return false

    return /(?:^|\n)[ \t]{0,3}\[[^\]\n]+\]:/.test(src)
  }

  private canDirectlyParseAppend(cache: StreamCache): boolean {
    if (!this.tokenMapsTrusted)
      return false

    if (!(cache.boundary ? cache.boundary.endsWithBlankLine : this.endsWithBlankLine(cache.src)))
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
    postBlockSrc: string,
  ): Token[] | null {
    if (!appended || this.mayContainReferenceDefinition(appended))
      return null

    const lastToken = cached.tokens[lastSegment.tokenStart]
    switch (lastToken?.type) {
      case 'bullet_list_open':
      case 'ordered_list_open':
        return this.tryListTailAppendMerge(src, cached, env, md, lastSegment, appended, lastToken, postBlockSrc)
      case 'table_open':
        return this.tryTableTailAppendMerge(src, cached, env, md, lastSegment, appended, lastToken, postBlockSrc)
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
    postBlockSrc: string,
  ): Token[] | null {
    if (cached.src.length === 0 || !(cached.boundary ? cached.boundary.endsWithNewline : cached.src.charCodeAt(cached.src.length - 1) === 0x0A))
      return null

    this.ensureSegmentSourceOffset(cached, lastSegment)
    const segmentLineSpan = lastSegment.lineEnd - lastSegment.lineStart
    const segmentChars = cached.src.length - lastSegment.srcOffset
    if (segmentLineSpan < this.MIN_LIST_LINES_FOR_MERGE && segmentChars < this.MIN_LIST_CHARS_FOR_MERGE)
      return null

    const closeType = listOpen.type === 'bullet_list_open' ? 'bullet_list_close' : 'ordered_list_close'
    const lineOffset = cached.lineCount ?? countLines(cached.src)
    let parsed: Token[]
    let mapsShifted = false
    try {
      const parsedAppend = this.parseAtLineOffset(appended, env, md, lineOffset, postBlockSrc)
      parsed = parsedAppend.state.tokens
      mapsShifted = parsedAppend.mapsShifted
    }
    catch {
      return null
    }
    if (!this.isSingleTopLevelContainer(parsed, listOpen.type, closeType, listOpen.markup))
      return null

    const inserted = parsed.slice(1, -1)
    if (inserted.length === 0)
      return null

    if (lineOffset > 0 && !mapsShifted)
      this.shiftTokenLines(inserted, lineOffset)

    const existingMode = this.getListParagraphMode(cached.tokens, lastSegment.tokenStart, cached.tokens.length, listOpen.level)
    const appendedMode = this.getListParagraphMode(parsed, 0, parsed.length, 0)
    const nextLoose = existingMode === 'loose'
      || appendedMode === 'loose'
      || (cached.boundary ? cached.boundary.endsWithBlankLine : this.endsWithBlankLine(cached.src))
      || (((parsed[0]?.map?.[0] ?? 0) - (mapsShifted ? lineOffset : 0)) > 0)

    if (nextLoose) {
      this.setListParagraphVisibility(cached.tokens, lastSegment.tokenStart, cached.tokens.length, listOpen.level, false)
      this.setListParagraphVisibility(inserted, 0, inserted.length, listOpen.level, false)
    }

    cached.tokens.splice(cached.tokens.length - 1, 0, ...inserted)
    if (cached.boundary)
      this.updateBoundaryStateForAppend(cached, appended)
    else
      this.updateFenceMarkerCacheForAppend(cached, appended)
    cached.src = src
    cached.normalizedSrc = postBlockSrc
    cached.env = env
    cached.globalStateReason = null
    const nextLineCount = lineOffset + countLines(appended)
    cached.lineCount = nextLineCount
    const nextDocLineCount = this.getCachedDocLineCount(cached, nextLineCount)
    if (listOpen.map)
      listOpen.map[1] = nextDocLineCount
    cached.lastSegment = {
      tokenStart: lastSegment.tokenStart,
      tokenEnd: cached.tokens.length,
      lineStart: lastSegment.lineStart,
      lineEnd: nextDocLineCount,
      srcOffset: lastSegment.srcOffset,
    }
    cached.lastSegmentVerified = true
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
    postBlockSrc: string,
  ): Token[] | null {
    if (cached.src.length === 0 || !(cached.boundary ? cached.boundary.endsWithNewline : cached.src.charCodeAt(cached.src.length - 1) === 0x0A))
      return null
    if (/(?:^|\n)[ \t]*\n/.test(appended))
      return null

    this.ensureSegmentSourceOffset(cached, lastSegment)
    const segmentLineSpan = lastSegment.lineEnd - lastSegment.lineStart
    const segmentChars = cached.src.length - lastSegment.srcOffset
    if (segmentLineSpan < this.MIN_TABLE_LINES_FOR_MERGE && segmentChars < this.MIN_TABLE_CHARS_FOR_MERGE)
      return null

    const tableContext = this.getTableHeaderContext(cached.src.slice(lastSegment.srcOffset))
    if (!tableContext)
      return null

    const syntheticSrc = `${tableContext}${appended}`
    const lineOffset = lastSegment.lineEnd - 2
    let parsed: Token[]
    let mapsShifted = false
    try {
      const parsedTable = this.parseAtLineOffset(syntheticSrc, env, md, lineOffset, postBlockSrc)
      parsed = parsedTable.state.tokens
      mapsShifted = parsedTable.mapsShifted
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

    if (lineOffset !== 0 && !mapsShifted)
      this.shiftTokenLines(inserted, lineOffset)

    const insertAt = cachedSection.tbodyCloseIndex >= 0
      ? cachedSection.tbodyCloseIndex
      : cachedSection.tableCloseIndex
    const previousLineCount = cached.lineCount ?? countLines(cached.src)
    cached.tokens.splice(insertAt, 0, ...inserted)
    if (cached.boundary)
      this.updateBoundaryStateForAppend(cached, appended)
    else
      this.updateFenceMarkerCacheForAppend(cached, appended)
    cached.src = src
    cached.normalizedSrc = postBlockSrc
    cached.env = env
    cached.globalStateReason = null
    const nextLineCount = previousLineCount + countLines(appended)
    cached.lineCount = nextLineCount

    const nextDocLineCount = this.getCachedDocLineCount(cached, nextLineCount)
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
    cached.lastSegmentVerified = true
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

  private shouldPreferTailReparseForAppend(cache: StreamCache, verifiedUntrustedTail: boolean): boolean {
    const lastSegment = this.ensureLastSegment(cache)
    if (!lastSegment)
      return false

    const lastToken = cache.tokens[lastSegment.tokenStart]
    if (!this.tokenMapsTrusted)
      return verifiedUntrustedTail

    switch (lastToken?.type) {
      case 'bullet_list_open':
      case 'ordered_list_open':
      case 'blockquote_open':
      case 'table_open':
        return true
      case 'paragraph_open':
      case 'code_block':
      case 'html_block':
        return !(cache.boundary ? cache.boundary.endsWithBlankLine : this.endsWithBlankLine(cache.src))
      default:
        return lastToken?.nesting === 1
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

  private ensureBoundaryState(cache: StreamCache): StreamBoundaryState {
    if (cache.boundary)
      return cache.boundary

    const src = cache.src
    const len = src.length
    const endsWithNewline = len > 0 && src.charCodeAt(len - 1) === 0x0A
    const lineEnd = endsWithNewline ? len - 1 : len
    let lineStart = lineEnd - 1
    while (lineStart >= 0 && src.charCodeAt(lineStart) !== 0x0A) lineStart--

    let lineNonBlank = false
    for (let i = lineStart + 1; i < lineEnd; i++) {
      const ch = src.charCodeAt(i)
      if (ch !== 0x20 && ch !== 0x09) {
        lineNonBlank = true
        break
      }
    }

    cache.boundary = {
      currentLineNonBlank: endsWithNewline ? false : lineNonBlank,
      previousLineNonBlank: endsWithNewline ? lineNonBlank : false,
      endsWithNewline,
      endsWithBlankLine: this.endsWithBlankLine(src),
    }
    return cache.boundary
  }

  private updateBoundaryStateForAppend(cache: StreamCache, appended: string): void {
    const boundary = this.ensureBoundaryState(cache)
    let currentLineNonBlank = boundary.currentLineNonBlank
    let previousLineNonBlank = boundary.previousLineNonBlank

    for (let i = 0; i < appended.length; i++) {
      const ch = appended.charCodeAt(i)
      if (ch === 0x0A) {
        previousLineNonBlank = currentLineNonBlank
        currentLineNonBlank = false
      }
      else if (ch !== 0x20 && ch !== 0x09) {
        currentLineNonBlank = true
      }
    }

    boundary.currentLineNonBlank = currentLineNonBlank
    boundary.previousLineNonBlank = previousLineNonBlank
    boundary.endsWithNewline = appended.length > 0
      ? appended.charCodeAt(appended.length - 1) === 0x0A
      : boundary.endsWithNewline
    boundary.endsWithBlankLine = cache.src.length + appended.length >= 2
      && boundary.endsWithNewline
      && !previousLineNonBlank
  }

  private getDocLineCount(src: string, lineCount = countLines(src)): number {
    if (src.length === 0)
      return 0
    return src.charCodeAt(src.length - 1) === 0x0A ? lineCount : lineCount + 1
  }

  private getCachedDocLineCount(cache: StreamCache, lineCount: number): number {
    if (cache.src.length === 0)
      return 0
    if (cache.boundary)
      return cache.boundary.endsWithNewline ? lineCount : lineCount + 1
    return this.getDocLineCount(cache.src, lineCount)
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
