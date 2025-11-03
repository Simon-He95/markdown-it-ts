import type { RendererOptions, Token } from '../types'
import Renderer from './renderer'

/**
 * Render tokens to HTML string using the Renderer class.
 * This small wrapper allows importing just the render functionality.
 */
export function render(tokens: Token[], options: RendererOptions = {}, _env: Record<string, unknown> = {}) {
  if (!Array.isArray(tokens)) {
    throw new TypeError('render expects token array as first argument')
  }

  const r = new Renderer(options)
  return r.render(tokens, options)
}

export default render
