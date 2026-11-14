import { isSpace } from '../common/utils'
import { skipOrderedListMarker } from '../rules/block/list'

export function isStockFenceClose(src: string, pos: number, end: number): boolean {
  const start = pos
  while (pos - start < 3 && src.charCodeAt(pos) === 0x20)
    pos++

  const markerStart = pos
  while (pos < end && src.charCodeAt(pos) === 0x60)
    pos++

  if (pos - markerStart < 3)
    return false

  while (pos < end && isSpace(src.charCodeAt(pos)))
    pos++

  return pos === end
}

export function startsWithOrderedItem(src: string, pos: number, end: number): boolean {
  const ch = src.charCodeAt(pos)
  return ch >= 0x30 && ch <= 0x39 && skipOrderedListMarker(src, pos, end) !== -1
}

export function startsWithSimpleBulletItem(src: string, pos: number, end: number): boolean {
  return pos + 2 < end
    && src.charCodeAt(pos) === 0x2D
    && src.charCodeAt(pos + 1) === 0x20
    && !isSpace(src.charCodeAt(pos + 2))
    && !isSpace(src.charCodeAt(end - 1))
}

export function startsWithDashMarker(src: string, pos: number, end: number): boolean {
  return src.charCodeAt(pos) === 0x2D && (pos + 1 === end || isSpace(src.charCodeAt(pos + 1)))
}

export function stockParagraphContent(src: string, start: number, end: number): string {
  while (end > start && isSpace(src.charCodeAt(end - 1)))
    end--
  return src.slice(start, end)
}

export function stockAtxHeading(src: string, pos: number, end: number): { level: number, content: string } | null {
  let level = 0
  let markerEnd = pos
  while (markerEnd < end && src.charCodeAt(markerEnd) === 0x23 && level < 6) {
    markerEnd++
    level++
  }

  if (level === 0 || markerEnd >= end || src.charCodeAt(markerEnd) !== 0x20)
    return null

  let contentStart = markerEnd + 1
  while (contentStart < end && isSpace(src.charCodeAt(contentStart)))
    contentStart++

  let contentEnd = end
  while (contentEnd > contentStart && isSpace(src.charCodeAt(contentEnd - 1)))
    contentEnd--

  let markerStart = contentEnd
  while (markerStart > contentStart && src.charCodeAt(markerStart - 1) === 0x23)
    markerStart--

  if (markerStart > contentStart && isSpace(src.charCodeAt(markerStart - 1))) {
    contentEnd = markerStart - 1
    while (contentEnd > contentStart && isSpace(src.charCodeAt(contentEnd - 1)))
      contentEnd--
  }

  return contentStart < contentEnd ? { level, content: src.slice(contentStart, contentEnd) } : null
}
