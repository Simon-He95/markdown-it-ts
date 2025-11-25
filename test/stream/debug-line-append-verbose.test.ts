import { describe, it } from 'vitest'
import MarkdownIt, { StreamBuffer } from '../../src'

describe('debug: stream line append verbose', () => {
  it('prints tokens and html after each flush for inspection', () => {
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

    const lines = longDoc.split('\n')
    for (let i = 0; i < lines.length; i++) {
      buffer.feed(lines[i] + '\n')
      const tokens = buffer.flushIfBoundary()
      if (tokens) {
        const html = md.renderer.render(tokens, md.options, {})
        const baseHtml = baseline.render(buffer.getText())
        // Print summary for inspection
        // eslint-disable-next-line no-console
        console.log('--- flush at line', i + 1, '---')
        // eslint-disable-next-line no-console
        console.log('stream tokens:', tokens.length, 'stream html len:', html.length)
        // eslint-disable-next-line no-console
        console.log(html.slice(0, 400))
        // eslint-disable-next-line no-console
        console.log('baseline html len:', baseHtml.length)
        // eslint-disable-next-line no-console
        console.log(baseHtml.slice(0, 400))
      }
    }

    // final flush
    const finalTokens = buffer.flushForce()
    const finalHtml = md.renderer.render(finalTokens, md.options, {})
    const finalBaselineHtml = baseline.render(buffer.getText())
    // eslint-disable-next-line no-console
    console.log('=== FINAL ===')
    // eslint-disable-next-line no-console
    console.log('final stream html:\n', finalHtml)
    // eslint-disable-next-line no-console
    console.log('final baseline html:\n', finalBaselineHtml)
  })
})
