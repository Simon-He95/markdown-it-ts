/**
 * Link utilities for normalizing and validating URLs
 */

import * as mdurl from 'mdurl'
import punycode from 'punycode.js'

const BAD_PROTO_RE = /^(?:vbscript|javascript|file|data):/
const GOOD_DATA_RE = /^data:image\/(?:gif|png|jpeg|webp);/
const RECODE_HOSTNAME_FOR = ['http:', 'https:', 'mailto:']

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
      try {
        parsed.hostname = punycode.toASCII(parsed.hostname)
      }
      catch {
        /* ignore encoding errors */
      }
    }
  }

  return mdurl.encode(mdurl.format(parsed))
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
      try {
        parsed.hostname = punycode.toUnicode(parsed.hostname)
      }
      catch {
        /* ignore encoding errors */
      }
    }
  }

  // add '%' to exclude list because of https://github.com/markdown-it/markdown-it/issues/720
  return mdurl.decode(mdurl.format(parsed), `${mdurl.decode.defaultChars}%`)
}
