import { describe, expect, it } from 'vitest'
import { State } from '../../src/parse/state'
import { normalize } from '../../src/rules/core/normalize'

describe('core normalize', () => {
  it('converts CRLF and CR to LF and replaces NUL with U+FFFD', () => {
    const src = 'line1\r\nline2\rline3\0end'
    const state = new State(src)
    normalize(state as any)
    expect(state.src).toBe('line1\nline2\nline3\uFFFDend')
  })
})
