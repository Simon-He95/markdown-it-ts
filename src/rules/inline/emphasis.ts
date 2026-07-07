/**
 * Inline rule: emphasis (proper implementation with delimiter processing)
 * Process *this* and _that_
 */

import type { StateInline } from '../../parse/parser_inline/state_inline'

// Cache marker characters to avoid repeated String.fromCharCode calls
const MARKER_ASTERISK = '*'
const MARKER_UNDERSCORE = '_'

// Insert each marker as a separate text token, and add it to delimiter list
export function emphasis_tokenize(state: StateInline, silent?: boolean): boolean {
  if (silent)
    return false

  const marker = state.src.charCodeAt(state.pos)

  if (marker !== 0x5F /* _ */ && marker !== 0x2A /* * */)
    return false

  const scanned = state.scanDelims(state.pos, marker === 0x2A)

  if (!scanned || scanned.length === 0)
    return false

  const markerChar = marker === 0x2A ? MARKER_ASTERISK : MARKER_UNDERSCORE
  const scannedLength = scanned.length
  const canOpen = scanned.can_open
  const canClose = scanned.can_close
  const tokens = state.tokens
  const delimiters = state.delimiters

  for (let i = 0; i < scannedLength; i++) {
    const token = state.push('text', '', 0)
    token.content = markerChar

    delimiters.push({
      marker,
      length: scannedLength,
      token: tokens.length - 1,
      end: -1,
      open: canOpen,
      close: canClose,
    })
  }

  state.pos += scannedLength

  return true
}

function postProcess(state: StateInline, delimiters: any[]): void {
  const max = delimiters.length
  const tokens = state.tokens

  for (let i = max - 1; i >= 0; i--) {
    const startDelim = delimiters[i]
    const marker = startDelim.marker

    // Fast check for emphasis markers
    if (marker !== 0x5F /* _ */ && marker !== 0x2A /* * */)
      continue

    // Process only opening markers
    if (startDelim.end === -1)
      continue

    const endDelim = delimiters[startDelim.end]
    const startTokenIdx = startDelim.token
    const endTokenIdx = endDelim.token

    // Check if we can merge into strong
    const isStrong
      = i > 0
        && delimiters[i - 1].end === startDelim.end + 1
        && delimiters[i - 1].marker === marker
        && delimiters[i - 1].token === startTokenIdx - 1
        && delimiters[startDelim.end + 1].token === endTokenIdx + 1

    const markerChar = marker === 0x2A ? MARKER_ASTERISK : MARKER_UNDERSCORE

    // Update opening token
    const token_o = tokens[startTokenIdx]
    if (isStrong) {
      token_o.type = 'strong_open'
      token_o.tag = 'strong'
      token_o.nesting = 1
      token_o.markup = markerChar + markerChar
      token_o.content = ''
    }
    else {
      token_o.type = 'em_open'
      token_o.tag = 'em'
      token_o.nesting = 1
      token_o.markup = markerChar
      token_o.content = ''
    }

    // Update closing token
    const token_c = tokens[endTokenIdx]
    if (isStrong) {
      token_c.type = 'strong_close'
      token_c.tag = 'strong'
      token_c.nesting = -1
      token_c.markup = markerChar + markerChar
      token_c.content = ''
    }
    else {
      token_c.type = 'em_close'
      token_c.tag = 'em'
      token_c.nesting = -1
      token_c.markup = markerChar
      token_c.content = ''
    }

    if (isStrong) {
      tokens[delimiters[i - 1].token].content = ''
      tokens[delimiters[startDelim.end + 1].token].content = ''
      i--
    }
  }
}

// Walk through delimiter list and replace text tokens with tags
export function emphasis_postProcess(state: StateInline): void {
  const tokens_meta = state.tokens_meta
  const max = state.tokens_meta.length

  postProcess(state, state.delimiters)

  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      postProcess(state, tokens_meta[curr].delimiters)
    }
  }
}

export const emphasis = {
  tokenize: emphasis_tokenize,
  postProcess: emphasis_postProcess,
}

export default emphasis
