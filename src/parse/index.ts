import { ParserCore as ParserCoreClass } from './parser_core'

export { ParserBlock } from './parser_block'
export { ParserCore } from './parser_core'
export { ParserInline } from './parser_inline'

/**
 * High-level parse function returning token array. This is a small shim
 * around `ParserCore` to make a tree-shakable public API.
 */
export function parse(src: string, env: Record<string, unknown> = {}) {
  const core = new ParserCoreClass()
  const state = core.parse(src, env)
  return state.tokens
}

/**
 * Parse inline-only content. For now this uses the same core parser
 * (scaffold) — it may be adjusted to set inline mode in a future step.
 */
export function parseInline(src: string, env: Record<string, unknown> = {}) {
  const core = new ParserCoreClass()
  const state = core.createState(src, env)
  // enable inline-only mode so process() produces a single `inline` token
  state.inlineMode = true
  core.process(state)
  return state.tokens
}
