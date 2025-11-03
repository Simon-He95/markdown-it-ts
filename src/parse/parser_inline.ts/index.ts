import type { Token } from '../../types'
import type { State } from '../state'

/**
 * Minimal inline parser scaffold.
 *
 * This converts paragraph token `content` into simple `text` children tokens.
 * It's intentionally tiny — a migration scaffold to be replaced with the full
 * inline parsing logic from the original repo.
 */
export class ParserInline {
  constructor() {}

  public parse(state: State): void {
    for (const token of state.tokens) {
      if (token.type === 'paragraph' && typeof token.content === 'string') {
        const words = token.content.split(/\s+/).filter(Boolean)
        token.children = words.map((w: string) => ({ type: 'text', content: w, level: (token.level || 0) + 1 } as Token))
      }
    }
  }
}

export default ParserInline
