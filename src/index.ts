import type { RendererOptions } from './render/renderer'
import LinkifyIt from 'linkify-it'
import * as utils from './common/utils'
import * as helpers from './helpers'
import { normalizeLink, normalizeLinkText, validateLink } from './parse/link_utils'
import { ParserCore } from './parse/parser_core'
import commonmarkPreset from './presets/commonmark'
import defaultPreset from './presets/default'
import zeroPreset from './presets/zero'
import Renderer from './render/renderer'

export { Token } from './common/token'
export { parse, parseInline } from './parse'
export { withRenderer } from './plugins/with-renderer'

type QuotesOption = string | [string, string, string, string]

export interface MarkdownItOptions {
  html?: boolean
  xhtmlOut?: boolean
  breaks?: boolean
  langPrefix?: string
  linkify?: boolean
  typographer?: boolean
  quotes?: QuotesOption
  highlight?: ((str: string, lang?: string, attrs?: string) => string) | null
  maxNesting?: number
}

interface Preset { options?: MarkdownItOptions, components?: any }

const config: Record<string, Preset> = {
  default: defaultPreset as Preset,
  zero: (zeroPreset as unknown as Preset),
  commonmark: commonmarkPreset as Preset,
}

export type MarkdownItCore = ReturnType<typeof markdownit>
export type MarkdownItPluginFn = (md: MarkdownItCore, ...params: unknown[]) => unknown
export interface MarkdownItPluginModule { default: MarkdownItPluginFn }
export type MarkdownItPlugin = MarkdownItPluginFn | MarkdownItPluginModule

export default function markdownit(presetName?: string | MarkdownItOptions, options?: MarkdownItOptions) {
  // defaults (core-only)
  let opts: MarkdownItOptions = {
    html: false,
    xhtmlOut: false,
    breaks: false,
    langPrefix: 'language-',
    linkify: false,
    typographer: false,
    quotes: '\u201C\u201D\u2018\u2019',
    highlight: null,
    maxNesting: 100,
  }

  // preset and options resolution (compatible semantics)
  let presetToUse = 'default'
  let userOptions: MarkdownItOptions | undefined
  if (!options && typeof presetName !== 'string') {
    // markdownit({ ...options }) - presetName is actually options
    userOptions = presetName
    presetToUse = 'default'
  }
  else if (typeof presetName === 'string') {
    // markdownit('preset', { ...options })
    presetToUse = presetName
    userOptions = options
  }

  const preset = config[presetToUse]
  if (!preset) {
    throw new Error(`Wrong \`markdown-it\` preset "${presetToUse}", check name`)
  }

  // Apply preset options first, then user options (user options take precedence)
  if (preset?.options)
    opts = { ...opts, ...preset.options }
  if (userOptions)
    opts = { ...opts, ...userOptions }

  // Normalize quotes option: convert string to array if needed
  if (typeof opts.quotes === 'string') {
    // Split string into array of characters: '""''' -> ['"', '"', ''', ''']
    const quotesStr = opts.quotes
    opts.quotes = [
      quotesStr[0], // double open
      quotesStr[1], // double close
      quotesStr[2], // single open
      quotesStr[3], // single close
    ] as [string, string, string, string]
  }

  // construct minimal core instance; avoid importing renderer here
  const core = new ParserCore()

  const renderer = new Renderer(opts)

  const md: any = {
    // expose core parts for plugins and rules
    core,
    block: core.block,
    inline: core.inline,
    linkify: new LinkifyIt(),
    renderer,

    // options & mutators
    options: opts,
    set(newOpts: MarkdownItOptions) {
      this.options = { ...this.options, ...newOpts }
      this.renderer.set(newOpts as RendererOptions)
      return this
    },
    configure(presets: string | Preset) {
      const p = typeof presets === 'string' ? config[presets] : presets
      if (!p)
        throw new Error('Wrong `markdown-it` preset, can\'t be empty')
      if (p.options)
        this.set(p.options)
      // Apply components (enableOnly rules) if present
      if (p.components) {
        const c = p.components
        if (c.core?.rules)
          this.core.ruler.enableOnly(c.core.rules)
        if (c.block?.rules)
          this.block.ruler.enableOnly(c.block.rules)
        if (c.inline?.rules)
          this.inline.ruler.enableOnly(c.inline.rules)
        if (c.inline2?.rules)
          this.inline.ruler2.enableOnly(c.inline2.rules)
      }
      return this
    },
    enable(list: string | string[], ignoreInvalid?: boolean) {
      const names = Array.isArray(list) ? list : [list]
      const managers = [this.core?.ruler, this.block?.ruler, this.inline?.ruler, this.inline?.ruler2]
      let changed = 0
      for (const m of managers) {
        if (!m)
          continue
        const enabled = m.enable(names, true)
        changed += enabled.length
      }
      if (!ignoreInvalid && changed < names.length) {
        throw new Error('Rules manager: invalid rule name in list')
      }
      return this
    },
    disable(list: string | string[], ignoreInvalid?: boolean) {
      const names = Array.isArray(list) ? list : [list]
      const managers = [this.core?.ruler, this.block?.ruler, this.inline?.ruler, this.inline?.ruler2]
      let changed = 0
      for (const m of managers) {
        if (!m)
          continue
        const disabled = m.disable(names, true)
        changed += disabled.length
      }
      if (!ignoreInvalid && changed < names.length) {
        throw new Error('Rules manager: invalid rule name in list')
      }
      return this
    },
    use(this: MarkdownItCore, plugin: MarkdownItPlugin, ...params: unknown[]) {
      const fn: MarkdownItPluginFn | undefined
        = typeof plugin === 'function'
          ? plugin
          : (plugin && typeof (plugin as MarkdownItPluginModule).default === 'function'
              ? (plugin as MarkdownItPluginModule).default
              : undefined)

      if (!fn)
        throw new TypeError('MarkdownIt.use: plugin must be a function')

      const args = [this, ...params] as Parameters<MarkdownItPluginFn>
      const thisArg = typeof plugin === 'function' ? plugin : plugin
      fn.apply(thisArg as unknown, args)
      return this
    },
    render(this: MarkdownItCore, src: string, env: Record<string, unknown> = {}) {
      const tokens = this.parse(src, env)
      return this.renderer.render(tokens, this.options, env)
    },
    renderInline(this: MarkdownItCore, src: string, env: Record<string, unknown> = {}) {
      const tokens = this.parseInline(src, env)
      return this.renderer.render(tokens, this.options, env)
    },

    // link helpers
    validateLink,
    normalizeLink,
    normalizeLinkText,

    // utils (subset) for plugins
    utils,
    helpers: { ...helpers },

    // parsing API (core-only)
    parse(src: string, env: Record<string, unknown> = {}) {
      if (typeof src !== 'string')
        throw new TypeError('Input data should be a String')
      const state = core.parse(src, env, this)
      return state.tokens
    },
    parseInline(src: string, env: Record<string, unknown> = {}) {
      if (typeof src !== 'string')
        throw new TypeError('Input data should be a String')
      const state = core.createState(src, env)
      state.inlineMode = true
      core.process(state, this)
      // Return tokens array containing single inline token (matches original)
      return state.tokens
    },
  }

  // Apply preset components after md is constructed (so rulers are ready)
  // Only for 'zero' preset for now (others don't specify components yet)
  if (presetToUse === 'zero' && preset?.components) {
    const c = preset.components
    if (c.core?.rules)
      md.core.ruler.enableOnly(c.core.rules)
    if (c.block?.rules)
      md.block.ruler.enableOnly(c.block.rules)
    if (c.inline?.rules)
      md.inline.ruler.enableOnly(c.inline.rules)
    if (c.inline2?.rules)
      md.inline.ruler2.enableOnly(c.inline2.rules)
  }

  return md
}
