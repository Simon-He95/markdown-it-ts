import { escapeHtml } from './utils'

const INLINE_FALLBACK_RE = /[\n!#$%&*+\-:<=>@[\]\\^_`{}~]/
const INLINE_SPECIAL_RE = /[\n!"#$%&*+\-:<=>@[\]\\^_`{}~]/
const INLINE_QUOTE_RE = /"/g

function lineEnd(src: string, pos: number): number {
  const next = src.indexOf('\n', pos)
  return next === -1 ? src.length : next
}

function isBlankLine(src: string, start: number, end: number): boolean {
  for (let pos = start; pos < end; pos++) {
    const ch = src.charCodeAt(pos)
    if (ch !== 0x20 && ch !== 0x09)
      return false
  }
  return true
}

function skipEmptyLines(src: string, pos: number): number {
  while (pos < src.length && src.charCodeAt(pos) === 0x0A)
    pos++
  return pos
}

function startsParagraphContinuation(src: string, pos: number): boolean {
  if (pos >= src.length || src.charCodeAt(pos) === 0x0A)
    return false

  const end = lineEnd(src, pos)
  return !isBlankLine(src, pos, end)
}

function startsWithFence(src: string, pos: number, end: number): boolean {
  return pos + 2 < end
    && src.charCodeAt(pos) === 0x60
    && src.charCodeAt(pos + 1) === 0x60
    && src.charCodeAt(pos + 2) === 0x60
}

function paragraphContent(src: string, start: number, end: number): string {
  const lastCh = src.charCodeAt(end - 1)
  return lastCh === 0x20 || lastCh === 0x09 ? src.slice(start, end).trim() : src.slice(start, end)
}

// Fast lookup table for inline special characters
const INLINE_NEEDS_ESCAPE = new Uint8Array(256)
INLINE_NEEDS_ESCAPE[0x22] = 1 // "
INLINE_NEEDS_ESCAPE[0x0A] = 2 // \n (fallback)
INLINE_NEEDS_ESCAPE[0x21] = 2 // ! (fallback)
INLINE_NEEDS_ESCAPE[0x23] = 2 // # (fallback)
INLINE_NEEDS_ESCAPE[0x24] = 2 // $ (fallback)
INLINE_NEEDS_ESCAPE[0x25] = 2 // % (fallback)
INLINE_NEEDS_ESCAPE[0x26] = 2 // & (fallback)
INLINE_NEEDS_ESCAPE[0x2A] = 2 // * (fallback)
INLINE_NEEDS_ESCAPE[0x2B] = 2 // + (fallback)
INLINE_NEEDS_ESCAPE[0x2D] = 2 // - (fallback)
INLINE_NEEDS_ESCAPE[0x3A] = 2 // : (fallback)
INLINE_NEEDS_ESCAPE[0x3C] = 2 // < (fallback)
INLINE_NEEDS_ESCAPE[0x3D] = 2 // = (fallback)
INLINE_NEEDS_ESCAPE[0x3E] = 2 // > (fallback)
INLINE_NEEDS_ESCAPE[0x40] = 2 // @ (fallback)
INLINE_NEEDS_ESCAPE[0x5B] = 2 // [ (fallback)
INLINE_NEEDS_ESCAPE[0x5C] = 2 // \ (fallback)
INLINE_NEEDS_ESCAPE[0x5D] = 2 // ] (fallback)
INLINE_NEEDS_ESCAPE[0x5E] = 2 // ^ (fallback)
INLINE_NEEDS_ESCAPE[0x5F] = 2 // _ (fallback)
INLINE_NEEDS_ESCAPE[0x60] = 2 // ` (fallback)
INLINE_NEEDS_ESCAPE[0x7B] = 2 // { (fallback)
INLINE_NEEDS_ESCAPE[0x7D] = 2 // } (fallback)
INLINE_NEEDS_ESCAPE[0x7E] = 2 // ~ (fallback)

function renderPlainInline(src: string): string | null {
  const len = src.length

  // Fast path for short strings using lookup table
  if (len <= 32) {
    let hasQuote = false
    for (let i = 0; i < len; i++) {
      const code = src.charCodeAt(i)
      const flag = code < 256 ? INLINE_NEEDS_ESCAPE[code] : 0
      if (flag === 2) // fallback character
        return null
      if (flag === 1) // quote
        hasQuote = true
    }
    return hasQuote ? src.replace(INLINE_QUOTE_RE, '&quot;') : src
  }

  // For longer strings, use regex
  if (!INLINE_SPECIAL_RE.test(src))
    return src

  if (INLINE_FALLBACK_RE.test(src))
    return null

  return src.replace(INLINE_QUOTE_RE, '&quot;')
}

function renderAtxHeading(src: string, pos: number, end: number): string | null {
  let level = 0
  let markerEnd = pos
  while (markerEnd < end && src.charCodeAt(markerEnd) === 0x23 && level < 6) {
    markerEnd++
    level++
  }

  if (level === 0 || markerEnd >= end || src.charCodeAt(markerEnd) !== 0x20)
    return null

  let contentStart = markerEnd + 1
  while (contentStart < end && src.charCodeAt(contentStart) === 0x20)
    contentStart++

  let contentEnd = end
  while (contentEnd > contentStart && src.charCodeAt(contentEnd - 1) === 0x20)
    contentEnd--

  let markerStart = contentEnd
  while (markerStart > contentStart && src.charCodeAt(markerStart - 1) === 0x23)
    markerStart--

  if (markerStart > contentStart && src.charCodeAt(markerStart - 1) === 0x20) {
    contentEnd = markerStart - 1
    while (contentEnd > contentStart && src.charCodeAt(contentEnd - 1) === 0x20)
      contentEnd--
  }

  const content = renderPlainInline(src.slice(contentStart, contentEnd))
  if (content === null)
    return null

  return `<h${level}>${content}</h${level}>\n`
}

function startsWithBulletItem(src: string, pos: number, end: number): boolean {
  return pos + 1 < end && src.charCodeAt(pos) === 0x2D && src.charCodeAt(pos + 1) === 0x20
}

function renderSingleCharBulletItem(src: string, pos: number): string | null {
  switch (src.charCodeAt(pos)) {
    case 0x22:
      return '<li>&quot;</li>\n'
    case 0x0A:
    case 0x21:
    case 0x23:
    case 0x24:
    case 0x25:
    case 0x26:
    case 0x2A:
    case 0x2B:
    case 0x2D:
    case 0x3A:
    case 0x3C:
    case 0x3D:
    case 0x3E:
    case 0x40:
    case 0x5B:
    case 0x5C:
    case 0x5D:
    case 0x5E:
    case 0x5F:
    case 0x60:
    case 0x7B:
    case 0x7D:
    case 0x7E:
      return null
  }
  return `<li>${src[pos]}</li>\n`
}

function renderBulletItem(src: string, pos: number, end: number): string | null {
  const contentStart = pos + 2
  if (end === contentStart + 1)
    return renderSingleCharBulletItem(src, contentStart)

  const content = renderPlainInline(src.slice(pos + 2, end))
  return content === null ? null : `<li>${content}</li>\n`
}

function fenceLang(src: string, start: number, end: number): string | null {
  while (start < end) {
    const ch = src.charCodeAt(start)
    if (ch !== 0x20 && ch !== 0x09)
      break
    start++
  }

  while (end > start) {
    const ch = src.charCodeAt(end - 1)
    if (ch !== 0x20 && ch !== 0x09)
      break
    end--
  }

  let langEnd = end
  for (let pos = start; pos < end; pos++) {
    const ch = src.charCodeAt(pos)
    if (ch === 0x60)
      return null
    if (ch === 0x20 || ch === 0x09) {
      langEnd = pos
      break
    }
  }

  return src.slice(start, langEnd)
}

interface FenceOpenCache {
  lang: string
  open: string
}

function renderFence(src: string, pos: number, end: number, cache: FenceOpenCache): { html: string, nextPos: number } | null {
  if (!startsWithFence(src, pos, end))
    return null

  const lang = fenceLang(src, pos + 3, end)
  if (lang === null)
    return null

  const contentStart = end < src.length ? end + 1 : end
  let contentEnd = contentStart
  let scan = contentStart

  while (scan < src.length) {
    const closeEnd = lineEnd(src, scan)
    if (startsWithFence(src, scan, closeEnd) && isBlankLine(src, scan + 3, closeEnd)) {
      const content = src.slice(contentStart, contentEnd)
      let open: string
      if (lang === cache.lang) {
        open = cache.open
      }
      else {
        open = lang
          ? `<pre><code class="language-${escapeHtml(lang)}">`
          : '<pre><code>'
        cache.lang = lang
        cache.open = open
      }
      return {
        html: `${open}${escapeHtml(content)}</code></pre>\n`,
        nextPos: closeEnd < src.length ? closeEnd + 1 : closeEnd,
      }
    }

    scan = closeEnd < src.length ? closeEnd + 1 : closeEnd
    contentEnd = scan
  }

  return null
}

/**
 * Experimental stock renderer fast path.
 *
 * Returns HTML for the supported stock subset, or null when the input needs
 * the normal markdown-it-compatible parser and renderer.
 */
export function renderStockFast(src: string): string | null {
  if (src.length === 0)
    return ''

  if (src.includes('\r') || src.includes('\0'))
    return null

  let pos = 0
  let html = ''
  const useChunks = src.length >= 250_000
  const chunks: string[] = []
  const fenceOpenCache: FenceOpenCache = { lang: '', open: '<pre><code>' }
  let lastListSource = ''
  let lastListHtml = ''
  let lastParagraph = ''
  let lastParagraphHtml = ''

  while (pos < src.length) {
    const end = lineEnd(src, pos)

    if (pos === end) {
      pos = end < src.length ? end + 1 : end
      continue
    }

    const ch = src.charCodeAt(pos)

    if (ch === 0x20 || ch === 0x09) {
      if (!isBlankLine(src, pos, end))
        return null
      pos = end < src.length ? end + 1 : end
      continue
    }

    if (ch === 0x23) {
      const heading = renderAtxHeading(src, pos, end)
      if (heading === null)
        return null
      if (useChunks)
        chunks.push(heading)
      else
        html += heading
      pos = skipEmptyLines(src, end < src.length ? end + 1 : end)
      continue
    }

    if (ch === 0x2D) {
      let nextPos = pos

      while (nextPos < src.length) {
        const itemEnd = lineEnd(src, nextPos)
        if (!startsWithBulletItem(src, nextPos, itemEnd))
          break
        nextPos = itemEnd < src.length ? itemEnd + 1 : itemEnd
      }

      if (nextPos === pos)
        return null

      const listSource = src.slice(pos, nextPos)
      let listHtml: string
      if (listSource === lastListSource) {
        listHtml = lastListHtml
      }
      else {
        let itemPos = pos
        listHtml = '<ul>\n'
        while (itemPos < nextPos) {
          const itemEnd = lineEnd(src, itemPos)
          const item = renderBulletItem(src, itemPos, itemEnd)
          if (item === null)
            return null

          listHtml += item
          itemPos = itemEnd < src.length ? itemEnd + 1 : itemEnd
        }
        listHtml += '</ul>\n'
        lastListSource = listSource
        lastListHtml = listHtml
      }

      let lookahead = skipEmptyLines(src, nextPos)
      while (lookahead < src.length) {
        if (src.charCodeAt(lookahead) === 0x0A) {
          lookahead++
          continue
        }

        const lookaheadEnd = lineEnd(src, lookahead)
        if (!isBlankLine(src, lookahead, lookaheadEnd)) {
          if (startsWithBulletItem(src, lookahead, lookaheadEnd))
            return null
          break
        }
        lookahead = lookaheadEnd < src.length ? lookaheadEnd + 1 : lookaheadEnd
      }

      if (useChunks)
        chunks.push(listHtml)
      else
        html += listHtml
      pos = lookahead
      continue
    }

    if (ch === 0x60) {
      const fence = renderFence(src, pos, end, fenceOpenCache)
      if (!fence)
        return null

      if (useChunks)
        chunks.push(fence.html)
      else
        html += fence.html
      pos = skipEmptyLines(src, fence.nextPos)
      continue
    }

    const paragraph = paragraphContent(src, pos, end)
    let paragraphHtml: string
    if (paragraph === lastParagraph) {
      paragraphHtml = lastParagraphHtml
    }
    else {
      const paragraphHtmlContent = renderPlainInline(paragraph)
      if (paragraphHtmlContent === null)
        return null
      paragraphHtml = `<p>${paragraphHtmlContent}</p>\n`
      lastParagraph = paragraph
      lastParagraphHtml = paragraphHtml
    }

    const nextPos = end < src.length ? end + 1 : end
    if (nextPos < src.length && src.charCodeAt(nextPos) !== 0x0A && startsParagraphContinuation(src, nextPos))
      return null

    if (useChunks)
      chunks.push(paragraphHtml)
    else
      html += paragraphHtml
    pos = skipEmptyLines(src, nextPos)
  }

  return useChunks ? chunks.join('') : html
}
