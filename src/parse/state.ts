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
  public src: string
  public env: Record<string, unknown>
  public tokens: Token[]
  public inlineMode: boolean
  public md?: any
  public Token: typeof Token

  constructor(src: string, env: Record<string, unknown> = {}) {
    this.src = src || ''
    this.env = env
    this.tokens = []
    this.inlineMode = false
    this.Token = Token
  }
}

export default State
