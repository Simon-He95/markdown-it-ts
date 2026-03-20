function hasPipeOnLine(src: string, start: number, max: number): boolean {
  for (let pos = start; pos < max; pos++) {
    if (src.charCodeAt(pos) === 0x7C)
      return true
  }
  return false
}

export function couldTerminateParagraph(src: string, start: number, max: number): boolean {
  if (start >= max)
    return false

  const marker = src.charCodeAt(start)

  switch (marker) {
    case 0x23: // #
    case 0x2A: // *
    case 0x2B: // +
    case 0x2D: // -
    case 0x3C: // <
    case 0x3E: // >
    case 0x5F: // _
    case 0x60: // `
    case 0x7E: // ~
      return true
  }

  if (marker >= 0x30 && marker <= 0x39)
    return true

  return hasPipeOnLine(src, start, max)
}
