import type { State } from '../../parse/state'
import { Token } from '../../common/token'
import { isPlainInlineText } from '../../parse/parser_inline'

export interface StreamInlineReuse {
  previous: Map<string, Token[]>
  next: Map<string, Token[]>
}

// Keep the pre-core snapshots separate from children mutated by later core rules.
export const streamInlineReuse = new WeakMap<State, StreamInlineReuse>()

function copyInlineToken(token: Token): Token {
  const copy = Object.assign(new Token(token.type, token.tag, token.nesting), token)
  copy.attrs = token.attrs?.map(([key, value]) => [key, value]) ?? null
  copy.map = token.map?.slice() ?? null
  copy.children = token.children?.map(copyInlineToken) ?? null
  return copy
}

function canReuseInlineToken(token: Token): boolean {
  return token.meta === null
    && (!token.children || token.children.every(canReuseInlineToken))
}

/**
 * Core rule: inline
 * Iterates through tokens and runs inline parser on 'inline' type tokens.
 */
export function inline(state: State): void {
  const reuse = streamInlineReuse.get(state)
  const tokens = state.tokens
  const inlineParser = state.md?.inline
  // The plain-text shortcut below pushes a token without ever constructing a state, so it has
  // to stand down when a plugin replaced `md.inline.State`. Duck-typed parsers without the
  // predicate keep the previous behavior.
  const canUsePlainTextFastPath = !!inlineParser?.isDefaultRuleset?.()
    && inlineParser?.usesDefaultState?.() !== false

  // Parse inlines
  for (let i = 0, l = tokens.length; i < l; i++) {
    const tok = tokens[i]
    if (tok.type === 'inline' && state.md) {
      if (!tok.children) {
        tok.children = []
      }
      if (canUsePlainTextFastPath && tok.content.length > 0 && isPlainInlineText(tok.content)) {
        const text = new Token('text', '', 0)
        text.content = tok.content
        tok.children.push(text)
        continue
      }
      if (!reuse || tok.children.length > 0 || tok.content.length === 0) {
        state.md.inline.parse(tok.content, state.md, state.env, tok.children)
        continue
      }
      const cached = reuse.next.get(tok.content) ?? reuse.previous.get(tok.content)
      if (cached) {
        tok.children = cached.map(copyInlineToken)
        reuse.next.set(tok.content, cached)
      }
      else {
        state.md.inline.parse(tok.content, state.md, state.env, tok.children)
        if (tok.children.every(canReuseInlineToken))
          reuse.next.set(tok.content, tok.children.map(copyInlineToken))
      }
    }
  }
}

export default inline
