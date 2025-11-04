import type { MarkdownItCore, MarkdownItOptions } from '../index'
import Renderer from '../render/renderer'

/**
 * Attach rendering capabilities to a core-only md instance.
 * Importing this module brings renderer code into the bundle explicitly,
 * preserving tree-shaking when consumers only use md.parse/parseInline.
 */
export function withRenderer(md: MarkdownItCore, options?: MarkdownItOptions) {
  if (!md.renderer)
    md.renderer = new Renderer()

  if (options && typeof options === 'object')
    md.set(options)

  md.render = function (src: string, env: Record<string, unknown> = {}) {
    const tokens = this.parse(src, env)
    return this.renderer.render(tokens, this.options, env)
  }

  md.renderInline = function (src: string, env: Record<string, unknown> = {}) {
    const tokens = this.parseInline(src, env)
    return this.renderer.render(tokens, this.options, env)
  }

  return md
}

export default withRenderer
