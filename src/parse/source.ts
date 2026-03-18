export interface TextSource {
  readonly length: number
  charAt: (index: number) => string
  charCodeAt: (index: number) => number
  indexOf: (searchValue: string, fromIndex?: number) => number
  includes: (searchValue: string, fromIndex?: number) => boolean
  slice: (start?: number, end?: number) => string
  toString: () => string
}

export type ParseSource = string | TextSource

export function hasNormalizationChars(src: ParseSource): boolean {
  return src.includes('\r') || src.includes('\0')
}

export function sourceToString(src: ParseSource): string {
  return typeof src === 'string' ? src : src.toString()
}
