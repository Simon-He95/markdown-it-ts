import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'

// Post-block plugins read the full normalized source using absolute token maps.
function createParser() {
  const md = MarkdownIt({ stream: true, streamTailLocalPostBlockRules: true })
  md.core.ruler.after('block', 'source-map-reader', (state) => {
    const lines = String(state.src).split('\n')
    for (const token of state.tokens) {
      if (token.map)
        token.meta = { source: lines.slice(token.map[0], token.map[1]).join('\n') }
    }
  })
  return md
}

describe('full-source append with post-block plugins', () => {
  it.each(['\n', '\r\n', '\r'])('preserves tokens across normalization seams (%j)', (newline) => {
    const md = createParser()
    const full = createParser()
    const env = {}
    let source = `# History${newline}${newline}Stable **text**.${newline}${newline}Live`
    const updates = [' tail', '\0', '\r', '\n', '\r', '\n', '| a | b |', newline, '| - | - |', newline, '| x | y |', newline, newline, '```ts', newline, 'const n = 1', newline, '```', newline]
    md.stream.parse(source, env)
    for (const delta of updates) {
      source += delta
      expect(md.stream.parse(source, env)).toEqual(full.parse(source, {}))
    }
    expect(md.stream.stats().tailHits).toBeGreaterThan(0)

    source = source.replace('Stable **text**.', 'Edited **history**.')
    expect(md.stream.parse(source, env)).toEqual(full.parse(source, {}))
    source += '\n[ref]\n\n[ref]: https://example.com\n'
    expect(md.stream.parse(source, env)).toEqual(full.parse(source, {}))
    expect(md.stream.stats().lastMode).toBe('full')
  })

  it('keeps snapshots and switching between full source and deltas consistent', () => {
    const md = createParser()
    const full = createParser()
    const env = {}
    let source = '# History\n\nStable.\n\nLive'
    md.stream.parse(source, env)
    source += ' tail'
    md.stream.parse(source, env)
    const snapshot = md.stream.snapshot()!
    md.stream.reset()
    expect(md.stream.restore(snapshot)).toEqual(full.parse(source, {}))
    source += '\r'
    expect(md.stream.append('\r', env)).toEqual(full.parse(source, {}))
    source += '\nmore'
    expect(md.stream.parse(source, env)).toEqual(full.parse(source, {}))
    source += '\n\nDone.'
    expect(md.stream.append('\n\nDone.', env)).toEqual(full.parse(source, {}))
  })
})
