import type { Token } from '../../types'

/**
 * StateInline - state object for inline parser
 */
export class StateInline {
  public src: string
  public md: any
  public env: any
  public outTokens: Token[]
  public tokens: Token[] // Alias to outTokens for compatibility
  public tokens_meta: any[]
  public pos: number
  public posMax: number
  public level: number
  public pending: string
  public pendingLevel: number
  public cache: Record<number, number>
  public delimiters: any[]
  public _prev_delimiters: any[] // Stack of delimiter lists for upper level tags
  public backticks: Record<number, number>
  public backticksScanned: boolean
  public linkLevel: number

  constructor(src: string, md: any, env: any, outTokens: Token[]) {
    this.src = src
    this.md = md
    this.env = env
    this.outTokens = outTokens
    this.tokens = outTokens // Alias
    this.tokens_meta = new Array(outTokens.length)
    this.pos = 0
    this.posMax = src.length
    this.level = 0
    this.pending = ''
    this.pendingLevel = 0
    this.cache = {}
    this.delimiters = []
    this._prev_delimiters = []
    this.backticks = {}
    this.backticksScanned = false
    this.linkLevel = 0
  }

  /**
   * Push pending text as a text token
   */
  public pushPending(): Token {
    const token: Token = {
      type: 'text',
      content: this.pending,
      level: this.pendingLevel,
    } as Token

    this.tokens.push(token)
    this.tokens_meta.push(null)
    this.pending = ''
    return token
  }

  /**
   * Push a new token to the output
   */
  public push(type: string, tag: string, nesting: number): Token {
    if (this.pending) {
      this.pushPending()
    }

    const token: Token = {
      type,
      tag,
      level: this.level,
    } as Token

    let token_meta = null

    if (nesting < 0) {
      // closing tag
      this.level--
      this.delimiters = this._prev_delimiters.pop() || []
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
    let count = 0
    while (pos < posMax && src.charCodeAt(pos) === marker) {
      count++
      pos++
    }

    if (count < 1)
      return null

    const lastChar = start > 0 ? src.charCodeAt(start - 1) : 0x20
    const nextChar = pos < posMax ? src.charCodeAt(pos) : 0x20

    const isLastPunctChar = lastChar === 0x20 || lastChar === 0x0A
    const isNextPunctChar = nextChar === 0x20 || nextChar === 0x0A
    const isLastWhiteSpace = lastChar === 0x20
    const isNextWhiteSpace = nextChar === 0x20

    let can_open = true
    let can_close = true

    if (isNextWhiteSpace) {
      can_open = false
    }
    else if (isNextPunctChar) {
      if (!(isLastWhiteSpace || isLastPunctChar)) {
        can_open = false
      }
    }

    if (isLastWhiteSpace) {
      can_close = false
    }
    else if (isLastPunctChar) {
      if (!(isNextWhiteSpace || isNextPunctChar)) {
        can_close = false
      }
    }

    if (!canSplitWord) {
      can_open = can_open && (!isLastPunctChar || isLastWhiteSpace)
      can_close = can_close && (!isNextPunctChar || isNextWhiteSpace)
    }

    return {
      can_open,
      can_close,
      length: count,
    }
  }
}

export default StateInline
