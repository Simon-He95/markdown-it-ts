import type { ParseSource } from '../../parse/source'
import { LineFlag } from '../../parse/parser_block/state_block'

function hasPipeOnLine(src: ParseSource, start: number, max: number): boolean {
  for (let pos = start; pos < max; pos++) {
    if (src.charCodeAt(pos) === 0x7C)
      return true
  }
  return false
}

export function canUseParagraphTerminatorFastPath(state: any): boolean {
  const ruler = state?.md?.block?.ruler as { version?: number, __mdtsDefaultVersion?: number } | undefined
  if (!ruler)
    return false

  return ruler.version === ruler.__mdtsDefaultVersion
}

export function couldTerminateParagraph(state: any, line: number, src: ParseSource, start: number, max: number): boolean {
  if (state.lineFlags && (state.lineFlags[line] & LineFlag.ParagraphTerminator) === 0)
    return false

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
