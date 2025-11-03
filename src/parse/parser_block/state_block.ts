/**
 * StateBlock - Parser state class for block-level parsing
 */

import type { Token } from '../../types'

function isSpace(code: number): boolean {
  switch (code) {
    case 0x09:
    case 0x20:
      return true
  }
  return false
}

export class StateBlock {
  public src: string
  public md: any
  public env: any
  public tokens: Token[]

  // Line markers
  public bMarks: number[] = [] // line begin offsets
  public eMarks: number[] = [] // line end offsets
  public tShift: number[] = [] // offsets of first non-space characters
  public sCount: number[] = [] // indents for each line (tabs expanded)
  public bsCount: number[] = [] // virtual spaces between bMarks and real line start

  // Block parser variables
  public blkIndent: number = 0 // required block content indent
  public line: number = 0 // line index in src
  public lineMax: number = 0 // lines count
  public tight: boolean = false // loose/tight mode for lists
  public ddIndent: number = -1 // indent of current dd block
  public listIndent: number = -1 // indent of current list block
  public parentType: string = 'root' // 'blockquote', 'list', 'root', 'paragraph', 'reference'
  public level: number = 0

  constructor(src: string, md: any, env: any, tokens: Token[]) {
    this.src = src
    this.md = md
    this.env = env
    this.tokens = tokens

    // Generate line markers
    const s = this.src
    let indent = 0
    let offset = 0
    let start = 0
    let indent_found = false

    for (let pos = 0, len = s.length; pos < len; pos++) {
      const ch = s.charCodeAt(pos)

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
        }
      }

      if (ch === 0x0A || pos === len - 1) {
        if (ch !== 0x0A)
          pos++
        this.bMarks.push(start)
        this.eMarks.push(pos)
        this.tShift.push(indent)
        this.sCount.push(offset)
        this.bsCount.push(0)

        indent_found = false
        indent = 0
        offset = 0
        start = pos + 1
      }
    }

    // Push fake entry to simplify bounds checks
    this.bMarks.push(s.length)
    this.eMarks.push(s.length)
    this.tShift.push(0)
    this.sCount.push(0)
    this.bsCount.push(0)

    this.lineMax = this.bMarks.length - 1
  }

  push(type: string, tag: string, nesting: number): Token {
    const token: Token = {
      type,
      tag,
      level: this.level,
      content: '',
      block: true,
      nesting,
    } as Token

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
    for (let max = this.lineMax; from < max; from++) {
      if (this.bMarks[from] + this.tShift[from] < this.eMarks[from]) {
        break
      }
    }
    return from
  }

  skipSpaces(pos: number): number {
    for (let max = this.src.length; pos < max; pos++) {
      const ch = this.src.charCodeAt(pos)
      if (!isSpace(ch))
        break
    }
    return pos
  }

  skipSpacesBack(pos: number, min: number): number {
    if (pos <= min)
      return pos
    while (pos > min) {
      if (!isSpace(this.src.charCodeAt(--pos)))
        return pos + 1
    }
    return pos
  }

  skipChars(pos: number, code: number): number {
    for (let max = this.src.length; pos < max; pos++) {
      if (this.src.charCodeAt(pos) !== code)
        break
    }
    return pos
  }

  skipCharsBack(pos: number, code: number, min: number): number {
    if (pos <= min)
      return pos
    while (pos > min) {
      if (code !== this.src.charCodeAt(--pos))
        return pos + 1
    }
    return pos
  }

  getLines(begin: number, end: number, indent: number, keepLastLF: boolean): string {
    if (begin >= end)
      return ''

    const queue: string[] = new Array(end - begin)

    for (let i = 0, line = begin; line < end; line++, i++) {
      let lineIndent = 0
      const lineStart = this.bMarks[line]
      let first = lineStart
      let last: number

      if (line + 1 < end || keepLastLF) {
        last = this.eMarks[line] + 1
      }
      else {
        last = this.eMarks[line]
      }

      while (first < last && lineIndent < indent) {
        const ch = this.src.charCodeAt(first)

        if (isSpace(ch)) {
          if (ch === 0x09) {
            lineIndent += 4 - (lineIndent + this.bsCount[line]) % 4
          }
          else {
            lineIndent++
          }
        }
        else if (first - lineStart < this.tShift[line]) {
          lineIndent++
        }
        else {
          break
        }
        first++
      }

      if (lineIndent > indent) {
        queue[i] = new Array(lineIndent - indent + 1).join(' ') + this.src.slice(first, last)
      }
      else {
        queue[i] = this.src.slice(first, last)
      }
    }

    return queue.join('')
  }
}

export default StateBlock
