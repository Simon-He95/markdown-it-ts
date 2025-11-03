import type { Token } from '../types'
import type { ParserBlock } from './parser_block'
import type { ParserInline } from './parser_inline'

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
  public md?: {
    block: ParserBlock
    inline: ParserInline
    options: MarkdownItOptions
    helpers: {
      parseLinkLabel: (state: any, pos: number) => { ok: boolean, pos: number }
      parseLinkDestination: (str: string, pos: number, max: number) => { ok: boolean, str: string, pos: number }
      parseLinkTitle: (str: string, pos: number, max: number) => { ok: boolean, str: string, pos: number, can_continue: boolean }
    }
    normalizeLink: (url: string) => string
    normalizeLinkText: (url: string) => string
    validateLink: (url: string) => boolean
  }

  constructor(src: string, env: Record<string, unknown> = {}) {
    this.src = src || ''
    this.env = env
    this.tokens = []
    this.inlineMode = false
  }
}

export default State
