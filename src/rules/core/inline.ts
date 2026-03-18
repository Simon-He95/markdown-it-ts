import type { State } from '../../parse/state'
import { Token } from '../../common/token'
import { isPlainInlineText } from '../../parse/parser_inline'

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
      if (tok.content.length > 0 && isPlainInlineText(tok.content)) {
        const text = new Token('text', '', 0)
        text.content = tok.content
        tok.children.push(text)
        continue
      }
      state.md.inline.parse(tok.content, state.md, state.env, tok.children)
    }
  }
}

export default inline
