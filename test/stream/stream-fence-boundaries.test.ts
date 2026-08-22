import { describe, it, expect } from 'vitest'
import container from 'markdown-it-container'
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

    let doc = `::: note\n<div>\n\`\`\`\n</div>\n\n\`\`\`text\n${'x'.repeat(4100)}\n`
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
