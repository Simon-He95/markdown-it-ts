import type { Token } from '../../types'
import autolink from '../../rules/inline/autolink'
import backticks from '../../rules/inline/backticks'

import balance_pairs from '../../rules/inline/balance_pairs'
import { emphasis } from '../../rules/inline/emphasis'
import entity from '../../rules/inline/entity'
import escape from '../../rules/inline/escape'
import fragments_join from '../../rules/inline/fragments_join'
import html_inline from '../../rules/inline/html_inline'
import image from '../../rules/inline/image'
import link from '../../rules/inline/link'
import newline from '../../rules/inline/newline'
// Import inline rules
import text from '../../rules/inline/text'
import { InlineRuler } from './ruler'
import { StateInline } from './state_inline'

/**
 * ParserInline - inline parser with Ruler-based rule management
 */
export class ParserInline {
  public ruler: InlineRuler
  public ruler2: InlineRuler

  constructor() {
    this.ruler = new InlineRuler()
    this.ruler2 = new InlineRuler()

    // Register default inline rules (ruler)
    // Order matches original markdown-it
    this.ruler.push('text', text)
    // this.ruler.push('linkify', linkify) // TODO: requires linkify-it library
    this.ruler.push('newline', newline)
    this.ruler.push('escape', escape)
    this.ruler.push('backticks', backticks)
    // this.ruler.push('strikethrough', strikethrough.tokenize) // TODO: optional feature
    this.ruler.push('emphasis', emphasis.tokenize)
    this.ruler.push('link', link)
    this.ruler.push('image', image)
    this.ruler.push('autolink', autolink)
    this.ruler.push('html_inline', html_inline)
    this.ruler.push('entity', entity)

    // Register post-process rules (ruler2)
    this.ruler2.push('balance_pairs', balance_pairs)
    this.ruler2.push('emphasis', emphasis.postProcess)
    this.ruler2.push('fragments_join', fragments_join)
  }

  /**
   * Skip single token by running all rules in validation mode
   */
  public skipToken(state: StateInline): void {
    const pos = state.pos
    const rules = this.ruler.getRules('')
    const len = rules.length
    const posMax = state.posMax
    const maxNesting = state.md?.options?.maxNesting || 100

    if (typeof state.cache[pos] !== 'undefined') {
      state.pos = state.cache[pos]
      return
    }

    let ok: boolean | void = false

    if (state.level < maxNesting) {
      for (let i = 0; i < len; i++) {
        ok = rules[i](state, true)
        if (ok)
          break
      }
    }
    else {
      // Too much nesting, just skip until the end of the paragraph
      state.pos = posMax
    }

    if (!ok)
      state.pos++

    state.cache[pos] = state.pos
  }

  /**
   * Generate tokens for input string
   */
  public tokenize(state: StateInline): void {
    const rules = this.ruler.getRules('')
    const len = rules.length
    const end = state.posMax
    const maxNesting = state.md?.options?.maxNesting || 100

    while (state.pos < end) {
      const prevPos = state.pos
      let ok: boolean | void = false

      if (state.level < maxNesting) {
        for (let i = 0; i < len; i++) {
          ok = rules[i](state, false)
          if (ok) {
            if (prevPos >= state.pos) {
              throw new Error('inline rule didn\'t increment state.pos')
            }
            break
          }
        }
      }

      if (ok) {
        if (state.pos >= end)
          break
        continue
      }

      state.pending += state.src[state.pos++]
    }

    if (state.pending) {
      state.pushPending()
    }
  }

  /**
   * ParserInline.parse(str, md, env, outTokens)
   *
   * Process input string and push inline tokens into `outTokens`.
   * Matches the signature from original markdown-it/lib/parser_inline.mjs
   */
  public parse(str: string, md: any, env: any, outTokens: Token[]): void {
    const state = new StateInline(str, md, env, outTokens)

    this.tokenize(state)

    const rules2 = this.ruler2.getRules('')
    const len = rules2.length

    for (let i = 0; i < len; i++) {
      rules2[i](state, false)
    }
  }
}

export default ParserInline
