**Compatibility Report: `markdown-it-ts` vs `markdown-it`**

- **Purpose**: 简要说明 `markdown-it-ts` 与上游 `markdown-it` 在使用、API 与生态兼容性方面的异同，指出可能的 breaking changes 并给出迁移建议与验证清单。

**概要**
- **兼容性目标**: `markdown-it-ts` 以 markdown-it API/plugin 兼容为目标，并通过默认 CI 中的 CommonMark fixture 与插件矩阵持续验证。实际实现为 TypeScript 重写，提供更好的类型、安全性与按需子路径导出，从而支持 tree-shaking 与精细化导入。
- **结论（简要）**: 大多数插件与使用方式在语义上兼容；但以下几类情况可能需要改动或额外验证：CJS/ESM 导入方式、运行时引擎与包入口差异、流（stream）/chunk 特性的新增配置项，以及依赖内部分支或内部 API 的插件。

**主要差异（高层）**
- **语言与类型**: `markdown-it-ts` 完全用 TypeScript 实现并导出类型（`dist/index.d.ts`），对插件作者与 TypeScript 项目更友好。
- **模块系统**: `package.json` 使用 `"type": "module"`（ESM），并通过 `exports` 提供子路径导出，默认发布为 ESM。上游 `markdown-it` 曾同时提供 CJS/UMD，可能存在导入方式差异（CommonJS 项目需额外处理）。
- **模块化与子路径导出**: 支持精细导入（例如 `markdown-it-ts/render/renderer`），有利于 tree-shaking 与按需引入，但会改变直接读取内部文件路径的方案。
- **分离 parse / render**: 主入口实例已经提供 `render`、`renderAsync`、`renderInline` 与 `renderer`；`withRenderer` 子路径保留为 custom/core-shaped instance 的辅助函数。
- **流与增量解析**: 新增 `stream`、`chunkedParse`、`StreamBuffer` 等运行时选项及 API（例如 `renderAsync`、`stream.parse` 等），为编辑器等场景优化了 append-heavy 工作流。这些是上游没有的扩展功能，可能影响语义或性能边界。

**使用对比（示例）
- markdown-it（常见 JS 用法）

```js
// CommonJS
const MarkdownIt = require('markdown-it')
const md = new MarkdownIt({ html: true })
md.use(require('markdown-it-emoji'))
console.log(md.render('# Hello'))
```

- markdown-it-ts（TypeScript / ESM）

```ts
import markdownIt from 'markdown-it-ts'
import emoji from 'markdown-it-emoji'

const md = markdownIt({ html: true })
md.use(emoji)
console.log(md.render('# Hello'))
```

- CommonJS + ESM 互操作提示（当项目仍为 CJS）:

```js
// Node CJS 应用中动态导入 ESM 包
const { createRequire } = require('module')
const requireFromCjs = createRequire(import.meta?.url || __filename)
;(async () => {
  const markdownIt = await import('markdown-it-ts')
  const md = markdownIt.default ? markdownIt.default() : markdownIt()
  console.log(md.render('# Hello'))
})()
```

**插件生态兼容性**
- **大多数插件兼容**: 只要插件遵循标准插件签名 `function (md, opts)`（或默认导出为函数），一般能直接使用并获得类型帮助（如果插件也提供类型）。仓库的 `devDependencies` 中保留了大量 `markdown-it-*` 插件，说明测试矩阵覆盖常见场景。
- **可能的问题**:
  - **CJS 插件在 ESM 环境的导入**：某些 CJS-only 插件在直接 `import` 时需要 `import plugin from 'pkg'` 然后使用 `plugin.default` 或通过 `createRequire`。构建器（如 Rollup）或 Node 的 ESM/CJS interop 行为会影响运行时。
  - **内部 API 依赖**：若插件依赖 markdown-it 的内部私有符号或直接读取内部文件路径（比如 `require('markdown-it/lib/rules_core')`），则在子路径被重构或导出路径不同的情况下会断裂。
  - **渲染器扩展差异**：`renderAsync` 与流式渲染是新增特性；若插件期望在渲染阶段同步返回内容，使用异步高亮或异步 renderer 需要适配（或使用 `renderAsync`）。

**潜在 Breaking Changes（需要注意）**
- **ESM-only 发布**: `"type": "module"` 意味着直接使用 `require('markdown-it-ts')` 的旧式 CommonJS 项目可能无法工作，需采用动态 import 或 `createRequire`。这在一些老项目或脚本中会是破坏性变更。
- **Node 引擎限制**: `engines.node` 为 ">=18"，旧环境会不兼容。
- **输入类型检查加强**: `parse`/`parseInline` 对非字符串输入会抛出 `TypeError`，这在某些调用站点以前可能是宽松的；需确保传入字符串。
- **子路径导出与内部路径变化**: 直接依赖内部路径（`markdown-it/lib/...`）的代码将失效；请改用公开的 `exports` 子路径或主导出 API。
- **默认选项与新增行为**: `stream`、`fullChunkedFallback` 等新选项改变了在极端或大型文档下的执行路径，默认 `autoTuneChunks: true` 可能导致行为/性能差异，需要在迁移时验证。

**迁移建议（步骤）**
1. 在本地安装并运行现有测试与上游测试：

```bash
pnpm install
pnpm test            # 运行本仓库测试
RUN_ORIGINAL=1 pnpm test   # 可选：运行上游兼容测试（若已配置 upstream checkout）
```

2. 检查项目的模块类型：
  - 若项目仍以 CommonJS 为主，优先评估将项目迁移到 ESM，或通过 `createRequire` / 动态 `import()` 包装 `markdown-it-ts`。

3. 对关键插件做兼容性验证：
  - 安装并在迁移分支中运行所有用到的 `markdown-it-*` 插件。
  - 关注那些直接引用内部路径或采用非标准导出方式的插件（若存在，联系插件维护者或替换插件）。

4. 校验渲染与解析边界行为：
  **Compatibility Report: `markdown-it-ts` vs `markdown-it`**

  - **Purpose**: 简要说明 `markdown-it-ts` 与上游 `markdown-it` 在使用、API 与生态兼容性方面的异同，指出可能的 breaking changes 并给出迁移建议与验证清单。

  ## 中文概要
  - **兼容性目标**: `markdown-it-ts` 以 markdown-it API/plugin 兼容为目标，并通过默认 CI 中的 CommonMark fixture 与插件矩阵持续验证。实际实现为 TypeScript 重写，提供更好的类型、安全性与按需子路径导出，从而支持 tree-shaking 与精细化导入。
  - **结论（简要）**: 大多数插件与使用方式在语义上兼容；但以下几类情况可能需要改动或额外验证：CJS/ESM 导入方式、运行时引擎与包入口差异、流（stream）/chunk 特性的新增配置项，以及依赖内部分支或内部 API 的插件。

  ### 主要差异（高层）
  - **语言与类型**: `markdown-it-ts` 完全用 TypeScript 实现并导出类型（`dist/index.d.ts`），对插件作者与 TypeScript 项目更友好。
  - **模块系统**: `package.json` 使用 `"type": "module"`（ESM），并通过 `exports` 提供子路径导出，默认发布为 ESM。上游 `markdown-it` 曾同时提供 CJS/UMD，可能存在导入方式差异（CommonJS 项目需额外处理）。
  - **模块化与子路径导出**: 支持精细导入（例如 `markdown-it-ts/render/renderer`），有利于 tree-shaking 与按需引入，但会改变直接读取内部文件路径的方案。
  - **分离 parse / render**: 主入口实例已经提供 `render`、`renderAsync`、`renderInline` 与 `renderer`；`withRenderer` 子路径保留为 custom/core-shaped instance 的辅助函数。
  - **流与增量解析**: 新增 `stream`、`chunkedParse`、`StreamBuffer` 等运行时选项及 API（例如 `renderAsync`、`stream.parse` 等），为编辑器等场景优化了 append-heavy 工作流。这些是上游没有的扩展功能，可能影响语义或性能边界。

  ### 使用对比（示例）
  - markdown-it（常见 JS 用法）

  ```js
  // CommonJS
  const MarkdownIt = require('markdown-it')
  const md = new MarkdownIt({ html: true })
  md.use(require('markdown-it-emoji'))
  console.log(md.render('# Hello'))
  ```

  - markdown-it-ts（TypeScript / ESM）

  ```ts
  import markdownIt from 'markdown-it-ts'
  import emoji from 'markdown-it-emoji'

  const md = markdownIt({ html: true })
  md.use(emoji)
  console.log(md.render('# Hello'))
  ```

  - CommonJS + ESM 互操作提示（当项目仍为 CJS）:

  ```js
  // Node CJS 应用中动态导入 ESM 包
  const { createRequire } = require('module')
  const requireFromCjs = createRequire(import.meta?.url || __filename)
  ;(async () => {
    const markdownIt = await import('markdown-it-ts')
    const md = markdownIt.default ? markdownIt.default() : markdownIt()
    console.log(md.render('# Hello'))
  })()
  ```

  ### 插件生态兼容性
  - **大多数插件兼容**: 只要插件遵循标准插件签名 `function (md, opts)`（或默认导出为函数），一般能直接使用并获得类型帮助（如果插件也提供类型）。仓库的 `devDependencies` 中保留了大量 `markdown-it-*` 插件，说明测试矩阵覆盖常见场景。
  - **可能的问题**:
    - **CJS 插件在 ESM 环境的导入**：某些 CJS-only 插件在直接 `import` 时需要 `import plugin from 'pkg'` 然后使用 `plugin.default` 或通过 `createRequire`。构建器（如 Rollup）或 Node 的 ESM/CJS interop 行为会影响运行时。
    - **内部 API 依赖**：若插件依赖 markdown-it 的内部私有符号或直接读取内部文件路径（比如 `require('markdown-it/lib/rules_core')`），则在子路径被重构或导出路径不同的情况下会断裂。
    - **渲染器扩展差异**：`renderAsync` 与流式渲染是新增特性；若插件期望在渲染阶段同步返回内容，使用异步高亮或异步 renderer 需要适配（或使用 `renderAsync`）。

  ### 潜在 Breaking Changes（需要注意）
  - **ESM-only 发布**: `"type": "module"` 意味着直接使用 `require('markdown-it-ts')` 的旧式 CommonJS 项目可能无法工作，需采用动态 import 或 `createRequire`。这在一些老项目或脚本中会是破坏性变更。
  - **Node 引擎限制**: `engines.node` 为 ">=18"，旧环境会不兼容。
  - **输入类型检查加强**: `parse`/`parseInline` 对非字符串输入会抛出 `TypeError`，这在某些调用站点以前可能是宽松的；需确保传入字符串。
  - **子路径导出与内部路径变化**: 直接依赖内部路径（`markdown-it/lib/...`）的代码将失效；请改用公开的 `exports` 子路径或主导出 API。
  - **默认选项与新增行为**: `stream`、`fullChunkedFallback` 等新选项改变了在极端或大型文档下的执行路径，默认 `autoTuneChunks: true` 可能导致行为/性能差异，需要在迁移时验证。

  ### 迁移建议（步骤）
  1. 在本地安装并运行现有测试与上游测试：

  ```bash
  pnpm install
  pnpm test            # 运行本仓库测试
  RUN_ORIGINAL=1 pnpm test   # 可选：运行上游兼容测试（若已配置 upstream checkout）
  ```

  2. 检查项目的模块类型：
    - 若项目仍以 CommonJS 为主，优先评估将项目迁移到 ESM，或通过 `createRequire` / 动态 `import()` 包装 `markdown-it-ts`。

  3. 对关键插件做兼容性验证：
    - 安装并在迁移分支中运行所有用到的 `markdown-it-*` 插件。
    - 关注那些直接引用内部路径或采用非标准导出方式的插件（若存在，联系插件维护者或替换插件）。

  4. 校验渲染与解析边界行为：
    - 使用常用文档样例（fixtures）检测输出 HTML 是否与原来一致。
    - 对使用高亮/异步处理的场景，改用 `renderAsync` 并验证处理链。

  5. 性能回归检查：若关心性能，运行仓库内的 perf harness（`pnpm run perf:generate`）并比对 `docs/perf-latest.json`。

  ### 验证清单
  - **基本功能**: `render`, `renderInline`, `parse`, `parseInline` 输出无差异（对比重要 fixtures）
  - **插件**: 核心插件（emoji、footnote、container 等）能正确注册并影响 AST/HTML
  - **导入**: ESM 与 CJS 互操作在目标环境下可行
  - **异步渲染**: 如使用异步高亮，`renderAsync` 正常工作
  - **大型文档**: 若使用 `stream`/`chunkedParse`，确认行为与期望一致

  ### 结论与建议
  - `markdown-it-ts` 提供了类型、安全性、模块化与流式解析等值得期待的改进；总体上与 `markdown-it` 保持高度 API 相容，但迁移时应重点关注模块系统（ESM vs CJS）、子路径/内部导出依赖、以及流/异步渲染相关的新选项。
  - 推荐迁移流程：先在隔离分支中替换依赖并运行完整测试（包括插件测试与 fixture 对比），针对失败项按上文建议逐一处理。
