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
- 5,000 chars: 0.0001ms vs 0.3991ms → ~3780.5× faster (0.00× time)
- 20,000 chars: 0.0001ms vs 0.5713ms → ~4727.0× faster (0.00× time)
- 50,000 chars: 0.0001ms vs 1.1322ms → ~10064.1× faster (0.00× time)
- 100,000 chars: 0.0002ms vs 2.8605ms → ~15256.1× faster (0.00× time)
- 200,000 chars: 6.7418ms vs 5.7412ms → ~0.9× faster (1.17× time)
<!-- perf-auto:one-examples:end -->

注意：数字会因环境与内容不同而变化，建议在本地按上文“本地复现基准”步骤生成你自己的对比报告。若需在 CI 中进行回归检测，可运行：`pnpm run perf:check`。

### 与 remark 的解析性能对比（仅解析）

我们也会比较 `remark`（仅解析）的吞吐表现，以了解在纯解析任务中的差距。

单次解析耗时（越低越好）：

<!-- perf-auto:remark-one:start -->
- 5,000 chars: 0.0001ms vs 3.8328ms → 36307.0× faster
- 20,000 chars: 0.0001ms vs 14.45ms → 119596.7× faster
- 50,000 chars: 0.0001ms vs 38.99ms → 346605.5× faster
- 100,000 chars: 0.0002ms vs 94.17ms → 502240.4× faster
- 200,000 chars: 6.7418ms vs 217.64ms → 32.3× faster
<!-- perf-auto:remark-one:end -->

增量工作负载（append workload）：

<!-- perf-auto:remark-append:start -->
- 5,000 chars: 0.2744ms vs 10.02ms → 36.5× faster
- 20,000 chars: 0.8840ms vs 51.71ms → 58.5× faster
- 50,000 chars: 1.9366ms vs 144.19ms → 74.5× faster
- 100,000 chars: 4.0628ms vs 293.03ms → 72.1× faster
- 200,000 chars: 14.61ms vs 684.70ms → 46.9× faster
<!-- perf-auto:remark-append:end -->

说明：
- `remark` 常与其他 rehype/插件配合，真实项目的耗时可能更高；这里仅对其解析吞吐进行对比。
- 结果依赖于机器配置与内容形态，建议参考 `docs/perf-latest.json` 或 `docs/perf-history/*.json` 上的完整数据。

## 渲染性能（markdown → HTML）

除了纯解析，我们也持续跟踪 markdown-it-ts、原版 markdown-it 以及 remark+rehype 的“解析 + HTML 输出”整体耗时。以下数据来自最近一次 `pnpm run perf:generate`。

### 对比 markdown-it renderer

<!-- perf-auto:render-md:start -->
- 5,000 chars: 0.2091ms vs 0.1694ms → ~0.8× faster
- 20,000 chars: 0.6078ms vs 0.5493ms → ~0.9× faster
- 50,000 chars: 1.5064ms vs 1.3452ms → ~0.9× faster
- 100,000 chars: 4.5276ms vs 3.4122ms → ~0.8× faster
- 200,000 chars: 9.9405ms vs 7.7041ms → ~0.8× faster
<!-- perf-auto:render-md:end -->

### 对比 remark + rehype renderer

<!-- perf-auto:render-remark:start -->
- 5,000 chars: 0.2091ms vs 3.4914ms → ~16.7× faster
- 20,000 chars: 0.6078ms vs 18.46ms → ~30.4× faster
- 50,000 chars: 1.5064ms vs 44.63ms → ~29.6× faster
- 100,000 chars: 4.5276ms vs 103.02ms → ~22.8× faster
- 200,000 chars: 9.9405ms vs 238.86ms → ~24.0× faster
<!-- perf-auto:render-remark:end -->

本地复现：

```bash
pnpm build
node scripts/quick-benchmark.mjs
pnpm run perf:generate
pnpm run perf:update-readme
```

## 与 markdown-exit 的解析性能对比

下面表格比较了 markdown-it-ts（取最佳 one-shot 场景）与 `markdown-exit` 在 one-shot 解析（oneShotMs）上的表现：

| Size (chars) | markdown-it-ts (best one-shot) | markdown-exit (one-shot) |
|---:|---:|---:|
| 5,000 | 0.0001472ms | 0.3588764ms |
| 20,000 | 0.0001688ms | 0.8871354ms |
| 50,000 | 0.0003000ms | 2.1539625ms |
| 100,000 | 0.0004722ms | 5.0225138ms |
| 200,000 | 9.6601355ms | 12.8995730ms |

说明：markdown-it-ts 在较小文档上通过流式/分片策略获得显著 one-shot 优势；在非常大的文档（200k）上，各实现的绝对差距缩小。

### 与 markdown-exit 渲染器的对比

来自 `docs/perf-render-summary.csv` 的渲染（renderMs）汇总：

- 5,000 chars: markdown-it-ts 0.307706ms vs markdown-exit 0.223697ms → ~1.38×（markdown-exit 快）
- 20,000 chars: markdown-it-ts 0.627056ms vs markdown-exit 0.740508ms → ~1.18×（markdown-it-ts 快）
- 50,000 chars: markdown-it-ts 1.5393ms vs markdown-exit 1.8689ms → ~1.21×（markdown-it-ts 快）
- 100,000 chars: markdown-it-ts 4.3615ms vs markdown-exit 4.6592ms → ~1.07×（markdown-it-ts 快）
- 200,000 chars: markdown-it-ts 9.7917ms vs markdown-exit 10.43ms → ~1.06×（markdown-it-ts 快）


## Parse / Render 对比排名（5k~200k）

为了更直观地查看四个实现（markdown-it-ts、markdown-it、markdown-exit、remark）在不同规模下的 parse / render 名次，下面基于 `docs/perf-latest-summary.csv`（parse one-shot）与 `docs/perf-render-summary.csv`（parse + HTML 输出）整理了排名表。markdown-it-ts 取对应规模下 oneShotMs 最低的场景（S1~S5）。

**Parse 排名（one-shot 解析耗时，单位：ms）**

| Size | Rank | Library | oneShotMs |
|---:|---:|---|---:|
| 5,000 | 1 | markdown-it-ts | 0.000299 |
| 5,000 | 2 | markdown-it | 0.402106 |
| 5,000 | 3 | markdown-exit | 0.417318 |
| 5,000 | 4 | remark | 4.359 |
| 20,000 | 1 | markdown-it-ts | 0.000127 |
| 20,000 | 2 | markdown-it | 0.535485 |
| 20,000 | 3 | markdown-exit | 0.654704 |
| 20,000 | 4 | remark | 16.55 |
| 50,000 | 1 | markdown-it-ts | 0.000117 |
| 50,000 | 2 | markdown-it | 1.202 |
| 50,000 | 3 | markdown-exit | 1.606 |
| 50,000 | 4 | remark | 48.30 |
| 100,000 | 1 | markdown-it-ts | 0.000229 |
| 100,000 | 2 | markdown-it | 3.160 |
| 100,000 | 3 | markdown-exit | 3.665 |
| 100,000 | 4 | remark | 107.08 |
| 200,000 | 1 | markdown-it | 6.427 |
| 200,000 | 2 | markdown-it-ts | 6.535 |
| 200,000 | 3 | markdown-exit | 7.540 |
| 200,000 | 4 | remark | 336.40 |

**Render 排名（解析 + HTML 输出耗时，单位：ms）**

| Size | Rank | Library | renderMs |
|---:|---:|---|---:|
| 5,000 | 1 | markdown-it | 0.180096 |
| 5,000 | 2 | markdown-exit | 0.223697 |
| 5,000 | 3 | markdown-it-ts | 0.307706 |
| 5,000 | 4 | remark + rehype | 4.119 |
| 20,000 | 1 | markdown-it | 0.558317 |
| 20,000 | 2 | markdown-it-ts | 0.627056 |
| 20,000 | 3 | markdown-exit | 0.740508 |
| 20,000 | 4 | remark + rehype | 16.67 |
| 50,000 | 1 | markdown-it | 1.403 |
| 50,000 | 2 | markdown-it-ts | 1.539 |
| 50,000 | 3 | markdown-exit | 1.869 |
| 50,000 | 4 | remark + rehype | 52.97 |
| 100,000 | 1 | markdown-it-ts | 4.361 |
| 100,000 | 2 | markdown-it | 4.548 |
| 100,000 | 3 | markdown-exit | 4.659 |
| 100,000 | 4 | remark + rehype | 108.35 |
| 200,000 | 1 | markdown-it-ts | 9.792 |
| 200,000 | 2 | markdown-exit | 10.43 |
| 200,000 | 3 | markdown-it | 11.31 |
| 200,000 | 4 | remark + rehype | 264.05 |


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
