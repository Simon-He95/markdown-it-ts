import { Token } from '../common/token'
import type { ParseSource } from './source'

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

  constructor(src: ParseSource, md: any, env: Record<string, unknown> = {}) {
    this.src = typeof src === 'string' ? (src || '') : src
    this.env = env
    this.tokens = []
    this.inlineMode = false
    this.md = md
  }
}

export default State
