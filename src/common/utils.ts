// Common utility functions used across markdown-it

import { decodeHTML } from 'entities'
import * as mdurl from 'mdurl'
import * as ucmicro from 'uc.micro'

function _class(obj: unknown): string {
  return Object.prototype.toString.call(obj)
}

export function isString(obj: unknown): obj is string {
  return _class(obj) === '[object String]'
}

const _hasOwnProperty = Object.prototype.hasOwnProperty

export function has(object: object, key: string | number | symbol): boolean {
  return _hasOwnProperty.call(object, key)
}

// Merge objects
export function assign<T extends Record<string, any>>(obj: T, ...sources: any[]): T {
  sources.forEach((source) => {
    if (!source)
      return
    if (typeof source !== 'object') {
      throw new TypeError(`${String(source)}must be object`)
    }
    Object.keys(source).forEach((key) => {
      ;(obj as any)[key] = (source as any)[key]
    })
  })
  return obj
}

export function isSpace(code: number): boolean {
  return code === 0x09 || code === 0x20
}

// Zs (unicode class) || [\t\f\v\r\n]
export function isWhiteSpace(code: number): boolean {
  if (code >= 0x2000 && code <= 0x200A)
    return true
  switch (code) {
    case 0x09: // \t
    case 0x0A: // \n
    case 0x0B: // \v
    case 0x0C: // \f
    case 0x0D: // \r
    case 0x20:
    case 0xA0:
    case 0x1680:
    case 0x202F:
    case 0x205F:
    case 0x3000:
      return true
  }
  return false
}

// Currently without astral characters support.
export function isPunctChar(ch: string): boolean {
  return ucmicro.P.test(ch) || ucmicro.S.test(ch)
}

// Markdown ASCII punctuation characters.
//
// !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /, :, ;, <, =, >, ?, @, [, \, ], ^, _, `, {, |, }, or ~
// http://spec.commonmark.org/0.15/#ascii-punctuation-character
//
// Don't confuse with unicode punctuation !!! It lacks some chars in ascii range.
//
export function isMdAsciiPunct(ch: number): boolean {
  switch (ch) {
    case 0x21: /* ! */
    case 0x22: /* " */
    case 0x23: /* # */
    case 0x24: /* $ */
    case 0x25: /* % */
    case 0x26: /* & */
    case 0x27: /* ' */
    case 0x28: /* ( */
    case 0x29: /* ) */
    case 0x2A: /* * */
    case 0x2B: /* + */
    case 0x2C: /* , */
    case 0x2D: /* - */
    case 0x2E: /* . */
    case 0x2F: /* / */
    case 0x3A: /* : */
    case 0x3B: /* ; */
    case 0x3C: /* < */
    case 0x3D: /* = */
    case 0x3E: /* > */
    case 0x3F: /* ? */
    case 0x40: /* @ */
    case 0x5B: /* [ */
    case 0x5C: /* \ */
    case 0x5D: /* ] */
    case 0x5E: /* ^ */
    case 0x5F: /* _ */
    case 0x60: /* ` */
    case 0x7B: /* { */
    case 0x7C: /* | */
    case 0x7D: /* } */
    case 0x7E: /* ~ */
      return true
    default:
      return false
  }
}

export function normalizeReference(str: string): string {
  str = str.trim().replace(/\s+/g, ' ')
  if ('ẞ'.toLowerCase() === 'Ṿ') {
    str = str.replace(/ẞ/g, 'ß')
  }
  return str.toLowerCase().toUpperCase()
}

export function arrayReplaceAt<T>(src: T[], pos: number, newElements: T[]): T[] {
  return [...src.slice(0, pos), ...newElements, ...src.slice(pos + 1)]
}

export function isValidEntityCode(c: number): boolean {
  // broken sequence
  if (c >= 0xD800 && c <= 0xDFFF) {
    return false
  }
  // never used
  if (c >= 0xFDD0 && c <= 0xFDEF) {
    return false
  }
  if ((c & 0xFFFF) === 0xFFFF || (c & 0xFFFF) === 0xFFFE) {
    return false
  }
  // control codes
  if (c >= 0x00 && c <= 0x08) {
    return false
  }
  if (c === 0x0B) {
    return false
  }
  if (c >= 0x0E && c <= 0x1F) {
    return false
  }
  if (c >= 0x7F && c <= 0x9F) {
    return false
  }
  // out of range
  if (c > 0x10FFFF) {
    return false
  }
  return true
}

export function fromCodePoint(c: number): string {
  if (c > 0xFFFF) {
    c -= 0x10000
    const surrogate1 = 0xD800 + (c >> 10)
    const surrogate2 = 0xDC00 + (c & 0x3FF)
    return String.fromCharCode(surrogate1, surrogate2)
  }
  return String.fromCharCode(c)
}

/* eslint-disable regexp/no-useless-escape, regexp/no-unused-capturing-group, regexp/no-useless-non-capturing-group, regexp/prefer-d */
const UNESCAPE_MD_RE = /\\([!"#$%&'()*+,\-\./:;<=>?@[\\\]^_`{|}~])/g
const ENTITY_RE = /&([a-z#][a-z0-9]{1,31});/gi
const UNESCAPE_ALL_RE = new RegExp(`${UNESCAPE_MD_RE.source}|${ENTITY_RE.source}`, 'gi')

const DIGITAL_ENTITY_TEST_RE = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i

function replaceEntityPattern(match: string, name: string): string {
  if (name.charCodeAt(0) === 0x23 /* # */ && DIGITAL_ENTITY_TEST_RE.test(name)) {
    const code = name[1].toLowerCase() === 'x'
      ? Number.parseInt(name.slice(2), 16)
      : Number.parseInt(name.slice(1), 10)

    if (isValidEntityCode(code)) {
      return fromCodePoint(code)
    }
    return match
  }

  const decoded = decodeHTML(match)
  if (decoded !== match)
    return decoded
  return match
}

export function unescapeMd(str: string): string {
  if (!str.includes('\\'))
    return str
  return str.replace(UNESCAPE_MD_RE, '$1')
}

export function unescapeAll(str: string): string {
  if (!str.includes('\\') && !str.includes('&'))
    return str

  return str.replace(UNESCAPE_ALL_RE, (match: string, escaped?: string, entity?: string) => {
    if (escaped)
      return escaped
    // entity is defined because of alternation
    return replaceEntityPattern(match, entity as string)
  })
}

/* eslint-enable regexp/no-useless-escape, regexp/no-unused-capturing-group, regexp/no-useless-non-capturing-group, regexp/prefer-d */
const HTML_ESCAPE_TEST_RE = /[&<>"]/
const HTML_ESCAPE_REPLACE_RE = /[&<>"]/g
const HTML_REPLACEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

function replaceUnsafeChar(ch: string): string {
  return HTML_REPLACEMENTS[ch]
}

export function escapeHtml(str: string): string {
  if (HTML_ESCAPE_TEST_RE.test(str)) {
    return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar)
  }
  return str
}

const REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g

export function escapeRE(str: string): string {
  return str.replace(REGEXP_ESCAPE_RE, '\\$&')
}

// Re-export libraries commonly used in both markdown-it and its plugins
export const lib = { mdurl, ucmicro } as const

export { mdurl, ucmicro }
