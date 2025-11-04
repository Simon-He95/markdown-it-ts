import type { Token } from '../common/token'
import type { RendererEnv, RendererOptions } from './renderer'
import { parse } from '../parse'
import Renderer from './renderer'

type RenderInput = string | Token[]

/**
 * Render markdown or pre-generated tokens to HTML using a fresh Renderer instance.
 */
export function render(input: RenderInput, options: RendererOptions = {}, env: RendererEnv = {}) {
  const renderer = new Renderer(options)
  const tokens = typeof input === 'string' ? parse(input, env) : input
  return renderer.render(tokens, options, env)
}

export { Renderer }
export type { RendererEnv, RendererOptions }

export default render
