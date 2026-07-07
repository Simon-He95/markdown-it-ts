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

    // Generate line markers (single pass, no pre-scan to avoid O(2n) on large inputs)
    const s = this.src
    const len = s.length
    let indent = 0
    let offset = 0
    let start = 0
    let indent_found = false
    let flags = 0
    const bMarks: number[] = []
    const eMarks: number[] = []
    const tShift: number[] = []
    const sCount: number[] = []
    const bsCount: number[] = []
    const lineFlags: number[] = []

    for (let pos = 0; pos < len; pos++) {
      const ch = s.charCodeAt(pos)

      if (ch === 0x7C /* | */)
        flags |= LineFlag.Pipe | LineFlag.ParagraphTerminator

      if (!indent_found) {
        if (isSpace(ch)) {
          indent++
          if (ch === 0x09) {
            offset += 4 - offset % 4
          }
          else {
            offset++
          }
          continue
        }
        else {
          indent_found = true
          if (isParagraphTerminatorCandidate(ch))
            flags |= LineFlag.ParagraphTerminator
        }
      }

      if (ch === 0x0A || pos === len - 1) {
        if (ch !== 0x0A)
          pos++
        bMarks.push(start)
        eMarks.push(pos)
        tShift.push(indent)
        sCount.push(offset)
        bsCount.push(0)
        lineFlags.push(flags)

        indent_found = false
        indent = 0
        offset = 0
        flags = 0
        start = pos + 1
      }
    }

    // Push fake entry to simplify bounds checks
    bMarks.push(s.length)
    eMarks.push(s.length)
    tShift.push(0)
    sCount.push(0)
    bsCount.push(0)
    lineFlags.push(0)

    this.bMarks = bMarks
    this.eMarks = eMarks
    this.tShift = tShift
    this.sCount = sCount
    this.bsCount = bsCount
    this.lineFlags = lineFlags
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
    const max = src.length
    for (; pos < max; pos++) {
      const ch = src.charCodeAt(pos)
      // Inline isSpace: ch === 0x09 || ch === 0x20
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
      // Inline isSpace: ch === 0x09 || ch === 0x20
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

    // Single line fast path (most common case: ~70% of getLines calls)
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
        return new Array(lineIndent - indent + 1).join(' ') + src.slice(first, last)
      }

      return src.slice(first, last)
    }

    // 2-3 lines medium path - string concatenation is faster than array allocation
    // for small line counts. Handles exactly 2 or 3 lines (end - begin ∈ {2, 3})
    if (end - begin <= 3) {
      let result = ''
      const src = this.src
      const bMarks = this.bMarks
      const eMarks = this.eMarks
      const bsCount = this.bsCount
      const tShift = this.tShift

      for (let line = begin; line < end; line++) {
        let lineIndent = 0
        const lineStart = bMarks[line]
        let first = lineStart
        const last = (line + 1 < end || keepLastLF) ? eMarks[line] + 1 : eMarks[line]

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
          result += new Array(lineIndent - indent + 1).join(' ') + src.slice(first, last)
        }
        else {
          result += src.slice(first, last)
        }
      }

      return result
    }

    // Multi-line path (>= 4 lines)
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
        queue[i] = new Array(lineIndent - indent + 1).join(' ') + src.slice(first, last)
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
