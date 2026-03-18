import { Token } from '../../common/token'
import { isPunctCode, isWhiteSpace } from '../../common/utils'
import type { ParseSource } from '../source'

/**
 * StateInline - state object for inline parser
 */
export class StateInline {
  public src: ParseSource
  public md: any
  public env: any
  public tokens: Token[] // Alias to outTokens for compatibility
  public tokens_meta: any[]
  public pos: number
  public posMax: number
  public level: number
  public pending: string
  public pendingLevel: number
  public cache: Array<number | undefined>
  public delimiters: any[]
  public _prev_delimiters: any[] // Stack of delimiter lists for upper level tags
  public backticks: Record<number, number>
  public backticksScanned: boolean
  public linkLevel: number
  public maxNesting: number

  constructor(src: ParseSource, md: any, env: any, outTokens: Token[]) {
    this.src = src
    this.md = md
    this.env = env
    this.tokens = outTokens // Alias
    this.tokens_meta = new Array(outTokens.length)
    this.pos = 0
    this.posMax = src.length
    this.level = 0
    this.pending = ''
    this.pendingLevel = 0
    this.cache = []
    this.delimiters = []
    this._prev_delimiters = []
    this.backticks = {}
    this.backticksScanned = false
    this.linkLevel = 0
    this.maxNesting = md.options.maxNesting
  }

  /**
   * Push pending text as a text token
   */
  public pushPending(): Token {
    const token = new Token('text', '', 0)
    token.content = this.pending
    token.level = this.pendingLevel

    this.tokens.push(token)
    this.pending = ''
    return token
  }

  public pushSimple(type: string, tag: string): Token {
    if (this.pending) {
      this.pushPending()
    }

    const token = new Token(type, tag, 0)
    token.level = this.level
    this.pendingLevel = this.level
    this.tokens.push(token)
    this.tokens_meta.push(null)
    return token
  }

  /**
   * Push a new token to the output
   */
  public push(type: string, tag: string, nesting: number): Token {
    if (this.pending) {
      this.pushPending()
    }

    if (nesting === 0) {
      return this.pushSimple(type, tag)
    }

    const token = new Token(type, tag, nesting)
    let token_meta = null

    if (nesting < 0) {
      // closing tag
      this.level--
      this.delimiters = this._prev_delimiters.pop()
    }

    token.level = this.level

    if (nesting > 0) {
      // opening tag
      this.level++
      this._prev_delimiters.push(this.delimiters)
      this.delimiters = []
      token_meta = { delimiters: this.delimiters }
    }

    this.pendingLevel = this.level
    this.tokens.push(token)
    this.tokens_meta.push(token_meta)
    return token
  }

  /**
   * Scan delimiter run (for emphasis)
   */
  public scanDelims(start: number, canSplitWord: boolean): { can_open: boolean, can_close: boolean, length: number } | null {
    const { src, posMax } = this
    const marker = src.charCodeAt(start)
    let pos = start

    // Count consecutive markers
    while (pos < posMax && src.charCodeAt(pos) === marker)
      pos++

    const count = pos - start
    const lastChar = start > 0 ? src.charCodeAt(start - 1) : 0x20
    const nextChar = pos < posMax ? src.charCodeAt(pos) : 0x20

    const isLastWhiteSpace = isWhiteSpace(lastChar)
    const isNextWhiteSpace = isWhiteSpace(nextChar)
    const isLastPunctChar = isPunctCode(lastChar)
    const isNextPunctChar = isPunctCode(nextChar)

    const left_flanking
      = !isNextWhiteSpace
        && (!isNextPunctChar || isLastWhiteSpace || isLastPunctChar)
    const right_flanking
      = !isLastWhiteSpace
        && (!isLastPunctChar || isNextWhiteSpace || isNextPunctChar)

    const can_open = left_flanking && (canSplitWord || !right_flanking || isLastPunctChar)
    const can_close = right_flanking && (canSplitWord || !left_flanking || isNextPunctChar)

    return {
      can_open,
      can_close,
      length: count,
    }
  }
}

export default StateInline
