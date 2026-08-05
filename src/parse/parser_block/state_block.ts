/**
 * StateBlock - Parser state class for block-level parsing
 */

import type { ParseSource } from '../source'
import { Token } from '../../common/token'

function isSpace(code: number): boolean {
  switch (code) {
    case 0x09:
    case 0x20:
      return true
  }
  return false
}

export const LineFlag = {
  Pipe: 1,
  ParagraphTerminator: 2,
} as const

function isParagraphTerminatorCandidate(code: number): boolean {
  switch (code) {
    case 0x23: // #
    case 0x2A: // *
    case 0x2B: // +
    case 0x2D: // -
    case 0x3C: // <
    case 0x3E: // >
    case 0x5F: // _
    case 0x60: // `
    case 0x7C: // |
    case 0x7E: // ~
      return true
  }

  return code >= 0x30 && code <= 0x39
}

export class StateBlock {
  public src: ParseSource
  public md: any
  public env: any
  public tokens: Token[]
  declare public Token: typeof Token

  // Line markers
  public bMarks: number[] = [] // line begin offsets
  public eMarks: number[] = [] // line end offsets
  public tShift: number[] = [] // offsets of first non-space characters
  public sCount: number[] = [] // indents for each line (tabs expanded)
  public bsCount: number[] = [] // virtual spaces between bMarks and real line start
  public lineFlags: number[] = []

  // Block parser variables
  public blkIndent: number = 0 // required block content indent
  public line: number = 0 // line index in src
  public lineMax: number = 0 // lines count
  public tight: boolean = false // loose/tight mode for lists
  public ddIndent: number = -1 // indent of current dd block
  public listIndent: number = -1 // indent of current list block
  public parentType: string = 'root' // 'blockquote', 'list', 'root', 'paragraph', 'reference'
  public level: number = 0

  constructor(src: ParseSource, md: any, env: any, tokens: Token[]) {
    this.src = src
    this.md = md
    this.env = env
    this.tokens = tokens

    // Generate line markers.
    //
    // Fast path: short lines are scanned character by character (cheap for
    // line-heavy documents), while longer lines jump to the next newline with
    // native `indexOf('\n')` (SIMD in V8). Indentation and pipe detection are
    // done per line instead of per character. Produces byte-identical
    // bMarks/eMarks/tShift/sCount/bsCount/lineFlags arrays.
    const s = this.src
    const len = s.length

    const bMarks = this.bMarks
    const eMarks = this.eMarks
    const tShift = this.tShift
    const sCount = this.sCount
    const bsCount = this.bsCount
    const lineFlags = this.lineFlags

    let start = 0
    // Cursor for the next pipe position. Advancing it monotonically keeps the
    // total pipe search linear even for documents without any '|' (a naive
    // per-line `indexOf('|', lineStart)` would re-scan the whole tail of the
    // string for every line).
    let pipePos = s.indexOf('|')
    while (start < len) {
      // Find the end of this line. Short lines (the common case) are scanned
      // character by character; once a line is longer than 4 chars we jump to
      // the next newline natively.
      let end = start
      while (end < len && end - start < 4 && s.charCodeAt(end) !== 0x0A)
        end++
      if (end - start === 4 && end < len) {
        const nl = s.indexOf('\n', end)
        end = nl === -1 ? len : nl
      }

      let indent = 0
      let offset = 0
      let pos = start
      while (pos < end) {
        const ch = s.charCodeAt(pos)
        if (ch === 0x20) {
          indent++
          offset++
          pos++
          continue
        }
        if (ch === 0x09) {
          indent++
          offset += 4 - offset % 4
          pos++
          continue
        }
        break
      }

      let flags = 0
      if (pos < end) {
        if (isParagraphTerminatorCandidate(s.charCodeAt(pos)))
          flags |= LineFlag.ParagraphTerminator

        if (pipePos < start)
          pipePos = s.indexOf('|', start)
        if (pipePos !== -1 && pipePos < end)
          flags |= LineFlag.Pipe | LineFlag.ParagraphTerminator
        // Sticky sentinel: once a search returns -1 there are no more pipes,
        // so later lines must not re-scan the string tail.
        if (pipePos === -1)
          pipePos = len
      }

      bMarks.push(start)
      eMarks.push(end)
      tShift.push(indent)
      sCount.push(offset)
      bsCount.push(0)
      lineFlags.push(flags)

      start = end + 1
    }

    // Push fake entry to simplify bounds checks
    bMarks.push(len)
    eMarks.push(len)
    tShift.push(0)
    sCount.push(0)
    bsCount.push(0)
    lineFlags.push(0)

    this.lineMax = bMarks.length - 1
  }

  push(type: string, tag: string, nesting: number): Token {
    if (nesting === 0) {
      const token = new Token(type, tag, 0)
      token.block = true
      token.level = this.level
      this.tokens.push(token)
      return token
    }

    const token = new Token(type, tag, nesting)
    token.block = true

    if (nesting < 0)
      this.level--
    token.level = this.level
    if (nesting > 0)
      this.level++

    this.tokens.push(token)
    return token
  }

  isEmpty(line: number): boolean {
    return this.bMarks[line] + this.tShift[line] >= this.eMarks[line]
  }

  skipEmptyLines(from: number): number {
    const bMarks = this.bMarks
    const tShift = this.tShift
    const eMarks = this.eMarks
    for (let max = this.lineMax; from < max; from++) {
      if (bMarks[from] + tShift[from] < eMarks[from]) {
        break
      }
    }
    return from
  }

  skipSpaces(pos: number): number {
    const src = this.src
    for (let max = src.length; pos < max; pos++) {
      const ch = src.charCodeAt(pos)
      if (ch !== 0x09 && ch !== 0x20)
        break
    }
    return pos
  }

  skipSpacesBack(pos: number, min: number): number {
    if (pos <= min)
      return pos
    const src = this.src
    while (pos > min) {
      const ch = src.charCodeAt(--pos)
      if (ch !== 0x09 && ch !== 0x20)
        return pos + 1
    }
    return pos
  }

  skipChars(pos: number, code: number): number {
    const src = this.src
    for (let max = src.length; pos < max; pos++) {
      if (src.charCodeAt(pos) !== code)
        break
    }
    return pos
  }

  skipCharsBack(pos: number, code: number, min: number): number {
    if (pos <= min)
      return pos
    const src = this.src
    while (pos > min) {
      if (code !== src.charCodeAt(--pos))
        return pos + 1
    }
    return pos
  }

  getLines(begin: number, end: number, indent: number, keepLastLF: boolean): string {
    if (begin >= end)
      return ''

    if (begin + 1 === end) {
      const line = begin
      const lineStart = this.bMarks[line]
      let first = lineStart
      const last = keepLastLF ? this.eMarks[line] + 1 : this.eMarks[line]
      let lineIndent = 0
      const src = this.src
      const bsCount = this.bsCount
      const tShift = this.tShift

      while (first < last && lineIndent < indent) {
        const ch = src.charCodeAt(first)

        if (ch === 0x09 || ch === 0x20) {
          if (ch === 0x09) {
            lineIndent += 4 - (lineIndent + bsCount[line]) % 4
          }
          else {
            lineIndent++
          }
        }
        else if (first - lineStart < tShift[line]) {
          lineIndent++
        }
        else {
          break
        }
        first++
      }

      if (lineIndent > indent) {
        return ' '.repeat(lineIndent - indent) + src.slice(first, last)
      }

      return src.slice(first, last)
    }

    const queue: string[] = new Array(end - begin)
    const src = this.src
    const bMarks = this.bMarks
    const eMarks = this.eMarks
    const bsCount = this.bsCount
    const tShift = this.tShift

    for (let i = 0, line = begin; line < end; line++, i++) {
      let lineIndent = 0
      const lineStart = bMarks[line]
      let first = lineStart
      let last: number

      if (line + 1 < end || keepLastLF) {
        last = eMarks[line] + 1
      }
      else {
        last = eMarks[line]
      }

      while (first < last && lineIndent < indent) {
        const ch = src.charCodeAt(first)

        if (isSpace(ch)) {
          if (ch === 0x09) {
            lineIndent += 4 - (lineIndent + bsCount[line]) % 4
          }
          else {
            lineIndent++
          }
        }
        else if (first - lineStart < tShift[line]) {
          lineIndent++
        }
        else {
          break
        }
        first++
      }

      if (lineIndent > indent) {
        queue[i] = ' '.repeat(lineIndent - indent) + src.slice(first, last)
      }
      else {
        queue[i] = src.slice(first, last)
      }
    }

    return queue.join('')
  }
}

// Re-export Token for markdown-it plugin compatibility.
StateBlock.prototype.Token = Token

export default StateBlock
