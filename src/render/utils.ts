/**
 * Common utility functions for escaping HTML and unescaping entities
 */

const HTML_ESCAPE_TEST_RE = /[&<>"]/
const HTML_ESCAPE_REPLACE_RE = /[&<>"]/g
const HTML_REPLACEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

function replaceUnsafeChar(ch: string): string {
  return HTML_REPLACEMENTS[ch] || ch
}

/**
 * Escape HTML characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (HTML_ESCAPE_TEST_RE.test(str)) {
    return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar)
  }
  return str
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

      if (code >= 0xD800 && code <= 0xDFFF) {
        return '\uFFFD' // Invalid surrogate pair
      }
      if (code >= 0x80 && code <= 0x9F) {
        return '\uFFFD' // Invalid control character
      }

      return String.fromCodePoint(code)
    }

    // For named entities, we'd need a full entity map
    // For now, just return the original
    return match
  })
}
