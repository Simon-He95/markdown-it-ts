declare module 'punycode.js' {
  export function toASCII(domain: string): string
  export function toUnicode(domain: string): string
  export function encode(input: string): string
  export function decode(input: string): string
}
