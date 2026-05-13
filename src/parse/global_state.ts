export type GlobalMarkdownStateReason = 'reference-definition' | 'footnote-definition' | 'abbreviation-definition'

const FOOTNOTE_DEF_RE = /(?:^|\n)[ \t]{0,3}\[\^[^\]\n]+\]:/m
const ABBR_DEF_RE = /(?:^|\n)[ \t]{0,3}\*\[[^\]\n]+\]:/m
const REFERENCE_DEF_RE = /(?:^|\n)[ \t]{0,3}\[(?!\^)(?:\\.|[^\]\n])+\][ \t]*:/m
const GLOBAL_STATE_ENV_KEYS = [
  'references',
  'footnotes',
  'abbreviations',
  'abbr',
  'abbrs',
] as const

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

export function detectGlobalMarkdownStateFromChunks(
  chunks: Iterable<string>,
): GlobalMarkdownStateReason | null {
  let carry = ''

  for (const chunk of chunks) {
    if (!chunk)
      continue

    const text = carry + chunk
    const lastNewline = text.lastIndexOf('\n')

    if (lastNewline < 0) {
      carry = text
      continue
    }

    const completeLines = text.slice(0, lastNewline + 1)
    const reason = detectGlobalMarkdownState(completeLines)
    if (reason)
      return reason

    carry = text.slice(lastNewline + 1)
  }

  return detectGlobalMarkdownState(carry)
}

export function hasGlobalMarkdownState(src: string): boolean {
  return detectGlobalMarkdownState(src) !== null
}

export function resetKnownGlobalMarkdownState(env: Record<string, unknown>): void {
  for (const key of GLOBAL_STATE_ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(env, key))
      delete (env as any)[key]
  }
}
