import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import { countLines } from '../common/utils'
import { splitIntoChunkRanges } from './chunked'

export interface UnboundedBufferOptions {
  mode?: 'full' | 'stream'
  maxChunkChars?: number
  maxChunkLines?: number
  fenceAware?: boolean
  autoTune?: boolean
  retainTokens?: boolean
  onChunkTokens?: UnboundedTokenConsumer
}

const DEFAULT_AUTO_UNBOUNDED_THRESHOLD_CHARS = 4_000_000
const DEFAULT_AUTO_UNBOUNDED_THRESHOLD_LINES = 80_000

export interface UnboundedBufferStats {
  mode: 'full' | 'stream'
  fedChunks: number
  parsedChunks: number
  committedChars: number
  committedLines: number
  pendingChars: number
  pendingLines: number
  retainedTokens: boolean
}

export interface UnboundedChunkInfo {
  chunkIndex: number
  chunkChars: number
  chunkLines: number
  tokenCount: number
  startOffset: number
  endOffset: number
  startLine: number
  endLine: number
}

export type UnboundedTokenConsumer = (tokens: Token[], info: UnboundedChunkInfo) => void

interface ResolvedWindow {
  maxChunkChars: number
  maxChunkLines: number
  holdBelowChars: number
  holdBelowLines: number
  fenceAware: boolean
}

const DEFAULT_FULL_CHUNK_CHARS = 10_000
const DEFAULT_FULL_CHUNK_LINES = 200
const DEFAULT_STREAM_CHUNK_CHARS = 10_000
const DEFAULT_STREAM_CHUNK_LINES = 200

export type AutoUnboundedDecision = 'yes' | 'need-lines' | 'no'

function appendTokens(out: Token[], tokens: Token[]): void {
  for (let i = 0; i < tokens.length; i++) {
    out.push(tokens[i])
  }
}

function shiftTokenLines(tokens: Token[], offset: number): void {
  if (offset === 0)
    return

  const stack: Token[] = []
  for (let i = tokens.length - 1; i >= 0; i--) stack.push(tokens[i])

  while (stack.length) {
    const token = stack.pop()!
    if (token.map) {
      token.map[0] += offset
      token.map[1] += offset
    }
    if (token.children) {
      for (let i = token.children.length - 1; i >= 0; i--) {
        stack.push(token.children[i])
      }
    }
  }
}

function estimateLines(src: string): number {
  if (src.length === 0)
    return 0
  return countLines(src) + (src.charCodeAt(src.length - 1) === 0x0A ? 0 : 1)
}

function isBlankLine(src: string, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    const ch = src.charCodeAt(i)
    if (ch !== 0x20 && ch !== 0x09 && ch !== 0x0D)
      return false
  }
  return true
}

function endsInsideFence(src: string, fenceAware: boolean): boolean {
  if (!fenceAware || src.length === 0)
    return false

  let inFence: { marker: '`' | '~', length: number } | null = null

  for (let lineStart = 0; lineStart < src.length;) {
    let lineEnd = src.indexOf('\n', lineStart)
    if (lineEnd === -1)
      lineEnd = src.length

    let p = lineStart
    while (p < lineEnd) {
      const c = src.charCodeAt(p)
      if (c === 0x20 || c === 0x09)
        p++
      else
        break
    }

    const ch = src[p]
    if (ch === '`' || ch === '~') {
      let q = p
      while (q < lineEnd && src[q] === ch) q++
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

    lineStart = lineEnd === src.length ? src.length : lineEnd + 1
  }

  return inFence !== null
}

function endsAtBlankBoundary(src: string, fenceAware: boolean): boolean {
  if (src.length === 0 || src.charCodeAt(src.length - 1) !== 0x0A)
    return false

  let prevNl = src.length - 2
  while (prevNl >= 0 && src.charCodeAt(prevNl) !== 0x0A) prevNl--
  const lastLineStart = prevNl + 1
  if (!isBlankLine(src, lastLineStart, src.length - 1))
    return false

  return !endsInsideFence(src, fenceAware)
}

function resolveWindow(md: MarkdownIt, totalChars: number, totalLines: number, opts: UnboundedBufferOptions = {}): ResolvedWindow {
  const mode = opts.mode ?? 'full'
  const fenceAware = opts.fenceAware
    ?? (mode === 'stream'
      ? (md.options.streamChunkFenceAware ?? true)
      : (md.options.fullChunkFenceAware ?? true))

  const explicitWindow = opts.maxChunkChars !== undefined
    || opts.maxChunkLines !== undefined
    || opts.autoTune === false

  if (explicitWindow) {
    const maxChunkChars = opts.maxChunkChars
      ?? (mode === 'stream'
        ? (md.options.streamChunkSizeChars ?? DEFAULT_STREAM_CHUNK_CHARS)
        : (md.options.fullChunkSizeChars ?? DEFAULT_FULL_CHUNK_CHARS))
    const maxChunkLines = opts.maxChunkLines
      ?? (mode === 'stream'
        ? (md.options.streamChunkSizeLines ?? DEFAULT_STREAM_CHUNK_LINES)
        : (md.options.fullChunkSizeLines ?? DEFAULT_FULL_CHUNK_LINES))
    return {
      maxChunkChars,
      maxChunkLines,
      holdBelowChars: maxChunkChars,
      holdBelowLines: maxChunkLines,
      fenceAware,
    }
  }

  if (mode === 'stream') {
    if (totalChars <= 5_000) {
      return { maxChunkChars: 16_000, maxChunkLines: 250, holdBelowChars: 16_000, holdBelowLines: 250, fenceAware }
    }
    if (totalChars <= 20_000) {
      return { maxChunkChars: 16_000, maxChunkLines: 200, holdBelowChars: 16_000, holdBelowLines: 200, fenceAware }
    }
    if (totalChars <= 50_000) {
      return { maxChunkChars: 16_000, maxChunkLines: 250, holdBelowChars: 16_000, holdBelowLines: 250, fenceAware }
    }
    if (totalChars <= 500_000) {
      return { maxChunkChars: 32_000, maxChunkLines: 350, holdBelowChars: 32_000, holdBelowLines: 350, fenceAware }
    }
    return { maxChunkChars: 64_000, maxChunkLines: 700, holdBelowChars: 64_000, holdBelowLines: 700, fenceAware }
  }

  if (totalChars <= 100_000 && totalLines <= 2_500) {
    return { maxChunkChars: 32_000, maxChunkLines: 350, holdBelowChars: 100_000, holdBelowLines: 2_500, fenceAware }
  }
  if (totalChars <= 200_000) {
    return { maxChunkChars: 20_000, maxChunkLines: 150, holdBelowChars: 20_000, holdBelowLines: 150, fenceAware }
  }
  if (totalChars <= 500_000) {
    return { maxChunkChars: 32_000, maxChunkLines: 350, holdBelowChars: 32_000, holdBelowLines: 350, fenceAware }
  }
  return { maxChunkChars: 64_000, maxChunkLines: 700, holdBelowChars: 64_000, holdBelowLines: 700, fenceAware }
}

export class UnboundedBuffer {
  private readonly md: MarkdownIt
  private readonly options: UnboundedBufferOptions
  private pending = ''
  private tokens: Token[] = []
  private committedChars = 0
  private committedLines = 0
  private fedChunks = 0
  private parsedChunks = 0

  constructor(md: MarkdownIt, opts: UnboundedBufferOptions = {}) {
    this.md = md
    this.options = { mode: 'full', autoTune: true, retainTokens: true, ...opts }
    if (this.options.retainTokens === false && !this.options.onChunkTokens) {
      throw new Error('UnboundedBuffer with retainTokens=false requires onChunkTokens')
    }
  }

  feed(chunk: string): void {
    if (!chunk)
      return
    this.pending += chunk
    this.fedChunks += 1
  }

  flushAvailable(env: Record<string, unknown> = {}): Token[] | null {
    if (!this.pending)
      return null

    const window = this.resolveWindow()
    const pendingLines = estimateLines(this.pending)
    if (this.pending.length < window.holdBelowChars && pendingLines < window.holdBelowLines) {
      this.updateEnvDiagnostics(env, window, pendingLines)
      return null
    }

    const ranges = splitIntoChunkRanges(this.pending, {
      maxChunkChars: window.maxChunkChars,
      maxChunkLines: window.maxChunkLines,
      fenceAware: window.fenceAware,
      maxChunks: undefined,
    }, false)

    if (!ranges.length) {
      this.updateEnvDiagnostics(env, window, pendingLines)
      return null
    }

    const consumed = this.commitRanges(ranges, env)
    this.pending = this.pending.slice(consumed)
    this.updateEnvDiagnostics(env, window, estimateLines(this.pending))
    return this.tokens
  }

  flushIfBoundary(env: Record<string, unknown> = {}): Token[] | null {
    if (!this.pending)
      return null

    const window = this.resolveWindow()
    if (!endsAtBlankBoundary(this.pending, window.fenceAware)) {
      this.updateEnvDiagnostics(env, window, estimateLines(this.pending))
      return null
    }

    const ranges = splitIntoChunkRanges(this.pending, {
      maxChunkChars: window.maxChunkChars,
      maxChunkLines: window.maxChunkLines,
      fenceAware: window.fenceAware,
      maxChunks: undefined,
    }, true)

    if (!ranges.length) {
      this.updateEnvDiagnostics(env, window, estimateLines(this.pending))
      return null
    }

    this.commitRanges(ranges, env)
    this.pending = ''
    this.updateEnvDiagnostics(env, window, 0)
    return this.tokens
  }

  flushForce(env: Record<string, unknown> = {}): Token[] {
    if (!this.pending) {
      const window = this.resolveWindow()
      this.updateEnvDiagnostics(env, window, 0)
      return this.tokens
    }

    const window = this.resolveWindow()
    const ranges = splitIntoChunkRanges(this.pending, {
      maxChunkChars: window.maxChunkChars,
      maxChunkLines: window.maxChunkLines,
      fenceAware: window.fenceAware,
      maxChunks: undefined,
    }, true)

    if (ranges.length) {
      this.commitRanges(ranges, env)
      this.pending = ''
    }

    this.updateEnvDiagnostics(env, window, 0)
    return this.tokens
  }

  reset(): void {
    this.pending = ''
    this.tokens = []
    this.committedChars = 0
    this.committedLines = 0
    this.fedChunks = 0
    this.parsedChunks = 0
  }

  peek(): Token[] {
    return this.tokens
  }

  pendingText(): string {
    return this.pending
  }

  stats(): UnboundedBufferStats {
    return {
      mode: this.options.mode ?? 'full',
      fedChunks: this.fedChunks,
      parsedChunks: this.parsedChunks,
      committedChars: this.committedChars,
      committedLines: this.committedLines,
      pendingChars: this.pending.length,
      pendingLines: estimateLines(this.pending),
      retainedTokens: this.options.retainTokens !== false,
    }
  }

  private resolveWindow(): ResolvedWindow {
    const totalChars = this.committedChars + this.pending.length
    const totalLines = this.committedLines + estimateLines(this.pending)
    return resolveWindow(this.md, totalChars, totalLines, this.options)
  }

  private commitRanges(ranges: Array<{ start: number, end: number, lineCount: number }>, env: Record<string, unknown>): number {
    if (!ranges.length)
      return 0

    let consumed = 0
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i]
      const src = this.pending.slice(range.start, range.end)
      const state = this.md.core.parse(src, env, this.md)
      const nextTokens = state.tokens
      const startOffset = this.committedChars
      const startLine = this.committedLines
      if (startLine !== 0 && nextTokens.length)
        shiftTokenLines(nextTokens, startLine)
      if (this.options.retainTokens !== false)
        appendTokens(this.tokens, nextTokens)
      this.committedChars += src.length
      this.committedLines += range.lineCount
      this.parsedChunks += 1
      if (this.options.onChunkTokens) {
        this.options.onChunkTokens(nextTokens, {
          chunkIndex: this.parsedChunks,
          chunkChars: src.length,
          chunkLines: range.lineCount,
          tokenCount: nextTokens.length,
          startOffset,
          endOffset: this.committedChars,
          startLine,
          endLine: this.committedLines,
        })
      }
      consumed = range.end
    }
    return consumed
  }

  private updateEnvDiagnostics(env: Record<string, unknown>, window: ResolvedWindow, pendingLines: number): void {
    try {
      ;(env as any).__mdtsUnboundedInfo = {
        mode: this.options.mode ?? 'full',
        maxChunkChars: window.maxChunkChars,
        maxChunkLines: window.maxChunkLines,
        committedChars: this.committedChars,
        committedLines: this.committedLines,
        pendingChars: this.pending.length,
        pendingLines,
        fedChunks: this.fedChunks,
        parsedChunks: this.parsedChunks,
      }
    }
    catch {}
  }
}

export function parseIterable(
  md: MarkdownIt,
  chunks: Iterable<string>,
  env: Record<string, unknown> = {},
  opts: UnboundedBufferOptions = {},
): Token[] {
  const buffer = new UnboundedBuffer(md, { mode: 'full', ...opts })
  for (const chunk of chunks) {
    buffer.feed(chunk)
    buffer.flushAvailable(env)
  }
  return buffer.flushForce(env)
}

export async function parseAsyncIterable(
  md: MarkdownIt,
  chunks: AsyncIterable<string>,
  env: Record<string, unknown> = {},
  opts: UnboundedBufferOptions = {},
): Promise<Token[]> {
  const buffer = new UnboundedBuffer(md, { mode: 'full', ...opts })
  for await (const chunk of chunks) {
    buffer.feed(chunk)
    buffer.flushAvailable(env)
  }
  return buffer.flushForce(env)
}

export function parseIterableToSink(
  md: MarkdownIt,
  chunks: Iterable<string>,
  onChunkTokens: UnboundedTokenConsumer,
  env: Record<string, unknown> = {},
  opts: Omit<UnboundedBufferOptions, 'retainTokens' | 'onChunkTokens'> = {},
): UnboundedBufferStats {
  const buffer = new UnboundedBuffer(md, {
    mode: 'full',
    ...opts,
    retainTokens: false,
    onChunkTokens,
  })
  for (const chunk of chunks) {
    buffer.feed(chunk)
    buffer.flushAvailable(env)
  }
  buffer.flushForce(env)
  return buffer.stats()
}

export async function parseAsyncIterableToSink(
  md: MarkdownIt,
  chunks: AsyncIterable<string>,
  onChunkTokens: UnboundedTokenConsumer,
  env: Record<string, unknown> = {},
  opts: Omit<UnboundedBufferOptions, 'retainTokens' | 'onChunkTokens'> = {},
): Promise<UnboundedBufferStats> {
  const buffer = new UnboundedBuffer(md, {
    mode: 'full',
    ...opts,
    retainTokens: false,
    onChunkTokens,
  })
  for await (const chunk of chunks) {
    buffer.feed(chunk)
    buffer.flushAvailable(env)
  }
  buffer.flushForce(env)
  return buffer.stats()
}

export function shouldAutoUseUnbounded(
  md: MarkdownIt,
  totalChars: number,
  totalLines: number,
): boolean {
  if (md.options.autoUnbounded === false)
    return false

  const thresholdChars = md.options.autoUnboundedThresholdChars ?? DEFAULT_AUTO_UNBOUNDED_THRESHOLD_CHARS
  const thresholdLines = md.options.autoUnboundedThresholdLines ?? DEFAULT_AUTO_UNBOUNDED_THRESHOLD_LINES

  return totalChars >= thresholdChars || totalLines >= thresholdLines
}

export function getAutoUnboundedDecision(
  md: MarkdownIt,
  totalChars: number,
  totalLines?: number,
): AutoUnboundedDecision {
  if (md.options.autoUnbounded === false)
    return 'no'

  const thresholdChars = md.options.autoUnboundedThresholdChars ?? DEFAULT_AUTO_UNBOUNDED_THRESHOLD_CHARS
  if (totalChars >= thresholdChars)
    return 'yes'

  const thresholdLines = md.options.autoUnboundedThresholdLines ?? DEFAULT_AUTO_UNBOUNDED_THRESHOLD_LINES
  if (totalLines !== undefined)
    return totalLines >= thresholdLines ? 'yes' : 'no'

  // A string shorter than (thresholdLines - 1) chars cannot contain enough
  // newlines to reach the line threshold, so we can skip the extra scan.
  if (totalChars + 1 < thresholdLines)
    return 'no'

  return 'need-lines'
}

export function parseStringUnbounded(
  md: MarkdownIt,
  src: string,
  env: Record<string, unknown> = {},
  opts: Omit<UnboundedBufferOptions, 'retainTokens' | 'onChunkTokens'> = {},
): Token[] {
  const tokens: Token[] = []
  const buffer = new UnboundedBuffer(md, {
    mode: 'full',
    ...opts,
    retainTokens: false,
    onChunkTokens(nextTokens) {
      appendTokens(tokens, nextTokens)
    },
  })

  buffer.feed(src)
  buffer.flushForce(env)

  return tokens
}
