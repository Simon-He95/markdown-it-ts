import type { Token } from '../common/token'
import type { RendererEnv, RendererOptions } from './renderer'
import { parse } from '../parse'
import Renderer from './renderer'

type RenderInput = string | Token[]

const sharedRenderer = new Renderer()

const ensureTokens = (input: RenderInput, env: RendererEnv) => (typeof input === 'string' ? parse(input, env) : input)

const resolveEnv = (env?: RendererEnv): RendererEnv => env ?? {}

/**
 * Render markdown or pre-generated tokens to HTML using a shared Renderer instance.
 */
export function render(input: RenderInput, options?: RendererOptions, env?: RendererEnv) {
  const envRef = resolveEnv(env)
  const tokens = ensureTokens(input, envRef)
  return sharedRenderer.render(tokens, options, envRef)
}

/**
 * Asynchronous render variant that awaits async rules (e.g. async highlight).
 */
export async function renderAsync(input: RenderInput, options?: RendererOptions, env?: RendererEnv) {
  const envRef = resolveEnv(env)
  const tokens = ensureTokens(input, envRef)
  return sharedRenderer.renderAsync(tokens, options, envRef)
}

export { Renderer }
export type { RendererEnv, RendererOptions }

export default render
