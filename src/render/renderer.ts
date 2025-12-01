import type { Token } from '../common/token'
import { escapeHtml, unescapeAll } from './utils'

export interface RendererOptions {
  langPrefix?: string
  highlight?: ((str: string, lang: string, attrs: string) => string | Promise<string>) | null
  xhtmlOut?: boolean
  breaks?: boolean
}

export type RendererEnv = Record<string, unknown>

export type RendererRuleResult = string | Promise<string>
export type RendererRule = (tokens: Token[], idx: number, options: RendererOptions, env: RendererEnv, self: Renderer) => RendererRuleResult

function isPromiseLike(value: unknown): value is Promise<string> {
  return !!value && (typeof value === 'object' || typeof value === 'function') && typeof (value as any).then === 'function'
}

function ensureSyncResult(value: RendererRuleResult, ruleName: string): string {
  if (isPromiseLike(value))
    throw new TypeError(`Renderer rule "${ruleName}" returned a Promise. Use renderAsync() instead.`)
  return value
}

const resolveResult = (value: RendererRuleResult): Promise<string> => (isPromiseLike(value) ? value : Promise.resolve(value))

function renderFence(token: Token, highlighted: string, info: string, langName: string, options: RendererOptions, self: Renderer): string {
  if (highlighted.startsWith('<pre'))
    return `${highlighted}\n`

  if (info) {
    const classIndex = typeof token.attrIndex === 'function' ? token.attrIndex('class') : -1
    const tmpAttrs = token.attrs ? token.attrs.map(attr => attr.slice() as [string, string]) : []

    const langClass = `${options.langPrefix || 'language-'}${langName}`

    if (classIndex < 0)
      tmpAttrs.push(['class', langClass])
    else
      tmpAttrs[classIndex][1] += ` ${langClass}`

    const tmpToken = { ...token, attrs: tmpAttrs } as Token
    return `<pre><code${self.renderAttrs(tmpToken)}>${highlighted}</code></pre>\n`
  }

  return `<pre><code${self.renderAttrs(token)}>${highlighted}</code></pre>\n`
}

const DEFAULT_RENDERER_OPTIONS: Required<Pick<RendererOptions, 'langPrefix' | 'xhtmlOut' | 'breaks'>> = {
  langPrefix: 'language-',
  xhtmlOut: false,
  breaks: false,
}

const hasOwn = Object.prototype.hasOwnProperty

const defaultRules: Record<string, RendererRule> = {
  code_inline(tokens, idx, _options, _env, self) {
    const token = tokens[idx]
    return `<code${self.renderAttrs(token)}>${escapeHtml(token.content)}</code>`
  },
  code_block(tokens, idx, _options, _env, self) {
    const token = tokens[idx]
    return `<pre${self.renderAttrs(token)}><code>${escapeHtml(token.content)}</code></pre>\n`
  },
  fence(tokens, idx, options, _env, self) {
    const token = tokens[idx]
    const info = token.info ? unescapeAll(token.info).trim() : ''
    let langName = ''
    let langAttrs = ''

    if (info) {
      const parts = info.split(/(\s+)/g)
      langName = parts[0]
      langAttrs = parts.slice(2).join('')
    }

    const highlight = options.highlight
    const fallback = () => escapeHtml(token.content)

    if (!highlight)
      return renderFence(token, fallback(), info, langName, options, self)

    const highlighted = highlight(token.content, langName, langAttrs)

    if (isPromiseLike(highlighted)) {
      return highlighted.then(res => renderFence(token, res || fallback(), info, langName, options, self))
    }

    const resolved = highlighted || fallback()
    return renderFence(token, resolved, info, langName, options, self)
  },
  image(tokens, idx, options, env, self) {
    const token = tokens[idx]
    const altText = self.renderInlineAsText(token.children || [], options, env)
    if (typeof token.attrIndex === 'function') {
      const altIndex = token.attrIndex('alt')
      if (altIndex >= 0 && token.attrs)
        token.attrs[altIndex][1] = altText
      else if (token.attrs)
        token.attrs.push(['alt', altText])
      else
        token.attrs = [['alt', altText]]
    }
    return self.renderToken(tokens, idx, options)
  },
  hardbreak(_tokens, _idx, options) {
    return options.xhtmlOut ? '<br />\n' : '<br>\n'
  },
  softbreak(_tokens, _idx, options) {
    return options.breaks ? (options.xhtmlOut ? '<br />\n' : '<br>\n') : '\n'
  },
  text(tokens, idx) {
    return escapeHtml(tokens[idx].content)
  },
  text_special(tokens, idx) {
    return escapeHtml(tokens[idx].content)
  },
  html_block(tokens, idx) {
    return tokens[idx].content
  },
  html_inline(tokens, idx) {
    return tokens[idx].content
  },
}

export class Renderer {
  public readonly rules: Record<string, RendererRule>
  private baseOptions: RendererOptions
  private normalizedBase: RendererOptions

  constructor(options: RendererOptions = {}) {
    this.baseOptions = { ...options }
    this.normalizedBase = this.buildNormalizedBase()
    this.rules = { ...defaultRules }
  }

  public set(options: RendererOptions) {
    this.baseOptions = { ...this.baseOptions, ...options }
    this.normalizedBase = this.buildNormalizedBase()
    return this
  }

  public render(tokens: Token[], options?: RendererOptions, env?: RendererEnv): string {
    if (!Array.isArray(tokens))
      throw new TypeError('render expects token array as first argument')

    const merged = this.mergeOptions(options)
    const envRef = env ?? {}
    let output = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type === 'inline') {
        output += this.renderInlineTokens(token.children || [], merged, envRef)
        continue
      }

      const rule = this.rules[token.type]
      if (rule)
        output += ensureSyncResult(rule(tokens, i, merged, envRef, this), token.type)
      else
        output += this.renderToken(tokens, i, merged)
    }

    return output
  }

  public async renderAsync(tokens: Token[], options?: RendererOptions, env?: RendererEnv): Promise<string> {
    if (!Array.isArray(tokens))
      throw new TypeError('render expects token array as first argument')

    const merged = this.mergeOptions(options)
    const envRef = env ?? {}
    let output = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type === 'inline') {
        output += await this.renderInlineTokensAsync(token.children || [], merged, envRef)
        continue
      }

      const rule = this.rules[token.type]
      if (rule)
        output += await resolveResult(rule(tokens, i, merged, envRef, this))
      else
        output += this.renderToken(tokens, i, merged)
    }

    return output
  }

  public renderInline(tokens: Token[], options?: RendererOptions, env?: RendererEnv): string {
    const merged = this.mergeOptions(options)
    const envRef = env ?? {}
    return this.renderInlineTokens(tokens, merged, envRef)
  }

  public async renderInlineAsync(tokens: Token[], options?: RendererOptions, env?: RendererEnv): Promise<string> {
    const merged = this.mergeOptions(options)
    const envRef = env ?? {}
    return this.renderInlineTokensAsync(tokens, merged, envRef)
  }

  public renderInlineAsText(tokens: Token[], options?: RendererOptions, env?: RendererEnv): string {
    const merged = this.mergeOptions(options)
    const envRef = env ?? {}
    return this.renderInlineAsTextInternal(tokens, merged, envRef)
  }

  public renderAttrs(token: Token): string {
    if (!token.attrs || token.attrs.length === 0)
      return ''

    let result = ''
    for (let i = 0; i < token.attrs.length; i++) {
      const attr = token.attrs[i]
      result += ` ${escapeHtml(attr[0])}="${escapeHtml(attr[1])}"`
    }
    return result
  }

  public renderToken(tokens: Token[], idx: number, options: RendererOptions): string {
    const token = tokens[idx]

    if (token.hidden)
      return ''

    let result = ''

    if (token.block && token.nesting !== -1 && idx > 0 && tokens[idx - 1].hidden)
      result += '\n'

    result += token.nesting === -1 ? `</${token.tag}` : `<${token.tag}`
    result += this.renderAttrs(token)

    if (token.nesting === 0 && options.xhtmlOut)
      result += ' /'

    let needLineFeed = false
    if (token.block) {
      needLineFeed = true

      if (token.nesting === 1 && idx + 1 < tokens.length) {
        const nextToken = tokens[idx + 1]
        if (nextToken.type === 'inline' || nextToken.hidden)
          needLineFeed = false
        else if (nextToken.nesting === -1 && nextToken.tag === token.tag)
          needLineFeed = false
      }
    }

    result += needLineFeed ? '>\n' : '>'

    return result
  }

  private mergeOptions(overrides?: RendererOptions): RendererOptions {
    const base = this.normalizedBase
    if (!overrides)
      return base

    let merged: RendererOptions | null = null
    const ensureMerged = () => {
      if (!merged)
        merged = { ...base }
      return merged
    }

    if (hasOwn.call(overrides, 'highlight') && overrides.highlight !== base.highlight)
      ensureMerged().highlight = overrides.highlight

    if (hasOwn.call(overrides, 'langPrefix')) {
      const value = overrides.langPrefix
      if (value !== base.langPrefix)
        ensureMerged().langPrefix = value
    }

    if (hasOwn.call(overrides, 'xhtmlOut')) {
      const value = overrides.xhtmlOut
      if (value !== base.xhtmlOut)
        ensureMerged().xhtmlOut = value
    }

    if (hasOwn.call(overrides, 'breaks')) {
      const value = overrides.breaks
      if (value !== base.breaks)
        ensureMerged().breaks = value
    }

    return merged || base
  }

  private buildNormalizedBase(): RendererOptions {
    return Object.freeze({ ...DEFAULT_RENDERER_OPTIONS, ...this.baseOptions }) as RendererOptions
  }

  private renderInlineTokens(tokens: Token[], options: RendererOptions, env: RendererEnv): string {
    if (!tokens || tokens.length === 0)
      return ''

    let output = ''
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const rule = this.rules[token.type]
      if (rule)
        output += ensureSyncResult(rule(tokens, i, options, env, this), token.type)
      else
        output += this.renderToken(tokens, i, options)
    }
    return output
  }

  private async renderInlineTokensAsync(tokens: Token[], options: RendererOptions, env: RendererEnv): Promise<string> {
    if (!tokens || tokens.length === 0)
      return ''

    let output = ''
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const rule = this.rules[token.type]
      if (rule)
        output += await resolveResult(rule(tokens, i, options, env, this))
      else
        output += this.renderToken(tokens, i, options)
    }
    return output
  }

  private renderInlineAsTextInternal(tokens: Token[], options: RendererOptions, env: RendererEnv): string {
    if (!tokens || tokens.length === 0)
      return ''

    let output = ''
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      switch (token.type) {
        case 'text':
        case 'text_special':
          output += token.content
          break
        case 'image':
          output += this.renderInlineAsTextInternal(token.children || [], options, env)
          break
        case 'html_inline':
        case 'html_block':
          output += token.content
          break
        case 'softbreak':
        case 'hardbreak':
          output += '\n'
          break
        default:
          break
      }
    }
    return output
  }
}

export default Renderer
