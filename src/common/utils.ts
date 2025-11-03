// Common utility functions used across markdown-it

export function isSpace(code: number): boolean {
  return code === 0x09 || code === 0x20
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
