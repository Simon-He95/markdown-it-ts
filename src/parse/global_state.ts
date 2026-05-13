export type GlobalMarkdownStateReason = 'reference-definition' | 'footnote-definition' | 'abbreviation-definition'

const FOOTNOTE_DEF_RE = /(?:^|\n)[ \t]{0,3}\[\^[^\]\n]+\]:/m
const ABBR_DEF_RE = /(?:^|\n)[ \t]{0,3}\*\[[^\]\n]+\]:/m
const REFERENCE_DEF_RE = /(?:^|\n)[ \t]{0,3}\[(?!\^)(?:\\.|[^\]\n])+\][ \t]*:[ \t]*\S/m

export function detectGlobalMarkdownState(src: string): GlobalMarkdownStateReason | null {
  if (!src)
    return null

  if (FOOTNOTE_DEF_RE.test(src))
    return 'footnote-definition'

  if (ABBR_DEF_RE.test(src))
    return 'abbreviation-definition'

  if (REFERENCE_DEF_RE.test(src))
    return 'reference-definition'

  return null
}

export function hasGlobalMarkdownState(src: string): boolean {
  return detectGlobalMarkdownState(src) !== null
}
