import { Token } from '../../common/token'
import { sourceToString } from '../../parse/source'

/**
 * Core rule: block
 * Runs block-level parser on the input.
 */
export function block(state: any): void {
  if (state.inlineMode) {
    // In inline mode, create a single inline token instead of parsing blocks
    const token = new Token('inline', '', 0)
    token.content = sourceToString(state.src)
    token.map = [0, 1]
    token.children = []
    token.level = 0
    state.tokens.push(token)
  }
  else {
    // Normal mode: run block parser with correct signature
    if (state.md && state.md.block) {
      state.md.block.parse(state.src, state.md, state.env, state.tokens)
    }
  }
}

export default block
