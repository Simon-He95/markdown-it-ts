import { describe, expect, it } from 'vitest'
import MarkdownIt from '../../src'
import { StreamBuffer } from '../../src/experimental'

// This test demonstrates how feeding at safe boundaries enables append fast-path hits.
// We reuse the same longDoc from the parser test.

describe('stream buffer', () => {
  it('accumulates input and flushes at boundaries to get append hits', () => {
    const md = MarkdownIt({ stream: true })
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

### 一般形式（在点 \\(x = a\\) 处展开）：
\\[
f(x) = f(a) + f'(a)(x-a) + \\frac{f''(a)}{2!}(x-a)^2 + \\frac{f'''(a)}{3!}(x-a)^3 + \\cdots + \\frac{f^{(n)}(a)}{n!}(x-a)^n + R_n(x)
\\]

其中：
- \\(f^{(k)}(a)\\) 是 \\(f(x)\\) 在 \\(x=a\\) 处的 \\k\\ 阶导数
- \\(R_n(x)\\) 是余项，常见形式有拉格朗日余项：
\\[
R_n(x) = \\frac{f^{(n+1)}(xi)}{(n+1)!}(x-a)^{n+1}, \\quad xi \\text{ 在 } a \\text{ 和 } x \\text{ 之间}
\\]

---

如果您需要某个特定函数在特定点的泰勒展开，请告诉我，我可以为您详细写出。
`

    // Feed char-by-char but only flush at safe boundaries via buffer
    for (const ch of longDoc) {
      buffer.feed(ch)
      buffer.flushIfBoundary()
    }

    // Ensure we flush final state
    const tokens = buffer.flushForce()

    const baselineTokens = baseline.parse(longDoc)
    expect(tokens).toEqual(baselineTokens)

    const stats = md.stream.stats()
    // Expect at least one append hit due to boundary flushes
    expect(stats.appendHits).toBeGreaterThan(0)
    expect(stats.fullParses).toBeGreaterThan(0)
  })
})
