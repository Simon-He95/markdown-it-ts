import type { StockFastDiagnostics } from '../parse/strategy_diagnostics'
import { isStockFenceClose, startsWithDashMarker, startsWithOrderedItem, startsWithSimpleBulletItem, stockAtxHeading, stockParagraphContent } from '../parse/stock_block'
import { escapeHtml, unescapeAll } from './utils'

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

function renderPlainInline(src: string): string | null {
  if (!INLINE_SPECIAL_RE.test(src))
    return src

  if (INLINE_FALLBACK_RE.test(src))
    return null

  return src.replace(INLINE_QUOTE_RE, '&quot;')
}

function renderAtxHeading(src: string, pos: number, end: number): string | null {
  const heading = stockAtxHeading(src, pos, end)
  if (!heading)
    return null

  const { level } = heading
  const content = renderPlainInline(heading.content)
  if (content === null)
    return null

  return `<h${level}>${content}</h${level}>\n`
}

// 0 = must fall back to the full parser, 1 = safe to render as-is.
// Covers all inline terminators plus the '"' char (rendered as &quot;).
const BULLET_SAFE_TABLE = new Uint8Array(256).fill(1)
for (const code of [0x0A, 0x21, 0x23, 0x24, 0x25, 0x26, 0x2A, 0x2B, 0x2D, 0x3A, 0x3C, 0x3D, 0x3E, 0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F, 0x60, 0x7B, 0x7D, 0x7E])
  BULLET_SAFE_TABLE[code] = 0
BULLET_SAFE_TABLE[0x22] = 0 // "

function renderSingleCharBulletItem(src: string, pos: number): string | null {
  const ch = src.charCodeAt(pos)
  if (ch === 0x22)
    return '<li>&quot;</li>\n'
  if (ch < 0x100 && BULLET_SAFE_TABLE[ch] === 0)
    return null
  return `<li>${src[pos]}</li>\n`
}

function renderBulletItem(src: string, pos: number, end: number): string | null {
  const contentStart = pos + 2
  if (end === contentStart + 1)
    return renderSingleCharBulletItem(src, contentStart)

  const content = renderPlainInline(src.slice(pos + 2, end))
  return content === null ? null : `<li>${content}</li>\n`
}

interface FenceOpenCache {
  info: string | null
  lang: string | null
  open: string
}

function renderFence(
  src: string,
  pos: number,
  end: number,
  cache: FenceOpenCache,
  diagnostics?: StockFastDiagnostics,
): { html: string, nextPos: number } | null {
  if (!startsWithFence(src, pos, end))
    return null

  const rawInfo = src.slice(pos + 3, end)
  let lang = cache.lang
  if (rawInfo !== cache.info) {
    if (rawInfo.includes('`'))
      return null

    const info = unescapeAll(rawInfo).trim()
    const langEnd = info.search(/\s/)
    lang = langEnd === -1 ? info : info.slice(0, langEnd)
  }

  const contentStart = end < src.length ? end + 1 : end
  let contentEnd = contentStart
  let scan = contentStart

  while (scan < src.length) {
    const closeEnd = lineEnd(src, scan)
    if (isStockFenceClose(src, scan, closeEnd)) {
      const content = src.slice(contentStart, contentEnd)
      let open: string
      if (lang === cache.lang) {
        if (diagnostics)
          diagnostics.fenceCacheHits++
        open = cache.open
      }
      else {
        if (diagnostics)
          diagnostics.fenceCacheMisses++
        open = lang
          ? `<pre><code class="language-${escapeHtml(lang)}">`
          : '<pre><code>'
        cache.lang = lang
        cache.open = open
      }
      cache.info = rawInfo
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
function renderStockFastInternal(src: string, diagnostics?: StockFastDiagnostics): string | null {
  if (src.length === 0) {
    if (diagnostics)
      diagnostics.matched = true
    return ''
  }

  if (src.includes('\r') || src.includes('\0'))
    return null

  let pos = 0
  let html = ''
  const useChunks = src.length >= 250_000
  const chunks: string[] = []
  const fenceOpenCache: FenceOpenCache = { info: null, lang: null, open: '' }
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
      if (diagnostics) {
        diagnostics.blocks++
        diagnostics.headings++
      }
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
        if (!startsWithSimpleBulletItem(src, nextPos, itemEnd))
          break
        nextPos = itemEnd < src.length ? itemEnd + 1 : itemEnd
      }

      if (nextPos === pos)
        return null

      const listSource = src.slice(pos, nextPos)
      let listHtml: string
      if (listSource === lastListSource) {
        if (diagnostics)
          diagnostics.listCacheHits++
        listHtml = lastListHtml
      }
      else {
        if (diagnostics)
          diagnostics.listCacheMisses++
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

      let lookahead = nextPos
      while (lookahead < src.length) {
        if (src.charCodeAt(lookahead) === 0x0A) {
          lookahead++
          continue
        }

        const lookaheadEnd = lineEnd(src, lookahead)
        if (!isBlankLine(src, lookahead, lookaheadEnd)) {
          if (lookahead === nextPos || startsWithDashMarker(src, lookahead, lookaheadEnd))
            return null
          break
        }
        lookahead = lookaheadEnd < src.length ? lookaheadEnd + 1 : lookaheadEnd
      }

      if (diagnostics) {
        diagnostics.blocks++
        diagnostics.lists++
      }
      if (useChunks)
        chunks.push(listHtml)
      else
        html += listHtml
      pos = lookahead
      continue
    }

    if (ch === 0x60) {
      const fence = renderFence(src, pos, end, fenceOpenCache, diagnostics)
      if (!fence)
        return null

      if (diagnostics) {
        diagnostics.blocks++
        diagnostics.fences++
      }
      if (useChunks)
        chunks.push(fence.html)
      else
        html += fence.html
      pos = skipEmptyLines(src, fence.nextPos)
      continue
    }

    if (startsWithOrderedItem(src, pos, end))
      return null

    const paragraph = stockParagraphContent(src, pos, end)
    let paragraphHtml: string
    if (paragraph === lastParagraph) {
      if (diagnostics)
        diagnostics.paragraphCacheHits++
      paragraphHtml = lastParagraphHtml
    }
    else {
      if (diagnostics)
        diagnostics.paragraphCacheMisses++
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

    if (diagnostics) {
      diagnostics.blocks++
      diagnostics.paragraphs++
    }
    if (useChunks)
      chunks.push(paragraphHtml)
    else
      html += paragraphHtml
    pos = skipEmptyLines(src, nextPos)
  }

  if (diagnostics)
    diagnostics.matched = true
  return useChunks ? chunks.join('') : html
}

export function renderStockFast(src: string): string | null {
  return renderStockFastInternal(src)
}

export function renderStockFastWithDiagnostics(src: string, diagnostics: StockFastDiagnostics): string | null {
  return renderStockFastInternal(src, diagnostics)
}
