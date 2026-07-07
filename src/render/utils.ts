/**
 * Common utility functions for escaping HTML and unescaping entities
 */

import { decodeHTML } from 'entities'
import { fromCodePoint, isValidEntityCode } from '../common/utils'

const HTML_ESCAPE_TEST_RE = /[&<>"]/
const HTML_ESCAPE_REPLACE_RE = /[&<>"]/g
const HTML_ESCAPE_AMP_RE = /&/g
const HTML_ESCAPE_NO_AMP_RE = /[<>"]/g

// Use array lookup for faster character replacement
const ESCAPE_LOOKUP: string[] = []
ESCAPE_LOOKUP[38] = '&amp;' // &
ESCAPE_LOOKUP[60] = '&lt;' // <
ESCAPE_LOOKUP[62] = '&gt;' // >
ESCAPE_LOOKUP[34] = '&quot;' // "

function replaceUnsafeChar(ch: string): string {
  return ESCAPE_LOOKUP[ch.charCodeAt(0)] || ch
}

// Optimized manual string builder for short strings
function escapeShortManual(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    const escaped = ESCAPE_LOOKUP[code]
    result += escaped || str[i]
  }
  return result
}

/**
 * Escape HTML characters to prevent XSS
 * Optimized version with fast paths for common cases
 */
export function escapeHtml(str: string): string {
  const len = str.length
  if (len === 0)
    return ''

  // Fast path for very short strings (no test needed)
  if (len === 1) {
    const code = str.charCodeAt(0)
    return ESCAPE_LOOKUP[code] || str
  }

  if (len <= 8) {
    // For very short strings (≤8 chars), manual scanning is ~2x faster than regex
    // due to avoiding regex engine initialization overhead
    let needsEscape = false
    for (let i = 0; i < len; i++) {
      const code = str.charCodeAt(i)
      if (code === 38 || code === 60 || code === 62 || code === 34) {
        needsEscape = true
        break
      }
    }
    return needsEscape ? escapeShortManual(str) : str
  }

  if (len < 32) {
    // Medium strings: use regex test + replace (still faster than long-string branching)
    if (HTML_ESCAPE_TEST_RE.test(str))
      return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar)
    return str
  }

  // For longer strings, use includes for branching
  const hasAmp = str.includes('&')
  const hasLt = str.includes('<')
  const hasGt = str.includes('>')
  const hasQuot = str.includes('"')

  if (!hasAmp && !hasLt && !hasGt && !hasQuot)
    return str

  if (hasAmp && !hasLt && !hasGt && !hasQuot)
    return str.replace(HTML_ESCAPE_AMP_RE, '&amp;')

  if (!hasAmp)
    return str.replace(HTML_ESCAPE_NO_AMP_RE, replaceUnsafeChar)

  return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar)
}

const UNESCAPE_MD_RE = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g
const ENTITY_RE = /&([a-z#][a-z0-9]{1,31});/gi
const UNESCAPE_ALL_RE = new RegExp(`${UNESCAPE_MD_RE.source}|${ENTITY_RE.source}`, 'gi')

const DIGITAL_ENTITY_TEST_RE = /^#(?:x[a-f0-9]{1,8}|\d{1,8})$/i

/**
 * Unescape all backslash escapes and HTML entities
 */
export function unescapeAll(str: string): string {
  if (!str.includes('\\') && !str.includes('&')) {
    return str
  }

  return str.replace(UNESCAPE_ALL_RE, (match, escaped, entity) => {
    if (escaped) {
      return escaped
    }

    // Handle numeric entities
    if (DIGITAL_ENTITY_TEST_RE.test(entity)) {
      const code = entity[1].toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10)

      return isValidEntityCode(code) ? fromCodePoint(code) : '\uFFFD'
    }

    const decoded = decodeHTML(match)
    return decoded !== match ? decoded : match
  })
}
