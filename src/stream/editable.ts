import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import { PieceTable } from './piece_table'

interface SegmentAnchor {
  tokenStart: number
  lineStart: number
  lineEnd: number
}

export interface EditableBufferStats {
  edits: number
  fullParses: number
  localizedParses: number
  sourceChars: number
  sourceLineBreaks: number
  lastMode: 'idle' | 'full' | 'localized'
  lastAnchorLine: number
  lastAnchorTokenStart: number
  lastReparsedChars: number
  pieceCount: number
}

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
      for (let i = token.children.length - 1; i >= 0; i--)
        stack.push(token.children[i])
    }
  }
}

function cloneStats(source: PieceTable, current: EditableBufferStats): EditableBufferStats {
  const sourceStats = source.stats()
  return {
    ...current,
    sourceChars: sourceStats.length,
    sourceLineBreaks: sourceStats.lineBreaks,
    pieceCount: sourceStats.pieces,
  }
}

export class EditableBuffer {
  private readonly md: MarkdownIt
  private source: PieceTable
  private tokens: Token[] = []
  private statsState: EditableBufferStats

  constructor(md: MarkdownIt, initial = '') {
    this.md = md
    this.source = new PieceTable(initial)
    this.statsState = {
      edits: 0,
      fullParses: 0,
      localizedParses: 0,
      sourceChars: this.source.length,
      sourceLineBreaks: this.source.lineBreaks,
      lastMode: 'idle',
      lastAnchorLine: 0,
      lastAnchorTokenStart: 0,
      lastReparsedChars: initial.length,
      pieceCount: this.source.stats().pieces,
    }
  }

  length(): number {
    return this.source.length
  }

  slice(start = 0, end = this.source.length): string {
    return this.source.slice(start, end)
  }

  toString(): string {
    return this.source.toString()
  }

  peek(): Token[] {
    return this.tokens
  }

  stats(): EditableBufferStats {
    return cloneStats(this.source, this.statsState)
  }

  reset(text = ''): void {
    const next = new PieceTable(text)
    this.source = next
    this.tokens = []
    this.statsState = {
      edits: 0,
      fullParses: 0,
      localizedParses: 0,
      sourceChars: next.length,
      sourceLineBreaks: next.lineBreaks,
      lastMode: 'idle',
      lastAnchorLine: 0,
      lastAnchorTokenStart: 0,
      lastReparsedChars: text.length,
      pieceCount: next.stats().pieces,
    }
  }

  parse(env: Record<string, unknown> = {}): Token[] {
    return this.fullParse(env)
  }

  append(text: string, env: Record<string, unknown> = {}): Token[] {
    return this.replace(this.source.length, this.source.length, text, env)
  }

  insert(offset: number, text: string, env: Record<string, unknown> = {}): Token[] {
    return this.replace(offset, offset, text, env)
  }

  delete(start: number, end: number, env: Record<string, unknown> = {}): Token[] {
    return this.replace(start, end, '', env)
  }

  replace(start: number, end: number, text: string, env: Record<string, unknown> = {}): Token[] {
    const beforeLength = this.source.length
    const clampedStart = Math.max(0, Math.min(start, beforeLength))
    const clampedEnd = Math.max(clampedStart, Math.min(end, beforeLength))
    const editLine = this.source.lineOfOffset(clampedStart)
    const anchor = this.tokens.length > 0
      ? this.findAnchorForEditLine(editLine)
      : null

    this.source.replace(clampedStart, clampedEnd, text)
    this.statsState.edits += 1

    if (!anchor || (anchor.tokenStart <= 0 && anchor.lineStart <= 0))
      return this.fullParse(env)

    return this.localizedReparse(anchor, env)
  }

  private fullParse(env: Record<string, unknown>): Token[] {
    this.tokens = this.md.core.parseSource(this.source.view(), env, this.md).tokens
    this.statsState.fullParses += 1
    this.statsState.lastMode = 'full'
    this.statsState.lastAnchorLine = 0
    this.statsState.lastAnchorTokenStart = 0
    this.statsState.lastReparsedChars = this.source.length
    return this.tokens
  }

  private localizedReparse(anchor: SegmentAnchor, env: Record<string, unknown>): Token[] {
    const anchorOffset = this.source.offsetOfLine(anchor.lineStart)
    this.tokens.length = anchor.tokenStart
    const reparsed = this.md.core.parseSource(this.source.view(anchorOffset), env, this.md).tokens
    if (anchor.lineStart > 0)
      shiftTokenLines(reparsed, anchor.lineStart)
    appendTokens(this.tokens, reparsed)

    this.statsState.localizedParses += 1
    this.statsState.lastMode = 'localized'
    this.statsState.lastAnchorLine = anchor.lineStart
    this.statsState.lastAnchorTokenStart = anchor.tokenStart
    this.statsState.lastReparsedChars = this.source.length - anchorOffset
    return this.tokens
  }

  private findAnchorForEditLine(editLine: number): SegmentAnchor | null {
    const segments = this.collectTopLevelSegments()
    if (!segments.length)
      return null

    let segmentIndex = segments.length - 1
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      if (editLine < segment.lineEnd || editLine <= segment.lineStart) {
        segmentIndex = i
        break
      }
    }

    const anchorIndex = Math.max(0, segmentIndex - 1)
    return segments[anchorIndex]
  }

  private collectTopLevelSegments(): SegmentAnchor[] {
    const segments: SegmentAnchor[] = []
    let current: SegmentAnchor | null = null

    const pushCurrent = () => {
      if (!current)
        return
      if (current.lineEnd < current.lineStart)
        current.lineEnd = current.lineStart
      segments.push(current)
      current = null
    }

    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i]
      const isSegmentStart = token.level === 0 && token.nesting >= 0

      if (isSegmentStart) {
        pushCurrent()
        current = {
          tokenStart: i,
          lineStart: token.map?.[0] ?? 0,
          lineEnd: token.map?.[1] ?? token.map?.[0] ?? 0,
        }
      }

      if (!current)
        continue

      if (token.map) {
        if (token.map[0] < current.lineStart)
          current.lineStart = token.map[0]
        if (token.map[1] > current.lineEnd)
          current.lineEnd = token.map[1]
      }
    }

    pushCurrent()
    return segments
  }
}
