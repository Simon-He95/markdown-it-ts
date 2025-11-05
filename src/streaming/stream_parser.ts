import type { Token } from '../common/token'
import type { MarkdownIt } from '../index'
import type { ParserCore } from '../parse/parser_core'

interface StreamCache {
  src: string
  tokens: Token[]
  env: Record<string, unknown>
}

/**
 * StreamParser provides a lightweight incremental parsing layer that can reuse
 * tokens when the incoming markdown string is an append-only update. It falls
 * back to full parsing in all other scenarios to preserve correctness.
 */
export class StreamParser {
  private core: ParserCore
  private cache: StreamCache | null = null

  constructor(core: ParserCore) {
    this.core = core
  }

  reset(): void {
    this.cache = null
  }

  parse(src: string, env: Record<string, unknown> | undefined, md: MarkdownIt): Token[] {
    const envProvided = env
    const cached = this.cache

    if (!cached || (envProvided && envProvided !== cached.env)) {
      const workingEnv = envProvided ?? {}
      const state = this.core.parse(src, workingEnv, md)
      const tokens = state.tokens.slice()
      this.cache = { src, tokens, env: workingEnv }
      return tokens
    }

    const active = this.cache as StreamCache

    if (src === active.src) {
      // Nothing changed; reuse the previous tokens.
      return active.tokens
    }

    const appended = this.getAppendedSegment(active.src, src)

    if (appended) {
      const state = this.core.parse(appended, active.env, md)
      const combined = [...active.tokens, ...state.tokens]
      this.cache = { src, tokens: combined, env: active.env }
      return combined
    }

    // Fallback: full parse for edits in the middle or deletions.
    const fallbackEnv = envProvided ?? active.env
    const state = this.core.parse(src, fallbackEnv, md)
    const tokens = state.tokens.slice()
    this.cache = { src, tokens, env: fallbackEnv }
    return tokens
  }

  private getAppendedSegment(prev: string, next: string): string | null {
    if (!next.startsWith(prev))
      return null

    if (!prev.endsWith('\n'))
      return null

    const segment = next.slice(prev.length)
    if (!segment)
      return null

    return segment
  }
}

export default StreamParser
