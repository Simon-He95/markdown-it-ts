import type { State } from '../../parse/state'

/**
 * Core rule: inline
 * Iterates through tokens and runs inline parser on 'inline' type tokens.
 */
export function inline(state: State): void {
  const tokens = state.tokens

  // Parse inlines
  for (let i = 0, l = tokens.length; i < l; i++) {
    const tok = tokens[i]
    if (tok.type === 'inline' && state.md) {
      if (!tok.children) {
        tok.children = []
      }
      state.md.inline.parse(tok.content, state.md, state.env, tok.children)
    }
  }
}

export default inline
