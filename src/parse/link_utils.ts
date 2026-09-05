/**
 * Link utilities for normalizing and validating URLs
 */

import * as mdurl from 'mdurl'
import punycode from 'punycode.js'

const BAD_PROTO_RE = /^(?:vbscript|javascript|file|data):/
const GOOD_DATA_RE = /^data:image\/(?:gif|png|jpeg|webp);/
const RECODE_HOSTNAME_FOR = ['http:', 'https:', 'mailto:']
const NON_ASCII_RE = /[^\0-\x7F]/
const PUNYCODE_LABEL_RE = /xn--/
// mdurl.encode(url) with default keepEscaped + defaultChars is the identity
// when every character is alphanumeric / in defaultChars, and every `%` is
// part of a valid two-hex-digit escape sequence.
const ENCODE_IDENTITY_RE = /%(?![0-9a-f]{2})|[^\w;/?:@&=+$,\-.!~*'()#%]/i
// mdurl.decode(str, defaultChars + '%') is the identity when there is no
// `%` + two-hex-digit sequence (bare `%` is excluded from decoding).
const DECODE_SCAN_RE = /%[0-9a-f]{2}/i

/**
 * Validate URL to prevent XSS attacks.
 * This validator can prohibit more than really needed to prevent XSS.
 * It's a tradeoff to keep code simple and to be secure by default.
 */
export function validateLink(url: string): boolean {
  // url should be normalized at this point, and existing entities are decoded
  const str = url.trim().toLowerCase()
  return BAD_PROTO_RE.test(str) ? GOOD_DATA_RE.test(str) : true
}

/**
 * Normalize link URL by encoding hostname to ASCII (punycode)
 */
export function normalizeLink(url: string): string {
  const parsed = mdurl.parse(url, true)

  if (parsed.hostname) {
    // Encode hostnames in urls like:
    // `http://host/`, `https://host/`, `mailto:user@host`, `//host/`
    //
    // We don't encode unknown schemas, because it's likely that we encode
    // something we shouldn't (e.g. `skype:name` treated as `skype:host`)
    //
    if (!parsed.protocol || RECODE_HOSTNAME_FOR.includes(parsed.protocol)) {
      // punycode.toASCII is the identity for pure-ASCII hostnames
      // (mapDomain only rewrites labels containing non-ASCII characters).
      if (NON_ASCII_RE.test(parsed.hostname)) {
        try {
          parsed.hostname = punycode.toASCII(parsed.hostname)
        }
        catch {
          /* ignore encoding errors */
        }
      }
    }
  }

  const formatted = mdurl.format(parsed)
  return ENCODE_IDENTITY_RE.test(formatted) ? mdurl.encode(formatted) : formatted
}

/**
 * Normalize link text by decoding hostname from punycode to Unicode
 */
export function normalizeLinkText(url: string): string {
  const parsed = mdurl.parse(url, true)

  if (parsed.hostname) {
    // Encode hostnames in urls like:
    // `http://host/`, `https://host/`, `mailto:user@host`, `//host/`
    //
    // We don't encode unknown schemas, because it's likely that we encode
    // something we shouldn't (e.g. `skype:name` treated as `skype:host`)
    //
    if (!parsed.protocol || RECODE_HOSTNAME_FOR.includes(parsed.protocol)) {
      // toUnicode only rewrites lowercase `xn--` punycode labels; for
      // pure-ASCII hostnames without any punycode label it is the identity.
      if (NON_ASCII_RE.test(parsed.hostname) || PUNYCODE_LABEL_RE.test(parsed.hostname)) {
        try {
          parsed.hostname = punycode.toUnicode(parsed.hostname)
        }
        catch {
          /* ignore encoding errors */
        }
      }
    }
  }

  // add '%' to exclude list because of https://github.com/markdown-it/markdown-it/issues/720
  const formatted = mdurl.format(parsed)
  return DECODE_SCAN_RE.test(formatted)
    ? mdurl.decode(formatted, `${mdurl.decode.defaultChars}%`)
    : formatted
}
