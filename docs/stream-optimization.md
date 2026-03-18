# Stream Parser 性能优化总结

首先明确默认原则：

- 普通用户继续使用原来的 `md.parse(src)` / `md.render(src)`。
- 对于超大但有限的字符串，默认 API 已经会在内部自动切到大文本优化路径，不要求调用方换 API。
- `parseIterable`、`UnboundedBuffer`、sink 这类入口保留给“输入本来就是 chunk 流”或“明确需要有界输出内存”的高级场景。

## 优化措施

### 1. **避免不必要的数组复制** ✅
- **问题**: 原代码使用 `.slice()` 和 `[...array]` 创建大量副本
- **优化**: 
  - 直接使用 `state.tokens` 而不是 `state.tokens.slice()`
  - Append 时使用 `cached.tokens.push(...new)` 而不是 `[...cached, ...new]`
  - 减少了内存分配和 GC 压力

### 2. **缓存行数计算** ✅
- **问题**: 每次 append 都要重新计算整个文档的行数
- **优化**: 在 `StreamCache` 中缓存 `lineCount`
- **效果**: append 操作不再需要遍历整个前文

### 3. **优化字符串检查** ✅
- **问题**: `getAppendedSegment` 使用了很多字符串方法（`endsWith`, `includes`, `split`）
- **优化**:
  - 使用 `charCodeAt` 直接检查字符
  - 提前返回（early return）
  - 避免 `split('\n')` 创建数组
- **效果**: 减少了字符串操作开销

### 4. **迭代替代递归** ✅
- **问题**: `shiftTokenLines` 使用递归可能导致调用栈开销
- **优化**: 使用栈（stack）进行迭代遍历
- **效果**: 减少函数调用开销，避免潜在的栈溢出

### 5. **文档大小阈值** ✅
- **问题**: 小文档上 stream 优化得不偿失
- **优化**: 设置 `MIN_SIZE_FOR_OPTIMIZATION = 1000` 字符阈值
- **效果**: 小文档直接重新解析，避免管理开销

## 性能数据对比

### 优化前
```
10x paragraphs (4590 chars):  Stream 85.0% faster
20x paragraphs (9180 chars):  Stream 87.3% faster
50x paragraphs (22950 chars): Stream 85.0% faster
```

### 优化后
```
10x paragraphs (4590 chars):  Stream 95.8% faster ⬆️ +10.8%
20x paragraphs (9180 chars):  Stream 92.6% faster ⬆️ +5.3%
50x paragraphs (22950 chars): Stream 96.9% faster ⬆️ +11.9%
```

## 使用建议

### ✅ 适用场景

1. **大文档编辑** (> 2000 字符)
   ```typescript
   const md = MarkdownIt({ stream: true })
   let content = largeDocument // 5000+ chars
   
   // 用户添加新段落
   content += '\n\n## New Section\n\nNew content...\n\n'
   const tokens = md.stream.parse(content)
   ```

2. **块状追加**
   ```typescript
   // 按段落追加
   let doc = '# Title\n\nFirst paragraph.\n\n'
   md.stream.parse(doc)
   
   doc += 'Second paragraph.\n\n'
   md.stream.parse(doc) // 高效：使用 append optimization
   ```

3. **聊天/日志场景**
   ```typescript
   // 不断追加新消息
   messages.forEach(msg => {
     chatLog += `**${msg.user}**: ${msg.text}\n\n`
     updateUI(md.stream.parse(chatLog))
   })
   ```

### ❌ 不适用场景

1. **逐字符输入** - 使用 Debounced Wrapper
   ```typescript
   import { DebouncedStreamParser } from 'markdown-it-ts/stream/debounced'
   
   const debouncedParser = new DebouncedStreamParser(md, 150)
   
   editor.on('input', (text) => {
     debouncedParser.parse(text, (tokens) => {
       renderTokens(tokens)
     })
   })
   ```

2. **小文档** (< 1000 字符) - 直接使用 `md.parse()`
   ```typescript
   const md = MarkdownIt() // stream: false
   const tokens = md.parse(shortText)
   ```

3. **中间编辑** - stream 只优化追加，不优化编辑
   ```typescript
   // ❌ 不会优化
   let doc = 'Line 1\nLine 2\nLine 3'
   md.stream.parse(doc)
   
   doc = 'Line 1\nEDITED\nLine 3' // 修改了中间内容
   md.stream.parse(doc) // 会 fallback 到完整解析
   ```

## 高级用法

### 使用 Debounced Parser

```typescript
import { DebouncedStreamParser } from 'markdown-it-ts/stream/debounced'

const md = MarkdownIt({ stream: true })
const parser = new DebouncedStreamParser(md, 100) // 100ms 防抖

let editor = document.querySelector('textarea')
editor.addEventListener('input', (e) => {
  parser.parse(e.target.value, (tokens) => {
    // 渲染 tokens
    document.querySelector('#preview').innerHTML = 
      md.renderer.render(tokens, md.options, {})
  })
})

// 获取统计信息
console.log(parser.getStats())
```

### 使用 Throttled Parser

```typescript
import { ThrottledStreamParser } from 'markdown-it-ts/stream/debounced'

const md = MarkdownIt({ stream: true })
const parser = new ThrottledStreamParser(md, 200) // 最多每 200ms 解析一次

editor.addEventListener('input', (e) => {
  parser.parse(e.target.value, (tokens) => {
    renderPreview(tokens)
  })
})
```

### 监控性能

```typescript
const md = MarkdownIt({ stream: true })
md.stream.resetStats()

// ... 进行多次解析 ...

const stats = md.stream.stats()
console.log({
  total: stats.total,
  cacheHits: stats.cacheHits,
  appendHits: stats.appendHits,
  fullParses: stats.fullParses,
  cacheHitRate: (stats.cacheHits / stats.total * 100).toFixed(1) + '%',
  appendHitRate: (stats.appendHits / stats.total * 100).toFixed(1) + '%'
})
```

## 未来优化方向

### 1. **差分算法** (Diff-based parsing)
- 检测文档中的具体变化位置
- 只重新解析受影响的块
- 需要更复杂的状态管理

### 2. **Web Worker 支持**
- 将解析移到 worker 线程
- 避免阻塞主线程
- 适合超大文档（> 100KB）

### 3. **增量 Token 更新**
- 不重新创建整个 token 树
- 只更新变化的节点
- 需要 immutable 数据结构支持

### 4. **AST 缓存**
- 缓存中间解析结果（AST）
- 跨会话持久化
- IndexedDB 存储

### 5. **智能预测**
- 根据用户输入模式预测下一步
- 预加载可能需要的解析结果
- 机器学习优化

## 基准测试

运行性能测试：

```bash
npm run test:perf
```

生成性能报告：

```bash
npm run benchmark
```

## 总结

Stream parser 通过以下优化达到了 **96.9%** 的性能提升（大文档场景）：

1. ✅ 消除不必要的数组复制
2. ✅ 缓存行数计算
3. ✅ 优化字符串操作
4. ✅ 使用迭代替代递归
5. ✅ 智能阈值控制
6. ✅ 提供 Debounced/Throttled 包装器

对于实时编辑场景，建议使用 `DebouncedStreamParser` 或 `ThrottledStreamParser` 来平衡响应性和性能。

## 附：Chunked Parse（分块解析，单次渲染优化）

当你不是流式追加，而是“对很长的文档做一次性解析/渲染”，可以尝试分块解析来降低超长字符串一次性处理的成本。

示例：

```ts
import MarkdownIt, { chunkedParse } from 'markdown-it-ts'

const md = MarkdownIt()
const tokens = chunkedParse(md, veryLongMarkdown, {}, {
  maxChunkChars: 10_000,     // 每块约 10KB
  maxChunkLines: 200,        // 或 200 行
  fenceAware: true,          // 不要把三引号代码块拆断
})

const html = md.renderer.render(tokens, md.options, {})
```

默认参数在 5KB~50KB 文档中有良好表现；更大的文档（>100KB）时，是否更快取决于内容特征和运行环境，建议实测后选取 10KB~20KB 作为起始阈值。

也可以把它作为 Stream 的 fallback 使用：

```ts
const md = MarkdownIt({
  stream: true,
  streamChunkedFallback: true,      // 开启
  streamChunkSizeChars: 10000,      // 10KB 每块
  streamChunkSizeLines: 200,
  streamChunkFenceAware: true,
})

// 当不能走 append 快速路径，且文档足够大时，会用 chunked 代替整篇 full parse
const tokens = md.stream.parse(veryLongMarkdown)
```

## 附：真正不依赖单个大字符串的入口

如果你手里已经拿到的是一个普通字符串，那么优先继续使用默认 API：

```ts
const tokens = md.parse(hugeMarkdown)
const html = md.render(hugeMarkdown)
```

这条默认路径在输入超过阈值时，已经会自动切到内部的大文本优化方案；下面这些入口只在“上游输入本来就是文件块、网络流或日志流”时才需要。

### 1. 全量解析：`parseIterable` / `parseAsyncIterable`

```ts
import MarkdownIt from 'markdown-it-ts'

const md = MarkdownIt()
const tokens = md.parseIterable(fileChunks)
```

这条路径会一边接收 chunk，一边按安全边界提交可解析片段，最后再补齐尾巴；适合超大文件、离线批处理和服务端流式读取。它不是普通 `parse` / `render` 的替代品，而是“显式 chunk 输入”的高级入口。

### 2. 增量追加：`UnboundedBuffer`

```ts
import MarkdownIt, { UnboundedBuffer } from 'markdown-it-ts'

const md = MarkdownIt()
const buffer = new UnboundedBuffer(md, { mode: 'stream' })

for await (const chunk of incomingChunks) {
  buffer.feed(chunk)
  buffer.flushAvailable()
}

const tokens = buffer.flushForce()
```

它和默认 `md.parse()` / `md.render()` 的区别是：默认 API 面向“你已经拿到了完整字符串”的场景，而 `UnboundedBuffer` 面向“输入本身就是持续追加 chunk 流”的场景。

它和 `StreamBuffer` 的区别是：

- `StreamBuffer` 适合“内存里已经有完整文档字符串”的编辑器场景，重点是复用 `md.stream.parse(fullText)` 的 append fast-path。
- `UnboundedBuffer` 适合“输入本身就是持续追加的 chunk 流”，重点是避免把历史全文一直保存在一个超大字符串里。

### 3. 真正有界输出：sink / consumer

如果你不需要最终一次性拿到完整 token 数组，而是希望边解析边消费 token，可以使用 sink 形式。这个也属于高级场景，不是默认 API 的必选项：

```ts
md.parseIterableToSink(fileChunks, (tokens, info) => {
  consumeTokenChunk(tokens, info)
})

const buffer = new UnboundedBuffer(md, {
  mode: 'stream',
  retainTokens: false,
  onChunkTokens(tokens, info) {
    consumeTokenChunk(tokens, info)
  },
})
```

这种模式下，内存占用主要来自“当前待提交尾巴 + 当前 chunk 的 token”，而不是“完整输入字符串 + 完整 token 数组”。

## 附：任意位置编辑的基础版支持

对于不是 append-only，而是“文档中间任意 insert / delete / replace”的场景，可以使用 `EditableBuffer`：

```ts
import MarkdownIt, { EditableBuffer } from 'markdown-it-ts'

const md = MarkdownIt()
const buffer = new EditableBuffer(md, initialDoc)

buffer.parse()
buffer.replace(start, end, nextText)
const tokens = buffer.peek()
```

它的当前策略是：

- 源文本不保存在一个连续大字符串里，而是保存在 piece-table 中。
- full parse 和 localized reparse 都直接把 `PieceTable.view(...)` 产生的 `SourceView` 交给 `md.core.parseSource(...)`，不再先把对应区间拼成一个超大字符串。
- inline 层里原本最容易退化成“大尾部字符串切片”的 `entity`、`html_inline`、`linkify` 也已经改成有界前缀扫描/匹配。
- 发生编辑后，不是整篇重建，而是从受影响块之前的一个安全锚点开始，重新解析后缀。
- 编辑越靠后，重解析范围越小；编辑越靠前，退化得越接近全量解析。

如果你想自己复用这条低层路径，也可以直接把 piece-table 的区间视图交给 core：

```ts
import MarkdownIt, { PieceTable } from 'markdown-it-ts'

const md = MarkdownIt()
const table = new PieceTable(initialDoc)
const state = md.core.parseSource(table.view(startOffset, endOffset), {}, md)
```

inline parser 这一层现在也能直接吃 `SourceView`：

```ts
const inlineTokens: any[] = []
md.inline.parseSource(table.view(startOffset, endOffset), md, {}, inlineTokens)
```

注意：分块解析不会做中间编辑的增量复用，它优化的是“超长文档的一次性 parse”。流式增量还是建议用 `StreamParser`。

### 混合策略（Stream + Chunked）

自 vX.Y 起（本仓库实现），当你开启 `streamChunkedFallback: true` 时：

- 首次解析：若文档大小满足 `src.length >= 2 * streamChunkSizeChars`，将优先采用 Chunked 解析（确保至少会产生 2 个 chunk，而不是“伪分块”）。
- 后续解析：
  - 如果是纯追加（pure append），使用 Stream 的快速路径（只解析追加尾部）。
  - 如果不是纯追加，且文档足够大（同样满足 `>= 2 * streamChunkSizeChars`），使用 Chunked 作为 fallback。
  - 否则退回整篇 full parse。

你可以通过 `md.stream.stats` 观察运行路径：

- `lastMode`: `'full' | 'stream' | 'chunked'`
- `appendHits`、`fullParses`、`chunkedParses` 计数器分别记录各自调用次数

这套策略的目标是：

- 初次处理大文档时避免整篇 full parse 的单次长尾；
- 持续编辑时尽可能复用缓存，仅解析追加部分；
- 在中间编辑无法增量时，以 Chunked 把“一次性重解析”的成本分摊到更小的块上。

## 非 Stream（一次性 full parse）中的分块

默认 `md.parse(hugeString)` 已经会自动兼容大文本。下面这一组 `fullChunkedFallback` 配置不是为了“让默认 API 才能支持大文本”，而是给你在特定工作负载上继续手动调参时使用。

你也可以在非 stream 模式下显式启用分块解析，用于一次性解析很大的文档：

```ts
import MarkdownIt from 'markdown-it-ts'

const md = new MarkdownIt({
  fullChunkedFallback: true,
  fullChunkThresholdChars: 20_000, // 超过该长度走分块
  fullChunkThresholdLines: 400,    // 或者行数阈值
  fullChunkSizeChars: 10_000,      // 每块目标字符数
  fullChunkSizeLines: 200,         // 每块目标行数
  fullChunkFenceAware: true,       // fenced code block 保护
  fullChunkMaxChunks: 16,          // 最多分为 16 块（可选）
})

const tokens = md.parse(veryLongMarkdown, {})
```

建议：

- 触发阈值：初始推荐 `fullChunkThresholdChars ≈ 20k` 或 `fullChunkThresholdLines ≈ 400`。
- 每块大小：`fullChunkSizeChars ≈ 8k–16k`，`fullChunkSizeLines ≈ 150–250`。
- 最大块数：根据内容与运行环境，`8–32` 通常足够。若超过则会把尾部合并到最后一块。

你可以使用 `scripts/full-vs-chunked-sweep.mjs`（见仓库 scripts）对你的实际数据进行小规模自测，找到更贴合的阈值与块大小。

### 分块切分的保护与强制刷新策略

为了避免极端内容（例如：超长的无空行段落、连续列表项、长表格）导致单个分块无限增长，`splitIntoChunks()` 在超过目标块大小且“很久没有遇到空行”时（并且当前不在 fenced code block 内），会触发一次“强制刷新”（force flush）：

- 行或字符超过配置的 `maxChunkLines`/`maxChunkChars` 后，如果仍未遇到空行且不在 fence 中，则提前切分当前块。
- 该策略仅在 `fenceAware: true` 时启用对 fence 的保护：不会在三引号代码块内部切分。
- 这样可以避免在“没有空行作为自然分割点”的文档中形成病态超大块，同时尽量靠近空行进行切分以保持语义完整。

调优建议：

- 处理大量“超长无空行段落”的文本时，可适当降低 `maxChunkChars` 或 `maxChunkLines`，以更积极地触发强制刷新。
- 对代码密集型内容，务必开启 `fenceAware: true`，保证不会把 fenced code block 拆断。

测试保障：

- 已加入单元测试覆盖如下场景：
  - 在“长时间无空行”的情况下，会触发强制刷新，产生多个块，且每块不会远超配置上限。
  - 在 fenced code block 内，即使超过阈值也不会切分，确保首个块包含完整的 fenced 片段。
