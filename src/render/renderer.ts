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

function renderAttrName(name: string): string {
  switch (name) {
    case 'alt':
    case 'class':
    case 'href':
    case 'id':
    case 'lang':
    case 'rel':
    case 'src':
    case 'start':
    case 'style':
    case 'target':
    case 'title':
      return name
    default:
      return escapeHtml(name)
  }
}

function renderAttrsFromList(attrs: [string, string][] | null | undefined): string {
  if (!attrs || attrs.length === 0)
    return ''

  const firstAttr = attrs[0]
  let result = ' ' + renderAttrName(firstAttr[0]) + '="' + escapeHtml(firstAttr[1]) + '"'

  for (let i = 1; i < attrs.length; i++) {
    const attr = attrs[i]
    result += ' ' + renderAttrName(attr[0]) + '="' + escapeHtml(attr[1]) + '"'
  }

  return result
}

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

function renderFence(token: Token, highlighted: string, info: string, langName: string, options: RendererOptions): string {
  if (highlighted.indexOf('<pre') === 0)
    return highlighted + '\n'

  if (info) {
    if (!token.attrs || token.attrs.length === 0) {
      const langClass = escapeHtml(`${options.langPrefix ?? 'language-'}${langName}`)
      return '<pre><code class="' + langClass + '">' + highlighted + '</code></pre>\n'
    }

    const classIndex = token.attrIndex('class')
    const tmpAttrs = token.attrs ? token.attrs.slice() : []
    const langClass = `${options.langPrefix ?? 'language-'}${langName}`

    if (classIndex < 0)
      tmpAttrs.push(['class', langClass])
    else {
      tmpAttrs[classIndex] = tmpAttrs[classIndex].slice() as [string, string]
      tmpAttrs[classIndex][1] += ` ${langClass}`
    }

    return '<pre><code' + renderAttrsFromList(tmpAttrs) + '>' + highlighted + '</code></pre>\n'
  }

  return '<pre><code' + renderAttrsFromList(token.attrs) + '>' + highlighted + '</code></pre>\n'
}

function renderCodeInlineToken(token: Token): string {
  if (!token.attrs || token.attrs.length === 0)
    return '<code>' + escapeHtml(token.content) + '</code>'

  return '<code' + renderAttrsFromList(token.attrs) + '>' + escapeHtml(token.content) + '</code>'
}

function renderCodeBlockToken(token: Token): string {
  const content = escapeHtml(token.content)
  if (!token.attrs)
    return '<pre><code>' + content + '</code></pre>\n'

  return '<pre' + renderAttrsFromList(token.attrs) + '><code>' + content + '</code></pre>\n'
}

function renderFastBlockOpenWithInline(token: Token, prefix: string): string | null {
  const attrs = token.attrs
  if (!attrs || attrs.length === 0) {
    switch (token.type) {
      case 'paragraph_open':
        return prefix + '<p>'
      case 'heading_open':
        return '<' + token.tag + '>'
      case 'td_open':
        return prefix + '<td>'
      case 'th_open':
        return prefix + '<th>'
      default:
        return null
    }
  }

  if (attrs.length === 1 && attrs[0][0] === 'style') {
    if (token.type === 'td_open')
      return prefix + '<td style="' + escapeHtml(attrs[0][1]) + '">'
    if (token.type === 'th_open')
      return prefix + '<th style="' + escapeHtml(attrs[0][1]) + '">'
  }

  return null
}

function renderLinkOpenToken(token: Token): string {
  const attrs = token.attrs
  if (!attrs || attrs.length === 0)
    return '<a>'

  if (attrs.length === 1)
    return '<a ' + renderAttrName(attrs[0][0]) + '="' + escapeHtml(attrs[0][1]) + '">'

  if (attrs.length === 2)
    return '<a '
      + renderAttrName(attrs[0][0]) + '="' + escapeHtml(attrs[0][1]) + '" '
      + renderAttrName(attrs[1][0]) + '="' + escapeHtml(attrs[1][1]) + '">'

  return '<a' + renderAttrsFromList(attrs) + '>'
}

function canUseLinkInlineFastPath(token: Token): boolean {
  switch (token.type) {
    case 'text':
    case 'text_special':
    case 'softbreak':
    case 'hardbreak':
    case 'html_inline':
    case 'code_inline':
    case 'image':
      return true
    default:
      return false
  }
}

function canUseWrappedInlineFastPath(token: Token): boolean {
  switch (token.type) {
    case 'text':
    case 'text_special':
    case 'softbreak':
    case 'hardbreak':
    case 'html_inline':
    case 'code_inline':
      return true
    default:
      return false
  }
}

function renderFlatToken(token: Token, xhtmlOut: boolean): string {
  if (token.hidden)
    return ''

  const attrs = token.attrs
  const nesting = token.nesting
  const tag = token.tag

  if (!attrs || attrs.length === 0) {
    if (nesting === 0)
      return xhtmlOut ? '<' + tag + ' />' : '<' + tag + '>'
    return nesting === -1 ? '</' + tag + '>' : '<' + tag + '>'
  }

  let result = (nesting === -1 ? '</' : '<') + tag + renderAttrsFromList(attrs)
  if (nesting === 0 && xhtmlOut)
    result += ' /'
  return result + '>'
}

function renderFenceSyncToken(token: Token, options: RendererOptions, self: Renderer): string {
  const info = token.info ? unescapeAll(token.info).trim() : ''
  const { langName, langAttrs } = parseFenceInfo(info)
  const highlight = options.highlight
  const fallback = escapeHtml(token.content)

  if (!highlight)
    return renderFence(token, fallback, info, langName, options)

  const highlighted = highlight(token.content, langName, langAttrs)
  if (isPromiseLike(highlighted))
    throw new TypeError('Renderer rule "fence" returned a Promise. Use renderAsync() instead.')

  return renderFence(token, highlighted || fallback, info, langName, options)
}

function renderSingleInlineTokenSync(
  tokens: Token[],
  options: RendererOptions,
  env: RendererEnv,
  self: Renderer,
  rules: Record<string, RendererRule>,
  inlineBreak: string,
  softbreak: string,
): string {
  const token = tokens[0]

  switch (token.type) {
    case 'text':
      if (rules.text === defaultRules.text)
        return token.content.length === 0 ? '' : escapeHtml(token.content)
      break
    case 'text_special':
      if (rules.text_special === defaultRules.text_special)
        return token.content.length === 0 ? '' : escapeHtml(token.content)
      break
    case 'softbreak':
      if (rules.softbreak === defaultRules.softbreak)
        return softbreak
      break
    case 'hardbreak':
      if (rules.hardbreak === defaultRules.hardbreak)
        return inlineBreak
      break
    case 'html_inline':
      if (rules.html_inline === defaultRules.html_inline)
        return token.content
      break
    case 'code_inline':
      if (rules.code_inline === defaultRules.code_inline)
        return renderCodeInlineToken(token)
      break
    default:
      break
  }

  const rule = rules[token.type]
  if (!rule)
    return renderFlatToken(token, options.xhtmlOut === true)

  const rendered = rule(tokens, 0, options, env, self)
  if (typeof rendered === 'string')
    return rendered
  return ensureSyncResult(rendered, token.type)
}

const DEFAULT_RENDERER_OPTIONS: Required<Pick<RendererOptions, 'langPrefix' | 'xhtmlOut' | 'breaks'>> = {
  langPrefix: 'language-',
  xhtmlOut: false,
  breaks: false,
}

const hasOwn = Object.prototype.hasOwnProperty

const defaultRules: Record<string, RendererRule> = {
  code_inline(tokens, idx) {
    return renderCodeInlineToken(tokens[idx])
  },
  code_block(tokens, idx) {
    return renderCodeBlockToken(tokens[idx])
  },
  fence(tokens, idx, options, _env, self) {
    const token = tokens[idx]
    const info = token.info ? unescapeAll(token.info).trim() : ''
    const { langName, langAttrs } = parseFenceInfo(info)
    const highlight = options.highlight
    const fallback = escapeHtml(token.content)

    if (!highlight)
      return renderFence(token, fallback, info, langName, options)

    const highlighted = highlight(token.content, langName, langAttrs)

    if (isPromiseLike(highlighted)) {
      return highlighted.then(res => renderFence(token, res || fallback, info, langName, options))
    }

    return renderFence(token, highlighted || fallback, info, langName, options)
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
    return renderFlatToken(token, options.xhtmlOut === true)
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

    if (tokens.length === 1)
      return this.renderSingleToken(tokens, tokens[0], options, env)

    const merged = this.mergeOptions(options)
    const envRef = env ?? {}
    const rules = this.rules
    const xhtmlOut = merged.xhtmlOut === true

    let textRule: RendererRule | undefined
    let textSpecialRule: RendererRule | undefined
    let softbreakRule: RendererRule | undefined
    let hardbreakRule: RendererRule | undefined
    let htmlInlineRule: RendererRule | undefined
    let codeInlineRule: RendererRule | undefined
    let inlineBreak = ''
    let softbreak = ''
    let inlineFastPathReady = false
    let result = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const type = token.type
      const prefix = i > 0 && tokens[i - 1].hidden ? '\n' : ''

      if (type === 'list_item_open' && (!token.attrs || token.attrs.length === 0) && i + 3 < tokens.length) {
        const paragraphOpen = tokens[i + 1]
        const inlineToken = tokens[i + 2]
        const paragraphClose = tokens[i + 3]

        if (
          paragraphOpen.type === 'paragraph_open'
          && paragraphOpen.hidden
          && inlineToken.type === 'inline'
          && paragraphClose.type === 'paragraph_close'
          && paragraphClose.hidden
        ) {
          result += prefix + '<li>' + this.renderInlineTokens(inlineToken.children || [], merged, envRef)
          i += 3
          continue
        }
      }

      if (i + 2 < tokens.length) {
        const inlineToken = tokens[i + 1]
        const closeToken = tokens[i + 2]

        if (
          inlineToken.type === 'inline'
          && closeToken.nesting === -1
          && closeToken.tag === token.tag
          && !closeToken.hidden
        ) {
          const open = renderFastBlockOpenWithInline(token, prefix)
          if (open !== null) {
            result += open + this.renderInlineTokens(inlineToken.children || [], merged, envRef) + '</' + token.tag + '>\n'
            i += 2
            continue
          }
        }
      }

      if (type === 'inline') {
        const children = token.children || []
        if (children.length === 1) {
          if (!inlineFastPathReady) {
            textRule = rules.text
            textSpecialRule = rules.text_special
            softbreakRule = rules.softbreak
            hardbreakRule = rules.hardbreak
            htmlInlineRule = rules.html_inline
            codeInlineRule = rules.code_inline
            inlineBreak = merged.xhtmlOut ? '<br />\n' : '<br>\n'
            softbreak = merged.breaks ? inlineBreak : '\n'
            inlineFastPathReady = true
          }

          const child = children[0]
          switch (child.type) {
            case 'text':
              if (textRule === defaultRules.text) {
                result += escapeHtml(child.content)
                continue
              }
              break
            case 'text_special':
              if (textSpecialRule === defaultRules.text_special) {
                result += escapeHtml(child.content)
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
                result += child.content
                continue
              }
              break
            case 'code_inline':
              if (codeInlineRule === defaultRules.code_inline) {
                result += renderCodeInlineToken(child)
                continue
              }
              break
            default:
              break
          }
        }

        result += this.renderInlineTokens(children, merged, envRef)
        continue
      }

      const rule = rules[type]
      if (!rule) {
        const attrs = token.attrs
        if (!token.hidden) {
          if (!attrs || attrs.length === 0) {
            switch (type) {
              case 'hr':
                result += xhtmlOut ? '<hr />\n' : '<hr>\n'
                continue
              case 'heading_open':
                result += '<' + token.tag + '>'
                continue
              case 'heading_close':
                result += '</' + token.tag + '>\n'
                continue
              case 'paragraph_open':
                result += prefix + '<p>'
                continue
              case 'paragraph_close':
                result += '</p>\n'
                continue
              case 'list_item_open': {
                const nextToken = tokens[i + 1]
                result += prefix + (
                  nextToken && (nextToken.type === 'inline' || nextToken.hidden || (nextToken.nesting === -1 && nextToken.tag === 'li'))
                    ? '<li>'
                    : '<li>\n'
                )
                continue
              }
              case 'list_item_close':
                result += '</li>\n'
                continue
              case 'bullet_list_open':
                result += prefix + '<ul>\n'
                continue
              case 'bullet_list_close':
                result += '</ul>\n'
                continue
              case 'blockquote_open':
                result += prefix + (
                  tokens[i + 1] && tokens[i + 1].nesting === -1 && tokens[i + 1].tag === 'blockquote'
                    ? '<blockquote>'
                    : '<blockquote>\n'
                )
                continue
              case 'blockquote_close':
                result += '</blockquote>\n'
                continue
              case 'ordered_list_open':
                result += prefix + '<ol>\n'
                continue
              case 'ordered_list_close':
                result += '</ol>\n'
                continue
              case 'table_open':
                result += prefix + '<table>\n'
                continue
              case 'table_close':
                result += '</table>\n'
                continue
              case 'thead_open':
                result += prefix + '<thead>\n'
                continue
              case 'thead_close':
                result += '</thead>\n'
                continue
              case 'tbody_open':
                result += prefix + '<tbody>\n'
                continue
              case 'tbody_close':
                result += '</tbody>\n'
                continue
              case 'tr_open':
                result += prefix + '<tr>\n'
                continue
              case 'tr_close':
                result += '</tr>\n'
                continue
              case 'td_open':
                result += prefix + '<td>'
                continue
              case 'td_close':
                result += '</td>\n'
                continue
              case 'th_open':
                result += prefix + '<th>'
                continue
              case 'th_close':
                result += '</th>\n'
                continue
              default:
                break
            }
          }
          else if (attrs.length === 1) {
            const attr = attrs[0]
            if (type === 'ordered_list_open' && attr[0] === 'start') {
              result += prefix + '<ol start="' + escapeHtml(attr[1]) + '">\n'
              continue
            }
            if (type === 'td_open' && attr[0] === 'style') {
              result += prefix + '<td style="' + escapeHtml(attr[1]) + '">'
              continue
            }
            if (type === 'th_open' && attr[0] === 'style') {
              result += prefix + '<th style="' + escapeHtml(attr[1]) + '">'
              continue
            }
          }
        }

        result += this.renderToken(tokens, i, merged)
        continue
      }

      if (type === 'code_block' && rule === defaultRules.code_block) {
        result += renderCodeBlockToken(token)
        continue
      }

      if (type === 'fence' && rule === defaultRules.fence) {
        result += renderFenceSyncToken(token, merged, this)
        continue
      }

      if (type === 'html_block' && rule === defaultRules.html_block) {
        result += token.content
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
    return renderAttrsFromList(token.attrs)
  }

  public renderToken(tokens: Token[], idx: number, options: RendererOptions): string {
    const token = tokens[idx]

    if (token.hidden)
      return ''

    const block = token.block
    const nesting = token.nesting
    const tag = token.tag
    const attrs = token.attrs

    let needLineFeed = false
    if (block) {
      needLineFeed = true

      if (nesting === 1 && idx + 1 < tokens.length) {
        const nextToken = tokens[idx + 1]
        if (nextToken.type === 'inline' || nextToken.hidden)
          needLineFeed = false
        else if (nextToken.nesting === -1 && nextToken.tag === tag)
          needLineFeed = false
      }
    }

    const prefix = block && nesting !== -1 && idx > 0 && tokens[idx - 1].hidden ? '\n' : ''
    const suffix = needLineFeed ? '>\n' : '>'

    if (!attrs || attrs.length === 0) {
      if (nesting === 0) {
        if (options.xhtmlOut)
          return prefix + '<' + tag + ' /' + suffix
        return prefix + '<' + tag + suffix
      }
      if (nesting === -1)
        return prefix + '</' + tag + suffix
      return prefix + '<' + tag + suffix
    }

    let result = prefix + (nesting === -1 ? '</' : '<') + tag + renderAttrsFromList(attrs)
    if (nesting === 0 && options.xhtmlOut)
      result += ' /'

    return result + suffix
  }

  private mergeOptions(overrides?: RendererOptions): RendererOptions {
    const base = this.normalizedBase
    if (!overrides)
      return base

    if (
      overrides.highlight === base.highlight
      && overrides.langPrefix === base.langPrefix
      && overrides.xhtmlOut === base.xhtmlOut
      && overrides.breaks === base.breaks
    ) {
      return base
    }

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

  private renderSingleToken(tokens: Token[], token: Token, options?: RendererOptions, env?: RendererEnv): string {
    const rules = this.rules
    const type = token.type

    if (type === 'code_block' && rules.code_block === defaultRules.code_block)
      return renderCodeBlockToken(token)

    if (type === 'html_block' && rules.html_block === defaultRules.html_block)
      return token.content

    const merged = this.mergeOptions(options)
    const envRef = env ?? {}

    if (type === 'inline')
      return this.renderInlineTokens(token.children || [], merged, envRef)

    const rule = rules[type]
    if (!rule)
      return token.block ? this.renderToken(tokens, 0, merged) : renderFlatToken(token, merged.xhtmlOut === true)

    if (type === 'fence' && rule === defaultRules.fence)
      return renderFenceSyncToken(token, merged, this)

    const rendered = rule(tokens, 0, merged, envRef, this)
    if (typeof rendered === 'string')
      return rendered
    return ensureSyncResult(rendered, type)
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
    const linkOpenRule = rules.link_open
    const linkCloseRule = rules.link_close
    const emOpenRule = rules.em_open
    const emCloseRule = rules.em_close
    const strongOpenRule = rules.strong_open
    const strongCloseRule = rules.strong_close
    const xhtmlOut = options.xhtmlOut === true
    const inlineBreak = xhtmlOut ? '<br />\n' : '<br>\n'
    const softbreak = options.breaks ? inlineBreak : '\n'

    if (tokens.length === 1)
      return renderSingleInlineTokenSync(tokens, options, env, this, rules, inlineBreak, softbreak)

    let result = ''
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (token.type === 'link_open' && !linkOpenRule && !linkCloseRule && i + 2 < tokens.length) {
        const bodyToken = tokens[i + 1]
        const closeToken = tokens[i + 2]

        if (closeToken.type === 'link_close' && canUseLinkInlineFastPath(bodyToken)) {
          const renderedLink = renderLinkOpenToken(token)
            + renderSingleInlineTokenSync([bodyToken], options, env, this, rules, inlineBreak, softbreak)
            + '</a>'

          if (softbreakRule === defaultRules.softbreak && i + 3 < tokens.length && tokens[i + 3].type === 'softbreak') {
            result += renderedLink + softbreak
            i += 3
            continue
          }

          result += renderedLink
          i += 2
          continue
        }
      }

      if (token.type === 'link_open' && !linkOpenRule && !linkCloseRule && i + 1 < tokens.length) {
        const closeToken = tokens[i + 1]
        if (closeToken.type === 'link_close') {
          result += renderLinkOpenToken(token) + '</a>'
          i += 1
          continue
        }
      }

      if (token.type === 'em_open' && !emOpenRule && !emCloseRule && i + 2 < tokens.length) {
        const bodyToken = tokens[i + 1]
        const closeToken = tokens[i + 2]

        if (closeToken.type === 'em_close' && canUseWrappedInlineFastPath(bodyToken)) {
          result += '<em>'
            + renderSingleInlineTokenSync([bodyToken], options, env, this, rules, inlineBreak, softbreak)
            + '</em>'
          i += 2
          continue
        }
      }

      if (token.type === 'strong_open' && !strongOpenRule && !strongCloseRule && i + 2 < tokens.length) {
        const bodyToken = tokens[i + 1]
        const closeToken = tokens[i + 2]

        if (closeToken.type === 'strong_close' && canUseWrappedInlineFastPath(bodyToken)) {
          result += '<strong>'
            + renderSingleInlineTokenSync([bodyToken], options, env, this, rules, inlineBreak, softbreak)
            + '</strong>'
          i += 2
          continue
        }
      }

      switch (token.type) {
        case 'text':
          if (textRule === defaultRules.text) {
            const escaped = token.content.length === 0 ? '' : escapeHtml(token.content)
            if (htmlInlineRule === defaultRules.html_inline && i + 1 < tokens.length && tokens[i + 1].type === 'html_inline') {
              result += escaped + tokens[++i].content
              while (i + 1 < tokens.length && tokens[i + 1].type === 'html_inline')
                result += tokens[++i].content
              continue
            }
            result += escaped
            continue
          }
          break
        case 'text_special':
          if (textSpecialRule === defaultRules.text_special) {
            if (token.content.length !== 0)
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
            while (i + 1 < tokens.length && tokens[i + 1].type === 'html_inline')
              result += tokens[++i].content
            continue
          }
          break
        case 'code_inline':
          if (codeInlineRule === defaultRules.code_inline) {
            result += renderCodeInlineToken(token)
            continue
          }
          break
        default:
          break
      }

      const rule = rules[token.type]
      if (!rule) {
        result += token.block ? this.renderToken(tokens, i, options) : renderFlatToken(token, xhtmlOut)
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
