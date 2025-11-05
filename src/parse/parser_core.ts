import LinkifyIt from 'linkify-it'
import { parseLinkDestination } from '../helpers/parse_link_destination'
import { parseLinkLabel } from '../helpers/parse_link_label'
import { parseLinkTitle } from '../helpers/parse_link_title'
import { block } from '../rules/core/block'
import { inline } from '../rules/core/inline'
import { linkify } from '../rules/core/linkify'
import { normalize } from '../rules/core/normalize'
import { replacements } from '../rules/core/replacements'
import { CoreRuler } from '../rules/core/ruler'
import { smartquotes } from '../rules/core/smartquotes'
import { text_join } from '../rules/core/text_join'
import { normalizeLink, normalizeLinkText, validateLink } from './link_utils'
import { ParserBlock } from './parser_block'
import { ParserInline } from './parser_inline'
import { State } from './state'

const CORE_RULES: ReadonlyArray<[string, (state: State) => void]> = [
  ['normalize', normalize],
  ['block', block],
  ['inline', inline],
  ['linkify', linkify],
  ['replacements', replacements],
  ['smartquotes', smartquotes],
  ['text_join', text_join],
]

const DEFAULT_OPTIONS_TEMPLATE = {
  html: true,
  xhtmlOut: false,
  breaks: false,
  langPrefix: 'language-',
  linkify: false,
  typographer: false,
  quotes: '\u201C\u201D\u2018\u2019',
  maxNesting: 100,
}

const DEFAULT_HELPERS = {
  parseLinkLabel,
  parseLinkDestination,
  parseLinkTitle,
}

type ParserLike = {
  block: ParserBlock
  inline: ParserInline
  core: ParserCore
  options: typeof DEFAULT_OPTIONS_TEMPLATE
  helpers: typeof DEFAULT_HELPERS
  normalizeLink: typeof normalizeLink
  normalizeLinkText: typeof normalizeLinkText
  validateLink: typeof validateLink
  linkify: ReturnType<typeof LinkifyIt>
}

function cloneDefaultOptions() {
  return { ...DEFAULT_OPTIONS_TEMPLATE }
}

function cloneDefaultHelpers() {
  return { ...DEFAULT_HELPERS }
}

export class ParserCore {
  private fallbackParser: ParserLike
  private lastState: State | null = null
  public block: ParserBlock
  public inline: ParserInline
  public ruler: CoreRuler

  constructor() {
    this.block = new ParserBlock()
    this.inline = new ParserInline()
    this.ruler = new CoreRuler()

    for (let i = 0; i < CORE_RULES.length; i++) {
      const [name, rule] = CORE_RULES[i]
      this.ruler.push(name, rule)
    }

    this.fallbackParser = {
      block: this.block,
      inline: this.inline,
      core: this,
      options: cloneDefaultOptions(),
      helpers: cloneDefaultHelpers(),
      normalizeLink,
      normalizeLinkText,
      validateLink,
      linkify: new LinkifyIt(),
    }
  }

  private resolveParser(md?: any): ParserLike | typeof md {
    if (md) {
      return md
    }

    if (this.fallbackParser.block !== this.block) {
      this.fallbackParser.block = this.block
    }
    if (this.fallbackParser.inline !== this.inline) {
      this.fallbackParser.inline = this.inline
    }
    this.fallbackParser.core = this

    return this.fallbackParser
  }

  public createState(src: string, env: Record<string, unknown> = {}, md?: any): State {
    const parser = this.resolveParser(md)
    return new State(src, parser, env)
  }

  public process(state: State): void {
    const rules = this.ruler.getRules('')
    for (let i = 0; i < rules.length; i++) {
      rules[i](state)
    }
  }

  public parse(src: string, env: Record<string, unknown> = {}, md?: any): State {
    if (typeof src !== 'string') {
      throw new TypeError('Input data should be a String')
    }

    const state = this.createState(src, env, md)
    this.process(state)
    this.lastState = state
    return state
  }

  public getTokens(): Array<import('../types').Token> {
    return this.lastState ? this.lastState.tokens : []
  }
}
