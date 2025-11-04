// Common utility functions used across markdown-it

import * as ucmicro from 'uc.micro'

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

// String.fromCharCode() equivalent that works with astral plane characters
export function fromCodePoint(c: number): string {
  if (c > 0xFFFF) {
    c -= 0x10000
    const surrogate1 = 0xD800 + (c >> 10)
    const surrogate2 = 0xDC00 + (c & 0x3FF)

    return String.fromCharCode(surrogate1, surrogate2)
  }
  return String.fromCharCode(c)
}

// Check if entity code is valid
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

// Object.assign polyfill for plugins that merge options
export function assign(obj: any, ...args: any[]): any {
  const sources = args

  sources.forEach((source) => {
    if (!source) {
      return
    }

    if (typeof source !== 'object') {
      throw new TypeError(`${source} must be object`)
    }

    Object.keys(source).forEach((key) => {
      obj[key] = source[key]
    })
  })

  return obj
}

// Escape special characters for use in regular expressions
export function escapeRE(str: string): string {
  return str.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
}

// Unescape markdown backslash sequences
export function unescapeMd(str: string): string {
  if (!str.includes('\\')) {
    return str
  }
  return str.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1')
}
