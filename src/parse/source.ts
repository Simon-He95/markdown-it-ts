export interface TextSource {
  readonly length: number
  charAt(index: number): string
  charCodeAt(index: number): number
  indexOf(searchValue: string, fromIndex?: number): number
  slice(start?: number, end?: number): string
  toString(): string
}

export type ParseSource = string | TextSource

export function hasNormalizationChars(src: ParseSource): boolean {
  return src.indexOf('\r') !== -1 || src.indexOf('\0') !== -1
}

export function sourceToString(src: ParseSource): string {
  return typeof src === 'string' ? src : src.toString()
}
