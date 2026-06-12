import type { Token } from '../common/token'

export const SEGMENT_FLAG_LIST = 1 << 0
export const SEGMENT_FLAG_TABLE = 1 << 1
export const SEGMENT_FLAG_FENCE = 1 << 2
export const SEGMENT_FLAG_PARAGRAPH = 1 << 3

export interface Segment {
  tokenStart: number
  tokenEnd: number
  lineStart: number
  lineEnd: number
  srcOffset: number
  type: string
  flags: number
}

interface LineLookup {
  offsetOfLine: (line: number) => number
}

function segmentFlags(type: string): number {
  switch (type) {
    case 'bullet_list_open':
    case 'ordered_list_open':
      return SEGMENT_FLAG_LIST
    case 'table_open':
      return SEGMENT_FLAG_TABLE
    case 'fence':
      return SEGMENT_FLAG_FENCE
    case 'paragraph_open':
      return SEGMENT_FLAG_PARAGRAPH
    default:
      return 0
  }
}

export class LineIndex {
  private newlineOffsets: number[] = []
  private sourceLength = 0

  reset(src = ''): void {
    this.newlineOffsets = []
    this.sourceLength = 0
    this.append(src, 0)
  }

  append(delta: string, absoluteStart: number): void {
    if (!delta)
      return

    this.sourceLength = absoluteStart + delta.length
    for (let i = 0; i < delta.length; i++) {
      if (delta.charCodeAt(i) === 0x0A)
        this.newlineOffsets.push(absoluteStart + i)
    }
  }

  truncate(offset: number): void {
    const nextLength = Math.max(0, Math.min(offset, this.sourceLength))
    let lo = 0
    let hi = this.newlineOffsets.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.newlineOffsets[mid] < nextLength)
        lo = mid + 1
      else
        hi = mid
    }
    this.newlineOffsets.length = lo
    this.sourceLength = nextLength
  }

  lineOfOffset(offset: number): number {
    const target = Math.max(0, Math.min(offset, this.sourceLength))
    let lo = 0
    let hi = this.newlineOffsets.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.newlineOffsets[mid] < target)
        lo = mid + 1
      else
        hi = mid
    }
    return lo
  }

  offsetOfLine(line: number): number {
    if (line <= 0)
      return 0

    const prevNewline = this.newlineOffsets[line - 1]
    return prevNewline === undefined ? this.sourceLength : prevNewline + 1
  }

  lineCount(): number {
    return this.newlineOffsets.length
  }
}

export class SegmentIndex {
  private segments: Segment[] = []

  clear(): void {
    this.segments.length = 0
  }

  last(): Segment | null {
    return this.segments.length ? this.segments[this.segments.length - 1] : null
  }

  findByLine(line: number): Segment | null {
    if (!this.segments.length)
      return null

    let lo = 0
    let hi = this.segments.length - 1
    let best = this.segments[hi]

    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const segment = this.segments[mid]
      if (line < segment.lineEnd || line <= segment.lineStart) {
        best = segment
        hi = mid - 1
      }
      else {
        lo = mid + 1
      }
    }

    return best
  }

  previous(segment: Segment): Segment | null {
    const index = this.segments.indexOf(segment)
    if (index <= 0)
      return this.segments[0] ?? null
    return this.segments[index - 1]
  }

  truncateFromToken(tokenStart: number): void {
    let nextLength = this.segments.length
    while (nextLength > 0 && this.segments[nextLength - 1].tokenStart >= tokenStart)
      nextLength--
    this.segments.length = nextLength
  }

  rebuild(tokens: Token[], lineIndex: LineLookup): void {
    this.clear()
    this.appendFromTokens(tokens, 0, lineIndex)
  }

  appendFromTokens(tokens: Token[], tokenStart: number, lineIndex: LineLookup): void {
    let current: Segment | null = null

    const pushCurrent = (tokenEnd: number) => {
      if (!current)
        return
      if (current.lineEnd < current.lineStart)
        current.lineEnd = current.lineStart
      current.tokenEnd = tokenEnd
      current.srcOffset = lineIndex.offsetOfLine(current.lineStart)
      this.segments.push(current)
      current = null
    }

    for (let i = tokenStart; i < tokens.length; i++) {
      const token = tokens[i]
      const isSegmentStart = token.level === 0 && token.nesting >= 0

      if (isSegmentStart) {
        pushCurrent(i)
        const lineStart = token.map?.[0] ?? 0
        current = {
          tokenStart: i,
          tokenEnd: tokens.length,
          lineStart,
          lineEnd: token.map?.[1] ?? lineStart,
          srcOffset: lineIndex.offsetOfLine(lineStart),
          type: token.type,
          flags: segmentFlags(token.type),
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

    pushCurrent(tokens.length)
  }
}
