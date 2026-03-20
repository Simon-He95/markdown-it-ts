/**
 * ParserBlock
 *
 * Block-level tokenizer.
 */

import type { Token } from '../types'
import type { ParseSource } from './source'
import { blockquote } from '../rules/block/blockquote'

import { code } from '../rules/block/code'
import { fence } from '../rules/block/fence'
import { heading } from '../rules/block/heading'
import { hr } from '../rules/block/hr'
import { html_block } from '../rules/block/html_block'
import { lheading } from '../rules/block/lheading'
import { list } from '../rules/block/list'
import { paragraph } from '../rules/block/paragraph'
import { reference } from '../rules/block/reference'
import { table } from '../rules/block/table'
import { BlockRuler } from './parser_block/ruler'
import { StateBlock } from './parser_block/state_block'
import { recordRuleInvocation } from './rule_profile'

const _rules: [string, any, string[]?][] = [
  // First 2 params - rule name & source. Third param - list of rules,
  // which can be terminated by this one.
  ['table', table, ['paragraph', 'reference']],
  ['code', code],
  ['fence', fence, ['paragraph', 'reference', 'blockquote', 'list']],
  ['blockquote', blockquote, ['paragraph', 'reference', 'blockquote', 'list']],
  ['hr', hr, ['paragraph', 'reference', 'blockquote', 'list']],
  ['list', list, ['paragraph', 'reference', 'blockquote']],
  ['reference', reference],
  ['html_block', html_block, ['paragraph', 'reference', 'blockquote']],
  ['heading', heading, ['paragraph', 'reference', 'blockquote']],
  ['lheading', lheading],
  ['paragraph', paragraph],
]

export class ParserBlock {
  public ruler: BlockRuler
  private cachedRulesVersion = -1
  private cachedRules: Array<(state: StateBlock, startLine: number, endLine: number, silent: boolean) => boolean> = []

  constructor() {
    this.ruler = new BlockRuler()

    for (let i = 0; i < _rules.length; i++) {
      this.ruler.push(_rules[i][0], _rules[i][1], { alt: (_rules[i][2] || []).slice() })
    }

    // Fast paragraph terminator hints are only safe for the stock block rule
    // set. Plugins that add/replace block rules should automatically fall back
    // to the full terminator chain.
    ;(this.ruler as any).__mdtsDefaultVersion = this.ruler.version
  }

  /**
   * Generate tokens for input range
   */
  tokenize(state: StateBlock, startLine: number, endLine: number): void {
    const rules = this.getRules()
    const namedRules = this.ruler.getNamedRules('')
    const len = rules.length
    const maxNesting = state.md.options.maxNesting
    const bMarks = state.bMarks
    const tShift = state.tShift
    const eMarks = state.eMarks
    const sCount = state.sCount
    let line = startLine
    let hasEmptyLines = false
    const shouldProfile = !!state.env && (Object.prototype.hasOwnProperty.call(state.env, '__mdtsRuleProfile') || Object.prototype.hasOwnProperty.call(state.env, '__mdtsProfileRules'))

    while (line < endLine) {
      while (line < endLine && bMarks[line] + tShift[line] >= eMarks[line]) {
        line++
      }
      state.line = line
      if (line >= endLine)
        break

      // Termination condition for nested calls.
      // Nested calls currently used for blockquotes & lists
      if (sCount[line] < state.blkIndent)
        break

      // If nesting level exceeded - skip tail to the end. That's not ordinary
      // situation and we should not care about content.
      if (state.level >= maxNesting) {
        state.line = endLine
        break
      }

      // Try all possible rules.
      // On success, rule should:
      //
      // - update `state.line`
      // - update `state.tokens`
      // - return true
      const prevLine = state.line
      let ok = false

      for (let i = 0; i < len; i++) {
        if (!shouldProfile) {
          ok = rules[i](state, line, endLine, false)
        }
        else {
          const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now()
          ok = namedRules[i].fn(state, line, endLine, false)
          const endedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now()
          recordRuleInvocation(state.env, 'block', namedRules[i].name, endedAt - startedAt, ok, false)
        }
        if (ok) {
          if (prevLine >= state.line) {
            throw new Error('block rule didn\'t increment state.line')
          }
          break
        }
      }

      // this can only happen if user disables paragraph rule
      if (!ok)
        throw new Error('none of the block rules matched')

      // set state.tight if we had an empty line before current tag
      // i.e. latest empty line should not count
      state.tight = !hasEmptyLines

      // paragraph might "eat" one newline after it in nested lists
      if (bMarks[state.line - 1] + tShift[state.line - 1] >= eMarks[state.line - 1]) {
        hasEmptyLines = true
      }

      line = state.line

      if (line < endLine && bMarks[line] + tShift[line] >= eMarks[line]) {
        hasEmptyLines = true
        line++
        state.line = line
      }
    }
  }

  /**
   * ParserBlock.parse(src, md, env, outTokens)
   *
   * Process input string and push block tokens into `outTokens`
   */
  parse(src: ParseSource, md: any, env: any, outTokens: Token[]): void {
    if (!src || src.length === 0)
      return

    const state = new StateBlock(src, md, env, outTokens)

    this.tokenize(state, state.line, state.lineMax)
  }

  private getRules(): Array<(state: StateBlock, startLine: number, endLine: number, silent: boolean) => boolean> {
    if (this.cachedRulesVersion !== this.ruler.version) {
      this.cachedRules = this.ruler.getRules('') as Array<(state: StateBlock, startLine: number, endLine: number, silent: boolean) => boolean>
      this.cachedRulesVersion = this.ruler.version
    }
    return this.cachedRules
  }
}
