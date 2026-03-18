import type { Token as TokenType } from './common/token'
import type { ParserBlock } from './parse/parser_block'
import type { ParserInline } from './parse/parser_inline'
import type { RendererOptions } from './render/renderer'
import type { StreamStats } from './stream/parser'
import type { UnboundedBufferStats, UnboundedChunkInfo } from './stream/unbounded'
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
import {
  getAutoUnboundedDecision,
  parseAsyncIterable as parseAsyncIterableSource,
  parseAsyncIterableToSink as parseAsyncIterableToSinkSource,
  parseIterable as parseIterableSource,
  parseIterableToSink as parseIterableToSinkSource,
  parseStringUnbounded,
  shouldAutoUseUnbounded,
} from './stream/unbounded'
import { recommendFullChunkStrategy } from './support/chunk_recommend'

export { Token } from './common/token'
export { parse, parseInline } from './parse'

export type { ParseSource, TextSource } from './parse/source'
export { withRenderer } from './plugins/with-renderer'
export type { RendererEnv, RendererOptions } from './render'
export { StreamBuffer } from './stream/buffer'
export { chunkedParse } from './stream/chunked'
export type { ChunkedOptions } from './stream/chunked'
export { DebouncedStreamParser, ThrottledStreamParser } from './stream/debounced'
export { EditableBuffer } from './stream/editable'
export type { EditableBufferStats } from './stream/editable'
export type { StreamStats } from './stream/parser'
export { PieceTable, PieceTableSourceView } from './stream/piece_table'
export type { PieceTableStats } from './stream/piece_table'
export { parseAsyncIterable, parseAsyncIterableToSink, parseIterable, parseIterableToSink, UnboundedBuffer } from './stream/unbounded'
export type { UnboundedBufferOptions, UnboundedBufferStats, UnboundedChunkInfo, UnboundedTokenConsumer } from './stream/unbounded'
export { recommendFullChunkStrategy, recommendStreamChunkStrategy } from './support/chunk_recommend'

type QuotesOption = string | [string, string, string, string]

export interface MarkdownItOptions {
  html?: boolean
  xhtmlOut?: boolean
  breaks?: boolean
  langPrefix?: string
  linkify?: boolean
  typographer?: boolean
  quotes?: QuotesOption
  highlight?: ((str: string, lang?: string, attrs?: string) => string | Promise<string>) | null
  maxNesting?: number
  stream?: boolean
  // Stream optimization knobs
  streamOptimizationMinSize?: number // characters threshold to start stream append optimizations
  // Context-parse strategy options (controls when to attempt parsing with context)
  streamContextParseStrategy?: 'chars' | 'lines' | 'constructs'
  streamContextParseMinChars?: number
  streamContextParseMinLines?: number
  // Chunked fallback when stream falls back to full parse for very large docs
  streamChunkedFallback?: boolean
  streamChunkSizeChars?: number
  streamChunkSizeLines?: number
  streamChunkFenceAware?: boolean
  // Adaptive chunk sizing for stream chunked fallback (if true, sizes chosen by doc size)
  streamChunkAdaptive?: boolean
  streamChunkTargetChunks?: number
  streamChunkMaxChunks?: number
  // Skip caching for extremely large one-shot payloads (chars or lines)
  streamSkipCacheAboveChars?: number
  streamSkipCacheAboveLines?: number
  // Full (non-stream) parse: optional chunked mode
  fullChunkedFallback?: boolean
  fullChunkThresholdChars?: number
  fullChunkThresholdLines?: number
  fullChunkSizeChars?: number
  fullChunkSizeLines?: number
  fullChunkFenceAware?: boolean
  fullChunkMaxChunks?: number
  // Adaptive chunk sizing for full chunked fallback (if true, sizes chosen by doc size)
  fullChunkAdaptive?: boolean
  fullChunkTargetChunks?: number
  // Auto-tune best-practice chunk strategy by doc size when user did not provide explicit sizes
  autoTuneChunks?: boolean
  // For large plain-string inputs, transparently switch to the internal unbounded full parser
  autoUnbounded?: boolean
  autoUnboundedThresholdChars?: number
  autoUnboundedThresholdLines?: number
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
  block: ParserBlock
  inline: ParserInline
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
  renderAsync: (src: string, env?: Record<string, unknown>) => Promise<string>
  renderIterable: (chunks: Iterable<string>, env?: Record<string, unknown>) => string
  renderAsyncIterable: (chunks: AsyncIterable<string>, env?: Record<string, unknown>) => Promise<string>
  renderInline: (src: string, env?: Record<string, unknown>) => string
  validateLink: typeof validateLink
  normalizeLink: typeof normalizeLink
  normalizeLinkText: typeof normalizeLinkText
  utils: typeof utils
  helpers: typeof helpers
  parse: (src: string, env?: Record<string, unknown>) => TokenType[]
  parseIterable: (chunks: Iterable<string>, env?: Record<string, unknown>) => TokenType[]
  parseAsyncIterable: (chunks: AsyncIterable<string>, env?: Record<string, unknown>) => Promise<TokenType[]>
  parseIterableToSink: (chunks: Iterable<string>, onChunkTokens: (tokens: TokenType[], info: UnboundedChunkInfo) => void, env?: Record<string, unknown>) => UnboundedBufferStats
  parseAsyncIterableToSink: (chunks: AsyncIterable<string>, onChunkTokens: (tokens: TokenType[], info: UnboundedChunkInfo) => void, env?: Record<string, unknown>) => Promise<UnboundedBufferStats>
  parseInline: (src: string, env?: Record<string, unknown>) => TokenType[]
}

export type MarkdownItPluginFn = (md: MarkdownIt, ...params: unknown[]) => unknown
export interface MarkdownItPluginModule { default: MarkdownItPluginFn }
export type MarkdownItPlugin = MarkdownItPluginFn | MarkdownItPluginModule

function hasExplicitChunkOverride(
  presetOptions: MarkdownItOptions | undefined,
  userOptions: MarkdownItOptions | undefined,
  keys: ReadonlyArray<keyof MarkdownItOptions>,
): boolean {
  const hasOwn = (obj: MarkdownItOptions | undefined, key: keyof MarkdownItOptions) =>
    !!obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (hasOwn(userOptions, key) || hasOwn(presetOptions, key))
      return true
  }

  return false
}

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
    streamChunkAdaptive: true,
    streamChunkTargetChunks: 8,
    streamChunkMaxChunks: undefined,
    streamSkipCacheAboveChars: 600_000,
    streamSkipCacheAboveLines: 10_000,
    fullChunkedFallback: false,
    fullChunkThresholdChars: 20_000,
    fullChunkThresholdLines: 400,
    fullChunkSizeChars: 10_000,
    fullChunkSizeLines: 200,
    fullChunkFenceAware: true,
    fullChunkAdaptive: true,
    fullChunkTargetChunks: 8,
    fullChunkMaxChunks: undefined,
    autoTuneChunks: true,
    autoUnbounded: true,
    autoUnboundedThresholdChars: 4_000_000,
    autoUnboundedThresholdLines: 80_000,
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
    // Split string into array of characters and validate length
    const quotesStr = opts.quotes
    if (quotesStr.length >= 4) {
      opts.quotes = [
        quotesStr[0], // double open
        quotesStr[1], // double close
        quotesStr[2], // single open
        quotesStr[3], // single close
      ] as [string, string, string, string]
    }
    else {
      // Fallback to defaults if malformed
      opts.quotes = ['\u201C', '\u201D', '\u2018', '\u2019']
    }
  }

  let explicitFullChunkConfig = hasExplicitChunkOverride(preset?.options, userOptions, [
    'fullChunkSizeChars',
    'fullChunkSizeLines',
    'fullChunkMaxChunks',
  ])
  let explicitStreamChunkConfig = hasExplicitChunkOverride(preset?.options, userOptions, [
    'streamChunkSizeChars',
    'streamChunkSizeLines',
    'streamChunkMaxChunks',
  ])

  // construct minimal core instance; avoid importing renderer here
  const core = new ParserCore()

  let renderer: Renderer | null = null
  const getRenderer = () => {
    if (!renderer)
      renderer = new Renderer(opts)
    return renderer
  }

  let streamParser: StreamParser | null = null
  const getStreamParser = () => {
    if (!streamParser)
      streamParser = new StreamParser(core)
    return streamParser
  }
  let linkifyInstance: ReturnType<typeof LinkifyIt> | null = null
  const getLinkify = () => {
    if (!linkifyInstance)
      linkifyInstance = new LinkifyIt()
    return linkifyInstance
  }

  const md: any = {
    // expose core parts for plugins and rules
    core,
    block: core.block,
    inline: core.inline,
    get linkify() {
      const inst = getLinkify()
      Object.defineProperty(this, 'linkify', { value: inst, writable: true, configurable: true })
      return inst
    },
    get renderer() {
      const r = getRenderer()
      Object.defineProperty(this, 'renderer', { value: r, writable: true, configurable: true })
      return r
    },

    // options & mutators
    options: opts,
    __explicitFullChunkConfig: explicitFullChunkConfig,
    __explicitStreamChunkConfig: explicitStreamChunkConfig,
    set(newOpts: MarkdownItOptions) {
      this.options = { ...this.options, ...newOpts }
      if (newOpts.fullChunkSizeChars !== undefined || newOpts.fullChunkSizeLines !== undefined || newOpts.fullChunkMaxChunks !== undefined) {
        explicitFullChunkConfig = true
        this.__explicitFullChunkConfig = true
      }
      if (newOpts.streamChunkSizeChars !== undefined || newOpts.streamChunkSizeLines !== undefined || newOpts.streamChunkMaxChunks !== undefined) {
        explicitStreamChunkConfig = true
        this.__explicitStreamChunkConfig = true
      }
      if (renderer)
        renderer.set(newOpts as RendererOptions)
      if (typeof newOpts.stream === 'boolean') {
        this.stream.enabled = newOpts.stream
        if (streamParser) {
          streamParser.reset()
          streamParser.resetStats()
        }
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
      return getRenderer().render(tokens, this.options, env)
    },
    async renderAsync(this: MarkdownIt, src: string, env: Record<string, unknown> = {}) {
      const tokens = this.parse(src, env)
      return getRenderer().renderAsync(tokens, this.options, env)
    },
    renderIterable(this: MarkdownIt, chunks: Iterable<string>, env: Record<string, unknown> = {}) {
      const tokens = this.parseIterable(chunks, env)
      return getRenderer().render(tokens, this.options, env)
    },
    async renderAsyncIterable(this: MarkdownIt, chunks: AsyncIterable<string>, env: Record<string, unknown> = {}) {
      const tokens = await this.parseAsyncIterable(chunks, env)
      return getRenderer().renderAsync(tokens, this.options, env)
    },
    renderInline(this: MarkdownIt, src: string, env: Record<string, unknown> = {}) {
      const tokens = this.parseInline(src, env)
      return getRenderer().render(tokens, this.options, env)
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

      // Fast path: stream disabled and chunked fallback disabled -> direct parse
      if (!this.stream.enabled && !this.options.fullChunkedFallback) {
        const autoUnboundedDecision = getAutoUnboundedDecision(this, src.length)
        if (autoUnboundedDecision === 'yes') {
          return parseStringUnbounded(this, src, env)
        }
        if (
          autoUnboundedDecision === 'need-lines'
          && shouldAutoUseUnbounded(this, src.length, utils.countLines(src))
        ) {
          return parseStringUnbounded(this, src, env)
        }
        const state = core.parse(src, env, this)
        return state.tokens
      }

      // Optional chunked path for full parse (non-stream)
      if (!this.stream.enabled) {
        const chars = src.length
        if (this.options.fullChunkedFallback) {
          const lines = utils.countLines(src)
          // Best-practice auto-tuning: choose strategy by size if user didn't force a strategy
          const auto = this.options.autoTuneChunks !== false
          const userForcedChunk = explicitFullChunkConfig
          const autoRecommendation = auto && !userForcedChunk
            ? recommendFullChunkStrategy(chars, lines, this.options)
            : null
          const useChunked = (chars >= (this.options.fullChunkThresholdChars ?? 20_000))
            || (lines >= (this.options.fullChunkThresholdLines ?? 400))
          if (useChunked) {
            if (autoRecommendation) {
              if (autoRecommendation.strategy === 'plain') {
                const state = core.parse(src, env, this)
                return state.tokens
              }
              const tokens = chunkedParse(this, src, env, {
                maxChunkChars: autoRecommendation.maxChunkChars,
                maxChunkLines: autoRecommendation.maxChunkLines,
                fenceAware: autoRecommendation.fenceAware,
                maxChunks: autoRecommendation.maxChunks,
              })
              return tokens
            }

            const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : (v > hi ? hi : v)
            const adaptive = this.options.fullChunkAdaptive !== false
            const target = this.options.fullChunkTargetChunks ?? 8
            const dynMaxChunkChars = clamp(Math.ceil(chars / target), 8000, 64_000)
            const dynMaxChunkLines = clamp(Math.ceil(lines / target), 150, 700)
            const maxChunkChars = adaptive ? dynMaxChunkChars : (this.options.fullChunkSizeChars ?? 10_000)
            const maxChunkLines = adaptive ? dynMaxChunkLines : (this.options.fullChunkSizeLines ?? 200)
            const maxChunks = adaptive
              ? clamp(Math.ceil(chars / 64_000), target, 32)
              : this.options.fullChunkMaxChunks

            return chunkedParse(this, src, env, {
              maxChunkChars,
              maxChunkLines,
              fenceAware: this.options.fullChunkFenceAware ?? true,
              maxChunks,
            })
          }
        }
      }
      const state = core.parse(src, env, this)
      return state.tokens
    },
    parseIterable(this: MarkdownIt, chunks: Iterable<string>, env: Record<string, unknown> = {}) {
      return parseIterableSource(this, chunks, env)
    },
    parseAsyncIterable(this: MarkdownIt, chunks: AsyncIterable<string>, env: Record<string, unknown> = {}) {
      return parseAsyncIterableSource(this, chunks, env)
    },
    parseIterableToSink(this: MarkdownIt, chunks: Iterable<string>, onChunkTokens: (tokens: TokenType[], info: UnboundedChunkInfo) => void, env: Record<string, unknown> = {}) {
      return parseIterableToSinkSource(this, chunks, onChunkTokens, env)
    },
    parseAsyncIterableToSink(this: MarkdownIt, chunks: AsyncIterable<string>, onChunkTokens: (tokens: TokenType[], info: UnboundedChunkInfo) => void, env: Record<string, unknown> = {}) {
      return parseAsyncIterableToSinkSource(this, chunks, onChunkTokens, env)
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
      if (!md.stream.enabled)
        return md.parse(src, env ?? {})
      return getStreamParser().parse(src, env, md)
    },
    reset() {
      getStreamParser().reset()
    },
    peek() {
      return streamParser ? streamParser.peek() : []
    },
    stats() {
      return streamParser ? streamParser.getStats() : { total: 0, cacheHits: 0, appendHits: 0, tailHits: 0, fullParses: 0, resets: 0, chunkedParses: 0, lastMode: 'idle' }
    },
    resetStats() {
      if (streamParser)
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
