import type { State } from '../../parse/state'
import { Token } from '../../common/token'

interface LinkifyMatch {
  schema: string
  index: number
  lastIndex: number
  raw: string
  text: string
  url: string
}

const CJK_CHAR_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const ASCII_DOMAIN_START_RE = /[0-9a-z]/i

// A linkify-it match always contains one of these characters:
// - `:` for schema-based links (all schemas end with `:`)
// - `@` for fuzzy email matches
// - `.` for fuzzy domain links (TLD is required)
// Screening with native `indexOf` avoids running the (very large) linkify
// regexes over link-free text tokens. This is only used when every registered
// schema ends with `:`; otherwise linkify may match colonless user schemas.
function hasLinkifySeed(text: string): boolean {
  return text.indexOf('.') !== -1 || text.indexOf('@') !== -1 || text.indexOf(':') !== -1
}

const linkifySeedSafety = new WeakMap<object, { schemaSearch: object, safe: boolean }>()

function isLinkifySeedSafe(linkify: { re?: { get_schema_search?: () => object }, __schemas__?: Record<string, unknown> }): boolean {
  const schemaSearch = linkify.re?.get_schema_search?.()
  if (!schemaSearch)
    return false

  const cached = linkifySeedSafety.get(linkify)
  if (cached && cached.schemaSearch === schemaSearch)
    return cached.safe

  const schemas = linkify.__schemas__
  let safe = true
  if (schemas) {
    for (const name in schemas) {
      if (name.charCodeAt(name.length - 1) !== 0x3A /* : */) {
        safe = false
        break
      }
    }
  }
  linkifySeedSafety.set(linkify, { schemaSearch, safe })
  return safe
}

function isLinkOpen(str: string): boolean {
  return /^<a[>\s]/i.test(str)
}

function isLinkClose(str: string): boolean {
  return /^<\/a\s*>/i.test(str)
}

function trimCjkPrefixFromFuzzyLink(linkify: { match: (text: string) => LinkifyMatch[] | null }, link: LinkifyMatch): LinkifyMatch {
  if (link.schema || link.index !== 0 || !link.raw)
    return link

  for (let offset = 1; offset < link.raw.length; offset++) {
    const prevChar = link.raw[offset - 1]
    const nextChar = link.raw[offset]

    if (!CJK_CHAR_RE.test(prevChar) || !ASCII_DOMAIN_START_RE.test(nextChar))
      continue

    const suffix = link.raw.slice(offset)
    const candidate = linkify.match(suffix)?.[0]

    if (!candidate || candidate.index !== 0 || candidate.lastIndex !== suffix.length)
      continue

    return {
      ...candidate,
      index: link.index + offset,
      lastIndex: link.index + offset + candidate.lastIndex,
    }
  }

  return link
}

export function linkify(state: State): void {
  const blockTokens = state.tokens

  if (!state.md?.options?.linkify) {
    return
  }

  // Resolve the seed-screen policy once per rule run (per parse), not per
  // text token: WeakMap + schema-search lookups would otherwise dominate
  // short link-free tokens.
  const seedSafe = isLinkifySeedSafe(state.md.linkify)
  const mayMatch = (text: string) => seedSafe ? hasLinkifySeed(text) : true

  for (let j = 0; j < blockTokens.length; j++) {
    const blockToken = blockTokens[j]

    // linkify-it@6 removed `pretest`; `test` is the exact (non-false-negative)
    // equivalent — it is slightly heavier but never skips a block containing a link.
    if (blockToken.type !== 'inline' || !mayMatch(blockToken.content)) {
      continue
    }

    let tokens = blockToken.children
    if (!tokens) {
      tokens = []
      blockToken.children = tokens
    }
    let htmlLinkLevel = 0

    for (let i = tokens.length - 1; i >= 0; i--) {
      const currentToken = tokens[i]

      if (currentToken.type === 'link_close') {
        i--
        while (i >= 0 && tokens[i].level !== currentToken.level && tokens[i].type !== 'link_open') {
          i--
        }
        continue
      }

      if (currentToken.type === 'html_inline') {
        if (isLinkOpen(currentToken.content) && htmlLinkLevel > 0) {
          htmlLinkLevel--
        }
        if (isLinkClose(currentToken.content)) {
          htmlLinkLevel++
        }
      }

      if (htmlLinkLevel > 0) {
        continue
      }

      if (currentToken.type !== 'text' || !mayMatch(currentToken.content)) {
        continue
      }

      const text = currentToken.content
      // `test()` followed by `match()` would scan the same text twice; a
      // single `match()` returns `null` when nothing matches, which is
      // exactly equivalent.
      let links = (state.md.linkify.match(text) || []).map((link: LinkifyMatch) => trimCjkPrefixFromFuzzyLink(state.md.linkify, link))

      if (links.length === 0) {
        continue
      }

      const nodes: Token[] = []
      let level = currentToken.level
      let lastPos = 0

      if (
        links.length > 0
        && links[0].index === 0
        && i > 0
        && tokens[i - 1].type === 'text_special'
      ) {
        links = links.slice(1)
      }

      for (let ln = 0; ln < links.length; ln++) {
        const link = links[ln]
        const fullUrl = state.md.normalizeLink(link.url)

        if (!state.md.validateLink(fullUrl)) {
          continue
        }

        let urlText = link.text

        if (!link.schema) {
          urlText = state.md.normalizeLinkText(`http://${urlText}`).replace(/^http:\/\//, '')
        }
        else if (link.schema === 'mailto:' && !/^mailto:/i.test(urlText)) {
          urlText = state.md.normalizeLinkText(`mailto:${urlText}`).replace(/^mailto:/, '')
        }
        else {
          urlText = state.md.normalizeLinkText(urlText)
        }

        const pos = link.index

        if (pos > lastPos) {
          const textToken = new Token('text', '', 0)
          textToken.content = text.slice(lastPos, pos)
          textToken.level = level
          nodes.push(textToken)
        }

        const tokenOpen = new Token('link_open', 'a', 1)
        tokenOpen.attrs = [['href', fullUrl]]
        tokenOpen.level = level++
        tokenOpen.markup = 'linkify'
        tokenOpen.info = 'auto'
        nodes.push(tokenOpen)

        const tokenText = new Token('text', '', 0)
        tokenText.content = urlText
        tokenText.level = level
        nodes.push(tokenText)

        const tokenClose = new Token('link_close', 'a', -1)
        tokenClose.level = --level
        tokenClose.markup = 'linkify'
        tokenClose.info = 'auto'
        nodes.push(tokenClose)

        lastPos = link.lastIndex
      }

      if (lastPos === 0) {
        continue
      }

      if (lastPos < text.length) {
        const textToken = new Token('text', '', 0)
        textToken.content = text.slice(lastPos)
        textToken.level = level
        nodes.push(textToken)
      }

      // Replace in-place to avoid allocating a new array for each match.
      tokens.splice(i, 1, ...nodes)
    }
  }
}

export default linkify
