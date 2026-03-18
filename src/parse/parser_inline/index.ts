import type { Token } from '../../types'
import type { ParseSource } from '../source'
import { Token as TokenClass } from '../../common/token'
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
import linkify from '../../rules/inline/linkify'
import newline from '../../rules/inline/newline'
import { strikethrough } from '../../rules/inline/strikethrough'
import text from '../../rules/inline/text'
import { InlineRuler } from './ruler'
import { StateInline } from './state_inline'

/**
 * ParserInline - inline parser with Ruler-based rule management
 */

function isInlineTerminatorChar(ch: number): boolean {
  switch (ch) {
    case 0x0A:
    case 0x21:
    case 0x23:
    case 0x24:
    case 0x25:
    case 0x26:
    case 0x2A:
    case 0x2B:
    case 0x2D:
    case 0x3A:
    case 0x3C:
    case 0x3D:
    case 0x3E:
    case 0x40:
    case 0x5B:
    case 0x5C:
    case 0x5D:
    case 0x5E:
    case 0x5F:
    case 0x60:
    case 0x7B:
    case 0x7D:
    case 0x7E:
      return true
    default:
      return false
  }
}

export function isPlainInlineText(src: string): boolean {
  for (let i = 0; i < src.length; i++) {
    if (isInlineTerminatorChar(src.charCodeAt(i))) {
      return false
    }
  }
  return true
}

export class ParserInline {
  public ruler: InlineRuler
  public ruler2: InlineRuler
  private cachedRulesVersion = -1
  private cachedRules: Array<(state: StateInline, silent?: boolean) => boolean | void> = []
  private cachedRules2Version = -1
  private cachedRules2: Array<(state: StateInline, silent?: boolean) => void> = []

  constructor() {
    this.ruler = new InlineRuler()
    this.ruler2 = new InlineRuler()

    // Register default inline rules (ruler)
    // Order MUST match original markdown-it exactly!
    this.ruler.push('text', text)
    this.ruler.push('linkify', linkify)
    this.ruler.push('newline', newline)
    this.ruler.push('escape', escape)
    this.ruler.push('backticks', backticks)
    this.ruler.push('strikethrough', strikethrough.tokenize)
    this.ruler.push('emphasis', emphasis.tokenize)
    this.ruler.push('link', link)
    this.ruler.push('image', image)
    this.ruler.push('autolink', autolink)
    this.ruler.push('html_inline', html_inline)
    this.ruler.push('entity', entity)

    // Register post-process rules (ruler2)
    this.ruler2.push('balance_pairs', balance_pairs)
    this.ruler2.push('strikethrough', strikethrough.postProcess)
    this.ruler2.push('emphasis', emphasis.postProcess)
    this.ruler2.push('fragments_join', fragments_join)
  }

  /**
   * Skip single token by running all rules in validation mode
   */
  public skipToken(state: StateInline): void {
    const pos = state.pos
    const rules = this.getRules()
    const len = rules.length
    const cache = state.cache
    const cached = cache[pos]
    if (cached !== undefined) {
      state.pos = cached
      return
    }

    let ok: boolean | void = false

    if (state.level < state.maxNesting) {
      for (let i = 0; i < len; i++) {
        // Increment state.level and decrement it later to limit recursion.
        // It's harmless to do here, because no tokens are created. But ideally,
        // we'd need a separate private state variable for this purpose.
        state.level++
        ok = rules[i](state, true)
        state.level--

        if (ok) {
          if (pos >= state.pos) {
            throw new Error('inline rule didn\'t increment state.pos')
          }
          break
        }
      }
    }
    else {
      // Too much nesting, just skip until the end of the paragraph.
      //
      // NOTE: this will cause links to behave incorrectly in the following case,
      //       when an amount of `[` is exactly equal to `maxNesting + 1`:
      //
      //       [[[[[[[[[[[[[[[[[[[[[foo]()
      //
      // TODO: remove this workaround when CM standard will allow nested links
      //       (we can replace it by preventing links from being parsed in
      //       validation mode)
      state.pos = state.posMax
    }

    if (!ok)
      state.pos++

    cache[pos] = state.pos
  }

  /**
   * Generate tokens for input string
   */
  public tokenize(state: StateInline): void {
    const rules = this.getRules()
    const len = rules.length
    const end = state.posMax

    while (state.pos < end) {
      const prevPos = state.pos
      let ok: boolean | void = false

      if (state.level < state.maxNesting) {
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

      state.pending += state.src.charAt(state.pos++)
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
  public parseSource(src: ParseSource, md: any, env: any, outTokens: Token[]): void {
    if (typeof src === 'string' && src.length > 0 && isPlainInlineText(src)) {
      const token = new TokenClass('text', '', 0)
      token.content = src
      outTokens.push(token)
      return
    }

    const state = new StateInline(src, md, env, outTokens)

    this.tokenize(state)

    const rules2 = this.getRules2()
    const len = rules2.length

    for (let i = 0; i < len; i++) {
      rules2[i](state, false)
    }
  }

  public parse(str: string, md: any, env: any, outTokens: Token[]): void {
    this.parseSource(str, md, env, outTokens)
  }

  private getRules(): Array<(state: StateInline, silent?: boolean) => boolean | void> {
    if (this.cachedRulesVersion !== this.ruler.version) {
      this.cachedRules = this.ruler.getRules('') as Array<(state: StateInline, silent?: boolean) => boolean | void>
      this.cachedRulesVersion = this.ruler.version
    }
    return this.cachedRules
  }

  private getRules2(): Array<(state: StateInline, silent?: boolean) => void> {
    if (this.cachedRules2Version !== this.ruler2.version) {
      this.cachedRules2 = this.ruler2.getRules('') as Array<(state: StateInline, silent?: boolean) => void>
      this.cachedRules2Version = this.ruler2.version
    }
    return this.cachedRules2
  }
}

export default ParserInline
