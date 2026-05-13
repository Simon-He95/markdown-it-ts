import { describe, expect, it } from 'vitest'
import { detectGlobalMarkdownStateFromChunks } from '../../src/parse/global_state'

describe('global markdown state detection', () => {
  it('detects definitions split across chunks', () => {
    expect(detectGlobalMarkdownStateFromChunks(['[re', 'f]: https://example.com\n']))
      .toBe('reference-definition')
  })
})
