import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { detectGlobalMarkdownState, detectGlobalMarkdownStateFromChunks } from '../../src/parse/global_state'

describe('global markdown state detection', () => {
  it('detects definitions split across chunks', () => {
    expect(detectGlobalMarkdownStateFromChunks(['[re', 'f]: https://example.com\n']))
      .toBe('reference-definition')
  })

  it('matches parser behavior for multiline reference labels', () => {
    const src = '[foo\nbar]: https://example.com\n'
    const md = markdownit()
    const html = md.render(`[x][foo bar]\n\n${src}`)

    if (html.includes('href="https://example.com"'))
      expect(detectGlobalMarkdownState(src)).toBe('reference-definition')
    else
      expect(detectGlobalMarkdownState(src)).toBeNull()
  })
})
