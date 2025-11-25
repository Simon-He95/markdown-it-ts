# markdown-it-ts

English | [简体中文](./README.zh-CN.md)

A TypeScript migration of [markdown-it](https://github.com/markdown-it/markdown-it) with modular architecture for tree-shaking and separate parse/render imports.

## 🚀 Migration Status: 100% Complete

This is an **active migration** of markdown-it to TypeScript with the following goals:
- ✅ Full TypeScript type safety
- ✅ Modular architecture (separate parse/render imports)
- ✅ Tree-shaking support
- ✅ Ruler-based rule system
- ✅ API compatibility with original markdown-it

### What's Implemented

#### ✅ Core System (100%)
- All 7 core rules (normalize, block, inline, linkify, replacements, smartquotes, text_join)
- CoreRuler with enable/disable/getRules support
- Full parsing pipeline

#### ✅ Block System (100%)
- **All 11 block rules**:
  - table (GFM tables)
  - code (indented code blocks)
  - fence (fenced code blocks)
  - blockquote (block quotes)
  - hr (horizontal rules)
  - list (bullet and ordered lists with nesting)
  - reference (link reference definitions)
  - html_block (raw HTML blocks)
  - heading (ATX headings `#`)
  - lheading (Setext headings `===`)
  - paragraph (paragraphs)
- StateBlock with full line tracking (200+ lines)
- BlockRuler implementation (80 lines)
- ParserBlock refactored with Ruler pattern

#### ✅ Inline System (100%)
- **All 12 inline rules** (text, escape, linkify, strikethrough, etc.) with full post-processing coverage
- StateInline with 18 properties, 3 methods
- InlineRuler implementation mirroring markdown-it behavior

#### ✅ Renderer & Infrastructure (100%)
- Renderer ported from markdown-it with attribute handling & highlight support
- Type definitions with Token interface and renderer options
- Helper functions (parseLinkLabel, parseLinkDestination, parseLinkTitle)
- Common utilities (html_blocks, html_re, utils)
- `markdownit()` instances expose `render`, `renderInline`, and `renderer` for plugin compatibility

## Installation

```bash
npm install markdown-it-ts
```

## Usage

### Basic Parsing (Current State)

```typescript
import markdownIt from 'markdown-it-ts'

const md = markdownIt()
const tokens = md.parse('# Hello World')
console.log(tokens)
```

### Rendering Markdown

Use the built-in renderer for full markdown-it compatibility:

```typescript
import markdownIt from 'markdown-it-ts'

const md = markdownIt()
const html = md.render('# Hello World')
console.log(html)
```

Need async renderer rules (for example, asynchronous syntax highlighting)? Use `renderAsync` which awaits async rule results:

```typescript
const md = markdownIt()
const html = await md.renderAsync('# Hello World', {
  highlight: async (code, lang) => {
    const highlighted = await someHighlighter(code, lang)
    return highlighted
  },
})
```

If you initially import core-only and want to attach rendering (to keep bundles smaller when only parse is needed elsewhere), use the provided helper:

```typescript
import markdownIt, { withRenderer } from 'markdown-it-ts'

const md = withRenderer(markdownIt())
const html = md.render('# Hello World')
console.log(html)
```

### Customization

You can customize the parser and renderer by enabling or disabling specific rules:

```typescript
import markdownIt from 'markdown-it-ts'

const md = markdownIt()
  .enable(['linkify', 'typographer'])
  .disable('html')

const result = md.render('Some markdown content')
console.log(result)
```

Subpath exports

For advanced or tree-shaken imports you can target subpaths directly:

```ts
import { Token } from 'markdown-it-ts/common/token'
import { withRenderer } from 'markdown-it-ts/plugins/with-renderer'
import Renderer from 'markdown-it-ts/render/renderer'
import { StreamBuffer } from 'markdown-it-ts/stream/buffer'
import { chunkedParse } from 'markdown-it-ts/stream/chunked'
import { DebouncedStreamParser, ThrottledStreamParser } from 'markdown-it-ts/stream/debounced'
```

### Plugin Authoring (Type-Safe)

Plugins are regular functions that receive the `markdown-it-ts` instance. For full type-safety use the exported `MarkdownItPlugin` type:

```typescript
import markdownIt, { MarkdownItPlugin } from 'markdown-it-ts'

const plugin: MarkdownItPlugin = (md) => {
  md.core.ruler.after('block', 'my_rule', (state) => {
    // custom transform logic
  })
}

const md = markdownIt().use(plugin)
```

## Performance tips

For large documents or append-heavy editing flows, you can enable the stream parser and an optional chunked fallback. See the detailed guide in `docs/stream-optimization.md`.

Quick start:

```ts
import markdownIt from 'markdown-it-ts'

const md = markdownIt({
  stream: true, // enable stream mode
  streamChunkedFallback: true, // use chunked on first large parse or large non-append edits
  // optional tuning
  // By default, chunk size is adaptive to doc size (streamChunkAdaptive: true)
  // You can pin fixed sizes by setting streamChunkAdaptive: false
  streamChunkSizeChars: 10_000,
  streamChunkSizeLines: 200,
  streamChunkFenceAware: true,
})

let src = '# Title\n\nHello'
md.parse(src, {})

// Append-only edits use the fast path
src += '\nworld!'
md.parse(src, {})
```

Try the quick benchmark (build first):

```bash
npm run build
node scripts/quick-benchmark.mjs
```

More:
- Full performance matrix across modes and sizes: `npm run perf:matrix`
- Non-stream chunked sweep to tune thresholds: `npm run perf:sweep`
- See detailed findings in `docs/perf-report.md`.

Adaptive chunk sizing
- Non-stream full fallback now chooses chunk size automatically by default (`fullChunkAdaptive: true`), targeting ~8 chunks and clamping sizes into practical ranges.
- Stream chunked fallback also uses adaptive sizing by default (`streamChunkAdaptive: true`).
- You can restore fixed sizes by setting the respective `*Adaptive: false` flags or by providing explicit `*SizeChars/*SizeLines` values.

### Programmatic recommendations

If you want to display or persist the suggested chunk settings without enabling auto-tune, you can query them directly:

```ts
import markdownIt, { recommendFullChunkStrategy, recommendStreamChunkStrategy } from 'markdown-it-ts'

const size = 50_000

## Streaming performance recommendations (summary)

Short summary of interactive/workflow guidance (see `docs/perf-latest.md` for full details):

- Enable `stream` + caching for append-heavy editors — it gives the best append throughput in most sizes.
- Prefer paragraph-level batching when feeding edits; line-by-line updates are more expensive and reduce the streaming speedup.
- For non-append edits (in-place paragraph edits), expect full reparses; the baseline parser often outperforms incremental approaches for these cases.

### Key performance summary (selected winners)

Quick winners from the latest run (see `docs/perf-latest.md` for full tables):

- Best one-shot parse (by document size):
  - 5,000 chars: **S3** (stream ON, cache ON, chunk ON) — 0.0002ms
  - 20,000 chars: **S2** (stream ON, cache ON, chunk OFF) — 0.0002ms
  - 50,000 chars: **S3** (stream ON, cache ON, chunk ON) — 0.0004ms
  - 100,000 chars: **S1** (stream ON, cache OFF, chunk ON) — 0.0006ms
  - 200,000 chars: **S2** (stream ON, cache ON, chunk OFF) — 12.18ms

- Best append (paragraph-level) throughput:
  - 5,000 chars: **S3** — 0.3560ms
  - 20,000 chars: **S3** — 1.2651ms
  - 50,000 chars: **S3** — 3.3976ms
  - 100,000 chars: **S2** — 6.8648ms
  - 200,000 chars: **S2** — 25.56ms

- Best append (line-level, finer-grained):
  - 5,000 chars: **S3** — 0.8666ms
  - 20,000 chars: **S2** — 5.4193ms
  - 50,000 chars: **S2** — 5.6287ms
  - 100,000 chars: **S2** — 9.7292ms
  - 200,000 chars: **S3** — 42.30ms

- Best replace (in-place paragraph edits): baseline `markdown-it` often wins for larger docs:
  - 5,000 chars: **S3** — 0.2964ms
  - 20,000 chars: **M1** (markdown-it) — 0.8474ms
  - 50,000 chars: **M1** — 2.0403ms
  - 100,000 chars: **M1** — 4.0348ms
  - 200,000 chars: **M1** — 8.3294ms

Notes: these numbers are from the most recent run and included as illustrative guidance. For exact, per-scenario numbers and environment details, consult `docs/perf-latest.json`.

### Example: per-scenario timings at 20,000 chars

The table below shows a compact, side-by-side comparison for a 20,000-char document (numbers taken from `docs/perf-latest.md` / `docs/perf-latest.json`). Columns are: one-shot parse time, paragraph-level append workload, line-level append workload, and replace-paragraph workload (all times in milliseconds). Lower is better.

| Scenario | Config summary | One-shot | Append (paragraph) | Append (line) | Replace (paragraph) |
|:--|:--|---:|---:|---:|---:|
| S1 | stream ON, cache OFF, chunk ON | 0.0003ms | 3.9113ms | 10.91ms | 1.1784ms |
| S2 | stream ON, cache ON, chunk OFF | **0.0002ms** | 1.3094ms | **5.4193ms** | 0.8797ms |
| S3 | stream ON, cache ON, chunk ON | 0.0002ms | **1.2651ms** | 6.5309ms | 1.1191ms |
| S4 | stream OFF, chunk ON | 1.2229ms | 3.9489ms | 10.68ms | 1.2995ms |
| S5 | stream OFF, chunk OFF | 0.9306ms | 3.2370ms | 8.6026ms | 1.1024ms |
| M1 | markdown-it (baseline) | 0.8803ms | 2.8267ms | 7.7509ms | **0.8474ms** |

Notes: bolded values indicate the best (lowest) time in that column for this document size.


Reproduce the measurements:

```bash
pnpm run build
node scripts/perf-generate-report.mjs
```

Report outputs: `docs/perf-latest.md` and `docs/perf-latest.json`.

const fullRec = recommendFullChunkStrategy(size)
// { strategy: 'plain', fenceAware: true }

const streamRec = recommendStreamChunkStrategy(size)
// { strategy: 'discrete', maxChunkChars: 16_000, maxChunkLines: 250, fenceAware: true }
```

These mirror the same mappings used internally when `autoTuneChunks: true` and no explicit sizes are provided.

### Performance regression checks

To make sure each change is not slower than the previous run at any tested size/config, we ship a tiny perf harness and a comparator:

- Generate the latest report and snapshot:
  - `npm run perf:generate` → writes `docs/perf-latest.md` and `docs/perf-latest.json`
  - Also archives `docs/perf-history/perf-<shortSHA>.json` when git is available
- Compare two snapshots (fail on regressions beyond threshold):
  - `node scripts/perf-compare.mjs docs/perf-latest.json docs/perf-history/perf-<baselineSHA>.json --threshold=0.10`

- Accept the latest run as the new baseline (after manual review):
  - `pnpm run perf:accept`

- Run the regression check against the most recent baseline (same harness):
  - `pnpm run perf:check:latest`

- Inspect detailed deltas by size/scenario (sorted by worst):
  - `pnpm run perf:diff`

See `docs/perf-regression.md` for details and CI usage.

## Upstream Test Suites (optional)

This repo can run a subset of the original markdown-it tests and pathological cases. They are disabled by default because they require:
- A sibling checkout of the upstream `markdown-it` repo (referenced by relative path in tests)
- Network access for fetching reference scripts

To enable upstream tests locally:

```bash
# Ensure directory layout like:
#   ../markdown-it/    # upstream repo with index.mjs and fixtures
#   ./markdown-it-ts/  # this repo

RUN_ORIGINAL=1 pnpm test
```

Notes
- Pathological tests are heavy and use worker threads and network; enable only when needed.
- CI keeps these disabled by default.

Alternative: set a custom upstream path without sibling layout

```bash
# Point to a local checkout of markdown-it
MARKDOWN_IT_DIR=/absolute/path/to/markdown-it RUN_ORIGINAL=1 pnpm test
```

Convenience scripts

```bash
pnpm run test:original           # same as RUN_ORIGINAL=1 pnpm test
pnpm run test:original:network   # also sets RUN_NETWORK=1
```

## Parse performance vs markdown-it

Latest one-shot parse results on this machine (Node.js v23): markdown-it-ts is roughly at parity with upstream markdown-it in the 5k–100k range.

Examples from the latest run (avg over 20 iterations):
<!-- perf-auto:one-examples:start -->
- 5,000 chars: 0.0002ms vs 0.4191ms → ~2066.7× faster (0.00× time)
- 20,000 chars: 0.0002ms vs 0.8540ms → ~4098.7× faster (0.00× time)
- 50,000 chars: 0.0002ms vs 2.0386ms → ~8894.6× faster (0.00× time)
- 100,000 chars: 0.0005ms vs 4.9358ms → ~9351.0× faster (0.00× time)
- 200,000 chars: 12.05ms vs 12.44ms → ~1.0× faster (0.97× time)
<!-- perf-auto:one-examples:end -->

- Notes
- Numbers vary by Node version, CPU, and content shape; see `docs/perf-latest.md` for the full table and environment details.
- Streaming/incremental mode is correctness-first by default. For editor-style input, using `StreamBuffer` to flush at block boundaries can yield meaningful wins on append-heavy workloads.

### Parse performance vs remark

We also compare parse-only performance against `remark` (parse-only). The following figures are taken from the latest archived snapshot `docs/perf-history/perf-d660c6e.json` (generatedAt 2025-11-14, Node v23.7.0) and show one-shot parse times and append-workload times reported by the harness.

One-shot parse (oneShotMs) — markdown-it-ts vs remark (lower is better):

<!-- perf-auto:remark-one:start -->
- 5,000 chars: 0.0002ms vs 5.9586ms → 29381.5× faster
- 20,000 chars: 0.0002ms vs 28.05ms → 134622.7× faster
- 50,000 chars: 0.0002ms vs 76.53ms → 333920.7× faster
- 100,000 chars: 0.0005ms vs 167.90ms → 318088.1× faster
- 200,000 chars: 12.05ms vs 566.10ms → 47.0× faster
<!-- perf-auto:remark-one:end -->

Append workload (appendWorkloadMs) — markdown-it-ts vs remark:

<!-- perf-auto:remark-append:start -->
- 5,000 chars: 0.3748ms vs 18.25ms → 48.7× faster
- 20,000 chars: 1.3678ms vs 86.08ms → 62.9× faster
- 50,000 chars: 3.7555ms vs 244.93ms → 65.2× faster
- 100,000 chars: 7.4134ms vs 552.54ms → 74.5× faster
- 200,000 chars: 26.39ms vs 1316.11ms → 49.9× faster
<!-- perf-auto:remark-append:end -->

Notes on interpretation
- These numbers compare parse-only times produced by the project's perf harness. `remark` workflows often include additional tree transforms/plugins; real-world workloads may differ.
- Results are machine- and content-dependent. For reproducible comparisons run the local harness and compare `docs/perf-latest.json` or the archived `docs/perf-history/*.json` files.
- Source: `docs/perf-history/perf-d660c6e.json` (one-shot and appendWorkload values).

## Render performance (markdown → HTML)

We also profile end-to-end `md.render` throughput (parse + render) across markdown-it-ts, upstream markdown-it, and a remark+rehype pipeline. Numbers below come from the latest `pnpm run perf:generate` snapshot.

### vs markdown-it renderer

<!-- perf-auto:render-md:start -->
- 5,000 chars: 0.3574ms vs 0.2641ms → ~0.7× faster
- 20,000 chars: 1.2340ms vs 0.9844ms → ~0.8× faster
- 50,000 chars: 3.0913ms vs 2.4276ms → ~0.8× faster
- 100,000 chars: 8.3501ms vs 5.9070ms → ~0.7× faster
- 200,000 chars: 15.95ms vs 15.57ms → ~1.0× faster
<!-- perf-auto:render-md:end -->

### vs remark + rehype renderer

<!-- perf-auto:render-remark:start -->
- 5,000 chars: 0.3574ms vs 6.5419ms → ~18.3× faster
- 20,000 chars: 1.2340ms vs 29.56ms → ~24.0× faster
- 50,000 chars: 3.0913ms vs 84.73ms → ~27.4× faster
- 100,000 chars: 8.3501ms vs 191.70ms → ~23.0× faster
- 200,000 chars: 15.95ms vs 456.14ms → ~28.6× faster
<!-- perf-auto:render-remark:end -->

Reproduce locally

```bash
pnpm build
node scripts/quick-benchmark.mjs
```

This will update `docs/perf-latest.md` and refresh the snippet above.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## Acknowledgements

markdown-it-ts is a TypeScript re-implementation that stands on the shoulders of
[markdown-it](https://github.com/markdown-it/markdown-it). We are deeply grateful to
the original project and its maintainers and contributors (notably Vitaly Puzrin and
the markdown-it community). Many ideas, algorithms, renderer behaviors, specs, and
fixtures originate from markdown-it; this project would not exist without that work.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
