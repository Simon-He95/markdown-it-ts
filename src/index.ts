import type { Token as TokenType } from './common/token'
import type { ParserBlock } from './parse/parser_block'
import type { ParserInline } from './parse/parser_inline'
import type { RendererOptions } from './render/renderer'
import type { StreamStats } from './stream/parser'
import type { UnboundedBufferStats, UnboundedChunkInfo } from './stream/unbounded'
import LinkifyIt from 'linkify-it'
import * as utils from './common/utils'
import * as helpers from './helpers'
import { detectGlobalMarkdownState, getKnownGlobalMarkdownState, resetKnownGlobalMarkdownState, runWithKnownGlobalMarkdownState } from './parse/global_state'
import { normalizeLink, normalizeLinkText, validateLink } from './parse/link_utils'
import { ParserCore } from './parse/parser_core'
import { beginParseDiagnostics, getParseDiagnostics, setStrategyDiagnostics } from './parse/strategy_diagnostics'
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

type QuotesOption = string | [string, string, string, string]

export interface MarkdownItExperimentalOptions {
  stream?: boolean
  streamOptimizationMinSize?: number
  streamContextParseStrategy?: 'chars' | 'lines' | 'constructs'
  streamContextParseMinChars?: number
  streamContextParseMinLines?: number
  streamChunkedFallback?: boolean
  streamChunkSizeChars?: number
  streamChunkSizeLines?: number
  streamChunkFenceAware?: boolean
  streamChunkAdaptive?: boolean
  streamChunkTargetChunks?: number
  streamChunkMaxChunks?: number
  streamSkipCacheAboveChars?: number
  streamSkipCacheAboveLines?: number
  fullChunkedFallback?: boolean
  fullChunkThresholdChars?: number
  fullChunkThresholdLines?: number
  fullChunkSizeChars?: number
  fullChunkSizeLines?: number
  fullChunkFenceAware?: boolean
  fullChunkMaxChunks?: number
  fullChunkAdaptive?: boolean
  fullChunkTargetChunks?: number
  autoTuneChunks?: boolean
  autoUnbounded?: boolean
  autoUnboundedThresholdChars?: number
  autoUnboundedThresholdLines?: number
}

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
  /** @experimental Not part of the markdown-it stable compatibility surface. */
  experimental?: MarkdownItExperimentalOptions
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.stream instead. */
  stream?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamOptimizationMinSize instead. */
  streamOptimizationMinSize?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamContextParseStrategy instead. */
  streamContextParseStrategy?: 'chars' | 'lines' | 'constructs'
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamContextParseMinChars instead. */
  streamContextParseMinChars?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamContextParseMinLines instead. */
  streamContextParseMinLines?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamChunkedFallback instead. */
  streamChunkedFallback?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamChunkSizeChars instead. */
  streamChunkSizeChars?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamChunkSizeLines instead. */
  streamChunkSizeLines?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamChunkFenceAware instead. */
  streamChunkFenceAware?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamChunkAdaptive instead. */
  streamChunkAdaptive?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamChunkTargetChunks instead. */
  streamChunkTargetChunks?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamChunkMaxChunks instead. */
  streamChunkMaxChunks?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamSkipCacheAboveChars instead. */
  streamSkipCacheAboveChars?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.streamSkipCacheAboveLines instead. */
  streamSkipCacheAboveLines?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkedFallback instead. */
  fullChunkedFallback?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkThresholdChars instead. */
  fullChunkThresholdChars?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkThresholdLines instead. */
  fullChunkThresholdLines?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkSizeChars instead. */
  fullChunkSizeChars?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkSizeLines instead. */
  fullChunkSizeLines?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkFenceAware instead. */
  fullChunkFenceAware?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkMaxChunks instead. */
  fullChunkMaxChunks?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkAdaptive instead. */
  fullChunkAdaptive?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.fullChunkTargetChunks instead. */
  fullChunkTargetChunks?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.autoTuneChunks instead. */
  autoTuneChunks?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.autoUnbounded instead. */
  autoUnbounded?: boolean
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.autoUnboundedThresholdChars instead. */
  autoUnboundedThresholdChars?: number
  /** @experimental Not part of the markdown-it stable compatibility surface. @deprecated Use experimental.autoUnboundedThresholdLines instead. */
  autoUnboundedThresholdLines?: number
}

interface PresetComponentRules {
  rules?: string[]
}

interface PresetComponents {
  core?: PresetComponentRules
  block?: PresetComponentRules
  inline?: PresetComponentRules
  inline2?: PresetComponentRules
}

interface Preset { options?: MarkdownItOptions, components?: PresetComponents }

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
  linkify: InstanceType<typeof LinkifyIt>
  renderer: Renderer
  options: MarkdownItOptions
  /**
   * @experimental Append-heavy stream parser controls. Not part of the
   * markdown-it stable compatibility surface.
   */
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
  /**
   * Render iterable chunk sources.
   *
   * @experimental Same correctness boundary as parseIterable().
   */
  renderIterable: (chunks: Iterable<string>, env?: Record<string, unknown>) => string
  /**
   * Render async iterable chunk sources.
   *
   * @experimental Same correctness boundary as parseAsyncIterable().
   */
  renderAsyncIterable: (chunks: AsyncIterable<string>, env?: Record<string, unknown>) => Promise<string>
  renderInline: (src: string, env?: Record<string, unknown>) => string
  validateLink: typeof validateLink
  normalizeLink: typeof normalizeLink
  normalizeLinkText: typeof normalizeLinkText
  utils: typeof utils
  helpers: typeof helpers
  parse: (src: string, env?: Record<string, unknown>) => TokenType[]
  /**
   * Parse an iterable chunk source without first joining all chunks.
   *
   * @experimental This is for explicit chunk-stream inputs. It may flush earlier
   * chunks before later document-level definitions are observed.
   */
  parseIterable: (chunks: Iterable<string>, env?: Record<string, unknown>) => TokenType[]
  /**
   * Parse an async iterable chunk source without first joining all chunks.
   *
   * @experimental This is for explicit chunk-stream inputs. It may flush earlier
   * chunks before later document-level definitions are observed.
   */
  parseAsyncIterable: (chunks: AsyncIterable<string>, env?: Record<string, unknown>) => Promise<TokenType[]>
  /**
   * Parse iterable chunks and deliver token chunks to a sink.
   *
   * @experimental Sink output is streaming-oriented and can differ from a final
   * full parse when future document-level definitions affect earlier text.
   */
  parseIterableToSink: (chunks: Iterable<string>, onChunkTokens: (tokens: TokenType[], info: UnboundedChunkInfo) => void, env?: Record<string, unknown>) => UnboundedBufferStats
  /**
   * Parse async iterable chunks and deliver token chunks to a sink.
   *
   * @experimental Sink output is streaming-oriented and can differ from a final
   * full parse when future document-level definitions affect earlier text.
   */
  parseAsyncIterableToSink: (chunks: AsyncIterable<string>, onChunkTokens: (tokens: TokenType[], info: UnboundedChunkInfo) => void, env?: Record<string, unknown>) => Promise<UnboundedBufferStats>
  parseInline: (src: string, env?: Record<string, unknown>) => TokenType[]
}

export type MarkdownItPluginFn = (md: MarkdownIt, ...params: unknown[]) => unknown
export interface MarkdownItPluginModule { default: MarkdownItPluginFn }
export type MarkdownItPlugin = MarkdownItPluginFn | MarkdownItPluginModule

interface ParserRuleVersions {
  core: number
  block: number
  inline: number
  inline2: number
}

function getParserRuleVersions(md: MarkdownIt): ParserRuleVersions {
  return {
    core: md.core.ruler.version,
    block: md.block.ruler.version,
    inline: md.inline.ruler.version,
    inline2: md.inline.ruler2.version,
  }
}

function hasParserRuleChanges(md: MarkdownIt, initial: ParserRuleVersions): boolean {
  return md.core.ruler.version !== initial.core
    || md.block.ruler.version !== initial.block
    || md.inline.ruler.version !== initial.inline
    || md.inline.ruler2.version !== initial.inline2
}

function applyExperimentalOptions(options: MarkdownItOptions): MarkdownItOptions {
  return options.experimental
    ? { ...options, ...options.experimental }
    : options
}

function hasOwnOption(
  obj: MarkdownItOptions | undefined,
  key: keyof MarkdownItOptions,
): boolean {
  if (!obj)
    return false

  if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined)
    return true

  const experimental = obj.experimental as Record<string, unknown> | undefined
  return !!experimental
    && Object.prototype.hasOwnProperty.call(experimental, key)
    && experimental[key as string] !== undefined
}

function hasExplicitChunkOverride(
  presetOptions: MarkdownItOptions | undefined,
  userOptions: MarkdownItOptions | undefined,
  keys: ReadonlyArray<keyof MarkdownItOptions>,
): boolean {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (hasOwnOption(userOptions, key) || hasOwnOption(presetOptions, key))
      return true
  }

  return false
}

function hasExplicitOption(
  presetOptions: MarkdownItOptions | undefined,
  userOptions: MarkdownItOptions | undefined,
  key: keyof MarkdownItOptions,
): boolean {
  return hasOwnOption(userOptions, key) || hasOwnOption(presetOptions, key)
}

function setFullChunkStrategyDiagnostics(env: Record<string, unknown>, reason: string): void {
  const chunkInfo = getParseDiagnostics(env)?.chunk

  if (chunkInfo?.fallback) {
    setStrategyDiagnostics(env, {
      area: 'parse',
      path: 'plain',
      reason: `global-state:${chunkInfo.fallbackReason || 'unknown'}`,
    })
    return
  }

  setStrategyDiagnostics(env, {
    area: 'parse',
    path: 'full-chunk',
    chunked: true,
    reason,
  })
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
    streamSkipCacheAboveChars: 1_000_000,
    streamSkipCacheAboveLines: 100_000,
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
  opts = applyExperimentalOptions(opts)

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
  let explicitFullChunkFallbackSetting = hasExplicitOption(preset?.options, userOptions, 'fullChunkedFallback')
  let explicitStreamChunkFallbackSetting = hasExplicitOption(preset?.options, userOptions, 'streamChunkedFallback')
  let usedPlugin = false
  let initialParserRuleVersions: ParserRuleVersions | null = null

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
  let linkifyInstance: InstanceType<typeof LinkifyIt> | null = null
  const getLinkify = () => {
    if (!linkifyInstance)
      linkifyInstance = new LinkifyIt()
    return linkifyInstance
  }
  const canUseImplicitLargeInputStrategy = (instance: MarkdownIt) => {
    return !usedPlugin
      && !!initialParserRuleVersions
      && !hasParserRuleChanges(instance, initialParserRuleVersions)
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
    __explicitFullChunkFallbackSetting: explicitFullChunkFallbackSetting,
    __explicitStreamChunkFallbackSetting: explicitStreamChunkFallbackSetting,
    __canUseImplicitLargeInputStrategy() {
      return canUseImplicitLargeInputStrategy(this)
    },
    set(newOpts: MarkdownItOptions) {
      const resolvedNewOpts = applyExperimentalOptions(newOpts)
      this.options = { ...this.options, ...resolvedNewOpts }
      if (hasOwnOption(newOpts, 'fullChunkSizeChars') || hasOwnOption(newOpts, 'fullChunkSizeLines') || hasOwnOption(newOpts, 'fullChunkMaxChunks')) {
        explicitFullChunkConfig = true
        this.__explicitFullChunkConfig = true
      }
      if (hasOwnOption(newOpts, 'streamChunkSizeChars') || hasOwnOption(newOpts, 'streamChunkSizeLines') || hasOwnOption(newOpts, 'streamChunkMaxChunks')) {
        explicitStreamChunkConfig = true
        this.__explicitStreamChunkConfig = true
      }
      if (hasOwnOption(newOpts, 'fullChunkedFallback')) {
        explicitFullChunkFallbackSetting = true
        this.__explicitFullChunkFallbackSetting = true
      }
      if (hasOwnOption(newOpts, 'streamChunkedFallback')) {
        explicitStreamChunkFallbackSetting = true
        this.__explicitStreamChunkFallbackSetting = true
      }
      if (renderer)
        renderer.set(resolvedNewOpts as RendererOptions)
      if (typeof resolvedNewOpts.stream === 'boolean') {
        this.stream.enabled = resolvedNewOpts.stream
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
      const found = new Set<string>()

      for (const m of managers) {
        if (!m)
          continue

        const enabled = m.enable(names, true)
        for (let i = 0; i < enabled.length; i++)
          found.add(enabled[i])
      }

      if (!ignoreInvalid) {
        const missed = names.filter(name => !found.has(name))
        if (missed.length)
          throw new Error(`Rules manager: invalid rule name ${missed.join(', ')}`)
      }

      return this
    },
    disable(list: string | string[], ignoreInvalid?: boolean) {
      const names = Array.isArray(list) ? list : [list]
      const managers = [this.core?.ruler, this.block?.ruler, this.inline?.ruler, this.inline?.ruler2]
      const found = new Set<string>()

      for (const m of managers) {
        if (!m)
          continue

        const disabled = m.disable(names, true)
        for (let i = 0; i < disabled.length; i++)
          found.add(disabled[i])
      }

      if (!ignoreInvalid) {
        const missed = names.filter(name => !found.has(name))
        if (missed.length)
          throw new Error(`Rules manager: invalid rule name ${missed.join(', ')}`)
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
      usedPlugin = true
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

      beginParseDiagnostics(env)

      let countedLines: number | undefined

      // Fast path: stream disabled and chunked fallback disabled -> direct parse,
      // unless the default auto large-input strategy selects an internal path.
      if (!this.stream.enabled && !this.options.fullChunkedFallback) {
        if (canUseImplicitLargeInputStrategy(this)) {
          const autoUnboundedDecision = getAutoUnboundedDecision(this, src.length)
          if (autoUnboundedDecision === 'yes') {
            const tokens = parseStringUnbounded(this, src, env)
            setStrategyDiagnostics(env, { area: 'parse', path: 'auto-unbounded', unbounded: true, reason: 'char-threshold' })
            return tokens
          }
          if (
            autoUnboundedDecision === 'need-lines'
          ) {
            countedLines = utils.countLines(src)
          }
        }
      }

      // Optional chunked path for full parse (non-stream)
      if (!this.stream.enabled) {
        const chars = src.length
        const lines = countedLines ?? utils.countLines(src)
        const auto = this.options.autoTuneChunks !== false
        const userForcedChunk = explicitFullChunkConfig
        const allowImplicitChunk = !explicitFullChunkFallbackSetting
          && canUseImplicitLargeInputStrategy(this)
        const wantsChunking = !!this.options.fullChunkedFallback
        const shouldAutoChunk = allowImplicitChunk
          && chars >= 200_000
        const autoRecommendation = auto && !userForcedChunk
          ? recommendFullChunkStrategy(chars, lines, this.options)
          : null

        if (wantsChunking || shouldAutoChunk) {
          const useChunked = wantsChunking
            ? (
                chars >= (this.options.fullChunkThresholdChars ?? 20_000)
                || lines >= (this.options.fullChunkThresholdLines ?? 400)
              )
            : shouldAutoChunk

          if (useChunked) {
            if (autoRecommendation && autoRecommendation.strategy !== 'plain') {
              const tokens = chunkedParse(this, src, env, {
                maxChunkChars: autoRecommendation.maxChunkChars,
                maxChunkLines: autoRecommendation.maxChunkLines,
                fenceAware: autoRecommendation.fenceAware,
                maxChunks: autoRecommendation.maxChunks,
              })
              setFullChunkStrategyDiagnostics(env, wantsChunking ? 'explicit-full-chunk' : 'default-large-string')
              return tokens
            }

            if (wantsChunking) {
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

              const tokens = chunkedParse(this, src, env, {
                maxChunkChars,
                maxChunkLines,
                fenceAware: this.options.fullChunkFenceAware ?? true,
                maxChunks,
              })
              setFullChunkStrategyDiagnostics(env, 'explicit-full-chunk')
              return tokens
            }
          }
        }

        if (countedLines !== undefined && canUseImplicitLargeInputStrategy(this) && shouldAutoUseUnbounded(this, chars, lines)) {
          const tokens = parseStringUnbounded(this, src, env)
          setStrategyDiagnostics(env, { area: 'parse', path: 'auto-unbounded', unbounded: true, reason: 'line-threshold' })
          return tokens
        }
      }
      const currentGlobalStateReason = detectGlobalMarkdownState(src)
      setStrategyDiagnostics(env, { area: 'parse', path: 'plain', reason: 'default-plain' })
      return runWithKnownGlobalMarkdownState(env, currentGlobalStateReason, () => {
        return core.parse(src, env, this).tokens
      })
    },
    parseIterable(this: MarkdownIt, chunks: Iterable<string>, env: Record<string, unknown> = {}) {
      beginParseDiagnostics(env)
      return parseIterableSource(this, chunks, env)
    },
    parseAsyncIterable(this: MarkdownIt, chunks: AsyncIterable<string>, env: Record<string, unknown> = {}) {
      beginParseDiagnostics(env)
      return parseAsyncIterableSource(this, chunks, env)
    },
    parseIterableToSink(this: MarkdownIt, chunks: Iterable<string>, onChunkTokens: (tokens: TokenType[], info: UnboundedChunkInfo) => void, env: Record<string, unknown> = {}) {
      beginParseDiagnostics(env)
      return parseIterableToSinkSource(this, chunks, onChunkTokens, env)
    },
    parseAsyncIterableToSink(this: MarkdownIt, chunks: AsyncIterable<string>, onChunkTokens: (tokens: TokenType[], info: UnboundedChunkInfo) => void, env: Record<string, unknown> = {}) {
      beginParseDiagnostics(env)
      return parseAsyncIterableToSinkSource(this, chunks, onChunkTokens, env)
    },
    parseInline(src: string, env: Record<string, unknown> = {}) {
      if (typeof src !== 'string')
        throw new TypeError('Input data should be a String')
      beginParseDiagnostics(env)
      if (getKnownGlobalMarkdownState(env))
        resetKnownGlobalMarkdownState(env)
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
      return streamParser
        ? streamParser.getStats()
        : { total: 0, cacheHits: 0, appendHits: 0, unboundedAppendHits: 0, tailHits: 0, fullParses: 0, resets: 0, chunkedParses: 0, lastMode: 'idle' }
    },
    resetStats() {
      if (streamParser)
        streamParser.resetStats()
    },
  }

  // Apply preset components after md is constructed (so rulers are ready)
  if (preset?.components) {
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

  initialParserRuleVersions = getParserRuleVersions(md)

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
