# Stream Parser 与长文本策略

这份文档描述当前 parser/stream 的默认性能策略、兼容性边界，以及如何验证优化没有破坏原有行为。

## 设计原则

- 普通调用方继续使用 `md.parse(src)` / `md.render(src)`，不要求学习新的默认 API。
- 长文本优化优先做成内部自动策略，而不是把选择成本转嫁给调用方。
- 当前仓库已有测试覆盖的行为是硬基线；如果和 upstream `markdown-it` 存在差异，优先保持本仓库行为。
- 兼容性优先于跑分，不删除 `Token` / `state` 上已有兼容属性。

## 默认策略

### `md.parse(src)`

- 小中型字符串默认走 plain full parse。
- 较长的 one-shot 字符串会自动进入 full chunked path。
- `autoUnbounded` 仍然保留，但只在现有阈值命中时才接管；不会因为引入 chunk 策略就移除原有兼容行为。
- 诊断信息会写入 `env.__mdtsStrategyInfo`，用于确认最终走的是 `plain`、`full-chunk` 还是 `auto-unbounded`。

### `md.stream.parse(src)`

- 相同源码重复解析优先命中 cache。
- 安全 append 优先尝试 append fast-path。
- 适合重解析尾部容器时优先走 tail reparse。
- 大文档的一次性 stream 首次解析会按配置进入 chunked fallback。
- 长文本纯 append 场景会自动切到内部 unbounded-backed append，只消费新增 delta。
- 中间编辑、不安全边界、reference-definition 风险、merge 失败时立即回退到现有 `tail/chunked/full` 路径。

`md.stream.stats()` 里现在会保留：

- `cacheHits`
- `appendHits`
- `unboundedAppendHits`
- `tailHits`
- `chunkedParses`
- `fullParses`
- `lastMode`

这些字段用于确认“结果对了”之外，默认策略是否真的走到了预期路径。

## 兼容性约束

优化过程中不允许删除、不重命名、或改变以下兼容属性的基本语义：

- `Token.type`
- `Token.tag`
- `Token.attrs`
- `Token.map`
- `Token.nesting`
- `Token.level`
- `Token.children`
- `Token.content`
- `Token.markup`
- `Token.info`
- `Token.meta`
- `Token.block`
- `Token.hidden`
- `State.prototype.Token`
- `StateBlock.prototype.Token`
- `StateInline.prototype.Token`

同时避免把现有 token/state 字段替换成插件不兼容的惰性代理、只读对象或不同类型。

## 诊断与 profiling

### Rule profiler

在开发态基准里，可以通过在 env 上打开 `__mdtsProfileRules` 收集 rule-family profiling。结果会写入：

- `env.__mdtsRuleProfile`

目前覆盖：

- `core`
- `block`
- `inline`
- `inline2`

每条规则会记录：

- `calls`
- `hits`
- `inclusiveMs`
- `medianMs`
- `maxMs`
- `normalCalls`
- `silentCalls`

### Strategy diagnostics

默认策略决策会写入：

- `env.__mdtsStrategyInfo`

常见路径包括：

- `plain`
- `full-chunk`
- `auto-unbounded`
- `stream-cache`
- `stream-append`
- `stream-unbounded-append`
- `stream-tail`
- `stream-chunked`
- `stream-full`

## 性能门禁

性能验证是独立门禁，不并入普通 `pnpm test`。

常用命令：

```bash
pnpm test
pnpm perf:families
pnpm perf:strategies
pnpm perf:strategy:check
pnpm perf:gate
```

说明：

- `pnpm perf:families`
  生成 family 热点报告，输出 `docs/perf-family-hotspots.json` 和 `docs/perf-family-hotspots.md`
- `pnpm perf:strategies`
  生成长文本策略矩阵，输出 `docs/perf-large-defaults.json`、`docs/perf-large-defaults.md`、`docs/parse-strategy-matrix.md`
- `pnpm perf:strategy:check`
  校验默认策略与最佳已测方案的 gap、以及长文本 SLA
- `pnpm perf:gate`
  组合执行 `perf:strategies` 和 `perf:strategy:check`

## 如何读报告

- `docs/perf-family-hotspots.md`
  看每个 fixture 最慢的 rule family，决定先优化哪里。
- `docs/perf-large-defaults.md`
  看不同长度下 full/stream/advanced 路径的完整跑分。
- `docs/parse-strategy-matrix.md`
  看默认 API 在不同长度和场景下的最佳策略解释。

## 使用建议

- 普通 one-shot 渲染继续优先使用 `md.parse(src)` / `md.render(src)`。
- 长文本 append-heavy 编辑器优先使用 `MarkdownIt({ stream: true })`。
- 如果输入天然就是 chunk 流，或者你明确需要控制内存保留量，再使用 `parseIterable`、`parseIterableToSink`、`UnboundedBuffer`。
- 如果是中间编辑而不是 append，预期仍然会退回 tail/full 路径，不要把 stream 当成任意 diff parser。

## 验证清单

每次做 parser 优化时，至少确认以下几件事：

- 现有 parser/renderer/stream/plugin tests 全部通过。
- `Token` shape 和 `state.Token` 兼容回归通过。
- stream/full token parity 通过，尤其是 `map`、`hidden`、`info`、`attrs`、`children`。
- family 热点报告能解释本次优化命中的规则。
- 默认策略矩阵没有偏离该长度档已测最佳方案。
