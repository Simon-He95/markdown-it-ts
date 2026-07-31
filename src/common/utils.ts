// Common utility functions used across markdown-it

import { decodeHTML } from 'entities'
import * as mdurl from 'mdurl'

// Inlined from `uc.micro` (Unicode categories Any/Cc/Cf/P/S/Z).
// Removed the external dependency; the full category set is preserved so that
// downstream markdown-it plugins (e.g. markdown-it-abbr) can access md.utils.lib.ucmicro.*
/* eslint-disable no-control-regex, regexp/no-obscure-range, regexp/no-useless-escape */
const UCMICRO_ANY = /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/
const UCMICRO_CC = /[\0-\x1F\x7F-\x9F]/
const UCMICRO_CF = /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/
const UCMICRO_P = /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/
const UCMICRO_S = /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/

const UCMICRO_Z = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/
/* eslint-enable no-control-regex, regexp/no-obscure-range, regexp/no-useless-escape */

const ucmicro = {
  Any: UCMICRO_ANY,
  Cc: UCMICRO_CC,
  Cf: UCMICRO_CF,
  P: UCMICRO_P,
  S: UCMICRO_S,
  Z: UCMICRO_Z,
}

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

const PUNCT_CHAR_CACHE = new Map<number, boolean>()

export function isPunctCode(ch: number): boolean {
  if (isMdAsciiPunct(ch))
    return true
  if (ch >= 0 && ch < 0x80)
    return false

  const cached = PUNCT_CHAR_CACHE.get(ch)
  if (cached !== undefined)
    return cached

  const value = isPunctChar(String.fromCharCode(ch))
  PUNCT_CHAR_CACHE.set(ch, value)
  return value
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

// Count number of line breaks ("\n") in a string without allocating arrays
export function countLines(input: string): number {
  if (input.length === 0)
    return 0
  let count = 0
  let pos = -1
  while ((pos = input.indexOf('\n', pos + 1)) !== -1) count++
  return count
}
