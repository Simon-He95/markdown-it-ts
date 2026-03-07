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

function parseFenceInfo(info: string): { langName: string, langAttrs: string } {
  if (!info)
    return { langName: '', langAttrs: '' }

  let markerEnd = 0
  while (markerEnd < info.length) {
    const ch = info.charCodeAt(markerEnd)
    if (ch === 0x20 || ch === 0x09 || ch === 0x0A)
      break
    markerEnd++
  }

  if (markerEnd >= info.length)
    return { langName: info, langAttrs: '' }

  let attrsStart = markerEnd
  while (attrsStart < info.length) {
    const ch = info.charCodeAt(attrsStart)
    if (ch !== 0x20 && ch !== 0x09 && ch !== 0x0A)
      break
    attrsStart++
  }

  return {
    langName: info.slice(0, markerEnd),
    langAttrs: attrsStart < info.length ? info.slice(attrsStart) : '',
  }
}

function renderFence(token: Token, highlighted: string, info: string, langName: string, options: RendererOptions, self: Renderer): string {
  if (highlighted.startsWith('<pre'))
    return `${highlighted}\n`

  if (info) {
    const classIndex = token.attrIndex('class')
    const tmpAttrs = token.attrs ? token.attrs.slice() : []

    const langClass = `${options.langPrefix || 'language-'}${langName}`

    if (classIndex < 0)
      tmpAttrs.push(['class', langClass])
    else
      tmpAttrs[classIndex] = tmpAttrs[classIndex].slice() as [string, string]

    if (classIndex >= 0)
      tmpAttrs[classIndex][1] += ` ${langClass}`

    const tmpToken = { ...token, attrs: tmpAttrs } as Token
    const renderedAttrs = tmpAttrs.length > 0 ? self.renderAttrs(tmpToken) : ''
    return `<pre><code${renderedAttrs}>${highlighted}</code></pre>\n`
  }

  const renderedAttrs = token.attrs && token.attrs.length > 0 ? self.renderAttrs(token) : ''
  return `<pre><code${renderedAttrs}>${highlighted}</code></pre>\n`
}

function renderCodeInlineToken(token: Token, self: Renderer): string {
  const renderedAttrs = token.attrs && token.attrs.length > 0 ? self.renderAttrs(token) : ''
  return `<code${renderedAttrs}>${escapeHtml(token.content)}</code>`
}

function renderCodeBlockToken(token: Token, self: Renderer): string {
  const renderedAttrs = token.attrs && token.attrs.length > 0 ? self.renderAttrs(token) : ''
  return `<pre${renderedAttrs}><code>${escapeHtml(token.content)}</code></pre>\n`
}

function renderFenceSyncToken(token: Token, options: RendererOptions, self: Renderer): string {
  const info = token.info ? unescapeAll(token.info).trim() : ''
  const { langName, langAttrs } = parseFenceInfo(info)
  const highlight = options.highlight
  const fallback = escapeHtml(token.content)

  if (!highlight)
    return renderFence(token, fallback, info, langName, options, self)

  const highlighted = highlight(token.content, langName, langAttrs)
  if (isPromiseLike(highlighted))
    throw new TypeError('Renderer rule "fence" returned a Promise. Use renderAsync() instead.')

  return renderFence(token, highlighted || fallback, info, langName, options, self)
}

const DEFAULT_RENDERER_OPTIONS: Required<Pick<RendererOptions, 'langPrefix' | 'xhtmlOut' | 'breaks'>> = {
  langPrefix: 'language-',
  xhtmlOut: false,
  breaks: false,
}

const hasOwn = Object.prototype.hasOwnProperty

const defaultRules: Record<string, RendererRule> = {
  code_inline(tokens, idx, _options, _env, self) {
    return renderCodeInlineToken(tokens[idx], self)
  },
  code_block(tokens, idx, _options, _env, self) {
    return renderCodeBlockToken(tokens[idx], self)
  },
  fence(tokens, idx, options, _env, self) {
    const token = tokens[idx]
    const info = token.info ? unescapeAll(token.info).trim() : ''
    const { langName, langAttrs } = parseFenceInfo(info)
    const highlight = options.highlight
    const fallback = escapeHtml(token.content)

    if (!highlight)
      return renderFence(token, fallback, info, langName, options, self)

    const highlighted = highlight(token.content, langName, langAttrs)

    if (isPromiseLike(highlighted)) {
      return highlighted.then(res => renderFence(token, res || fallback, info, langName, options, self))
    }

    return renderFence(token, highlighted || fallback, info, langName, options, self)
  },
  image(tokens, idx, options, env, self) {
    const token = tokens[idx]
    const altText = self.renderInlineAsText(token.children || [], options, env)
    const altIndex = token.attrIndex('alt')
    if (altIndex >= 0 && token.attrs)
      token.attrs[altIndex][1] = altText
    else if (token.attrs)
      token.attrs.push(['alt', altText])
    else
      token.attrs = [['alt', altText]]
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
    const rules = this.rules
    const codeBlockRule = rules.code_block
    const fenceRule = rules.fence
    const htmlBlockRule = rules.html_block
    let result = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type === 'inline') {
        result += this.renderInlineTokens(token.children || [], merged, envRef)
        continue
      }

      switch (token.type) {
        case 'code_block':
          if (codeBlockRule === defaultRules.code_block) {
            result += renderCodeBlockToken(token, this)
            continue
          }
          break
        case 'fence':
          if (fenceRule === defaultRules.fence) {
            result += renderFenceSyncToken(token, merged, this)
            continue
          }
          break
        case 'html_block':
          if (htmlBlockRule === defaultRules.html_block) {
            result += token.content
            continue
          }
          break
        default:
          break
      }

      const rule = rules[token.type]
      if (!rule) {
        result += this.renderToken(tokens, i, merged)
        continue
      }

      const rendered = rule(tokens, i, merged, envRef, this)
      if (typeof rendered === 'string')
        result += rendered
      else
        result += ensureSyncResult(rendered, token.type)
    }

    return result
  }

  public async renderAsync(tokens: Token[], options?: RendererOptions, env?: RendererEnv): Promise<string> {
    if (!Array.isArray(tokens))
      throw new TypeError('render expects token array as first argument')

    const merged = this.mergeOptions(options)
    const envRef = env ?? {}
    const rules = this.rules
    let result = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type === 'inline') {
        result += await this.renderInlineTokensAsync(token.children || [], merged, envRef)
        continue
      }

      const rule = rules[token.type]
      if (rule)
        result += await resolveResult(rule(tokens, i, merged, envRef, this))
      else
        result += this.renderToken(tokens, i, merged)
    }

    return result
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
    if (token.attrs && token.attrs.length > 0)
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

    const rules = this.rules
    const textRule = rules.text
    const textSpecialRule = rules.text_special
    const softbreakRule = rules.softbreak
    const hardbreakRule = rules.hardbreak
    const htmlInlineRule = rules.html_inline
    const codeInlineRule = rules.code_inline
    const inlineBreak = options.xhtmlOut ? '<br />\n' : '<br>\n'
    const softbreak = options.breaks ? inlineBreak : '\n'
    let result = ''
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      switch (token.type) {
        case 'text':
          if (textRule === defaultRules.text) {
            result += escapeHtml(token.content)
            continue
          }
          break
        case 'text_special':
          if (textSpecialRule === defaultRules.text_special) {
            result += escapeHtml(token.content)
            continue
          }
          break
        case 'softbreak':
          if (softbreakRule === defaultRules.softbreak) {
            result += softbreak
            continue
          }
          break
        case 'hardbreak':
          if (hardbreakRule === defaultRules.hardbreak) {
            result += inlineBreak
            continue
          }
          break
        case 'html_inline':
          if (htmlInlineRule === defaultRules.html_inline) {
            result += token.content
            continue
          }
          break
        case 'code_inline':
          if (codeInlineRule === defaultRules.code_inline) {
            result += renderCodeInlineToken(token, this)
            continue
          }
          break
        default:
          break
      }

      const rule = rules[token.type]
      if (!rule) {
        result += this.renderToken(tokens, i, options)
        continue
      }

      const rendered = rule(tokens, i, options, env, this)
      if (typeof rendered === 'string')
        result += rendered
      else
        result += ensureSyncResult(rendered, token.type)
    }
    return result
  }

  private async renderInlineTokensAsync(tokens: Token[], options: RendererOptions, env: RendererEnv): Promise<string> {
    if (!tokens || tokens.length === 0)
      return ''

    const rules = this.rules
    let result = ''
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const rule = rules[token.type]
      if (rule)
        result += await resolveResult(rule(tokens, i, options, env, this))
      else
        result += this.renderToken(tokens, i, options)
    }
    return result
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
