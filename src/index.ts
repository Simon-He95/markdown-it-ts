import type { Token as TokenType } from './common/token'
import type { RendererOptions } from './render/renderer'
import type { StreamStats } from './stream/parser'
import LinkifyIt from 'linkify-it'
import * as utils from './common/utils'
import * as helpers from './helpers'
import { normalizeLink, normalizeLinkText, validateLink } from './parse/link_utils'
import { ParserCore } from './parse/parser_core'
import commonmarkPreset from './presets/commonmark'
import defaultPreset from './presets/default'
import zeroPreset from './presets/zero'
import Renderer from './render/renderer'
import { chunkedParse } from './stream/chunked'
import { StreamParser } from './stream/parser'

export { Token } from './common/token'
export { parse, parseInline } from './parse'
export { withRenderer } from './plugins/with-renderer'
export { chunkedParse } from './stream/chunked'
export type { ChunkedOptions } from './stream/chunked'
export type { StreamStats } from './stream/parser'

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
  stream?: boolean
  // Stream optimization knobs
  streamOptimizationMinSize?: number // characters threshold to start stream append optimizations
  // Chunked fallback when stream falls back to full parse for very large docs
  streamChunkedFallback?: boolean
  streamChunkSizeChars?: number
  streamChunkSizeLines?: number
  streamChunkFenceAware?: boolean
  // Full (non-stream) parse: optional chunked mode
  fullChunkedFallback?: boolean
  fullChunkThresholdChars?: number
  fullChunkThresholdLines?: number
  fullChunkSizeChars?: number
  fullChunkSizeLines?: number
  fullChunkFenceAware?: boolean
  fullChunkMaxChunks?: number
}

interface Preset { options?: MarkdownItOptions, components?: any }

const config: Record<string, Preset> = {
  default: defaultPreset as Preset,
  zero: (zeroPreset as unknown as Preset),
  commonmark: commonmarkPreset as Preset,
}

// Define the MarkdownIt instance interface for better type support
export interface MarkdownIt {
  core: ParserCore
  block: any
  inline: any
  linkify: ReturnType<typeof LinkifyIt>
  renderer: Renderer
  options: MarkdownItOptions
  stream: {
    enabled: boolean
    parse: (src: string, env?: Record<string, unknown>) => TokenType[]
    reset: () => void
    peek: () => TokenType[]
    stats: () => StreamStats
    resetStats: () => void
  }
  set: (options: MarkdownItOptions) => this
  configure: (presets: string | Preset) => this
  enable: (list: string | string[], ignoreInvalid?: boolean) => this
  disable: (list: string | string[], ignoreInvalid?: boolean) => this
  use: (plugin: MarkdownItPlugin, ...params: unknown[]) => this
  render: (src: string, env?: Record<string, unknown>) => string
  renderInline: (src: string, env?: Record<string, unknown>) => string
  validateLink: typeof validateLink
  normalizeLink: typeof normalizeLink
  normalizeLinkText: typeof normalizeLinkText
  utils: typeof utils
  helpers: typeof helpers
  parse: (src: string, env?: Record<string, unknown>) => TokenType[]
  parseInline: (src: string, env?: Record<string, unknown>) => TokenType[]
}

export type MarkdownItPluginFn = (md: MarkdownIt, ...params: unknown[]) => unknown
export interface MarkdownItPluginModule { default: MarkdownItPluginFn }
export type MarkdownItPlugin = MarkdownItPluginFn | MarkdownItPluginModule

function markdownIt(presetName?: string | MarkdownItOptions, options?: MarkdownItOptions): MarkdownIt {
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
    stream: false,
    streamOptimizationMinSize: 1000,
    streamChunkedFallback: false,
    streamChunkSizeChars: 10000,
    streamChunkSizeLines: 200,
    streamChunkFenceAware: true,
    fullChunkedFallback: false,
    fullChunkThresholdChars: 20_000,
    fullChunkThresholdLines: 400,
    fullChunkSizeChars: 10_000,
    fullChunkSizeLines: 200,
    fullChunkFenceAware: true,
    fullChunkMaxChunks: undefined,
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
  const streamParser = new StreamParser(core)

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
      if (typeof newOpts.stream === 'boolean') {
        this.stream.enabled = newOpts.stream
        streamParser.reset()
        streamParser.resetStats()
      }
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
    use(this: MarkdownIt, plugin: MarkdownItPlugin, ...params: unknown[]) {
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
    render(this: MarkdownIt, src: string, env: Record<string, unknown> = {}) {
      const tokens = this.parse(src, env)
      return this.renderer.render(tokens, this.options, env)
    },
    renderInline(this: MarkdownIt, src: string, env: Record<string, unknown> = {}) {
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
      // Optional chunked path for full parse (non-stream)
      if (!this.stream.enabled && this.options.fullChunkedFallback) {
        const chars = src.length
        const lines = src.split('\n').length - 1
        const useChunked = (chars >= (this.options.fullChunkThresholdChars ?? 20_000))
          || (lines >= (this.options.fullChunkThresholdLines ?? 400))
        if (useChunked) {
          // Reuse chunked options but allow full-specific overrides
          const tokens = chunkedParse(this, src, env, {
            maxChunkChars: this.options.fullChunkSizeChars ?? 10_000,
            maxChunkLines: this.options.fullChunkSizeLines ?? 200,
            fenceAware: this.options.fullChunkFenceAware ?? true,
            maxChunks: this.options.fullChunkMaxChunks,
          })
          return tokens
        }
      }
      const state = core.parse(src, env, this)
      return state.tokens
    },
    parseInline(src: string, env: Record<string, unknown> = {}) {
      if (typeof src !== 'string')
        throw new TypeError('Input data should be a String')
      const state = core.createState(src, env, this)
      state.inlineMode = true
      core.process(state)
      // Return tokens array containing single inline token (matches original)
      return state.tokens
    },
  }

  md.stream = {
    enabled: Boolean(opts.stream),
    parse(src: string, env?: Record<string, unknown>) {
      if (!md.stream.enabled) {
        const state = core.parse(src, env ?? {}, md)
        return state.tokens
      }
      return streamParser.parse(src, env, md)
    },
    reset() {
      streamParser.reset()
    },
    peek() {
      return streamParser.peek()
    },
    stats() {
      return streamParser.getStats()
    },
    resetStats() {
      streamParser.resetStats()
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

  return md as MarkdownIt
}

// Provide a constructor+callable type so both `new MarkdownIt()` and `MarkdownIt()` are correctly typed
export interface MarkdownItConstructor {
  new (presetName?: string | MarkdownItOptions, options?: MarkdownItOptions): MarkdownIt
  (presetName?: string | MarkdownItOptions, options?: MarkdownItOptions): MarkdownIt
}

// Export default with constructor signature to match original markdown-it behavior
const MarkdownItExport = markdownIt as unknown as MarkdownItConstructor
export default MarkdownItExport
