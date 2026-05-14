# Compatibility Report: `markdown-it-ts` vs `markdown-it`

## 中文概要

本文说明 `markdown-it-ts` 与上游 `markdown-it` 的兼容性合同、主要差异、迁移风险和验证清单。

`markdown-it-ts` 的目标是兼容 markdown-it 的公开 API，而不是兼容上游包里的每一个私有实现细节。

## 兼容性合同

### Stable

这些接口属于明确支持的兼容目标：

- 主解析/渲染 API：`parse`、`parseInline`、`render`、`renderInline`、`renderAsync`
- 与 markdown-it 行为对齐的公开选项和 preset 风格用法
- `Token` shape 和常见 token mutation helper
- `Ruler` / `CoreRuler` / `BlockRuler` / `InlineRuler` 风格的规则注册
- `md.renderer.rules` 渲染规则扩展
- 遵循 `function plugin(md, options)` 模式的常见插件 hook
- 本包文档化并通过 `exports` 发布的稳定子路径

### Best Effort

这些场景会尽量验证，但迁移时仍需要用户在自己的 workload 上测试：

- 不依赖上游私有文件的第三方 markdown-it 插件
- 在 ESM 项目中通过 Node 或 bundler interop 加载的 CJS 插件
- 使用 `renderAsync` 的异步 renderer/highlight 集成
- 面向大输入或 append-heavy 编辑器场景的 stream、chunked、unbounded、editable-buffer API（通过 `markdown-it-ts/experimental` 使用；部分 helper 也有显式子路径：`markdown-it-ts/stream/buffer`、`markdown-it-ts/stream/chunked`、`markdown-it-ts/stream/debounced`、`markdown-it-ts/support/chunk_recommend`）

### Unsupported

这些模式不属于兼容性承诺：

- 直接导入上游私有路径，例如 `markdown-it/lib/...`
- 依赖未文档化的内部 parser state shape 或规则实现细节
- 在 CommonJS 中直接 `require('markdown-it-ts')`，而不使用动态 `import()`
- Node.js 18 以下运行时
- 假设 chunked 或 streaming API 在尚未看到后续全局定义时，也一定能产出与完整 parse 完全一致的中间结果

## 主要差异

- **语言与打包**：`markdown-it-ts` 使用 TypeScript 实现，并以 ESM-only package exports 发布。
- **运行时**：要求 Node.js >= 18。
- **子路径导出**：请使用文档化的 `markdown-it-ts/...` exports，不要依赖上游私有路径。
- **Renderer 集成**：主入口包含 `render`、`renderInline`、`renderAsync`、`renderer` 和 advanced `withRenderer`；`markdown-it-ts/plugins/with-renderer` 也保留给 custom/core-shaped instance。
- **大输入 API**：`stream`、`chunkedParse`、`StreamBuffer`、`UnboundedBuffer`、`EditableBuffer` 是本包扩展能力，只适合特定输入形态，并有独立正确性边界；它们从 `markdown-it-ts/experimental` 导入，部分 helper 也可从 `markdown-it-ts/stream/buffer`、`markdown-it-ts/stream/chunked`、`markdown-it-ts/stream/debounced`、`markdown-it-ts/support/chunk_recommend` 导入，不从 1.0 根入口导出。

## 导入示例

### ESM

```ts
import markdownIt from 'markdown-it-ts'
import emoji from 'markdown-it-emoji'

const md = markdownIt({ html: true })
md.use(emoji)

console.log(md.render('# Hello'))
```

### CommonJS Application

`markdown-it-ts` 是 ESM-only。CommonJS 项目里使用动态 import：

```js
async function main() {
  const { default: markdownIt } = await import('markdown-it-ts')

  const md = markdownIt({ html: true })
  console.log(md.render('# Hello'))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
```

## 插件兼容性说明

大多数使用 markdown-it 公开 API 的插件，在替换 import 后应当可以工作。当前 CI 的插件矩阵覆盖 abbreviation、container、definition list、emoji、footnote、inline hook、ins、mark、sub、sup 等常见插件。

以下插件需要重点验证：

- 导入 `markdown-it/lib/...` 等上游内部路径
- patch 未文档化的 state 对象
- 假设 CommonJS-only 加载方式
- 在 streaming/chunked parsing 期间修改 renderer 或 parser state

## Stream 与 Chunked 正确性

Markdown 不总是 chunk-local。Reference definition、footnote definition、abbreviation definition，以及插件自定义全局状态，都可能影响前文内容。

`chunkedParse()` 和完整字符串的 unbounded parsing 默认对已知全局状态语法采用 correctness-first fallback。Iterable/sink parsing 更偏 stream 场景，可能在看到后续定义前就提交前面的 chunk；如果需要严格 full-parse parity，请使用完整字符串解析，或避免过早 flush。

关闭 global-state fallback 属于性能模式，可能产生与 full parse 不同的输出。

## 迁移清单

1. 将导入改为 ESM import，或在 CommonJS 中使用动态 `import()`。
2. 用业务 fixture 同时对比旧版和新版渲染输出。
3. 验证所有第三方插件，尤其是依赖上游私有路径的插件。
4. 检查安全敏感行为：`html`、link validation、highlight 输出，以及外部 sanitization。
5. 优先使用普通 `md.parse` / `md.render`。只有大输入或 append-heavy workload 才引入 stream/chunk API。
6. 如果关注性能，请带上 `docs/perf-latest.json` 记录的 Node、CPU、OS、依赖版本、commit 等元数据复现 benchmark。

## English Summary

`markdown-it-ts` targets the markdown-it public API, not every private upstream implementation detail.

- **Stable**: main parse/render APIs, `Token` shape, ruler APIs, renderer rules, common public plugin hooks, and documented stable package exports.
- **Best effort**: third-party plugins that avoid private upstream files, CJS plugin interop from ESM, async render/highlight integrations, and large-input stream/chunk/editable APIs imported from `markdown-it-ts/experimental`; selected helpers also have explicit subpaths: `markdown-it-ts/stream/buffer`, `markdown-it-ts/stream/chunked`, `markdown-it-ts/stream/debounced`, and `markdown-it-ts/support/chunk_recommend`.
- **Unsupported**: private upstream imports such as `markdown-it/lib/...`, undocumented internal state dependencies, direct CommonJS `require('markdown-it-ts')`, Node.js < 18, and assuming stream/chunk output is always equivalent before future document-level definitions are known.

Use normal `md.parse` / `md.render` first. The stable default path keeps plugin/custom-rule instances on plain full parse unless chunking is explicitly enabled. Adopt stream/chunk APIs only for large-input or append-heavy workloads, and validate output against full parse when exact parity matters.
