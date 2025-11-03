import type { RendererOptions, Token } from '../types'
import { escapeHtml, unescapeAll } from './utils'

class Renderer {
  private options: RendererOptions

  constructor(options: RendererOptions = {}) {
    this.options = {
      langPrefix: 'language-',
      ...options,
    }
  }

  public render(tokens: Token[], options: RendererOptions = {}): string {
    this.options = { ...this.options, ...options }
    let output = ''

    tokens.forEach((token) => {
      output += this.renderToken(token)
    })

    return output
  }

  private renderAttrs(token: Token): string {
    if (!token.attrs || token.attrs.length === 0) {
      return ''
    }

    return ` ${token.attrs
      .map(([name, value]) => `${escapeHtml(name)}="${escapeHtml(value)}"`)
      .join(' ')}`
  }

  private renderToken(token: Token): string {
    switch (token.type) {
      case 'paragraph_open':
        return '<p>'
      case 'paragraph_close':
        return '</p>'
      case 'paragraph':
        // If paragraph has inline children, render them. Otherwise fall back
        // to raw content.
        if (Array.isArray(token.children) && token.children.length > 0) {
          return `<p>${this.renderInline(token.children)}</p>`
        }
        return `<p>${token.content}</p>`
      case 'heading':
        return `<h${token.level}>${token.content}</h${token.level}>`
      case 'inline':
        return this.renderInline(token.children || [])
      case 'code_block':
        return `<pre${this.renderAttrs(token)}><code>${escapeHtml(token.content)}</code></pre>\n`
      case 'fence':
        return this.renderFence(token)
      case 'code_inline':
        return `<code${this.renderAttrs(token)}>${escapeHtml(token.content)}</code>`
      // Add more cases for other token types as needed
      default:
        return ''
    }
  }

  private attrIndex(token: Token, name: string): number {
    if (!token.attrs)
      return -1

    for (let i = 0; i < token.attrs.length; i++) {
      if (token.attrs[i][0] === name)
        return i
    }
    return -1
  }

  private renderFence(token: Token): string {
    const info = token.info ? unescapeAll(token.info).trim() : ''
    let langName = ''
    let langAttrs = ''

    if (info) {
      const arr = info.split(/(\s+)/g)
      langName = arr[0]
      langAttrs = arr.slice(2).join('')
    }

    let highlighted: string
    if (this.options.highlight) {
      highlighted = this.options.highlight(token.content, langName, langAttrs) || escapeHtml(token.content)
    }
    else {
      highlighted = escapeHtml(token.content)
    }

    // If highlighter already wrapped in <pre>, return as-is
    if (highlighted.indexOf('<pre') === 0) {
      return `${highlighted}\n`
    }

    // If language exists, inject class
    if (info) {
      const i = this.attrIndex(token, 'class')
      const tmpAttrs = token.attrs ? token.attrs.slice() : []

      if (i < 0) {
        tmpAttrs.push(['class', (this.options.langPrefix || 'language-') + langName])
      }
      else {
        tmpAttrs[i] = tmpAttrs[i].slice() as [string, string]
        tmpAttrs[i][1] += ` ${this.options.langPrefix || 'language-'}${langName}`
      }

      // Fake token just to render attributes
      const tmpToken: Token = {
        ...token,
        attrs: tmpAttrs,
      }

      return `<pre><code${this.renderAttrs(tmpToken)}>${highlighted}</code></pre>\n`
    }

    return `<pre><code${this.renderAttrs(token)}>${highlighted}</code></pre>\n`
  }

  private renderInline(tokens: Token[] = []): string {
    return (tokens || []).map((token) => {
      switch (token.type) {
        case 'text':
          return token.content
        case 'strong_open':
          return '<strong>'
        case 'strong_close':
          return '</strong>'
        case 'em_open':
          return '<em>'
        case 'em_close':
          return '</em>'
        case 'code_inline':
          return `<code${this.renderAttrs(token)}>${escapeHtml(token.content)}</code>`
        default:
          return ''
      }
    }).join('')
  }
}

export default Renderer
