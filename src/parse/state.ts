import type { ParseSource } from './source'
import { Token } from '../common/token'

export interface MarkdownItOptions {
  html?: boolean
  xhtmlOut?: boolean
  breaks?: boolean
  langPrefix?: string
  linkify?: boolean
  typographer?: boolean
  quotes?: string
  maxNesting?: number
}

export class State {
  public src: ParseSource
  public env: Record<string, unknown>
  public tokens: Token[]
  public inlineMode: boolean
  public md: any
  declare public Token: typeof Token

  constructor(src: ParseSource, md: any, env: Record<string, unknown> = {}) {
    this.src = typeof src === 'string' ? (src || '') : src
    this.env = env
    this.tokens = []
    this.inlineMode = false
    this.md = md
  }
}

// Re-export Token for markdown-it plugin compatibility.
State.prototype.Token = Token

export default State
