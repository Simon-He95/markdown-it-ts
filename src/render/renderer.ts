import type { Token } from '../common/token'
import { escapeHtml, unescapeAll } from './utils'

export interface RendererOptions {
  langPrefix?: string
  highlight?: ((str: string, lang: string, attrs: string) => string) | null
  xhtmlOut?: boolean
  breaks?: boolean
}

export type RendererEnv = Record<string, unknown>

export type RendererRule = (tokens: Token[], idx: number, options: RendererOptions, env: RendererEnv, self: Renderer) => string

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
    const highlighted = highlight ? (highlight(token.content, langName, langAttrs) || escapeHtml(token.content)) : escapeHtml(token.content)

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
  html_block(tokens, idx) {
    return tokens[idx].content
  },
  html_inline(tokens, idx) {
    return tokens[idx].content
  },
}

function mergeOptions(base: RendererOptions, override: RendererOptions): RendererOptions {
  return {
    langPrefix: 'language-',
    xhtmlOut: false,
    breaks: false,
    ...base,
    ...override,
  }
}

export class Renderer {
  public readonly rules: Record<string, RendererRule>
  private baseOptions: RendererOptions

  constructor(options: RendererOptions = {}) {
    this.baseOptions = { ...options }
    this.rules = { ...defaultRules }
  }

  public set(options: RendererOptions) {
    this.baseOptions = { ...this.baseOptions, ...options }
    return this
  }

  public render(tokens: Token[], options: RendererOptions = {}, env: RendererEnv = {}): string {
    if (!Array.isArray(tokens))
      throw new TypeError('render expects token array as first argument')

    const merged = mergeOptions(this.baseOptions, options)
    let result = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type === 'inline') {
        result += this.renderInline(token.children || [], merged, env)
        continue
      }

      const rule = this.rules[token.type]
      if (rule)
        result += rule(tokens, i, merged, env, this)
      else
        result += this.renderToken(tokens, i, merged)
    }

    return result
  }

  public renderInline(tokens: Token[], options: RendererOptions = {}, env: RendererEnv = {}): string {
    const merged = mergeOptions(this.baseOptions, options)
    let result = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const rule = this.rules[token.type]
      if (rule)
        result += rule(tokens, i, merged, env, this)
      else
        result += this.renderToken(tokens, i, merged)
    }

    return result
  }

  public renderInlineAsText(tokens: Token[], options: RendererOptions = {}, env: RendererEnv = {}): string {
    const merged = mergeOptions(this.baseOptions, options)
    let result = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      switch (token.type) {
        case 'text':
          result += token.content
          break
        case 'image':
          result += this.renderInlineAsText(token.children || [], merged, env)
          break
        case 'html_inline':
        case 'html_block':
          result += token.content
          break
        case 'softbreak':
        case 'hardbreak':
          result += '\n'
          break
        default:
          break
      }
    }

    return result
  }

  public renderAttrs(token: Token): string {
    if (!token.attrs || token.attrs.length === 0)
      return ''

    return token.attrs
      .map(([name, value]) => ` ${escapeHtml(name)}="${escapeHtml(value)}"`)
      .join('')
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
}

export default Renderer
