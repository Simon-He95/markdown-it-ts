import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import type { GlobalMarkdownStateReason } from '../parse/global_state'
import { countLines } from '../common/utils'
import { detectGlobalMarkdownState, runWithKnownGlobalMarkdownState } from '../parse/global_state'

export interface DeltaMarkdownStreamOptions {
  final?: boolean
}

export interface StreamPatch {
  tokens: Token[]
  tokenStart: number
  tokenDeleteCount: number
  stableLineEnd: number
  mode: 'append' | 'tail' | 'full'
}

export interface DeltaMarkdownStreamStats {
  fedChars: number
  committedChars: number
  committedLines: number
  pendingChars: number
  reparsedChars: number
  fullParses: number
  localizedParses: number
  emittedPatches: number
  lastMode: 'pending' | 'append' | 'tail' | 'full'
}

function makeStats(): DeltaMarkdownStreamStats {
  return {
    fedChars: 0,
    committedChars: 0,
    committedLines: 0,
    pendingChars: 0,
    reparsedChars: 0,
    fullParses: 0,
    localizedParses: 0,
    emittedPatches: 0,
    lastMode: 'pending',
  }
}

function isBlankLine(src: string, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    const ch = src.charCodeAt(i)
    if (ch !== 0x20 && ch !== 0x09 && ch !== 0x0D)
      return false
  }
  return true
}

function scanFenceLine(src: string, start: number, end: number): { marker: number, length: number } | null {
  let pos = start
  while (pos < end) {
    const ch = src.charCodeAt(pos)
    if (ch === 0x20 || ch === 0x09)
      pos++
    else
      break
  }

  const marker = src.charCodeAt(pos)
  if (marker !== 0x60 && marker !== 0x7E)
    return null

  let runEnd = pos + 1
  while (runEnd < end && src.charCodeAt(runEnd) === marker)
    runEnd++

  const length = runEnd - pos
  return length >= 3 ? { marker, length } : null
}

function hasContainerRisk(src: string): boolean {
  let lineStart = 0
  while (lineStart < src.length) {
    let lineEnd = src.indexOf('\n', lineStart)
    if (lineEnd < 0)
      lineEnd = src.length

    let pos = lineStart
    let indent = 0
    while (pos < lineEnd) {
      const ch = src.charCodeAt(pos)
      if (ch === 0x20) {
        indent++
        pos++
        continue
      }
      if (ch === 0x09) {
        indent += 4 - (indent % 4)
        pos++
        continue
      }
      break
    }

    if (indent < 4 && pos < lineEnd) {
      const ch = src.charCodeAt(pos)
      if (ch === 0x3E)
        return true
      if ((ch === 0x2D || ch === 0x2A || ch === 0x2B) && pos + 1 < lineEnd) {
        const next = src.charCodeAt(pos + 1)
        if (next === 0x20 || next === 0x09)
          return true
      }
      if (ch >= 0x30 && ch <= 0x39) {
        let p = pos + 1
        while (p < lineEnd) {
          const digit = src.charCodeAt(p)
          if (digit < 0x30 || digit > 0x39)
            break
          p++
        }
        if (p < lineEnd && src.charCodeAt(p) === 0x2E && p + 1 < lineEnd) {
          const next = src.charCodeAt(p + 1)
          if (next === 0x20 || next === 0x09)
            return true
        }
      }
    }

    if (lineEnd === src.length)
      break
    lineStart = lineEnd + 1
  }

  return false
}

function hasDefinitionRisk(src: string): boolean {
  if (detectGlobalMarkdownState(src))
    return true

  return src.includes('[')
}

function findStablePrefixEnd(src: string): number {
  if (!src)
    return 0

  let stableEnd = 0
  let lineStart = 0
  let fence: { marker: number, length: number } | null = null

  while (lineStart < src.length) {
    let lineEnd = src.indexOf('\n', lineStart)
    let lineEndWithNl = lineEnd
    if (lineEnd < 0) {
      lineEnd = src.length
      lineEndWithNl = src.length
    }
    else {
      lineEndWithNl = lineEnd + 1
    }

    const fenceLine = scanFenceLine(src, lineStart, lineEnd)
    if (fenceLine) {
      if (!fence)
        fence = fenceLine
      else if (fence.marker === fenceLine.marker && fenceLine.length >= fence.length)
        fence = null
    }

    if (!fence && isBlankLine(src, lineStart, lineEnd))
      stableEnd = lineEndWithNl

    if (lineEndWithNl === src.length)
      break
    lineStart = lineEndWithNl
  }

  if (stableEnd === 0)
    return 0

  const candidate = src.slice(0, stableEnd)
  if (hasContainerRisk(candidate) || hasDefinitionRisk(candidate))
    return 0

  return stableEnd
}

function appendTokens(out: Token[], tokens: Token[]): void {
  for (let i = 0; i < tokens.length; i++)
    out.push(tokens[i])
}

export class DeltaMarkdownStream {
  private readonly md: MarkdownIt
  private readonly env: Record<string, unknown>
  private committedTokens: Token[] = []
  private pending = ''
  private statsState = makeStats()
  private pendingGlobalReason: GlobalMarkdownStateReason | null = null

  constructor(md: MarkdownIt, env: Record<string, unknown> = {}) {
    this.md = md
    this.env = env
  }

  feed(delta: string, opts: DeltaMarkdownStreamOptions = {}): StreamPatch | null {
    if (delta) {
      this.pending += delta
      this.statsState.fedChars += delta.length
      this.pendingGlobalReason = this.pendingGlobalReason || detectGlobalMarkdownState(this.pending)
    }

    return this.flush(opts)
  }

  flush(opts: DeltaMarkdownStreamOptions = {}): StreamPatch | null {
    if (!this.pending) {
      this.statsState.pendingChars = 0
      return null
    }

    const final = opts.final === true
    let stableEnd = final ? this.pending.length : findStablePrefixEnd(this.pending)
    if (stableEnd <= 0) {
      this.statsState.pendingChars = this.pending.length
      this.statsState.lastMode = 'pending'
      return null
    }

    if (!final && this.pendingGlobalReason) {
      this.statsState.pendingChars = this.pending.length
      this.statsState.lastMode = 'pending'
      return null
    }

    if (stableEnd < this.pending.length) {
      while (stableEnd > 0) {
        const ch = this.pending.charCodeAt(stableEnd - 1)
        if (ch === 0x0A || ch === 0x20 || ch === 0x09 || ch === 0x0D)
          break
        stableEnd--
      }
    }

    const stable = this.pending.slice(0, stableEnd)
    const reason = this.pendingGlobalReason || detectGlobalMarkdownState(stable)
    const mode: StreamPatch['mode'] = reason && final && this.committedTokens.length === 0
      ? 'full'
      : 'append'
    const tokens = runWithKnownGlobalMarkdownState(this.env, reason, () => {
      return this.md.core.parse(stable, this.env, this.md).tokens
    })

    const tokenStart = mode === 'full' ? 0 : this.committedTokens.length
    const tokenDeleteCount = mode === 'full' ? this.committedTokens.length : 0
    if (mode === 'full') {
      this.committedTokens = tokens.slice()
      this.statsState.fullParses += 1
    }
    else {
      appendTokens(this.committedTokens, tokens)
      this.statsState.localizedParses += 1
    }

    this.pending = this.pending.slice(stableEnd)
    this.pendingGlobalReason = detectGlobalMarkdownState(this.pending)
    this.statsState.committedChars += stable.length
    this.statsState.committedLines += countLines(stable)
    this.statsState.pendingChars = this.pending.length
    this.statsState.reparsedChars += stable.length
    this.statsState.emittedPatches += 1
    this.statsState.lastMode = mode

    return {
      tokens,
      tokenStart,
      tokenDeleteCount,
      stableLineEnd: this.statsState.committedLines,
      mode,
    }
  }

  peek(): Token[] {
    return this.committedTokens
  }

  stats(): DeltaMarkdownStreamStats {
    return {
      ...this.statsState,
      pendingChars: this.pending.length,
    }
  }

  reset(): void {
    this.committedTokens = []
    this.pending = ''
    this.statsState = makeStats()
    this.pendingGlobalReason = null
  }
}

export function createDeltaStream(md: MarkdownIt, env: Record<string, unknown> = {}): DeltaMarkdownStream {
  return new DeltaMarkdownStream(md, env)
}
