# markdown-it-ts

[English](./README.md) | 简体中文

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
- 5,000 chars: 0.0002ms vs 0.4191ms → ~2066.7× faster (0.00× time)
- 20,000 chars: 0.0002ms vs 0.8540ms → ~4098.7× faster (0.00× time)
- 50,000 chars: 0.0002ms vs 2.0386ms → ~8894.6× faster (0.00× time)
- 100,000 chars: 0.0005ms vs 4.9358ms → ~9351.0× faster (0.00× time)
- 200,000 chars: 12.05ms vs 12.44ms → ~1.0× faster (0.97× time)
<!-- perf-auto:one-examples:end -->

注意：数字会因环境与内容不同而变化，建议在本地按上文“本地复现基准”步骤生成你自己的对比报告。若需在 CI 中进行回归检测，可运行：`pnpm run perf:check`。

### 与 remark 的解析性能对比（仅解析）

我们也会比较 `remark`（仅解析）的吞吐表现，以了解在纯解析任务中的差距。

单次解析耗时（越低越好）：

<!-- perf-auto:remark-one:start -->
- 5,000 chars: 0.0002ms vs 5.9586ms → 29381.5× faster
- 20,000 chars: 0.0002ms vs 28.05ms → 134622.7× faster
- 50,000 chars: 0.0002ms vs 76.53ms → 333920.7× faster
- 100,000 chars: 0.0005ms vs 167.90ms → 318088.1× faster
- 200,000 chars: 12.05ms vs 566.10ms → 47.0× faster
<!-- perf-auto:remark-one:end -->

增量工作负载（append workload）：

<!-- perf-auto:remark-append:start -->
- 5,000 chars: 0.3748ms vs 18.25ms → 48.7× faster
- 20,000 chars: 1.3678ms vs 86.08ms → 62.9× faster
- 50,000 chars: 3.7555ms vs 244.93ms → 65.2× faster
- 100,000 chars: 7.4134ms vs 552.54ms → 74.5× faster
- 200,000 chars: 26.39ms vs 1316.11ms → 49.9× faster
<!-- perf-auto:remark-append:end -->

说明：
- `remark` 常与其他 rehype/插件配合，真实项目的耗时可能更高；这里仅对其解析吞吐进行对比。
- 结果依赖于机器配置与内容形态，建议参考 `docs/perf-latest.json` 或 `docs/perf-history/*.json` 上的完整数据。

## 渲染性能（markdown → HTML）

除了纯解析，我们也持续跟踪 markdown-it-ts、原版 markdown-it 以及 remark+rehype 的“解析 + HTML 输出”整体耗时。以下数据来自最近一次 `pnpm run perf:generate`。

### 对比 markdown-it renderer

<!-- perf-auto:render-md:start -->
- 5,000 chars: 0.3574ms vs 0.2641ms → ~0.7× faster
- 20,000 chars: 1.2340ms vs 0.9844ms → ~0.8× faster
- 50,000 chars: 3.0913ms vs 2.4276ms → ~0.8× faster
- 100,000 chars: 8.3501ms vs 5.9070ms → ~0.7× faster
- 200,000 chars: 15.95ms vs 15.57ms → ~1.0× faster
<!-- perf-auto:render-md:end -->

### 对比 remark + rehype renderer

<!-- perf-auto:render-remark:start -->
- 5,000 chars: 0.3574ms vs 6.5419ms → ~18.3× faster
- 20,000 chars: 1.2340ms vs 29.56ms → ~24.0× faster
- 50,000 chars: 3.0913ms vs 84.73ms → ~27.4× faster
- 100,000 chars: 8.3501ms vs 191.70ms → ~23.0× faster
- 200,000 chars: 15.95ms vs 456.14ms → ~28.6× faster
<!-- perf-auto:render-remark:end -->

本地复现：

```bash
pnpm build
node scripts/quick-benchmark.mjs
pnpm run perf:generate
pnpm run perf:update-readme
```

### 回归检查与对比

- 使用最近一次的基线进行回归检查（同一采集方法/同一机器更稳）：
  - `pnpm run perf:check:latest`
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
