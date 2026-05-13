import { describe, expect, it } from 'vitest'
import markdownit from '../../src/index'
import { detectGlobalMarkdownState, detectGlobalMarkdownStateFromChunks } from '../../src/parse/global_state'

describe('global markdown state detection', () => {
  it('detects definitions split across chunks', () => {
    expect(detectGlobalMarkdownStateFromChunks(['[re', 'f]: https://example.com\n']))
      .toBe('reference-definition')
  })

  it('detects multiline reference labels split across chunks', () => {
    expect(detectGlobalMarkdownStateFromChunks([
      '[foo\n',
      'bar]: https://example.com\n',
    ])).toBe('reference-definition')
  })

  it('detects multiline reference destinations split across chunks', () => {
    expect(detectGlobalMarkdownStateFromChunks([
      '[ref]:\n',
      '  https://example.com\n',
    ])).toBe('reference-definition')
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

  it('does not expose mdts global-state marker through Object.keys(env)', () => {
    const md = markdownit()
    const env: Record<string, unknown> = {}

    md.render('[x][ref]\n\n[ref]: https://example.com\n', env)

    expect(Object.keys(env)).not.toContain('__mdtsGlobalStateReason')
  })
})
