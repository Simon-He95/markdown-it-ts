// src/parse/parser_core.ts

import { block } from '../rules/core/block'
import { inline } from '../rules/core/inline'
import { linkify } from '../rules/core/linkify'
// Import core rules
import { normalize } from '../rules/core/normalize'
import { replacements } from '../rules/core/replacements'

import { CoreRuler } from '../rules/core/ruler'
import { smartquotes } from '../rules/core/smartquotes'
import { text_join } from '../rules/core/text_join'
import { normalizeLink, normalizeLinkText, validateLink } from './link_utils'
import { ParserBlock } from './parser_block'
import { ParserInline } from './parser_inline'
import { State } from './state'

const _rules: [string, any][] = [
  ['normalize', normalize],
  ['block', block],
  ['inline', inline],
  ['linkify', linkify],
  ['replacements', replacements],
  ['smartquotes', smartquotes],
  ['text_join', text_join],
]

export class ParserCore {
  private state?: State
  public block: ParserBlock
  public inline: ParserInline
  public ruler: CoreRuler

  constructor(src?: string) {
    this.block = new ParserBlock()
    this.inline = new ParserInline()
    this.ruler = new CoreRuler()

    // Register all core rules
    for (let i = 0; i < _rules.length; i++) {
      this.ruler.push(_rules[i][0], _rules[i][1])
    }

    if (typeof src === 'string') {
      this.state = new State(src)
    }
  }

  /**
   * Create a fresh State instance for given input.
   */
  public createState(src: string, env: Record<string, unknown> = {}): State {
    return new State(src, env)
  }

  /**
   * Process tokens for the provided state. If state.inlineMode is true,
   * generate a single `inline` token from src and run inline parser only.
   */
  public process(state: State): void {
    // Extend state with reference to this parser instance (for core rules)
    const extendedState = state as any
    extendedState.md = {
      block: this.block,
      inline: this.inline,
      options: {
        html: true,
        xhtmlOut: false,
        breaks: false,
        langPrefix: 'language-',
        linkify: false,
        typographer: false,
        quotes: '\u201C\u201D\u2018\u2019', // ""''
        maxNesting: 100,
      },
      helpers: {
        parseLinkLabel: () => ({ ok: false, pos: 0 }),
        parseLinkDestination: () => ({ ok: false, str: '', pos: 0 }),
        parseLinkTitle: () => ({ ok: false, str: '', pos: 0, can_continue: false }),
      },
      normalizeLink,
      normalizeLinkText,
      validateLink,
    }

    // Execute all core rules through the ruler
    // This includes: normalize, block, inline, linkify, replacements, smartquotes, text_join
    const rules = this.ruler.getRules('')
    for (let i = 0; i < rules.length; i++) {
      rules[i](extendedState)
    }
  }

  /**
   * Convenience: parse src/env and return tokens.
   */
  public parse(src?: string, env: Record<string, unknown> = {}): State {
    if (typeof src === 'string') {
      const state = this.createState(src, env)
      this.process(state)
      return state
    }

    if (this.state) {
      this.process(this.state)
      return this.state
    }

    throw new Error('No input provided to parse and no internal state available')
  }

  public getTokens(): Array<import('../types').Token> {
    return this.state ? this.state.tokens : []
  }
}
