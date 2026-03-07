import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import type { ParserCore } from '../parse/parser_core'
import { countLines } from '../common/utils'
import { chunkedParse } from './chunked'

interface StreamCache {
  src: string
  tokens: Token[]
  env: Record<string, unknown>
  // Cache line count to avoid recounting
  lineCount?: number
  lastSegment?: StreamSegment | null
}

interface StreamSegment {
  tokenStart: number
  tokenEnd: number
  lineStart: number
  lineEnd: number
  srcOffset: number
}

const EMPTY_TOKENS: Token[] = []

export interface StreamStats {
  total: number
  cacheHits: number
  appendHits: number
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
  private readonly DEFAULT_SKIP_CACHE_CHARS = 600_000
  private readonly DEFAULT_SKIP_CACHE_LINES = 10_000
  private readonly MAX_CHUNKS_FOR_FALLBACK = 24
  // Avoid chunked fallback for very large docs; prefer a single full parse
  private readonly MAX_CHUNKED_DOC_CHARS = 120_000
  // Container-merge pays off only when the tail list is already sizeable.
  private readonly MIN_LIST_LINES_FOR_MERGE = 80
  private readonly MIN_LIST_CHARS_FOR_MERGE = 800
  private readonly MIN_TABLE_LINES_FOR_MERGE = 48
  private readonly MIN_TABLE_CHARS_FOR_MERGE = 1200

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

    // Only update the cache on the very first parse or when the current
    // source ends at a safe block boundary (double newline). This prevents
    if (!cached || (envProvided && envProvided !== cached.env)) {
      const workingEnv = envProvided ?? {}

      // Allow chunked for first parse when enabled and large enough
      const chunkedEnabled = !!md.options?.streamChunkedFallback
      const chunkAdaptive = md.options?.streamChunkAdaptive !== false
      const targetChunks = md.options?.streamChunkTargetChunks ?? 8
      const chunkSizeCharsCfg = md.options?.streamChunkSizeChars
      const chunkSizeLinesCfg = md.options?.streamChunkSizeLines
      const auto = md.options?.autoTuneChunks !== false
      const chunkFenceAware = md.options?.streamChunkFenceAware ?? true

      const skipCacheChars = md.options?.streamSkipCacheAboveChars ?? this.DEFAULT_SKIP_CACHE_CHARS
      const skipCacheLines = md.options?.streamSkipCacheAboveLines ?? this.DEFAULT_SKIP_CACHE_LINES
      let srcLineCount: number | undefined
      const isLargeByChars = src.length >= skipCacheChars
      let isVeryLargeOneShot = isLargeByChars
      if (!isVeryLargeOneShot && skipCacheLines !== undefined) {
        srcLineCount = countLines(src)
        isVeryLargeOneShot = srcLineCount >= skipCacheLines
      }

      // Heuristic: very large one-shot payloads are likely history restore/display.
      // In such cases, treat as non-stream for performance and memory: do not cache.
      if (isVeryLargeOneShot) {
        const state = this.core.parse(src, workingEnv, md)
        const tokens = state.tokens
        // Intentionally skip caching to avoid holding a massive token array in memory
        this.stats.total += 1
        this.stats.fullParses += 1
        this.stats.lastMode = 'full'
        return tokens
      }
      else if (chunkedEnabled && src.length < this.MAX_CHUNKED_DOC_CHARS) {
        const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : (v > hi ? hi : v)
        // Best-practice discrete mapping (append-focused) when user didn't force sizes
        if (srcLineCount === undefined)
          srcLineCount = countLines(src)
        let useChars = chunkAdaptive ? clamp(Math.ceil(src.length / targetChunks), 8000, 32000) : (chunkSizeCharsCfg ?? 10000)
        let useLines = chunkAdaptive ? clamp(Math.ceil(srcLineCount / targetChunks), 150, 350) : (chunkSizeLinesCfg ?? 200)
        if (auto && !chunkSizeCharsCfg && !chunkSizeLinesCfg) {
          if (src.length <= 5_000) {
            useChars = 16_000
            useLines = 250
          }
          else if (src.length <= 20_000) {
            useChars = 16_000
            useLines = 200
          }
          else if (src.length <= 50_000) {
            useChars = 16_000
            useLines = 250
          }
          else if (src.length <= 100_000) {
            useChars = 10_000
            useLines = 200
          }
          else {
            useChars = 20_000
            useLines = 200
          }
        }
        // Avoid chunked fallback for character-by-character growth (no trailing newline)
        const hasTrailingNewline = src.length > 0 && src.charCodeAt(src.length - 1) === 0x0A
        const estimatedChunks = Math.ceil(src.length / useChars)
        if ((src.length >= (useChars * 2) || srcLineCount >= (useLines * 2)) && hasTrailingNewline && estimatedChunks <= this.MAX_CHUNKS_FOR_FALLBACK) {
          const tokens = chunkedParse(md, src, workingEnv, {
            maxChunkChars: useChars,
            maxChunkLines: useLines,
            fenceAware: chunkFenceAware,
          })
          this.cache = { src, tokens, env: workingEnv, lineCount: srcLineCount, lastSegment: undefined }
          this.updateCacheLineCount(this.cache, srcLineCount)
          this.stats.total += 1
          this.stats.chunkedParses = (this.stats.chunkedParses || 0) + 1
          this.stats.lastMode = 'chunked'
          return tokens
        }
      }

      // initial parse
      const state = this.core.parse(src, workingEnv, md)
      const tokens = state.tokens

      this.cache = { src, tokens, env: workingEnv, lineCount: srcLineCount, lastSegment: undefined }
      this.updateCacheLineCount(this.cache, srcLineCount)
      this.stats.total += 1
      this.stats.fullParses += 1
      this.stats.lastMode = 'full'
      return tokens
    }

    if (src === cached.src) {
      this.stats.total += 1
      this.stats.cacheHits += 1
      this.stats.lastMode = 'cache'
      return cached.tokens
    }

    // For small documents growing from scratch, optimization overhead is not worth it
    // But if we already have a cache, always try to optimize (user is editing)
    const threshold = md.options?.streamOptimizationMinSize ?? this.MIN_SIZE_FOR_OPTIMIZATION
    const isGrowingFromSmall = cached.src.length < threshold && src.length < threshold * 1.5

    if (isGrowingFromSmall && !src.startsWith(cached.src)) {
      // Small document with non-append edit - just reparse
      const fallbackEnv = envProvided ?? cached.env
      const fullState = this.core.parse(src, fallbackEnv, md)
      const nextTokens = fullState.tokens
      const lineCount = countLines(src)
      this.cache = { src, tokens: nextTokens, env: fallbackEnv, lineCount, lastSegment: undefined }
      this.updateCacheLineCount(this.cache, lineCount)
      this.stats.total += 1
      this.stats.fullParses += 1
      this.stats.lastMode = 'full'
      return nextTokens
    }

    // inspect appended detection
    const appended = this.getAppendedSegment(cached.src, src)
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
      // Context-parse strategy configuration (chars | lines | constructs)
      const ctxStrategy = (md.options?.streamContextParseStrategy as string) ?? 'chars'
      const CONTEXT_PARSE_MIN_CHARS = md.options?.streamContextParseMinChars ?? 200
      const CONTEXT_PARSE_MIN_LINES = md.options?.streamContextParseMinLines ?? 2

      function appendedHasBlockConstructs(s: string): boolean {
        // Heuristic: common block-level starters that may require context
        // - ATX headings (#)
        // - blockquote (>)
        // - lists (-, *, +, or numbered)
        // - fenced code (``` or ~~~)
        // - indented code (4+ spaces)
        // Scan line starts to avoid allocating regex backtracking state.
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

      let appendedLineCount: number | null = null
      const getAppendedLineCount = () => {
        if (appendedLineCount === null)
          appendedLineCount = countLines(appended)
        return appendedLineCount
      }

      const canDirectParseAppend = this.canDirectlyParseAppend(cached)

      // Decide whether to attempt a context-aware parse based on strategy
      let shouldAttemptContext = false
      if (!canDirectParseAppend) {
        switch (ctxStrategy) {
          case 'lines': {
            shouldAttemptContext = getAppendedLineCount() >= CONTEXT_PARSE_MIN_LINES
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
            shouldAttemptContext = getAppendedLineCount() >= CONTEXT_PARSE_MIN_LINES
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

          // Find first token that belongs to appended region. Tokens produced
          // by parsing `ctxSrc` will have `.map` values where lines starting
          // at >= ctxLines belong to appended part (since contextPrefix has
          // exactly ctxLines lines).
          // Find the first token that ends at or after the context window.
          // Using map[1] >= ctxLines ensures tokens that start earlier but
          // extend into the appended region are treated as part of the append.
          const idx = ctxTokens.findIndex(t => t.map && typeof t.map[1] === 'number' && t.map[1] >= ctxLines)
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
        const simpleState = this.core.parse(appended, cached.env, md)
        const lineOffset = cachedLineCount
        if (lineOffset > 0)
          this.shiftTokenLines(simpleState.tokens, lineOffset)
        appendedState = simpleState
      }

      // Conservative merge: if the last cached token and the first appended token
      // are both inline tokens, merge their content/children to avoid splitting
      // inline content across flush boundaries which can change rendered HTML.
      if (cached.tokens.length > 0 && appendedState.tokens.length > 0) {
        const lastCached = cached.tokens[cached.tokens.length - 1]
        const firstApp = appendedState.tokens[0]
        try {
          if (lastCached.type === 'inline' && firstApp.type === 'inline') {
            // merge children arrays when present
            if (firstApp.children && firstApp.children.length > 0) {
              if (!lastCached.children)
                lastCached.children = []
              lastCached.children.push(...firstApp.children)
            }
            // merge textual content
            lastCached.content = (lastCached.content || '') + (firstApp.content || '')
            // drop the merged token from appended list
            appendedState.tokens.shift()
          }
        }
        catch {
          // Be conservative on error: fall back to simple push below
        }
        // NOTE: previously had an aggressive paragraph-merge heuristic here that
        // attempted to splice an appended paragraph inline into the previous
        // paragraph. That heuristic caused distinct paragraphs to be concatenated
        // (breaking blank-line boundaries). Removing that rule preserves
        // paragraph boundaries while keeping the safer inline-token merge above.
      }

      // Append remaining tokens into cache
      const appendStart = cached.tokens.length
      if (appendedState.tokens.length > 0) {
        // Avoid duplicating tokens that are already present at the end of the cache.
        // If the beginning of appendedState.tokens matches a trailing sequence in
        // cached.tokens, drop the matching prefix from appendedState.tokens.
        const cachedTail = cached.tokens
        const a = appendedState.tokens
        const maxCheck = Math.min(cachedTail.length, a.length)

        function tokenEquals(x: any, y: any) {
          if (!x || !y)
            return false
          if (x.type !== y.type)
            return false
          if (x.type === 'inline')
            return (x.content || '') === (y.content || '')
          // For other tokens, type equality is acceptable for duplication detection
          return true
        }

        // Debug output suppressed in CI
        let dup = 0
        // Try longest prefix match
        for (let n = maxCheck; n > 0; n--) {
          let ok = true
          for (let i = 0; i < n; i++) {
            const tailToken = cachedTail[cachedTail.length - n + i]
            const prefToken = a[i]
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

        if (dup > 0) {
          // Drop the duplicated prefix from appended tokens
          a.splice(0, dup)
        }

        if (a.length > 0) {
          cached.tokens.push(...a)
        }
      }

      // Update cache with new src and line count
      cached.src = src
      const appendedLines = appendedLineCount ?? countLines(appended)
      cached.lineCount = cachedLineCount + appendedLines
      if (cached.tokens.length > appendStart) {
        const appendedLastSegment = this.getLastSegment(cached.tokens.slice(appendStart), src)
        if (appendedLastSegment) {
          cached.lastSegment = {
            tokenStart: appendStart + appendedLastSegment.tokenStart,
            tokenEnd: appendStart + appendedLastSegment.tokenEnd,
            lineStart: appendedLastSegment.lineStart,
            lineEnd: appendedLastSegment.lineEnd,
            srcOffset: appendedLastSegment.srcOffset,
          }
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
      this.stats.lastMode = 'append'
      return cached.tokens
    }

    const fallbackEnv = envProvided ?? cached.env

    const tailReparsed = this.tryTailSegmentReparse(src, cached, fallbackEnv, md)
    if (tailReparsed) {
      this.stats.total += 1
      this.stats.tailHits += 1
      this.stats.lastMode = 'tail'
      return tailReparsed
    }

    // Optional: use chunked parse as a fallback for very large documents
    const chunkedEnabled = !!md.options?.streamChunkedFallback
    const chunkAdaptive = md.options?.streamChunkAdaptive !== false
    const targetChunks = md.options?.streamChunkTargetChunks ?? 8
    const chunkSizeCharsCfg = md.options?.streamChunkSizeChars
    const chunkSizeLinesCfg = md.options?.streamChunkSizeLines
    const auto = md.options?.autoTuneChunks !== false
    const chunkFenceAware = md.options?.streamChunkFenceAware ?? true

    let srcLineCount2: number | undefined = cached.lineCount
    if (chunkedEnabled && src.length < this.MAX_CHUNKED_DOC_CHARS) {
      if (srcLineCount2 === undefined)
        srcLineCount2 = countLines(src)
      const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : (v > hi ? hi : v)
      let useChars = chunkAdaptive ? clamp(Math.ceil(src.length / targetChunks), 8000, 32000) : (chunkSizeCharsCfg ?? 10000)
      let useLines = chunkAdaptive ? clamp(Math.ceil(srcLineCount2 / targetChunks), 150, 350) : (chunkSizeLinesCfg ?? 200)
      if (auto && !chunkSizeCharsCfg && !chunkSizeLinesCfg) {
        if (src.length <= 5_000) {
          useChars = 16_000
          useLines = 250
        }
        else if (src.length <= 20_000) {
          useChars = 16_000
          useLines = 200
        }
        else if (src.length <= 50_000) {
          useChars = 16_000
          useLines = 250
        }
        else if (src.length <= 100_000) {
          useChars = 10_000
          useLines = 200
        }
        else {
          useChars = 20_000
          useLines = 200
        }
      }
      const hasTrailingNewline2 = src.length > 0 && src.charCodeAt(src.length - 1) === 0x0A
      const estimatedChunks = Math.ceil(src.length / useChars)
      if ((src.length >= (useChars * 2) || srcLineCount2 >= (useLines * 2)) && hasTrailingNewline2 && estimatedChunks <= this.MAX_CHUNKS_FOR_FALLBACK) {
        const tokens = chunkedParse(md, src, fallbackEnv, {
          maxChunkChars: useChars,
          maxChunkLines: useLines,
          fenceAware: chunkFenceAware,
        })
        this.cache = { src, tokens, env: fallbackEnv, lineCount: srcLineCount2, lastSegment: undefined }
        this.updateCacheLineCount(this.cache, srcLineCount2)
        this.stats.total += 1
        this.stats.chunkedParses = (this.stats.chunkedParses || 0) + 1
        this.stats.lastMode = 'chunked'
        return tokens
      }
    }

    // full fallback parse
    const fullState = this.core.parse(src, fallbackEnv, md)
    const nextTokens = fullState.tokens
    this.cache = { src, tokens: nextTokens, env: fallbackEnv, lineCount: srcLineCount2, lastSegment: undefined }
    this.updateCacheLineCount(this.cache, srcLineCount2)
    this.stats.total += 1
    this.stats.fullParses += 1
    this.stats.lastMode = 'full'
    return nextTokens
  }

  private getAppendedSegment(prev: string, next: string): string | null {
    if (!next.startsWith(prev))
      return null

    if (!prev.endsWith('\n'))
      return null

    const segment = next.slice(prev.length)
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
    if (this.endsInsideOpenFence(prev))
      return null

    if (this.mayContainReferenceDefinition(segment))
      return null

    return segment
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
      cached.tokens.length = lastSegment.tokenStart
      cached.tokens.push(...tailState.tokens)
      cached.lineCount = countLines(src)
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
    const chunk = text.slice(start)
    const len = chunk.length
    let inFence: { marker: number, length: number } | null = null
    let lineStart = 0
    while (lineStart <= len) {
      let lineEnd = chunk.indexOf('\n', lineStart)
      if (lineEnd === -1)
        lineEnd = len

      // skip leading spaces/tabs
      let p = lineStart
      while (p < lineEnd) {
        const c = chunk.charCodeAt(p)
        if (c === 0x20 /* space */ || c === 0x09 /* tab */)
          p++
        else
          break
      }

      if (p < lineEnd) {
        const ch = chunk.charCodeAt(p)
        if (ch === 0x60 /* ` */ || ch === 0x7E /* ~ */) {
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

  public peek(): Token[] {
    return this.cache?.tokens ?? EMPTY_TOKENS
  }

  public getStats(): StreamStats {
    return { ...this.stats }
  }

  // countLines moved to common utils for reuse

  private updateCacheLineCount(cache: StreamCache, lineCount?: number): void {
    cache.lineCount = lineCount ?? countLines(cache.src)
    cache.lastSegment = undefined
  }

  private ensureLastSegment(cache: StreamCache): StreamSegment | null {
    if (cache.lastSegment !== undefined)
      return cache.lastSegment

    cache.lastSegment = this.getLastSegment(cache.tokens, cache.src)
    return cache.lastSegment
  }

  private getLastSegment(tokens: Token[], src: string): StreamSegment | null {
    if (tokens.length === 0)
      return null

    let lineStart = Number.POSITIVE_INFINITY
    let lineEnd = -1
    let depth = 0

    for (let i = tokens.length - 1; i >= 0; i--) {
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
            tokenEnd: tokens.length,
            lineStart: resolvedStart,
            lineEnd: resolvedEnd,
            srcOffset: this.getLineStartOffset(src, resolvedStart),
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
          tokenEnd: tokens.length,
          lineStart: resolvedStart,
          lineEnd: resolvedEnd,
          srcOffset: this.getLineStartOffset(src, resolvedStart),
        }
      }
    }

    return null
  }

  private getLineStartOffset(src: string, line: number): number {
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
    cached.lineCount = countLines(src)
    if (listOpen.map)
      listOpen.map[1] = this.getDocLineCount(src)
    cached.lastSegment = {
      tokenStart: lastSegment.tokenStart,
      tokenEnd: cached.tokens.length,
      lineStart: lastSegment.lineStart,
      lineEnd: this.getDocLineCount(src),
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
    cached.tokens.splice(insertAt, 0, ...inserted)
    cached.src = src
    cached.env = env
    cached.lineCount = countLines(src)

    const nextDocLineCount = this.getDocLineCount(src)
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

  private getDocLineCount(src: string): number {
    const lines = countLines(src)
    if (src.length === 0)
      return 0
    return src.charCodeAt(src.length - 1) === 0x0A ? lines : lines + 1
  }

  private shiftTokenLines(tokens: Token[], offset: number): void {
    if (offset === 0)
      return

    // Use iterative approach with a stack to avoid recursion overhead
    const stack: Token[] = [...tokens]

    while (stack.length > 0) {
      const token = stack.pop()!

      if (token.map) {
        token.map[0] += offset
        token.map[1] += offset
      }

      if (token.children) {
        // Add children to stack for processing
        for (let i = token.children.length - 1; i >= 0; i--) {
          stack.push(token.children[i])
        }
      }
    }
  }

  // (no-op placeholder: extendEndingLine removed as unused)
}

export default StreamParser
