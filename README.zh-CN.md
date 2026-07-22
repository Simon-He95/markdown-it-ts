# markdown-it-ts

一个 TypeScript-first、兼容 markdown-it public API 的 Markdown 解析/渲染器，支持流式/增量解析与异步渲染。

[English](./README.md) | 简体中文

快速入口：[文档索引](./docs/README.md) · [流式/分块优化](./docs/stream-optimization.md) · [性能报告](./docs/perf-report.md) · [兼容性报告](./docs/COMPATIBILITY_REPORT.md)

> **运行时说明**
>
> `markdown-it-ts` 是 ESM-only 包，要求 Node.js >= 18。
>
> ```js
> import MarkdownIt from 'markdown-it-ts'
> ```
>
> 如果你的项目仍然是 CommonJS，请在 async 函数里使用动态导入：
>
> ```js
> async function main() {
>   const { default: MarkdownIt } = await import('markdown-it-ts')
>
>   const md = MarkdownIt()
>   console.log(md.render('# ok'))
> }
>
> main().catch((error) => {
>   console.error(error)
>   process.exitCode = 1
> })
> ```

一个在 [markdown-it](https://github.com/markdown-it/markdown-it) 基础上重构的 TypeScript 版本，采用更模块化的架构，支持 tree-shaking，并将 parse/render 职责解耦。

## 兼容性边界

`markdown-it-ts` 目标是兼容 markdown-it public API 中常见的 parser、renderer、plugin 用法。不支持 private `markdown-it/lib/...` 导入、依赖上游未文档化内部状态、直接 CommonJS `require('markdown-it-ts')`，也不支持 Node.js < 18。

| 层级 | API 面 |
| --- | --- |
| 稳定目标 | `MarkdownIt()`、`parse`、`render`、`renderInline`、`renderAsync`、`renderer.rules`、`Token`、公开 ruler/plugin API |
| 高级用法 | Root `withRenderer`，以及已文档化的子路径导出，例如 `core`、renderer helper、common utilities |
| 实验性 | `stream`、`chunkedParse`、`StreamBuffer`、`UnboundedBuffer`、`EditableBuffer`、`PieceTable`、iterable/sink parsing、chunk strategy recommender 通过 `markdown-it-ts/experimental` 使用；部分 helper 也有显式子路径，例如 `markdown-it-ts/stream/buffer`、`markdown-it-ts/stream/chunked`、`markdown-it-ts/stream/debounced`、`markdown-it-ts/support/chunk_recommend` |

根入口不再以顶层 named export 暴露实验性 helper。部分高级实例方法和选项仍保留给既有的大输入集成使用，并会在类型声明中标记为 experimental。

常见 0.x import 迁移：

| 0.x import | 1.0 import |
| --- | --- |
| `import { StreamBuffer } from 'markdown-it-ts'` | `import { StreamBuffer } from 'markdown-it-ts/experimental'` 或 `markdown-it-ts/stream/buffer` |
| `import { chunkedParse } from 'markdown-it-ts'` | `import { chunkedParse } from 'markdown-it-ts/experimental'` 或 `markdown-it-ts/stream/chunked` |
| `import { recommendFullChunkStrategy } from 'markdown-it-ts'` | `import { recommendFullChunkStrategy } from 'markdown-it-ts/support/chunk_recommend'` |
| `import { UnboundedBuffer } from 'markdown-it-ts'` | `import { UnboundedBuffer } from 'markdown-it-ts/experimental'` |

## 安装

```bash
npm install markdown-it-ts
```

## 使用示例

```ts
import markdownIt from 'markdown-it-ts'

const md = markdownIt()
const html = md.render('# 你好，世界')
console.log(html)
```

安全提醒：`markdown-it-ts` 不是 HTML sanitizer。默认会转义 raw HTML，但 `html: true` 会直接放行 raw HTML，插件写入的属性也会被视为可信输出。处理不可信作者内容时，请在应用边界额外做 HTML sanitize。

## 大文本输入

普通场景继续使用原来的 markdown-it 兼容 API 即可：

```ts
const md = markdownIt()
const tokens = md.parse(hugeMarkdown)
const html = md.render(hugeMarkdown)
```

默认的 `parse` / `render` 在输入超过大文档阈值时，可能切到内部的大文本优化路径。为了兼容插件生态，这个隐式路径只会在没有安装插件、parser ruler 没有被修改时启用；调用 `.use()` 或自定义 parser rule 后默认继续走 plain full parse。如需显式启用分块路径，请使用 `experimental.fullChunkedFallback`。

只有当你的上游输入本来就是 chunk 流，而且你不想先 `join('')` 成一个超大字符串时，才需要显式使用下面这些高级入口：

```typescript
import MarkdownIt from 'markdown-it-ts'
import { UnboundedBuffer } from 'markdown-it-ts/experimental'

const md = MarkdownIt()

const tokens = md.parseIterable(fileChunks)

const buffer = new UnboundedBuffer(md, { mode: 'stream' })
for await (const chunk of logChunks) {
  buffer.feed(chunk)
  buffer.flushAvailable()
}
const finalTokens = buffer.flushForce()
```

大输入调参选项建议放在 `experimental` 命名空间下：

```ts
const md = MarkdownIt({
  experimental: {
    autoUnbounded: false,
    fullChunkedFallback: true,
  },
})
```

旧的顶层实验选项在 1.x 中仍然保留兼容，但推荐新代码使用命名空间写法。

`parseIterable` / `parseAsyncIterable` 用于“输入本身就是 `Iterable<string>` / `AsyncIterable<string>`”的高级场景；`UnboundedBuffer` 用于 append-only 的 chunk 流，只保留有界尾部，而不是把历史全文一直留在一个大字符串里。

如果显式使用 chunk 流，而且连输出也不想保留完整 token 数组，可以直接走 sink 形式：

```ts
md.parseIterableToSink(fileChunks, (tokens, info) => {
  consumeTokenChunk(tokens, info)
})
```

如果是任意位置的中间编辑，可以用 `EditableBuffer`。它内部用 piece-table 保存源码，并从受影响块之前的锚点开始重解析，而不是每次都把整篇文本重新摊平成一个大字符串再 full parse。现在 full parse 和局部重解析都会直接把 `PieceTableSourceView` 交给 `md.core.parseSource(...)`，因此被解析的区间也不需要先物化成一个超大的中间字符串。

### chunked / streaming 正确性说明

Markdown 并不总是 chunk-local 的语言。某些语法依赖整篇文档状态，例如 reference definitions、footnote definitions、abbreviation definitions，以及插件自定义的全局状态。

`chunkedParse()` 和完整字符串的 unbounded parsing 默认采用 correctness-first 策略：遇到已知全局状态语法时会 fallback 到 full parse。强制分块如果落在非空行边界，也会退回 full parse，因为长列表、blockquote、HTML block 和普通段落都不能随意切开后再拼 token。

Iterable/sink 解析偏 streaming 场景；它不一定能在提交前面的 chunk 前看到后续的 reference/footnote/abbr definition。因此如果需要严格 full-parse 等价，包含全局定义的文档应优先使用完整字符串解析，或避免过早 flush。

检测器是保守的：即使 definition-like 文本出现在代码块或普通文本里，也可能触发 fallback。这个策略优先保证正确性，而不是极限性能。

你只能显式关闭已知全局状态语法触发的 fallback：

```ts
chunkedParse(md, source, env, {
  fallbackOnGlobalState: false,
})
```

非空行上的 unsafe chunk boundary 仍然会退回 full parse，因为在那里切分无法保证 token 流安全。

关闭全局状态 fallback 属于性能优先模式；对于包含全局状态的文档，输出可能和 full parse 不一致。

需要异步渲染规则（例如异步语法高亮）？使用 `renderAsync`，它会等待异步规则的结果：

```typescript
const md = markdownIt()
const html = await md.renderAsync('# 你好，世界', {
  highlight: async (code, lang) => {
    const highlighted = await someHighlighter(code, lang)
    return highlighted
 },
})
```

## 文档导航

- [文档索引](./docs/README.md)（架构、插件开发、流式、性能）
- [流式/分块解析优化](./docs/stream-optimization.md)
- [性能报告](./docs/perf-report.md) 与 [最新一次跑分（中文）](./docs/perf-latest.zh-CN.md)
- [安全说明](./docs/security.md)
- [兼容性报告](./docs/COMPATIBILITY_REPORT.md)

## 为什么推荐用 markdown-it-ts 渲染？

- **对比 markdown-it**：沿用相同 API/插件生态，但我们用 TypeScript 重写了解析器与渲染器，拆分为可 tree-shaking 的模块并加入流式/分块能力。普通 `parse` / `render` 调用方式保持不变，超大但有限的字符串会自动启用内部大文本优化；如果是编辑器输入，还可以额外启用 `stream`、`streamChunkedFallback` 等策略，仅重算新增内容，而不是每次重跑整篇文档。
- **对比 markdown-exit**：两者都强调性能，但 markdown-it-ts 保留 markdown-it API/插件面、typed API 与 async render（`renderAsync`），并提供更丰富的调参组合（例如块级 fence 感知、混合模式 fallback）。下方 benchmark 按语料和比较语义拆分；专项 stock-subset 的排名不能外推到一般 Markdown。
- **对比 remark**：remark 生态非常适合 AST 转换，真实项目通常还会叠加 unified/rehype 阶段。这里的数字只比较本仓库 Markdown → HTML harness；markdown-it-ts 直接输出 HTML、保留 markdown-it renderer 语义，并兼容异步高亮、Token 后处理等常见需求。
- **对比 micromark**：micromark 是面向 CommonMark 的参考实现，目标和 API 都不同。markdown-it-ts 以 markdown-it 的插件 API 与 renderer 语义兼容为目标；下方数字只代表本仓库 harness 覆盖的特定 parse/render 场景。
- **工程体验**：代码与类型全部开源且随发布同步，可以配合 `docs/stream-optimization.md`、`markdown-it-ts/experimental` 以及 `recommend*Strategy`、`StreamBuffer`、`chunkedParse` 等已开放显式子路径工具，快速搭建自适应流式管线；CI 中的基准脚本 (`perf:generate`, `perf:update-readme`) 也能确保团队持续看到最新对比数据，减少性能回退的顾虑。
- **生态/兼容**：继承 markdown-it 的 ruler、Token、插件管线，迁移现有插件或自己写的 renderer 通常只需改 import；CommonMark fixture 和插件矩阵在 CI 中默认运行。
- **生产准备**：内置 async render、基于 Token 的后处理钩子、流式缓冲区以及 chunked fallback 让它适用于 SSR、实时协作编辑器以及大 Markdown 文档的批量处理，配合 `docs/perf-report.md` / `docs/perf-history/*.json` 可以观察长期性能趋势。

## 性能说明（概览）

- 报告把三类问题分开：固定配置的 native API 吞吐、tuned/best-of 场景、已验证等价输出的比较。
- 历史按尺寸结果使用 synthetic `stock-subset`：ATX 标题、单行纯文本段落、平铺紧凑列表和 fenced code；重复段落/列表会命中 `stock-fast` 与末次输出缓存，因此这是专项快路径基准，不代表一般 Markdown。
- 新报告另外包含 feature-mixed synthetic 语料和本仓库自有的 MIT 许可真实文档，逐语料/逐文件报告，不合并成一个总体胜负。
- 可复现：本仓库附带基准脚本与对比脚本，便于在本机环境复现与比较。

本地复现基准：

```bash
pnpm build
node scripts/quick-benchmark.mjs
# 生成/刷新完整报告与 README 片段
pnpm run perf:generate
pnpm run perf:update-readme
```

说明：
- 性能与 Node.js 版本、CPU 以及具体内容形态相关。请参考 `docs/perf-latest.md` 获取完整表格与运行环境信息。
- 流式（stream）模式默认以正确性为优先。对于编辑器输入（频繁追加）的场景，可使用 `StreamBuffer` 在“块级边界”进行刷写，以提高追加路径命中率。

### 按语料拆分的固定配置 native API 结果

markdown-it-ts 使用默认 `MarkdownIt()` 实例；feature-mixed 和真实文档的 OX 行启用 tables 与 strikethrough，以更接近地对齐这些特性。Parse 行不是等价输出比较：markdown-it-ts 返回可变 `Token[]`，`@ox-content/napi` 返回包含 mdast JSON 字符串的对象。Render 行比较双方原生行为，并明确记录 HTML 是否相同。不同语料不会合并为一个总体胜负。

<!-- perf-auto:native-corpora:start -->
| 语料 | 字符数 | TS parse | OX parse | TS parse 路径 | TS render | OX render | TS render 路径 | HTML 相同？ |
|:--|---:|---:|---:|:--|---:|---:|:--|:--|
| synthetic stock-subset (~100k) | 100,126 | 0.6125ms | 0.7877ms | stock-fast | 0.2738ms | 0.6829ms | stock-fast | 否 |
| synthetic feature-mixed (~100k) | 100,450 | 3.7521ms | 0.8735ms | general | 4.4439ms | 0.8063ms | token-renderer | 否 |
| docs/architecture.md | 6,564 | 0.0929ms | 0.0209ms | general | 0.1040ms | 0.0151ms | token-renderer | 否 |
| docs/development.md | 4,756 | 0.0987ms | 0.0206ms | general | 0.1120ms | 0.0173ms | token-renderer | 否 |
| docs/security.md | 1,375 | 0.0259ms | 0.0063ms | general | 0.0298ms | 0.0058ms | token-renderer | 否 |
<!-- perf-auto:native-corpora:end -->

### Tuned/best-of stock-subset 结果

以下历史按尺寸数字只针对 synthetic `stock-subset`。除非特别说明，parse 取 markdown-it-ts S1–S5 中每个尺寸的最快值；render 使用默认 `MarkdownIt().render()`，两者不能合并理解为同一链路排名。

## 与 markdown-it 的解析性能对比（一次性解析）

最新一次在本机环境（Node.js 版本、CPU 请见 `docs/perf-latest.md`）经预热并取多组采样中位数的对比结果：

<!-- perf-auto:one-examples:start -->
- 5,000 chars: 0.0314ms vs 0.1460ms → ~4.6× faster, ~78% less time
- 20,000 chars: 0.0985ms vs 0.5863ms → ~6× faster, ~83% less time
- 100,000 chars: 0.5893ms vs 3.0054ms → ~5.1× faster, ~80% less time
- 500,000 chars: 4.4061ms vs 22.71ms → ~5.2× faster, ~81% less time
- 1,000,000 chars: 14.54ms vs 42.75ms → ~2.9× faster, ~66% less time
<!-- perf-auto:one-examples:end -->

注意：数字会因环境与内容不同而变化，建议在本地按上文“本地复现基准”步骤生成你自己的对比报告。若需在 CI 中进行回归检测，可运行：`pnpm run perf:check`。

### 与 @ox-content/napi 的解析性能对比（仅解析）

下面是 synthetic `stock-subset` 上 markdown-it-ts 每个尺寸最快 one-shot 场景与 `@ox-content/napi` native parse-only 的 tuned 比较，不作为固定配置 headline。

注意：两边输出 schema 不同，不是等价工作。`@ox-content/napi` 的 parse-only API 返回 AST JSON 字符串；下面的数据也不包含额外 `JSON.parse` 成 JavaScript 对象的成本。

<!-- perf-auto:ox-one:start -->
- 5,000 chars: 0.0314ms vs 0.0304ms → ~1 倍更慢，约多 3% 耗时
- 20,000 chars: 0.0985ms vs 0.1180ms → ~1.2× 更快，约少 16% 耗时
- 100,000 chars: 0.5893ms vs 0.7226ms → ~1.2× 更快，约少 18% 耗时
<!-- perf-auto:ox-one:end -->

如果把 `@ox-content/napi` 返回的 AST JSON 字符串立即 `JSON.parse` 成 JavaScript 对象：

<!-- perf-auto:ox-json-one:start -->
- 5,000 chars: 0.0314ms vs 0.1367ms → ~4.4× 更快，约少 77% 耗时
- 20,000 chars: 0.0985ms vs 0.5493ms → ~5.6× 更快，约少 82% 耗时
- 100,000 chars: 0.5893ms vs 2.8743ms → ~4.9× 更快，约少 79% 耗时
<!-- perf-auto:ox-json-one:end -->

实验性 stock-subset AST JSON 输出（`parseStockFastAstJson`）与 `@ox-content/napi` parse-only 对比：

<!-- perf-auto:stock-ast-json:start -->
- 5,000 chars: 0.0196ms vs 0.0316ms → ~1.6× 更快，约少 38% 耗时
- 20,000 chars: 0.0666ms vs 0.1226ms → ~1.8× 更快，约少 46% 耗时
- 100,000 chars: 0.3268ms vs 0.7361ms → ~2.3× 更快，约少 56% 耗时
<!-- perf-auto:stock-ast-json:end -->

从专项 native 基线里能学到的优化方向：

- 双方 native parse API 返回不同 schema、执行不同工作，这些耗时是运行层面的参考，不是等价输出排名。
- 对 OX 的 JSON 字符串继续执行 `JSON.parse` 代表额外消费成本，但仍不会把 schema 变成 markdown-it tokens。
- `parseStockFastAstJson` 是单独的等价输出比较：计时前会断言双方 mdast JSON 完全一致。
- 性能高度依赖语料形态；选择实现前应同时查看 feature-mixed 与真实文件结果。

### 与 remark 的解析性能对比（仅解析）

我们也会比较 `remark`（仅解析）的吞吐表现，以了解在纯解析任务中的差距。

单次解析耗时（越低越好）：

<!-- perf-auto:remark-one:start -->
- 5,000 chars: 0.0314ms vs 2.9947ms → 95.3× faster
- 20,000 chars: 0.0985ms vs 16.70ms → 169.5× faster
- 100,000 chars: 0.5893ms vs 124.62ms → 211.5× faster
<!-- perf-auto:remark-one:end -->

增量工作负载（append workload）：

<!-- perf-auto:remark-append:start -->
- 5,000 chars: 0.0825ms vs 9.7748ms → 118.4× faster
- 20,000 chars: 0.3367ms vs 49.99ms → 148.5× faster
- 100,000 chars: 2.0518ms vs 394.93ms → 192.5× faster
<!-- perf-auto:remark-append:end -->

说明：
- `remark` 常与其他 rehype/插件配合，真实项目的耗时可能更高；这里仅对其解析吞吐进行对比。
- 结果依赖于机器配置与内容形态，建议参考 `docs/perf-latest.json` 或 `docs/perf-history/*.json` 上的完整数据。

### 与 micromark 的解析性能对比（仅解析）

我们也会比较 `micromark`（场景 `MM1`）的解析吞吐，这里只测其 preprocess + parse + postprocess 管线（不包含 HTML compile）。以下数据来自 `docs/perf-latest.json`。

一次性解析（oneShotMs）—— markdown-it-ts vs micromark-based parse：

<!-- perf-auto:micromark-one:start -->
- 5,000 chars: 0.0314ms vs 2.4432ms → 77.8× faster
- 20,000 chars: 0.0985ms vs 13.73ms → 139.4× faster
- 100,000 chars: 0.5893ms vs 80.37ms → 136.4× faster
<!-- perf-auto:micromark-one:end -->

追加工作负载（appendWorkloadMs）—— markdown-it-ts vs micromark-based parse：

<!-- perf-auto:micromark-append:start -->
- 5,000 chars: 0.0825ms vs 7.7842ms → 94.3× faster
- 20,000 chars: 0.3367ms vs 38.86ms → 115.4× faster
- 100,000 chars: 2.0518ms vs 258.95ms → 126.2× faster
<!-- perf-auto:micromark-append:end -->

## 渲染性能（markdown → HTML）

除了纯解析，我们也持续跟踪 `md.render(markdown)` 这一整条 render API 调用的耗时，也就是“解析 + HTML 输出”的总成本，而不是单独比较低层 renderer 热路径。以下数据来自最近一次 `pnpm run perf:generate`。

对于超大但有限的字符串，stock parser 实例可能使用内部大文本优化；插件或自定义 parser rule 的实例默认保留 full parse 语义。`parseIterable` / `UnboundedBuffer` 这类 API 只保留给“输入本来就是 chunk 流”的高级场景。

### 对比 @ox-content/napi render API

下面对比 synthetic `stock-subset` 上默认 `markdown-it-ts.render` 与 `@ox-content/napi` 的 native parse + render 行为。它不是 S1–S5 best-of，但双方 HTML 不等价（例如 OX 默认生成 heading ID），因此不能称为等价工作，也不能外推到 feature-mixed Markdown。

<!-- perf-auto:render-ox:start -->
- 5,000 chars: 0.0168ms vs 0.0288ms → ~1.7× 更快，约少 42% 耗时
- 20,000 chars: 0.0555ms vs 0.1388ms → ~2.5× 更快，约少 60% 耗时
- 100,000 chars: 0.2714ms vs 0.6589ms → ~2.4× 更快，约少 59% 耗时
<!-- perf-auto:render-ox:end -->

Legacy stock-subset 汇总（tuned parse + 默认 native render）：

<!-- perf-auto:ox-summary:start -->
| Size | markdown-it-ts parse | @ox-content/napi parse | Parse 对比 | markdown-it-ts render | @ox-content/napi render | Render 对比 |
|---:|---:|---:|:--|---:|---:|:--|
| 5,000 | 0.0314ms | 0.0304ms | ~1 倍更慢，约多 3% 耗时 | 0.0168ms | 0.0288ms | ~1.7× 更快，约少 42% 耗时 |
| 20,000 | 0.0985ms | 0.1180ms | ~1.2× 更快，约少 16% 耗时 | 0.0555ms | 0.1388ms | ~2.5× 更快，约少 60% 耗时 |
| 100,000 | 0.5893ms | 0.7226ms | ~1.2× 更快，约少 18% 耗时 | 0.2714ms | 0.6589ms | ~2.4× 更快，约少 59% 耗时 |
<!-- perf-auto:ox-summary:end -->

### 对比 markdown-it render API

<!-- perf-auto:render-md:start -->
- 5,000 chars: 0.0168ms vs 0.1875ms → ~11.2× faster
- 20,000 chars: 0.0555ms vs 0.7291ms → ~13.1× faster
- 100,000 chars: 0.2714ms vs 3.8918ms → ~14.3× faster
- 500,000 chars: 1.9236ms vs 27.16ms → ~14.1× faster
- 1,000,000 chars: 3.9449ms vs 54.80ms → ~13.9× faster
<!-- perf-auto:render-md:end -->

### 对比 remark + rehype render API

<!-- perf-auto:render-remark:start -->
- 5,000 chars: 0.0168ms vs 4.1402ms → ~247.1× faster
- 20,000 chars: 0.0555ms vs 18.80ms → ~338.6× faster
- 100,000 chars: 0.2714ms vs 133.96ms → ~493.6× faster
<!-- perf-auto:render-remark:end -->

### 对比 micromark（CommonMark 参考实现）

<!-- perf-auto:render-micromark:start -->
- 5,000 chars: 0.0168ms vs 3.3405ms → ~199.4× faster
- 20,000 chars: 0.0555ms vs 15.24ms → ~274.4× faster
- 100,000 chars: 0.2714ms vs 93.06ms → ~342.9× faster
<!-- perf-auto:render-micromark:end -->

本地复现：

```bash
pnpm build
node scripts/quick-benchmark.mjs
pnpm run perf:generate
pnpm run perf:update-readme
```

## 与 markdown-exit 的解析性能对比

下面表格比较了 markdown-it-ts（取最佳 one-shot 场景）与 `markdown-exit` 在 one-shot 解析（oneShotMs）上的表现：

<!-- perf-auto:exit-one:start -->
| Size (chars) | markdown-it-ts (best one-shot) | markdown-exit (one-shot) |
|---:|---:|---:|
| 5,000 | 0.0314ms | 0.1986ms |
| 20,000 | 0.0985ms | 0.7924ms |
| 50,000 | 0.2480ms | 1.9458ms |
| 100,000 | 0.5893ms | 4.2022ms |
| 200,000 | 1.6233ms | 9.5993ms |
<!-- perf-auto:exit-one:end -->

说明：markdown-it-ts 在较小文档上通过流式/分片策略获得显著 one-shot 优势；在非常大的文档（200k）上，各实现的绝对差距缩小。

### 与 markdown-exit 渲染器的对比

来自最近一次 perf 快照的 render API（parse + HTML 输出）汇总：

<!-- perf-auto:render-exit:start -->
- 5,000 chars: 0.0168ms vs 0.2412ms → ~14.4× faster
- 20,000 chars: 0.0555ms vs 0.9254ms → ~16.7× faster
- 50,000 chars: 0.1359ms vs 2.3473ms → ~17.3× faster
- 100,000 chars: 0.2714ms vs 4.8490ms → ~17.9× faster
- 200,000 chars: 0.5384ms vs 10.92ms → ~20.3× faster
<!-- perf-auto:render-exit:end -->


## 非等价输出、仅限 stock-subset 的 Parse / Render 排名（5k~200k）

<!-- perf-auto:ranking-zh:start -->
以下 legacy 排名只覆盖专项 synthetic `stock-subset`，直接基于最新 `docs/perf-latest.json` 快照生成；它不是一般 Markdown 排名。
其中 parse 排名取 markdown-it-ts 在对应规模下 oneShotMs 最低的 tuned 场景（S1~S5）；render 排名使用默认 `MarkdownIt().render()` 的原生行为，且跨库 HTML 未验证等价，因此两张表不能理解为同一条链路或等价工作排名。

**Parse 排名（one-shot 解析耗时，单位：ms）**

| Size | Rank | Library | oneShotMs |
|---:|---:|---|---:|
| 5,000 | 1 | @ox-content/napi | 0.0304ms |
| 5,000 | 2 | markdown-it-ts | 0.0314ms |
| 5,000 | 3 | markdown-it | 0.1460ms |
| 5,000 | 4 | markdown-exit | 0.1986ms |
| 5,000 | 5 | remark | 2.9947ms |
| 20,000 | 1 | markdown-it-ts | 0.0985ms |
| 20,000 | 2 | @ox-content/napi | 0.1180ms |
| 20,000 | 3 | markdown-it | 0.5863ms |
| 20,000 | 4 | markdown-exit | 0.7924ms |
| 20,000 | 5 | remark | 16.70ms |
| 50,000 | 1 | markdown-it-ts | 0.2480ms |
| 50,000 | 2 | @ox-content/napi | 0.3277ms |
| 50,000 | 3 | markdown-it | 1.4660ms |
| 50,000 | 4 | markdown-exit | 1.9458ms |
| 50,000 | 5 | remark | 52.58ms |
| 100,000 | 1 | markdown-it-ts | 0.5893ms |
| 100,000 | 2 | @ox-content/napi | 0.7226ms |
| 100,000 | 3 | markdown-it | 3.0054ms |
| 100,000 | 4 | markdown-exit | 4.2022ms |
| 100,000 | 5 | remark | 124.62ms |
| 200,000 | 1 | markdown-it-ts | 1.6233ms |
| 200,000 | 2 | @ox-content/napi | 1.6315ms |
| 200,000 | 3 | markdown-it | 7.3875ms |
| 200,000 | 4 | markdown-exit | 9.5993ms |
| 200,000 | 5 | remark | 300.52ms |

**Render 排名（解析 + HTML 输出耗时，单位：ms）**

| Size | Rank | Library | renderMs |
|---:|---:|---|---:|
| 5,000 | 1 | markdown-it-ts | 0.0168ms |
| 5,000 | 2 | @ox-content/napi | 0.0288ms |
| 5,000 | 3 | markdown-it | 0.1875ms |
| 5,000 | 4 | markdown-exit | 0.2412ms |
| 5,000 | 5 | remark + rehype | 4.1402ms |
| 20,000 | 1 | markdown-it-ts | 0.0555ms |
| 20,000 | 2 | @ox-content/napi | 0.1388ms |
| 20,000 | 3 | markdown-it | 0.7291ms |
| 20,000 | 4 | markdown-exit | 0.9254ms |
| 20,000 | 5 | remark + rehype | 18.80ms |
| 50,000 | 1 | markdown-it-ts | 0.1359ms |
| 50,000 | 2 | @ox-content/napi | 0.3011ms |
| 50,000 | 3 | markdown-it | 1.8166ms |
| 50,000 | 4 | markdown-exit | 2.3473ms |
| 50,000 | 5 | remark + rehype | 59.81ms |
| 100,000 | 1 | markdown-it-ts | 0.2714ms |
| 100,000 | 2 | @ox-content/napi | 0.6589ms |
| 100,000 | 3 | markdown-it | 3.8918ms |
| 100,000 | 4 | markdown-exit | 4.8490ms |
| 100,000 | 5 | remark + rehype | 133.96ms |
| 200,000 | 1 | markdown-it-ts | 0.5384ms |
| 200,000 | 2 | @ox-content/napi | 1.4487ms |
| 200,000 | 3 | markdown-it | 8.6381ms |
| 200,000 | 4 | markdown-exit | 10.92ms |
| 200,000 | 5 | remark + rehype | 330.55ms |
<!-- perf-auto:ranking-zh:end -->


### 回归检查与对比

- 使用最近一次的基线进行回归检查（同一采集方法/同一机器更稳）：
  - `pnpm run perf:check:latest`
- 运行按 token 类型拆分的 render 对比基准（对照 `markdown-it`）：
  - `pnpm run perf:render-rules`
  - 若也想看零输出/低信号类别，可追加 `--include-noise`
  - 若想在有意义类别上做失败退出检查，可运行 `pnpm run perf:render-rules:check`
- 查看详细差异（按“最差”排序，便于定位）：
  - `pnpm run perf:diff`
- 在人工确认后将最新结果设为新的基线：
  - `pnpm run perf:accept`

## StreamBuffer（增量编辑建议）

当输入以“逐字符”方式到达时，直接调用 `md.stream.parse` 往往无法命中追加快路径（append fast-path）。
`StreamBuffer` 会聚合字符输入，只在安全的块级边界调用解析，从而保证正确性并提升命中率：

```ts
import markdownIt from 'markdown-it-ts'
import { StreamBuffer } from 'markdown-it-ts/stream/buffer'

const md = markdownIt({ stream: true })
const buffer = new StreamBuffer(md)

buffer.feed('Hello')
buffer.flushIfBoundary() // 尚未到块级边界，可能不触发

buffer.feed('\n\nWorld!\n')
buffer.flushIfBoundary() // 到达边界，触发增量解析

// 结束时确保一次最终解析
buffer.flushForce()
console.log(buffer.stats()) // 可查看 appendHits/fullParses 等统计
```

## 运行上游测试（可选）

本仓库可以在本地运行一部分上游 markdown-it 的测试与病理用例，默认关闭，因为：
- 需要在本仓库同级放置上游 `markdown-it` 仓库（测试使用相对路径引用其源码与夹具）
- 依赖网络从 GitHub 拉取参考脚本

启用方法（默认使用“同级目录”方式）：

```bash
# 目录结构类似：
#   ../markdown-it/    # 上游仓库（包含 index.mjs 与 fixtures）
#   ./markdown-it-ts/  # 本仓库

RUN_ORIGINAL=1 pnpm test
```

说明：
- 病理用例较重，涉及 worker 与网络，仅在需要时开启。
- CI 默认保持关闭。

如果不使用同级目录，也可以通过环境变量指定上游路径：

```bash
MARKDOWN_IT_DIR=/绝对路径/markdown-it RUN_ORIGINAL=1 pnpm test
```

便捷脚本：

```bash
pnpm run test:original           # 等价 RUN_ORIGINAL=1 pnpm test
pnpm run test:original:network   # 同时开启 RUN_NETWORK=1
```

## 致谢（Acknowledgements）

本项目在 markdown-it 的设计与实现基础上完成 TypeScript 化与架构重构，
我们对原项目及其维护者/贡献者（尤其是 Vitaly Puzrin 与社区）表示诚挚感谢。
很多算法、渲染行为、规范与测试用例都来自 markdown-it；没有这些工作就不会有此项目。

## 许可证

MIT。详见仓库中的 LICENSE。
