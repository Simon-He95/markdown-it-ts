import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import type { ParserCore } from '../parse/parser_core'
import { chunkedParse } from './chunked'

interface StreamCache {
  src: string
  tokens: Token[]
  env: Record<string, unknown>
  // Cache line count to avoid recounting
  lineCount?: number
}

const EMPTY_TOKENS: Token[] = []

export interface StreamStats {
  total: number
  cacheHits: number
  appendHits: number
  fullParses: number
  resets: number
  chunkedParses?: number
  lastMode: 'idle' | 'cache' | 'append' | 'full' | 'reset' | 'chunked'
}

function makeEmptyStats(): StreamStats {
  return {
    total: 0,
    cacheHits: 0,
    appendHits: 0,
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

  // Track recent parse times to adaptively adjust strategy
  private recentParseTimes: number[] = []
  private readonly MAX_RECENT_SAMPLES = 10

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

    if (!cached || (envProvided && envProvided !== cached.env)) {
      const workingEnv = envProvided ?? {}

      // Allow chunked for first parse when enabled and large enough
      const chunkedEnabled = !!md.options?.streamChunkedFallback
      const chunkSizeChars = md.options?.streamChunkSizeChars ?? 10000
      const chunkSizeLines = md.options?.streamChunkSizeLines ?? 200
      const chunkFenceAware = md.options?.streamChunkFenceAware ?? true

      const srcLineCount = this.countLines(src)
      const isVeryLargeOneShot = (src.length >= (md.options?.fullChunkThresholdChars ?? 20_000) * 2.5) || (srcLineCount >= (md.options?.fullChunkThresholdLines ?? 400) * 2.5)

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
      else if (chunkedEnabled && (src.length >= (chunkSizeChars * 2) || srcLineCount >= (chunkSizeLines * 2))) {
        const tokens = chunkedParse(md, src, workingEnv, {
          maxChunkChars: chunkSizeChars,
          maxChunkLines: chunkSizeLines,
          fenceAware: chunkFenceAware,
        })
        this.cache = { src, tokens, env: workingEnv, lineCount: srcLineCount }
        this.stats.total += 1
        this.stats.chunkedParses = (this.stats.chunkedParses || 0) + 1
        this.stats.lastMode = 'chunked'
        return tokens
      }

      const state = this.core.parse(src, workingEnv, md)
      const tokens = state.tokens
      const lineCount = this.countLines(src)
      this.cache = { src, tokens, env: workingEnv, lineCount }
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
      const lineCount = this.countLines(src)
      this.cache = { src, tokens: nextTokens, env: fallbackEnv, lineCount }
      this.stats.total += 1
      this.stats.fullParses += 1
      this.stats.lastMode = 'full'
      return nextTokens
    }

    const appended = this.getAppendedSegment(cached.src, src)
    if (appended) {
      // Fast-path: reuse existing tokens when new input is a clean append that starts on a fresh line.
      // This is conservative; edits requiring cross-block context still fall back to a full parse below.
      const appendedState = this.core.parse(appended, cached.env, md)

      // Use cached line count if available
      const lineOffset = cached.lineCount ?? this.countLines(cached.src)

      if (lineOffset > 0)
        this.shiftTokenLines(appendedState.tokens, lineOffset)

      // Avoid array spread - directly mutate cache tokens
      cached.tokens.push(...appendedState.tokens)

      // Update cache with new src and line count
      cached.src = src
      cached.lineCount = lineOffset + this.countLines(appended)

      this.stats.total += 1
      this.stats.appendHits += 1
      this.stats.lastMode = 'append'
      return cached.tokens
    }

    const fallbackEnv = envProvided ?? cached.env

    // Optional: use chunked parse as a fallback for very large documents
    const chunkedEnabled = !!md.options?.streamChunkedFallback
    const chunkSizeChars = md.options?.streamChunkSizeChars ?? 10000
    const chunkSizeLines = md.options?.streamChunkSizeLines ?? 200
    const chunkFenceAware = md.options?.streamChunkFenceAware ?? true

    const srcLineCount2 = this.countLines(src)
    if (chunkedEnabled && (src.length >= (chunkSizeChars * 2) || srcLineCount2 >= (chunkSizeLines * 2))) {
      const tokens = chunkedParse(md, src, fallbackEnv, {
        maxChunkChars: chunkSizeChars,
        maxChunkLines: chunkSizeLines,
        fenceAware: chunkFenceAware,
      })
      this.cache = { src, tokens, env: fallbackEnv, lineCount: srcLineCount2 }
      this.stats.total += 1
      this.stats.chunkedParses = (this.stats.chunkedParses || 0) + 1
      this.stats.lastMode = 'chunked'
      return tokens
    }

    const fullState = this.core.parse(src, fallbackEnv, md)
    const nextTokens = fullState.tokens
    const lineCount = this.countLines(src)
    this.cache = { src, tokens: nextTokens, env: fallbackEnv, lineCount }
    this.stats.total += 1
    this.stats.fullParses += 1
    this.stats.lastMode = 'full'
    return nextTokens
  }

  private getAppendedSegment(prev: string, next: string): string | null {
    // Quick length check first
    const prevLen = prev.length
    const nextLen = next.length
    if (nextLen <= prevLen)
      return null

    // Check if prev is a prefix (optimized for common case)
    if (!next.startsWith(prev))
      return null

    // Check if prev ends with newline (use charCodeAt for speed)
    if (prev.charCodeAt(prevLen - 1) !== 0x0A) // '\n'
      return null

    const segment = next.slice(prevLen)
    const segLen = segment.length

    // Must have content
    if (segLen === 0)
      return null

    // Must end with newline
    if (segment.charCodeAt(segLen - 1) !== 0x0A)
      return null

    // Fast check for at least one newline in the middle
    // (we know first char could be newline, and last char is newline)
    // We need at least 2 newlines total for a valid append
    let newlineCount = 0
    for (let i = 0; i < segLen && newlineCount < 2; i++) {
      if (segment.charCodeAt(i) === 0x0A)
        newlineCount++
    }

    if (newlineCount < 2)
      return null

    // Prevent setext heading underlines from using the fast-path since they
    // retroactively change the previous line's block type.
    const firstLineBreak = segment.indexOf('\n')
    const firstLine = segment.slice(0, firstLineBreak)
    const trimmedFirstLine = firstLine.trim()

    if (trimmedFirstLine.length === 0)
      return null

    // Check for setext underline (all dashes or equals)
    if (/^[-=]+$/.test(trimmedFirstLine)) {
      // Check if previous line has content (would make it a setext heading)
      const prevWithoutNewline = prev.slice(0, prevLen - 1)
      const lastBreak = prevWithoutNewline.lastIndexOf('\n')
      const previousLine = prevWithoutNewline.slice(lastBreak + 1)
      if (previousLine.trim().length > 0)
        return null
    }

    return segment
  }

  public peek(): Token[] {
    return this.cache?.tokens ?? EMPTY_TOKENS
  }

  public getStats(): StreamStats {
    return { ...this.stats }
  }

  private countLines(input: string): number {
    if (input.length === 0)
      return 0

    let count = 0
    // Optimized: use indexOf in a loop instead of char-by-char
    let pos = -1
    while ((pos = input.indexOf('\n', pos + 1)) !== -1) {
      count++
    }

    return count
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
}

export default StreamParser
