import { describe, expect, it, vi } from 'vitest'
import MarkdownIt from '../../src'

function makeTailList(count: number, options?: { loose?: boolean, ordered?: boolean }) {
  const loose = options?.loose ?? false
  const ordered = options?.ordered ?? false
  let out = ''
  for (let i = 0; i < count; i++) {
    const index = i + 1
    out += ordered ? `${index}. item ${index}` : `- item ${index}`
    out += loose ? '\n\n' : '\n'
  }
  return out
}

function makeTailTable(count: number, options?: { aligned?: boolean, headerCell?: string }) {
  const aligned = options?.aligned ?? false
  const headerCell = options?.headerCell ?? 'column'
  let out = `| ${headerCell} a | ${headerCell} b |\n`
  out += aligned ? '|:-----------|-----------:|\n' : '|------------|------------|\n'
  for (let i = 0; i < count; i++) {
    const index = i + 1
    out += `| row ${index} | value ${index} |\n`
  }
  return out
}

describe('stream parser', () => {
  it('produces the same output as the standard parser when enabled', () => {
    const md = MarkdownIt({ stream: true })
    const src = '# Heading\n\nParagraph with **bold** text.\n'

    const streamTokens = md.stream.parse(src)
    const streamHtml = md.renderer.render(streamTokens, md.options, {})
    const baselineHtml = md.render(src)

    expect(streamHtml).toEqual(baselineHtml)
  })

  it('returns cached tokens when the source string is unchanged', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const src = '# Heading\n\nParagraph one.\n'

    const firstTokens = md.stream.parse(src)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(src)
    expect(md.stream.peek()).toBe(firstTokens)
    let stats = md.stream.stats()
    expect(stats.fullParses).toBe(1)
    expect(stats.cacheHits).toBe(0)
    expect(stats.total).toBe(1)

    const secondTokens = md.stream.parse(src)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(secondTokens).toBe(firstTokens)
    stats = md.stream.stats()
    expect(stats.cacheHits).toBe(1)
    expect(stats.total).toBe(2)
    expect(stats.fullParses).toBe(1)
    expect(stats.lastMode).toBe('cache')

    parseSpy.mockRestore()
  })

  it('falls back to full parse when the edit is not an append', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const original = '# Title\n\nParagraph\n'
    const updated = '# Title\n\nReplaced paragraph\n'

    md.stream.parse(original)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(updated)

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)
    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.fullParses).toBe(2)
    expect(stats.total).toBe(2)
    expect(stats.lastMode).toBe('full')

    parseSpy.mockRestore()
  })

  it('uses append fast-path for multiline appends', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const base = '# Heading\n\nParagraph one.\n\n'
    const append = 'Appended paragraph.\n- item one\n- item two\n'
    const updated = base + append

    const baseTokens = md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(base)
    expect(md.stream.peek()).toBe(baseTokens)

    const combinedTokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(2)
    // Implementation may either parse the append alone, or include a small
    // context prefix (contextPrefix + append). Accept both behaviours.
    const secondCallArg = parseSpy.mock.calls[1][0]
    expect(secondCallArg).toBeDefined()
    expect(secondCallArg.endsWith(append)).toBe(true)
    const stats = md.stream.stats()
    expect(stats.fullParses).toBe(1)
    expect(stats.appendHits).toBe(1)
    expect(stats.total).toBe(2)
    expect(stats.lastMode).toBe('append')
    expect(md.stream.peek()).toBe(combinedTokens)

    parseSpy.mockRestore()

    const baseline = MarkdownIt()
    const baselineTokens = baseline.parse(updated)
    const streamHtml = md.renderer.render(combinedTokens, md.options, {})
    const baselineHtml = baseline.renderer.render(baselineTokens, baseline.options, {})
    // ensure output parity
    // ensure output parity
    expect(streamHtml).toEqual(baselineHtml)
  })

  it('falls back when extending content on the same line', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const base = 'Paragraph without trailing newline'
    const updated = `${base} with more text`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(base)

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(2)
    expect(parseSpy.mock.calls[1][0]).toBe(updated)

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.fullParses).toBe(2)
    expect(stats.lastMode).toBe('full')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('reparses only the last paragraph when extending an active tail line', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const base = `${prefix}Active paragraph`
    const updated = `${base} keeps streaming`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('Active paragraph keeps streaming')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('reparses the tail segment when continuing a paragraph on the next line', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const base = `${prefix}Active paragraph\n`
    const updated = `${base}continued on the next line`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('Active paragraph\ncontinued on the next line')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('reparses the tail segment when starting a new paragraph after a blank line', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\n'
    const base = `${prefix}Stable intro.\n\n`
    const updated = `${base}Fresh paragraph in progress`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('Stable intro.\n\nFresh paragraph in progress')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('reparses the tail segment when appending after a heading boundary', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = 'Stable intro.\n\n'
    const base = `${prefix}# Streaming title\n`
    const updated = `${base}Heading follow-up paragraph`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('# Streaming title\nHeading follow-up paragraph')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('reparses the tail segment when closing an open fence', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const base = `${prefix}\`\`\`ts\nconsole.log(1)\n`
    const updated = `${base}console.log(2)\n\`\`\`\n`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('```ts\nconsole.log(1)\nconsole.log(2)\n```\n')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('merges appended list items without reparsing the whole tight tail list', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const base = `${prefix}${makeTailList(96)}`
    const updated = `${base}- item 97\n`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('- item 97\n')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('merges appended list items and preserves loose-list paragraphs', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const base = `${prefix}${makeTailList(48, { loose: true })}`
    const updated = `${base}- item 49`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('- item 49')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('merges appended ordered-list items without reparsing the whole tail list', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const base = `${prefix}${makeTailList(96, { ordered: true })}`
    const updated = `${base}97. item 97\n`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('97. item 97\n')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('merges appended table rows without reparsing the whole tail table', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const tablePrefix = makeTailTable(0, { aligned: true })
    const base = `${prefix}${makeTailTable(96, { aligned: true })}`
    const updated = `${base}| row 97 | value 97 |\n`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(`${tablePrefix}| row 97 | value 97 |\n`)

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)
    expect(streamHtml).toContain('style="text-align:left"')
    expect(streamHtml).toContain('style="text-align:right"')

    parseSpy.mockRestore()
  })

  it('creates a tbody when appending rows to a large header-only tail table', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const headerCell = 'wide-header'.repeat(64)
    const tablePrefix = makeTailTable(0, { headerCell })
    const base = `${prefix}${tablePrefix}`
    const updated = `${base}| row 1 | value 1 |\n`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(`${tablePrefix}| row 1 | value 1 |\n`)

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)
    expect(streamHtml).toContain('<tbody>')

    parseSpy.mockRestore()
  })

  it('falls back to a tail reparse when a table append also adds a trailing blank line', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const baseTable = makeTailTable(96, { aligned: true })
    const base = `${prefix}${baseTable}`
    const updated = `${base}| row 97 | value 97 |\n\n`

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(`${baseTable}| row 97 | value 97 |\n\n`)

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('reparses only the last segment for tail edits when the prefix is stable', () => {
    const md = MarkdownIt({ stream: true, streamOptimizationMinSize: 0 })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const prefix = '# Title\n\nStable intro.\n\n'
    const original = `${prefix}Original tail paragraph.\n`
    const updated = `${prefix}Updated tail paragraph with more detail.\n`

    md.stream.parse(original)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe('Updated tail paragraph with more detail.\n')

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.lastMode).toBe('tail')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('falls back to a full parse when appended text adds a reference definition', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const base = 'Before\n\nSee [label][id]\n\n'
    const append = '[id]: https://example.com\n\n'
    const updated = base + append

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    parseSpy.mockClear()

    const tokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(updated)

    const stats = md.stream.stats()
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(0)
    expect(stats.lastMode).toBe('full')

    const baselineHtml = MarkdownIt().render(updated)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)

    parseSpy.mockRestore()
  })

  it('reparses the last segment when appending a setext underline', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const base = '# Title\n\nParagraph\n'
    const append = '-\n'
    const updated = base + append

    md.stream.parse(base)
    expect(parseSpy).toHaveBeenCalledTimes(1)
    expect(parseSpy.mock.calls[0][0]).toBe(base)

    const combinedTokens = md.stream.parse(updated)
    expect(parseSpy).toHaveBeenCalledTimes(2)
    expect(parseSpy.mock.calls[1][0]).toBe('Paragraph\n-\n')
    const stats = md.stream.stats()
    expect(stats.fullParses).toBe(1)
    expect(stats.appendHits).toBe(0)
    expect(stats.tailHits).toBe(1)
    expect(stats.total).toBe(2)
    expect(stats.lastMode).toBe('tail')
    expect(md.stream.peek()).toBe(combinedTokens)

    parseSpy.mockRestore()

    const baseline = MarkdownIt()
    const baselineTokens = baseline.parse(updated)
    const streamHtml = md.renderer.render(combinedTokens, md.options, {})
    const baselineHtml = baseline.renderer.render(baselineTokens, baseline.options, {})
    expect(streamHtml).toEqual(baselineHtml)
  })

  it('reset clears the cache', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    md.stream.parse('First pass\n')
    expect(parseSpy).toHaveBeenCalledTimes(1)

    md.stream.reset()

    md.stream.parse('Second pass\n')
    expect(parseSpy).toHaveBeenCalledTimes(2)
    const stats = md.stream.stats()
    expect(stats.resets).toBe(1)

    parseSpy.mockRestore()
  })

  it('disabling stream via set toggles cache usage off', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()
    const parseSpy = vi.spyOn(md.core, 'parse')

    const src = 'line one\n'
    md.stream.parse(src)
    expect(parseSpy).toHaveBeenCalledTimes(1)

    md.set({ stream: false })
    const tokens = md.stream.parse(`${src}line two\n`)

    expect(md.stream.enabled).toBe(false)
    expect(parseSpy).toHaveBeenCalledTimes(2)
    expect(parseSpy.mock.calls[1][0]).toBe(`${src}line two\n`)

    const baselineHtml = MarkdownIt().render(`${src}line two\n`)
    const streamHtml = md.renderer.render(tokens, md.options, {})
    expect(streamHtml).toEqual(baselineHtml)
    const stats = md.stream.stats()
    expect(stats.resets).toBeGreaterThanOrEqual(1)

    parseSpy.mockRestore()
  })

  it('matches baseline when parsing a long document character by character', () => {
  const mdWithStream = MarkdownIt({ stream: true })
  mdWithStream.stream.resetStats()

  const mdWithoutStream = MarkdownIt({ stream: false })
    const longDoc = `<thinking>这是一段自定义解析处理的thinking组件</thinking>
>>>I'll create a simple Electron + Vue chat application demo. Here's the structure:

[Star on GitHub](https://github.com/Simon-He95/vue-markdown-render)

<a href="https://simonhe.me/">我是 a 元素标签</a>

https://github.com/Simon-He95/vue-markdown-render

[【Author: Simon】](https://simonhe.me/)


![Vue Markdown Icon](/vue-markdown-icon.svg "Vue Markdown Icon")
*Figure: Vue Markdown Icon (served from /vue-markdown-icon.svg)*

这是 ~~已删除的文本~~，这是一个表情 :smile:。

- [ ] Star this repo
- [x] Fork this repo
- [ ] Create issues
- [x] Submit PRs

##  表格

| 姓名 | 年龄 | 职业 |
|------|------|------|
| 张三 | 25   | 工程师 |
| 李四 | 30   | 设计师 |
| 王五 | 28   | 产品经理 |

### 对齐表格
| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
| 内容1  |  内容2   |  内容3 |
| 内容4  |  内容5   |  内容6 |

我将为您输出泰勒公式的一般形式及其常见展开式。

---

## 1. 泰勒公式（Taylor's Formula）

### 一般形式（在点 \(x = a\) 处展开）：
\[
f(x) = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \frac{f'''(a)}{3!}(x-a)^3 + \cdots + \frac{f^{(n)}(a)}{n!}(x-a)^n + R_n(x)
\]

其中：
- \(f^{(k)}(a)\) 是 \(f(x)\) 在 \(x=a\) 处的 \(k\) 阶导数
- \(R_n(x)\) 是余项，常见形式有拉格朗日余项：
\[
R_n(x) = \frac{f^{(n+1)}(xi)}{(n+1)!}(x-a)^{n+1}, \quad xi \text{ 在 } a \text{ 和 } x \text{ 之间}
\]

---

## 2. 麦克劳林公式（Maclaurin's Formula，即 \(a=0\) 时的泰勒公式）：
\[
f(x) = f(0) + f'(0)x + \frac{f''(0)}{2!}x^2 + \frac{f'''(0)}{3!}x^3 + \cdots + \frac{f^{(n)}(0)}{n!}x^n + R_n(x)
\]

---

## 3. 常见函数的麦克劳林展开（前几项）

- **指数函数**：
\[
e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots + \frac{x^n}{n!} + \cdots, \quad x \in \mathbb{R}
\]

- **正弦函数**：
\[
\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + \cdots + (-1)^n \frac{x^{2n+1}}{(2n+1)!} + \cdots
\]

- **余弦函数**：
\[
\cos x = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \frac{x^6}{6!} + \cdots + (-1)^n \frac{x^{2n}}{(2n)!} + \cdots
\]

- **自然对数**（在 \(x=0\) 附近）：
\[
\ln(1+x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \frac{x^4}{4} + \cdots + (-1)^{n-1} \frac{x^n}{n} + \cdots, \quad -1 < x \le 1
\]

- **二项式展开**（\( (1+x)^m \)，\(m\) 为实数）：
\[
(1+x)^m = 1 + mx + \frac{m(m-1)}{2!}x^2 + \frac{m(m-1)(m-2)}{3!}x^3 + \cdots, \quad |x| < 1
\]

- **矩阵**：
\[
\begin{bmatrix}
2x_2 - 8x_3 = 8 \\
5x_1 - 5x_3 = 10
\end{bmatrix}
\]

- **公式**


- **代入数据**
   \[
   \frac{363}{15,\!135} \times 100\% = 2.398\%
   \]

- **计算工具验证**
   通过数学计算工具确认结果：
   \`363 ÷ 15,135 × 100 = 2.39841427...\`

- **差异说明**
   $$E=mc^2$$

---

如果您需要某个特定函数在特定点的泰勒展开，请告诉我，我可以为您详细写出。

::: warning
这是一个警告块。
:::

::: tip 提示标题
这是带标题的提示。
:::

::: error 错误块
这是一个错误块。
:::

مرحبا بكم في عالم اللغة العربية!
1. First, let's set up the project:

\`\`\`shellscript
# Create Vue project
npm create vue@latest electron-vue-chat

# Navigate to project
cd electron-vue-chat

# Install dependencies
npm install
npm install electron electron-builder vue-router

# Install dev dependencies
npm install -D electron-dev-server concurrently wait-on
\`\`\`

2. Create the main Electron file:

\`\`\`javascript:electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const url = isDev
    ? 'http://localhost:5173'
    : \`file://\${path.join(__dirname, '../dist/index.html')}\`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
\`\`\`

3. Update package.json:

\`\`\`diff json:package.json
{
  "name": "vue-renderer-markdown",
  "type": "module",
- "version": "0.0.49",
+ "version": "0.0.54-beta.1",
  "packageManager": "pnpm@10.16.1",
  "description": "A Vue 3 component that renders Markdown string content as HTML, supporting custom components and advanced markdown features.",
  "author": "Simon He",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git + git@github.com:Simon-He95/vue-markdown-render.git"
  },
  "bugs": {
    "url": "https://github.com/Simon-He95/vue-markdown-render/issues"
  },
  "keywords": [
    "vue",
    "vue3",
    "markdown",
    "markdown-to-html",
    "markdown-renderer",
    "vue-markdown",
    "vue-component",
    "html",
    "renderer",
    "custom-component"
  ],
  "exports": {
    ".": {
      "types": "./dist/types/exports.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./index.css": "./dist/index.css",
    "./index.tailwind.css": "./dist/index.tailwind.css",
    "./tailwind": "./dist/tailwind.ts"
  },
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/types/exports.d.ts",
  "files": [
    "dist"
  ],
}
\`\`\`

4. Create chat components \\(diversified languages\\):

\`\`\`python:src/server/app.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Message(BaseModel):
    sender: str
    text: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/echo")
def echo(msg: Message):
    return {"reply": f"Echo: {msg.text}"}
\`\`\`

5. Create a native module example \\(C++\\):

\`\`\`cpp:src/native/compute.cpp
#include <bits/stdc++.h>
using namespace std;

int fibonacci(int n){
  if(n<=1) return n;
  int a=0,b=1;
  for(int i=2;i<=n;++i){ int c=a+b; a=b; b=c; }
  return b;
}

int main(){
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  cout << "fib(10)=" << fibonacci(10) << "\n";
  return 0;
}
\`\`\`

6. Update the main App.vue:

\`\`\`vue:src/App.vue
<template>
  <router-view />
<\/template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
}
</style>
\`\`\`

7. Set up the router:

\`\`\`javascript:src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import ChatView from '../views/ChatView.vue';

const routes = [
  {
    path: '/',
    name: 'chat',
    component: ChatView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
\`\`\`

8. Update main.js:

\`\`\`javascript:src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

createApp(App).use(router).mount('#app');
\`\`\`

9. Mermaid graphic:

\`\`\`mermaid
graph TD
    Kira_Yamato[基拉·大和]
    Lacus_Clyne[拉克丝·克莱因]
    Athrun_Zala[阿斯兰·萨拉]
    Cagalli_Yula_Athha[卡嘉莉·尤拉·阿斯哈]
    Shinn_Asuka[真·飞鸟]
    Lunamaria_Hawke[露娜玛丽亚·霍克]
    COMPASS[世界和平监视组织COMPASS]
    Foundation[芬德申王国]
    Orphee_Lam_Tao[奥尔菲·拉姆·陶]
    %% 节点定义结束，开始定义边
    Kira_Yamato ---|恋人| Lacus_Clyne
    Kira_Yamato ---|挚友| Athrun_Zala
    Kira_Yamato -->|隶属| COMPASS
    Kira_Yamato -->|前辈| Shinn_Asuka
    Lacus_Clyne -->|初代总裁| COMPASS
    Athrun_Zala ---|恋人| Cagalli_Yula_Athha
    Athrun_Zala -.->|协力| COMPASS
    Shinn_Asuka ---|恋人| Lunamaria_Hawke
    Shinn_Asuka -->|隶属| COMPASS
    Lunamaria_Hawke -->|隶属| COMPASS
    COMPASS -->|对立| Foundation
    Orphee_Lam_Tao -->|隶属| Foundation
    Orphee_Lam_Tao -.->|追求| Lacus_Clyne
\`\`\`

---
# 复杂数学公式

### 1. **理解 \(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\) 的含义**
   - \(\boldsymbol{\alpha}\) 和 \(\boldsymbol{\beta}\) 是三维列向量，因此 \(\boldsymbol{\alpha}^T \boldsymbol{\beta}\) 表示它们的点积（内积）。
   - \(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\) 意味着向量 \(\boldsymbol{\alpha}\) 和 \(\boldsymbol{\beta}\) 正交（即垂直），因为点积为零表示它们之间的夹角为 90 度。

### 2. **正交补空间的概念**
   - 在线性代数中，对于一个子空间 \(W\)，它的正交补空间（记为 \(W^\perp\)）定义为所有与 \(W\) 中每个向量正交的向量的集合。即：
     \[
     W^\perp = \{ \mathbf{v} \in \mathbb{R}^3 \mid \mathbf{v} \cdot \mathbf{w} = 0 \text{ 对于所有 } \mathbf{w} \in W \}
     \]
   - 例如，如果 \(W\) 是由一个向量 \(\boldsymbol{\alpha}\) 张成的一维子空间（即 \(W = \operatorname{span}\{\boldsymbol{\alpha}\}\)），那么 \(W^\perp\) 就是所有与 \(\boldsymbol{\alpha}\) 正交的向量构成的二维平面。

### 3. **\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\) 与正交补空间的联系**
   - 当 \(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\) 时，这意味着：
     - \(\boldsymbol{\beta}\) 属于 \(\operatorname{span}\{\boldsymbol{\alpha}\}\) 的正交补空间，即 \(\boldsymbol{\beta} \in (\operatorname{span}\{\boldsymbol{\alpha}\})^\perp\)。
     - 同样，\(\boldsymbol{\alpha}\) 也属于 \(\operatorname{span}\{\boldsymbol{\beta}\}\) 的正交补空间，即 \(\boldsymbol{\alpha} \in (\operatorname{span}\{\boldsymbol{\beta}\})^\perp\)。
   - 换句话说，\(\boldsymbol{\beta}\) 与 \(\boldsymbol{\alpha}\) 张成的直线正交，因此 \(\boldsymbol{\beta}\) 位于该直线的垂直平面（即正交补空间）上。反之亦然。

### 4. **在三维空间中的几何意义**
   - 在三维空间中，如果 \(\boldsymbol{\alpha}\) 是一个非零向量，那么 \(\operatorname{span}\{\boldsymbol{\alpha}\}\) 是一条通过原点的直线，而它的正交补空间 \((\operatorname{span}\{\boldsymbol{\alpha}\})^\perp\) 是一个通过原点且与该直线垂直的平面。
   - \(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\) 表示 \(\boldsymbol{\beta}\) 位于这个垂直平面上。同样，如果 \(\boldsymbol{\beta}\) 非零，那么 \(\boldsymbol{\alpha}\) 也位于与 \(\boldsymbol{\beta}\) 垂直的平面上。

### 5. **推广到更一般的情况**
   - 如果考虑多个向量，正交补空间的概念可以扩展。例如，如果有一组向量 \(\{\boldsymbol{\alpha}_1, \boldsymbol{\alpha}_2, \ldots, \boldsymbol{\alpha}_k\}\)，那么它们的张成子空间 \(W = \operatorname{span}\{\boldsymbol{\alpha}_1, \ldots, \boldsymbol{\alpha}_k\}\) 的正交补空间 \(W^\perp\) 包含所有与这些向量正交的向量。
   - 在这种情况下，\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\) 可以看作 \(\boldsymbol{\beta}\) 与 \(W\) 正交的一个特例（当 \(W\) 只由 \(\boldsymbol{\alpha}\) 张成时）。

总之，\(\boldsymbol{\alpha}^T \boldsymbol{\beta} = 0\) 直接体现了正交补空间的关系：它表明一个向量属于另一个向量张成子空间的正交补空间。如果你有更多向量或子空间，这种联系可以进一步深化。

**示例：** emm\`1-(5)\`、\`3-(3)\`、\`3-(4)\` complex test \`1-(4)\`“heiheihei”中，hello world。`

    let rolling = ''
    let tokensWithStream: ReturnType<typeof mdWithStream.stream.parse> = []
    let tokensWithoutStream: ReturnType<typeof mdWithoutStream.parse> = []

    for (const char of longDoc) {
      rolling += char
      tokensWithStream = mdWithStream.stream.parse(rolling)
      tokensWithoutStream = mdWithoutStream.parse(rolling)
      expect(tokensWithStream).toEqual(tokensWithoutStream)
    }

    const referenceTokens = MarkdownIt().parse(longDoc)
    expect(tokensWithStream).toEqual(referenceTokens)

    const stats = mdWithStream.stream.stats()
    expect(stats.total).toBe(longDoc.length)
    // Note: with conservative heuristics, char-by-char often falls back to full parse.
    // We only assert parity and total; appendHits may be 0 depending on content shape.
    expect(stats.fullParses).toBeGreaterThan(0)
  })
})
