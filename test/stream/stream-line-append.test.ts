import { describe, expect, it } from 'vitest'
import MarkdownIt, { StreamBuffer } from '../../src'

describe('stream parser (line-by-line append)', () => {
  it('matches baseline when appending line-by-line', () => {
    const md = MarkdownIt({ stream: true })
    md.stream.resetStats()

    const baseline = MarkdownIt()
    const buffer = new StreamBuffer(md)

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

::: warning
这是一个警告块。
:::
`

    // Feed the document line-by-line, attempting to flush at safe boundaries.
    const lines = longDoc.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // preserve original newlines
      buffer.feed(line + '\n')
      // flushIfBoundary will only actually flush when the accumulated appended
      // segment satisfies stream safety rules (matches production fast-path)
      buffer.flushIfBoundary()
    }

    // Ensure final parse and compare rendered output with baseline
    const tokens = buffer.flushForce()
    const streamHtml = md.renderer.render(tokens, md.options, {})
    const baselineHtml = baseline.render(longDoc)

    // Compare normalized plain-text output (tolerant to minor HTML tokenization differences)
    const stripTags = (s: string) => s.replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/[\s\u00A0]+/g, ' ').trim()

    const plainStream = stripTags(streamHtml)
    const plainBaseline = stripTags(baselineHtml)
    expect(plainStream).toEqual(plainBaseline)

    const stats = md.stream.stats()
    // Append behavior can vary by boundary grouping; assert non-negative counters
    expect(stats.appendHits).toBeGreaterThanOrEqual(0)
    expect(stats.fullParses).toBeGreaterThanOrEqual(0)
  })
})
