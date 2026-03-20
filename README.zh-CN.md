# markdown-it-ts

一个 TypeScript-first、markdown-it 兼容的 Markdown 解析/渲染器，支持流式/增量解析与异步渲染。

[English](./README.md) | 简体中文

快速入口：[文档索引](./docs/README.md) · [流式/分块优化](./docs/stream-optimization.md) · [性能报告](./docs/perf-report.md) · [兼容性报告](./docs/COMPATIBILITY_REPORT.md)

一个在 [markdown-it](https://github.com/markdown-it/markdown-it) 基础上重构的 TypeScript 版本，采用更模块化的架构，支持 tree-shaking，并将 parse/render 职责解耦。

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

## 大文本输入

普通场景继续使用原来的 markdown-it 兼容 API 即可：

```ts
const md = markdownIt()
const tokens = md.parse(hugeMarkdown)
const html = md.render(hugeMarkdown)
```

现在默认的 `parse` / `render` 在输入超过大文档阈值时，会自动切到内部的大文本优化路径，用户不需要额外改调用方式；如果需要，也可以用 `autoUnbounded: false` 关闭。

只有当你的上游输入本来就是 chunk 流，而且你不想先 `join('')` 成一个超大字符串时，才需要显式使用下面这些高级入口：

```typescript
import MarkdownIt, { UnboundedBuffer } from 'markdown-it-ts'

const md = MarkdownIt()

const tokens = md.parseIterable(fileChunks)

const buffer = new UnboundedBuffer(md, { mode: 'stream' })
for await (const chunk of logChunks) {
  buffer.feed(chunk)
  buffer.flushAvailable()
}
const finalTokens = buffer.flushForce()
```

`parseIterable` / `parseAsyncIterable` 用于“输入本身就是 `Iterable<string>` / `AsyncIterable<string>`”的高级场景；`UnboundedBuffer` 用于 append-only 的 chunk 流，只保留有界尾部，而不是把历史全文一直留在一个大字符串里。

如果显式使用 chunk 流，而且连输出也不想保留完整 token 数组，可以直接走 sink 形式：

```ts
md.parseIterableToSink(fileChunks, (tokens, info) => {
  consumeTokenChunk(tokens, info)
})
```

如果是任意位置的中间编辑，可以用 `EditableBuffer`。它内部用 piece-table 保存源码，并从受影响块之前的锚点开始重解析，而不是每次都把整篇文本重新摊平成一个大字符串再 full parse。现在 full parse 和局部重解析都会直接把 `PieceTableSourceView` 交给 `md.core.parseSource(...)`，因此被解析的区间也不需要先物化成一个超大的中间字符串。

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
- **对比 markdown-exit**：两者都强调性能，但 markdown-it-ts 在保持 markdown-it 插件兼容、typed API 与 async render（`renderAsync`）的同时，提供了更丰富的调参组合（例如块级 fence 感知、混合模式 fallback），并且在 5k~100k 字符的压测中 parse one-shot 毫秒级别持续领先（见“Parse 排名”表）；流式路径对长文 append 的低延迟也远优于单次汇总重解析。
- **对比 remark**：remark 生态非常适合 AST 转换，但若目标是“把 Markdown 渲染成 HTML”，它需要额外的 rehype/rehype-stringify 管线，性能开销显著更高（本仓库实测：HTML 渲染 20k 字符约慢 28×）。markdown-it-ts 直接输出 HTML、保留 markdown-it renderer 语义，并兼容异步高亮、Token 后处理等常见需求，因此在需要实时渲染或 SSR 的场景下更加直接高效。
- **对比 micromark**：micromark 是面向 CommonMark 的参考实现，也可直接将 Markdown 渲染为 HTML。markdown-it-ts 则以 markdown-it 的插件 API 与 renderer 语义兼容为目标，同时保持有竞争力的端到端渲染吞吐（见下文“对比 micromark”）。
- **工程体验**：代码与类型全部开源且随发布同步，可以配合 `docs/stream-optimization.md` 的推荐参数、`recommend*Strategy` API 与 `StreamBuffer`、`chunkedParse` 等工具函数，快速搭建自适应流式管线；CI 中的基准脚本 (`perf:generate`, `perf:update-readme`) 也能确保团队持续看到最新对比数据，减少性能回退的顾虑。
- **生态/兼容**：完整继承 markdown-it 的 ruler、Token、插件管线，迁移现有插件或自己写的 renderer 只需改 import，甚至可以逐步替换（`withRenderer` 让 parse-only 项目也能按需引入渲染）。
- **生产准备**：内置 async render、基于 Token 的后处理钩子、流式缓冲区以及 chunked fallback 让它适用于 SSR、实时协作编辑器以及大 Markdown 文档的批量处理，配合 `docs/perf-report.md` / `docs/perf-history/*.json` 可以观察长期性能趋势。

## 性能说明（概览）

- 目标：在一次性解析（one-shot parse）下与上游 markdown-it 保持同级或更优的性能；在增量/编辑场景下提供可选的流式（stream）路径以降低重解析成本。
- 可复现：本仓库附带快速基准脚本与对比脚本，便于在本机环境复现与比较。

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

## 与 markdown-it 的解析性能对比（一次性解析）

最新一次在本机环境（Node.js 版本、CPU 请见 `docs/perf-latest.md`）的对比结果（取 20 次平均值）：

<!-- perf-auto:one-examples:start -->
- 5,000 chars: 0.1654ms vs 0.2015ms → ~1.2× faster, ~18% less time
- 20,000 chars: 0.6545ms vs 0.7885ms → ~1.2× faster, ~17% less time
- 100,000 chars: 4.0118ms vs 5.3204ms → ~1.3× faster, ~25% less time
- 500,000 chars: 24.42ms vs 28.78ms → ~1.2× faster, ~15% less time
- 1,000,000 chars: 54.82ms vs 57.37ms → ~1× faster, ~4% less time
<!-- perf-auto:one-examples:end -->

注意：数字会因环境与内容不同而变化，建议在本地按上文“本地复现基准”步骤生成你自己的对比报告。若需在 CI 中进行回归检测，可运行：`pnpm run perf:check`。

### 与 remark 的解析性能对比（仅解析）

我们也会比较 `remark`（仅解析）的吞吐表现，以了解在纯解析任务中的差距。

单次解析耗时（越低越好）：

<!-- perf-auto:remark-one:start -->
- 5,000 chars: 0.1654ms vs 5.2773ms → 31.9× faster
- 20,000 chars: 0.6545ms vs 23.81ms → 36.4× faster
- 100,000 chars: 4.0118ms vs 161.03ms → 40.1× faster
<!-- perf-auto:remark-one:end -->

增量工作负载（append workload）：

<!-- perf-auto:remark-append:start -->
- 5,000 chars: 0.2487ms vs 16.34ms → 65.7× faster
- 20,000 chars: 1.0456ms vs 81.83ms → 78.3× faster
- 100,000 chars: 5.4090ms vs 530.05ms → 98× faster
<!-- perf-auto:remark-append:end -->

说明：
- `remark` 常与其他 rehype/插件配合，真实项目的耗时可能更高；这里仅对其解析吞吐进行对比。
- 结果依赖于机器配置与内容形态，建议参考 `docs/perf-latest.json` 或 `docs/perf-history/*.json` 上的完整数据。

### 与 micromark 的解析性能对比（仅解析）

我们也会比较 `micromark`（场景 `MM1`）的解析吞吐，这里只测其 preprocess + parse + postprocess 管线（不包含 HTML compile）。以下数据来自 `docs/perf-latest.json`。

一次性解析（oneShotMs）—— markdown-it-ts vs micromark-based parse：

<!-- perf-auto:micromark-one:start -->
- 5,000 chars: 0.1654ms vs 4.1778ms → 25.3× faster
- 20,000 chars: 0.6545ms vs 18.12ms → 27.7× faster
- 100,000 chars: 4.0118ms vs 103.48ms → 25.8× faster
<!-- perf-auto:micromark-one:end -->

追加工作负载（appendWorkloadMs）—— markdown-it-ts vs micromark-based parse：

<!-- perf-auto:micromark-append:start -->
- 5,000 chars: 0.2487ms vs 13.89ms → 55.9× faster
- 20,000 chars: 1.0456ms vs 61.35ms → 58.7× faster
- 100,000 chars: 5.4090ms vs 348.15ms → 64.4× faster
<!-- perf-auto:micromark-append:end -->

## 渲染性能（markdown → HTML）

除了纯解析，我们也持续跟踪 `md.render(markdown)` 这一整条 render API 调用的耗时，也就是“解析 + HTML 输出”的总成本，而不是单独比较低层 renderer 热路径。以下数据来自最近一次 `pnpm run perf:generate`。

对于超大但有限的字符串，这里的数据已经包含默认自动触发的大文本优化；用户不需要切换到 `parseIterable` / `UnboundedBuffer` 才能吃到这层收益。那些 API 只保留给“输入本来就是 chunk 流”的高级场景。

### 对比 markdown-it render API

<!-- perf-auto:render-md:start -->
- 5,000 chars: 0.1877ms vs 0.2377ms → ~1.3× faster
- 20,000 chars: 0.7574ms vs 0.9580ms → ~1.3× faster
- 100,000 chars: 5.0904ms vs 6.3302ms → ~1.2× faster
- 500,000 chars: 37.12ms vs 41.10ms → ~1.1× faster
- 1,000,000 chars: 69.30ms vs 89.72ms → ~1.3× faster
<!-- perf-auto:render-md:end -->

### 对比 remark + rehype render API

<!-- perf-auto:render-remark:start -->
- 5,000 chars: 0.1877ms vs 4.7880ms → ~25.5× faster
- 20,000 chars: 0.7574ms vs 27.23ms → ~36× faster
- 100,000 chars: 5.0904ms vs 175.89ms → ~34.6× faster
<!-- perf-auto:render-remark:end -->

### 对比 micromark（CommonMark 参考实现）

<!-- perf-auto:render-micromark:start -->
- 5,000 chars: 0.1877ms vs 3.9821ms → ~21.2× faster
- 20,000 chars: 0.7574ms vs 22.72ms → ~30× faster
- 100,000 chars: 5.0904ms vs 123.07ms → ~24.2× faster
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
| 5,000 | 0.1654ms | 0.2662ms |
| 20,000 | 0.6545ms | 1.0446ms |
| 50,000 | 1.7409ms | 2.7569ms |
| 100,000 | 4.0118ms | 6.4988ms |
| 200,000 | 10.50ms | 13.83ms |
<!-- perf-auto:exit-one:end -->

说明：markdown-it-ts 在较小文档上通过流式/分片策略获得显著 one-shot 优势；在非常大的文档（200k）上，各实现的绝对差距缩小。

### 与 markdown-exit 渲染器的对比

来自最近一次 perf 快照的 render API（parse + HTML 输出）汇总：

<!-- perf-auto:render-exit:start -->
- 5,000 chars: 0.1877ms vs 0.3051ms → ~1.6× faster
- 20,000 chars: 0.7574ms vs 1.2242ms → ~1.6× faster
- 50,000 chars: 2.0238ms vs 3.2443ms → ~1.6× faster
- 100,000 chars: 5.0904ms vs 7.6242ms → ~1.5× faster
- 200,000 chars: 12.23ms vs 18.20ms → ~1.5× faster
<!-- perf-auto:render-exit:end -->


## Parse / Render 对比排名（5k~200k）

<!-- perf-auto:ranking-zh:start -->
为了更直观地查看四个实现（markdown-it-ts、markdown-it、markdown-exit、remark）在不同规模下的 parse / render 名次，下面直接基于最新 `docs/perf-latest.json` 的快照生成。
其中 parse 排名取 markdown-it-ts 在对应规模下 oneShotMs 最低的场景（S1~S5）；render 排名则使用默认 `MarkdownIt().render()` 的端到端耗时，因此两张表不能直接理解为“同一条 parse + renderer 链路”的组合排名。

**Parse 排名（one-shot 解析耗时，单位：ms）**

| Size | Rank | Library | oneShotMs |
|---:|---:|---|---:|
| 5,000 | 1 | markdown-it-ts | 0.1654ms |
| 5,000 | 2 | markdown-it | 0.2015ms |
| 5,000 | 3 | markdown-exit | 0.2662ms |
| 5,000 | 4 | remark | 5.2773ms |
| 20,000 | 1 | markdown-it-ts | 0.6545ms |
| 20,000 | 2 | markdown-it | 0.7885ms |
| 20,000 | 3 | markdown-exit | 1.0446ms |
| 20,000 | 4 | remark | 23.81ms |
| 50,000 | 1 | markdown-it-ts | 1.7409ms |
| 50,000 | 2 | markdown-it | 2.0481ms |
| 50,000 | 3 | markdown-exit | 2.7569ms |
| 50,000 | 4 | remark | 70.48ms |
| 100,000 | 1 | markdown-it-ts | 4.0118ms |
| 100,000 | 2 | markdown-it | 5.3204ms |
| 100,000 | 3 | markdown-exit | 6.4988ms |
| 100,000 | 4 | remark | 161.03ms |
| 200,000 | 1 | markdown-it-ts | 10.50ms |
| 200,000 | 2 | markdown-it | 11.00ms |
| 200,000 | 3 | markdown-exit | 13.83ms |
| 200,000 | 4 | remark | 406.15ms |

**Render 排名（解析 + HTML 输出耗时，单位：ms）**

| Size | Rank | Library | renderMs |
|---:|---:|---|---:|
| 5,000 | 1 | markdown-it-ts | 0.1877ms |
| 5,000 | 2 | markdown-it | 0.2377ms |
| 5,000 | 3 | markdown-exit | 0.3051ms |
| 5,000 | 4 | remark + rehype | 4.7880ms |
| 20,000 | 1 | markdown-it-ts | 0.7574ms |
| 20,000 | 2 | markdown-it | 0.9580ms |
| 20,000 | 3 | markdown-exit | 1.2242ms |
| 20,000 | 4 | remark + rehype | 27.23ms |
| 50,000 | 1 | markdown-it-ts | 2.0238ms |
| 50,000 | 2 | markdown-it | 2.4198ms |
| 50,000 | 3 | markdown-exit | 3.2443ms |
| 50,000 | 4 | remark + rehype | 83.64ms |
| 100,000 | 1 | markdown-it-ts | 5.0904ms |
| 100,000 | 2 | markdown-it | 6.3302ms |
| 100,000 | 3 | markdown-exit | 7.6242ms |
| 100,000 | 4 | remark + rehype | 175.89ms |
| 200,000 | 1 | markdown-it-ts | 12.23ms |
| 200,000 | 2 | markdown-it | 15.78ms |
| 200,000 | 3 | markdown-exit | 18.20ms |
| 200,000 | 4 | remark + rehype | 423.21ms |
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
import markdownIt, { StreamBuffer } from 'markdown-it-ts'

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
