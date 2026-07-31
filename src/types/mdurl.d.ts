// Local type shim for `mdurl`.
// Replaces @types/mdurl so downstream consumers don't need to install a
// separate @types package just for the re-exported `mdurl`/`lib` helpers.
declare module 'mdurl' {
  export class Url {
    protocol: string
    slashes: string
    auth: string
    port: string
    hostname: string
    hash: string
    search: string
    pathname: string
    constructor()
    parse(url: string, slashesDenoteHost?: boolean): this
    parseHost(host: string): void
  }
  export const decode: {
    defaultChars: string
    componentChars: string
    /** Decode percent-encoded string. */
    (str: string, exclude?: string): string
  }
  export const encode: {
    defaultChars: string
    componentChars: string
    /** Encode unsafe characters with percent-encoding, skipping already encoded sequences. */
    (str: string, exclude?: string, keepEscaped?: boolean): string
  }
  export function format(url: Omit<Url, 'parse' | 'parseHost'>): string
  export function parse(url: string | Url, slashesDenoteHost?: boolean): Url
}
