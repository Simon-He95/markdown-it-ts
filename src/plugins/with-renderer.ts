import type { MarkdownIt, MarkdownItOptions } from '../index'
import Renderer from '../render/renderer'

/**
 * Attach or refresh rendering methods on a markdown-it-shaped instance.
 * The main markdown-it-ts entry already exposes renderer methods; this helper is
 * for custom instances that provide parse/parseInline but need renderer methods.
 */
export function withRenderer(md: MarkdownIt, options?: MarkdownItOptions) {
  if (!md.renderer)
    md.renderer = new Renderer()

  if (options && typeof options === 'object')
    md.set(options)

  md.render = function (src: string, env: Record<string, unknown> = {}) {
    const tokens = this.parse(src, env)
    return this.renderer.render(tokens, this.options, env)
  }

  md.renderAsync = async function (src: string, env: Record<string, unknown> = {}) {
    const tokens = this.parse(src, env)
    return this.renderer.renderAsync(tokens, this.options, env)
  }

  md.renderInline = function (src: string, env: Record<string, unknown> = {}) {
    const tokens = this.parseInline(src, env)
    return this.renderer.render(tokens, this.options, env)
  }

  return md
}

export default withRenderer
