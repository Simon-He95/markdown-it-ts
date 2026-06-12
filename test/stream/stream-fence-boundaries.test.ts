import { describe, it, expect } from 'vitest'
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

  it('closing a long open fence does not use append when the opener is outside the scan window', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()

    const base = `Intro\n\n\`\`\`js\n${'x'.repeat(5000)}\n`
    const updated = `${base}\`\`\`\n\nAfter\n\n`

    md.stream.parse(base)
    const tokens = md.stream.parse(updated)

    const baseline = MarkdownIt().parse(updated)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    expect(md.stream.stats().lastMode).not.toBe('append')
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

  it('does not treat a large tail ending after a closed fence as an open fence', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()

    function fencedSection(index: number) {
      return `\`\`\`js\nconsole.log(${index})\n\`\`\`\n\n`
    }

    let suffix = '```\n\n'
    let index = 0
    while (suffix.length + fencedSection(index).length < 3400)
      suffix += fencedSection(index++)
    suffix += `Tail ${'x'.repeat(4000 - suffix.length - 7)}\n\n`

    const base = `\`\`\`js\nconsole.log('first')\n${suffix}`
    const append = 'Fresh paragraph.\n\n'
    const updated = base + append

    md.stream.parse(base)
    const tokens = md.stream.parse(updated)

    const baseline = MarkdownIt().parse(updated)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    expect(md.stream.stats().lastMode).toBe('append')
  })

  it('does not read a fence marker from the middle of the scan window as line-start syntax', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()

    const base = `Intro\n\n${'x'.repeat(256)} \`\`\` not a fence ${'y'.repeat(3983)}\n\n`
    const append = 'Fresh paragraph.\n\n'
    const updated = base + append

    md.stream.parse(base)
    const tokens = md.stream.parse(updated)

    const baseline = MarkdownIt().parse(updated)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    expect(md.stream.stats().lastMode).toBe('append')
  })

  it('does not treat an indented code block fence marker as an open fence', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()

    const base = `Intro\n\n    \`\`\`\n${'x'.repeat(3900)}\n\n`
    const append = 'Fresh paragraph.\n\n'
    const updated = base + append

    md.stream.parse(base)
    const tokens = md.stream.parse(updated)

    const baseline = MarkdownIt().parse(updated)
    expect(md.renderer.render(tokens, md.options, {}))
      .toEqual(MarkdownIt().renderer.render(baseline, md.options, {}))

    expect(md.stream.stats().lastMode).toBe('append')
  })
})
