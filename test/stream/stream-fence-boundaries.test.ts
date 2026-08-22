import { describe, it, expect } from 'vitest'
import container from 'markdown-it-container'
import deflist from 'markdown-it-deflist'
import MarkdownIt from '../../src'

describe('stream append with fenced code boundaries', () => {
  it('closing fence that matches an open fence in previous content should not use append', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()

    let doc = '```js\nconsole.log(1)\n' // open fence, not closed
    md.stream.parse(doc)

    // appending only the closing fence + blank line
    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baseline = MarkdownIt().parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('detects an open fence when an earlier fence opener is outside the scan tail', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()

    let doc = `\`\`\`text\n${'x'.repeat(4100)}\n\`\`\`\n\n\`\`\`mermaid\ngraph TD\n`
    md.stream.parse(doc)

    doc += 'A --> B\n\`\`\`\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('does not treat a marker followed by text as a closing fence', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()

    let doc = `\`\`\`text\n${'x'.repeat(4100)}\n\`\`\`not-a-close\n`
    md.stream.parse(doc)

    doc += '\`\`\`\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('does not treat an indented marker as a closing fence', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()

    let doc = `\`\`\`text\n${'x'.repeat(4100)}\n    \`\`\`\n`
    md.stream.parse(doc)

    doc += '\`\`\`\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('detects an open fence after a bare carriage-return line ending', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()

    let doc = 'first\rsecond\n```text\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('detects a fence after a bare carriage return inside a container', () => {
    const md = MarkdownIt({ stream: true }).use(container, 'note')
    md.stream.resetStats()

    let doc = `::: note\n${'x'.repeat(4100)}\r\`\`\`text\nbody\n`
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().use(container, 'note')
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('uses raw carriage returns as content when normalization is disabled', () => {
    const md = MarkdownIt({ stream: true }).disable('normalize')
    md.stream.resetStats()

    let doc = 'x\r```\n```\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().disable('normalize')
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('does not accept a carriage return in a closing fence when normalization is disabled', () => {
    const md = MarkdownIt({ stream: true }).disable('normalize')
    md.stream.resetStats()

    let doc = '```text\nbody\n```\r\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().disable('normalize')
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('does not treat backticks in fence info as an opener', () => {
    const md = MarkdownIt({ stream: true }).use(container, 'note')
    md.stream.resetStats()

    let doc = `::: note\n\`\`\`bad\`\`\`\n${'x'.repeat(4100)}\n\`\`\`\nbody\n`
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().use(container, 'note')
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('detects an open fence inside a blockquote container', () => {
    const md = MarkdownIt({ stream: true }).use(container, 'note')
    md.stream.resetStats()

    let doc = `::: note\n> \`\`\`text\n> ${'x'.repeat(4100)}\n`
    md.stream.parse(doc)

    doc += '> ```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().use(container, 'note')
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('detects an open fence after an HTML block inside a container', () => {
    const md = MarkdownIt({ stream: true }).use(container, 'note')
    md.stream.resetStats()

    let doc = '::: note\n<div>\n```\n</div>\n\n```\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().use(container, 'note')
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('detects an open fence inside a container list', () => {
    const md = MarkdownIt({ stream: true }).use(container, 'note')
    md.stream.resetStats()

    let doc = `::: note\n- \`\`\`text\n  ${'x'.repeat(4100)}\n`
    md.stream.parse(doc)

    doc += '  ```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().use(container, 'note')
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('detects a tab-prefixed blockquote fence inside a container', () => {
    const md = MarkdownIt({ stream: true }).use(container, 'note')
    md.stream.resetStats()

    let doc = `::: note\n>\t\`\`\`text\n>\t${'x'.repeat(4100)}\n`
    md.stream.parse(doc)

    doc += '>\t```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().use(container, 'note')
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('detects an open fence inside a definition list', () => {
    const md = MarkdownIt({ stream: true }).use(deflist)
    md.stream.resetStats()

    let doc = 'Term\n: ```text\n  body\n'
    md.stream.parse(doc)

    doc += '  ```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt().use(deflist)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('does not assume a replacement normalize rule converts carriage returns', () => {
    const preserveCarriageReturns = () => {}
    const md = MarkdownIt({ stream: true })
    md.core.ruler.at('normalize', preserveCarriageReturns)
    md.stream.resetStats()

    let doc = 'x\r```\n```\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.at('normalize', preserveCarriageReturns)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('does not assume normalize runs before the block parser', () => {
    const md = MarkdownIt({ stream: true })
    const normalizeRule = md.core.ruler.getNamedRules('').find(rule => rule.name === 'normalize')!
    md.core.ruler.push('normalize', normalizeRule.fn)
    md.stream.resetStats()

    let doc = 'x\r```\n```\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    const baselineNormalize = baselineMd.core.ruler.getNamedRules('').find(rule => rule.name === 'normalize')!
    baselineMd.core.ruler.push('normalize', baselineNormalize.fn)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('recognizes the built-in normalize rule registered under another name', () => {
    const md = MarkdownIt({ stream: true })
    const normalizeRule = md.core.ruler.getNamedRules('').find(rule => rule.name === 'normalize')!
    md.disable('normalize')
    md.core.ruler.before('block', 'renamed_normalize', normalizeRule.fn)
    md.stream.resetStats()

    let doc = 'prefix\r```text\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    const baselineNormalize = baselineMd.core.ruler.getNamedRules('').find(rule => rule.name === 'normalize')!
    baselineMd.disable('normalize')
    baselineMd.core.ruler.before('block', 'renamed_normalize', baselineNormalize.fn)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('preserves the cached environment when custom normalization bypasses the cache', () => {
    const applyEnvironment = (state: { src: string, env: Record<string, unknown> }) => {
      state.src = state.src.replace('VALUE', String(state.env.value ?? 'missing'))
    }
    const md = MarkdownIt({ stream: true })
    md.core.ruler.at('normalize', applyEnvironment)
    const env = { value: 'expected' }

    let doc = 'VALUE\r\n'
    md.stream.parse(doc, env)

    doc += 'tail\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.at('normalize', applyEnvironment)
    const baseline = baselineMd.parse(doc, env)
    expect(md.renderer.render(tokens, md.options, env))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, env))
  })

  it('bypasses the cache for a custom normalize rule that changes line coordinates', () => {
    const prependLine = (state: { src: string }) => {
      state.src = `\n${state.src}`
    }
    const md = MarkdownIt({ stream: true })
    md.core.ruler.at('normalize', prependLine)
    md.stream.resetStats()

    let doc = '```text\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.at('normalize', prependLine)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('bypasses the cache for an arbitrary source transform before block parsing', () => {
    const prependLine = (state: { src: string }) => {
      state.src = `\n${state.src}`
    }
    const md = MarkdownIt({ stream: true })
    md.core.ruler.before('block', 'prepend_line', prependLine)
    md.stream.resetStats()

    let doc = '```text\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.before('block', 'prepend_line', prependLine)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('recognizes the built-in block rule registered under another name', () => {
    const md = MarkdownIt({ stream: true })
    const blockRule = md.core.ruler.getNamedRules('').find(rule => rule.name === 'block')!
    md.disable('block')
    md.core.ruler.before('normalize', 'renamed_block', blockRule.fn)
    md.stream.resetStats()

    let doc = 'x\r```\n```\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    const baselineBlock = baselineMd.core.ruler.getNamedRules('').find(rule => rule.name === 'block')!
    baselineMd.disable('block')
    baselineMd.core.ruler.before('normalize', 'renamed_block', baselineBlock.fn)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('invalidates the cache when normalization mode changes', () => {
    const md = MarkdownIt({ stream: true })
    md.disable('normalize')

    let doc = 'x\r```\n```\nbody\n'
    md.stream.parse(doc)

    md.enable('normalize')
    md.stream.resetStats()
    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('bypasses the cache when a post-block rule changes token maps', () => {
    const shiftTokenMaps = (state: { tokens: Array<{ map?: [number, number] | null }> }) => {
      for (const token of state.tokens) {
        if (token.map)
          token.map = [token.map[0] + 1, token.map[1] + 1]
      }
    }
    const md = MarkdownIt({ stream: true })
    md.core.ruler.after('block', 'shift_token_maps', shiftTokenMaps)
    md.stream.resetStats()

    let doc = '```text\nbody\n'
    md.stream.parse(doc)

    doc += '```\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.after('block', 'shift_token_maps', shiftTokenMaps)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.lastMode).not.toBe('append')
  })

  it('uses a source boundary instead of shifted maps for a paragraph tail reparse', () => {
    const shiftTokenMaps = (state: { tokens: Array<{ map?: [number, number] | null }> }) => {
      for (const token of state.tokens) {
        if (token.map)
          token.map = [token.map[0] + 1, token.map[1] + 1]
      }
    }
    const md = MarkdownIt({ stream: true })
    md.core.ruler.after('block', 'shift_token_maps', shiftTokenMaps)
    md.stream.resetStats()

    let doc = 'First\n\nSecond\n'
    md.stream.parse(doc)

    doc += 'Third\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.after('block', 'shift_token_maps', shiftTokenMaps)
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.tailHits + stats.appendHits).toBeGreaterThan(0)
  })

  it('keeps tail reuse for source-neutral post-block rules without fences', () => {
    const md = MarkdownIt({ stream: true })
    md.core.ruler.after('block', 'observe_tokens', () => {})
    md.stream.resetStats()

    let doc = 'First paragraph\n\nSecond paragraph'
    md.stream.parse(doc)

    doc += ' appended\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.after('block', 'observe_tokens', () => {})
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))

    const stats = md.stream.stats()
    expect(stats.tailHits + stats.appendHits).toBeGreaterThan(0)
  })

  it('counts normalized carriage returns in source-derived paragraph anchors', () => {
    const md = MarkdownIt({ stream: true })
    md.core.ruler.after('block', 'observe_tokens', () => {})

    let doc = 'First\rline\n\nSecond'
    md.stream.parse(doc)

    doc += ' appended\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.after('block', 'observe_tokens', () => {})
    const baseline = baselineMd.parse(doc)
    expect(tokens.map(token => token.map)).toEqual(baseline.map(token => token.map))
  })

  it('falls back when an untrusted single paragraph has no reusable anchor', () => {
    const md = MarkdownIt({ stream: true })
    md.core.ruler.after('block', 'observe_tokens', () => {})

    let doc = 'First\n'
    md.stream.parse(doc)

    doc += 'second\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.after('block', 'observe_tokens', () => {})
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))
  })

  it('does not anchor an untrusted paragraph inside a preceding fence', () => {
    const md = MarkdownIt({ stream: true })
    md.core.ruler.after('block', 'observe_tokens', () => {})

    let doc = '```\nx\n\ny\n```\nFinal\n'
    md.stream.parse(doc)

    doc += 'continued\n\n'
    const tokens = md.stream.parse(doc)

    const baselineMd = MarkdownIt()
    baselineMd.core.ruler.after('block', 'observe_tokens', () => {})
    const baseline = baselineMd.parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(baselineMd.renderer.render(baseline, baselineMd.options, {}))
  })

  it('new fenced block entirely within appended segment can use append', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()

    let doc = 'Para\n\n'
    md.stream.parse(doc)

    // Append a complete fenced block (open, content, close, plus blank line)
    const add = ['```', 'x', '```', ''].join('\n') + '\n'
    doc += add
    const tokens = md.stream.parse(doc)

    const baseline = MarkdownIt().parse(doc)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    const stats = md.stream.stats()
    expect(['append', 'full']).toContain(stats.lastMode)
  })
})
