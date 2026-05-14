import {
  detectGlobalMarkdownState,
  getKnownGlobalMarkdownState,
  resetKnownGlobalMarkdownState,
  runWithKnownGlobalMarkdownState,
} from './global_state'
import { ParserCore as ParserCoreClass } from './parser_core'
import { beginParseDiagnostics } from './strategy_diagnostics'

export { ParserBlock } from './parser_block'
export { ParserCore } from './parser_core'
export { ParserInline } from './parser_inline'

/**
 * High-level parse function returning token array. This is a small shim
 * around `ParserCore` to make a tree-shakable public API.
 */
// Reuse a shared ParserCore to avoid expensive rule initialization on every parse()
let sharedCore: ParserCoreClass | null = null

function getSharedCore(): ParserCoreClass {
  if (!sharedCore)
    sharedCore = new ParserCoreClass()
  return sharedCore
}

export function parse(src: string, env: Record<string, unknown> = {}) {
  beginParseDiagnostics(env)
  const core = getSharedCore()
  const reason = detectGlobalMarkdownState(src)
  return runWithKnownGlobalMarkdownState(env, reason, () => {
    return core.parse(src, env).tokens
  })
}

/**
 * Parse inline-only content. For now this uses the same core parser
 * (scaffold) — it may be adjusted to set inline mode in a future step.
 */
export function parseInline(src: string, env: Record<string, unknown> = {}) {
  beginParseDiagnostics(env)
  const core = getSharedCore()
  if (getKnownGlobalMarkdownState(env))
    resetKnownGlobalMarkdownState(env)
  const state = core.createState(src, env)
  // enable inline-only mode so process() produces a single `inline` token
  state.inlineMode = true
  core.process(state)
  return state.tokens
}
