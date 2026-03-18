import { countLines } from '../common/utils'
import type { TextSource } from '../parse/source'

type PieceBuffer = 'original' | 'add'

interface Piece {
  buffer: PieceBuffer
  start: number
  length: number
  lineBreaks: number
}

function clampOffset(value: number, min: number, max: number): number {
  if (!Number.isFinite(value))
    return min
  if (value < min)
    return min
  if (value > max)
    return max
  return value
}

function normalizeSliceIndex(value: number | undefined, length: number, fallback: number): number {
  if (value === undefined)
    return fallback

  if (!Number.isFinite(value))
    return 0

  const whole = Math.trunc(value)
  if (whole < 0)
    return Math.max(length + whole, 0)
  if (whole > length)
    return length
  return whole
}

function countLinesInSlice(text: string, start: number, end: number): number {
  if (end <= start)
    return 0
  let count = 0
  let pos = start - 1
  while ((pos = text.indexOf('\n', pos + 1)) !== -1 && pos < end) count++
  return count
}

export interface PieceTableStats {
  length: number
  lineBreaks: number
  pieces: number
}

export class PieceTable {
  private original: string
  private add = ''
  private pieces: Piece[] = []
  private totalLength = 0
  private totalLineBreaks = 0

  constructor(initial = '') {
    this.original = initial
    if (initial.length > 0) {
      this.pieces.push({
        buffer: 'original',
        start: 0,
        length: initial.length,
        lineBreaks: countLines(initial),
      })
      this.totalLength = initial.length
      this.totalLineBreaks = countLines(initial)
    }
  }

  get length(): number {
    return this.totalLength
  }

  get lineBreaks(): number {
    return this.totalLineBreaks
  }

  stats(): PieceTableStats {
    return {
      length: this.totalLength,
      lineBreaks: this.totalLineBreaks,
      pieces: this.pieces.length,
    }
  }

  append(text: string): void {
    this.insert(this.totalLength, text)
  }

  insert(offset: number, text: string): void {
    this.replace(offset, offset, text)
  }

  delete(start: number, end: number): void {
    this.replace(start, end, '')
  }

  replace(start: number, end: number, text: string): void {
    const from = clampOffset(start, 0, this.totalLength)
    const to = clampOffset(end, from, this.totalLength)

    const startIndex = this.splitAt(from)
    const endIndex = this.splitAt(to)

    let removedLength = 0
    let removedLines = 0
    for (let i = startIndex; i < endIndex; i++) {
      removedLength += this.pieces[i].length
      removedLines += this.pieces[i].lineBreaks
    }

    const nextPieces: Piece[] = []
    if (text.length > 0) {
      const addStart = this.add.length
      this.add += text
      nextPieces.push({
        buffer: 'add',
        start: addStart,
        length: text.length,
        lineBreaks: countLines(text),
      })
    }

    this.pieces.splice(startIndex, endIndex - startIndex, ...nextPieces)
    this.totalLength += text.length - removedLength
    this.totalLineBreaks += countLines(text) - removedLines
    this.mergeAdjacentAround(Math.max(0, startIndex - 1))
  }

  slice(start = 0, end = this.totalLength): string {
    const from = clampOffset(start, 0, this.totalLength)
    const to = clampOffset(end, from, this.totalLength)
    if (from === to)
      return ''

    let offset = 0
    let out = ''
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i]
      const pieceStart = offset
      const pieceEnd = offset + piece.length
      if (pieceEnd <= from) {
        offset = pieceEnd
        continue
      }
      if (pieceStart >= to)
        break

      const localStart = from > pieceStart ? from - pieceStart : 0
      const localEnd = to < pieceEnd ? to - pieceStart : piece.length
      out += this.getBuffer(piece.buffer).slice(piece.start + localStart, piece.start + localEnd)
      offset = pieceEnd
    }
    return out
  }

  toString(): string {
    return this.slice(0, this.totalLength)
  }

  view(start = 0, end = this.totalLength, windowSize = 8192): TextSource {
    return new PieceTableSourceView(this, start, end, windowSize)
  }

  *iterateChunks(chunkSize = 8192): Iterable<string> {
    yield* this.iterateRangeChunks(0, this.totalLength, chunkSize)
  }

  *iterateRangeChunks(start = 0, end = this.totalLength, chunkSize = 8192): Iterable<string> {
    const from = clampOffset(start, 0, this.totalLength)
    const to = clampOffset(end, from, this.totalLength)
    if (from === to)
      return

    const size = chunkSize > 0 ? chunkSize : 8192
    let offset = 0
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i]
      const pieceStart = offset
      const pieceEnd = offset + piece.length
      if (pieceEnd <= from) {
        offset = pieceEnd
        continue
      }
      if (pieceStart >= to)
        break

      const localStart = from > pieceStart ? from - pieceStart : 0
      const localEnd = to < pieceEnd ? to - pieceStart : piece.length
      const text = this.getBuffer(piece.buffer).slice(piece.start + localStart, piece.start + localEnd)
      for (let j = 0; j < text.length; j += size)
        yield text.slice(j, j + size)
      offset = pieceEnd
    }
  }

  lineOfOffset(offset: number): number {
    const target = clampOffset(offset, 0, this.totalLength)
    if (target <= 0)
      return 0

    let consumed = 0
    let line = 0
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i]
      const next = consumed + piece.length
      if (target >= next) {
        line += piece.lineBreaks
        consumed = next
        continue
      }

      const inside = target - consumed
      if (inside > 0) {
        const buffer = this.getBuffer(piece.buffer)
        line += countLinesInSlice(buffer, piece.start, piece.start + inside)
      }
      return line
    }

    return line
  }

  offsetOfLine(line: number): number {
    if (line <= 0)
      return 0

    let remaining = line
    let offset = 0
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i]
      if (piece.lineBreaks < remaining) {
        remaining -= piece.lineBreaks
        offset += piece.length
        continue
      }

      const buffer = this.getBuffer(piece.buffer)
      let pos = piece.start - 1
      while (remaining > 0) {
        pos = buffer.indexOf('\n', pos + 1)
        if (pos === -1 || pos >= piece.start + piece.length)
          return offset + piece.length
        remaining--
      }
      return offset + (pos - piece.start + 1)
    }

    return this.totalLength
  }

  private getBuffer(buffer: PieceBuffer): string {
    return buffer === 'original' ? this.original : this.add
  }

  private makePiece(buffer: PieceBuffer, start: number, length: number): Piece | null {
    if (length <= 0)
      return null
    const text = this.getBuffer(buffer).slice(start, start + length)
    return {
      buffer,
      start,
      length,
      lineBreaks: countLines(text),
    }
  }

  private splitAt(offset: number): number {
    const target = clampOffset(offset, 0, this.totalLength)
    if (target <= 0)
      return 0
    if (target >= this.totalLength)
      return this.pieces.length

    let consumed = 0
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i]
      const next = consumed + piece.length
      if (target === consumed)
        return i
      if (target === next)
        return i + 1
      if (target > consumed && target < next) {
        const leftLen = target - consumed
        const rightLen = next - target
        const left = this.makePiece(piece.buffer, piece.start, leftLen)
        const right = this.makePiece(piece.buffer, piece.start + leftLen, rightLen)
        this.pieces.splice(i, 1, ...(left ? [left] : []), ...(right ? [right] : []))
        return i + (left ? 1 : 0)
      }
      consumed = next
    }
    return this.pieces.length
  }

  private mergeAdjacentAround(index: number): void {
    let i = index
    while (i < this.pieces.length - 1) {
      const left = this.pieces[i]
      const right = this.pieces[i + 1]
      if (!left || !right) {
        i++
        continue
      }
      if (left.buffer === right.buffer && left.start + left.length === right.start) {
        left.length += right.length
        left.lineBreaks += right.lineBreaks
        this.pieces.splice(i + 1, 1)
        continue
      }
      i++
    }
  }
}

export class PieceTableSourceView implements TextSource {
  private readonly startOffset: number
  private readonly endOffset: number
  private readonly cacheSize: number
  private cachedStart = -1
  private cachedEnd = -1
  private cachedText = ''

  constructor(table: PieceTable, start = 0, end = table.length, windowSize = 8192) {
    this.table = table
    this.startOffset = clampOffset(start, 0, table.length)
    this.endOffset = clampOffset(end, this.startOffset, table.length)
    this.cacheSize = windowSize > 0 ? Math.trunc(windowSize) : 8192
  }

  private readonly table: PieceTable

  get length(): number {
    return this.endOffset - this.startOffset
  }

  charAt(index: number): string {
    const code = this.charCodeAt(index)
    return Number.isNaN(code) ? '' : String.fromCharCode(code)
  }

  charCodeAt(index: number): number {
    if (!Number.isFinite(index))
      return Number.NaN

    const relative = Math.trunc(index)
    if (relative < 0 || relative >= this.length)
      return Number.NaN

    this.ensureWindow(relative)
    return this.cachedText.charCodeAt(relative - this.cachedStart)
  }

  slice(start = 0, end = this.length): string {
    const from = normalizeSliceIndex(start, this.length, 0)
    const to = normalizeSliceIndex(end, this.length, this.length)
    if (to <= from)
      return ''

    if (from >= this.cachedStart && to <= this.cachedEnd) {
      return this.cachedText.slice(from - this.cachedStart, to - this.cachedStart)
    }

    return this.table.slice(this.startOffset + from, this.startOffset + to)
  }

  indexOf(searchValue: string, fromIndex = 0): number {
    const needle = String(searchValue)
    const from = clampOffset(fromIndex, 0, this.length)
    if (needle.length === 0)
      return from
    if (from >= this.length)
      return -1

    const overlap = Math.max(0, needle.length - 1)
    let chunkStart = this.startOffset + from

    while (chunkStart < this.endOffset) {
      const chunkEnd = Math.min(this.endOffset, chunkStart + this.cacheSize)
      const haystack = this.table.slice(chunkStart, Math.min(this.endOffset, chunkEnd + overlap))
      const hit = haystack.indexOf(needle)
      if (hit !== -1) {
        const absolute = chunkStart + hit
        if (absolute + needle.length <= this.endOffset)
          return absolute - this.startOffset
      }
      if (chunkEnd >= this.endOffset)
        break
      chunkStart = chunkEnd
    }

    return -1
  }

  toString(): string {
    return this.table.slice(this.startOffset, this.endOffset)
  }

  private ensureWindow(relative: number): void {
    if (relative >= this.cachedStart && relative < this.cachedEnd)
      return

    const absoluteStart = this.startOffset + relative
    const absoluteEnd = Math.min(this.endOffset, absoluteStart + this.cacheSize)
    this.cachedText = this.table.slice(absoluteStart, absoluteEnd)
    this.cachedStart = relative
    this.cachedEnd = relative + this.cachedText.length
  }
}
