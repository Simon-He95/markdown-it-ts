# markdown-it-ts

English | [简体中文](./README.zh-CN.md)

[Compatibility report: `docs/COMPATIBILITY_REPORT.md`](./docs/COMPATIBILITY_REPORT.md)

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

## Why render with markdown-it-ts?

- **Compared with markdown-it**: same API/plugin surface, but rewritten in TypeScript with a modular architecture that can be tree-shaken and that ships streaming/chunked strategies. Default one-shot parse is already faster across most sizes (see benchmarks below), and editor-style flows can enable `stream`, `streamChunkedFallback`, etc., to re-parse only appended content instead of reprocessing entire documents.
- **Compared with markdown-exit**: both projects target speed, but markdown-it-ts stays 100% compatible with markdown-it plugins, offers typed APIs plus async rendering (`renderAsync`), and exposes richer tuning knobs (fence-aware chunking, hybrid fallback modes). In our 5k–100k measurements, markdown-it-ts consistently leads one-shot parse latency (see “Parse ranking”), and its streaming path keeps append latency far lower than re-running a full parse per keystroke.
- **Compared with remark**: remark’s strength is AST transforms, yet rendering Markdown → HTML usually requires a rehype/rehype-stringify pipeline, which adds significant overhead (our measurements show ~29× slower HTML rendering at 20k chars). markdown-it-ts produces HTML directly, keeps markdown-it renderer semantics, and still supports async highlighting or token post-processing, which makes it a better fit for real-time preview, SSR, or any latency-sensitive render workload.
- **Developer experience**: Type definitions and tuning helpers ship in the package (`docs/stream-optimization.md`, `recommend*Strategy` APIs, `StreamBuffer`, `chunkedParse`, etc.), so teams can build adaptive streaming pipelines quickly. The repository’s benchmark scripts (`perf:generate`, `perf:update-readme`) keep comparison data up to date in CI, reducing the risk of unnoticed regressions.
- **Drop-in compatibility**: markdown-it-ts preserves the ruler system, Token shape, and plugin hooks, so most existing markdown-it plugins just work after changing the import. For parse-only bundles you can opt into rendering later via `withRenderer`, enabling incremental migrations.
- **Production readiness**: async render, Token-level post-processing, streaming buffers, and chunked fallbacks serve SSR, collaborative editors, and large batch pipelines alike. With `docs/perf-report.md` plus long-term history (`docs/perf-history/*.json`) you can track performance trends over time and catch regressions early.

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

## Demo

Build the demo site into ./demo and open it in your browser.

Note: the demo build uses the current project's published build artifact (the files in `dist/`). The demo script runs `npm run build` before bundling, so the demo reflects the current repo source.

This ensures `demo/markdown-it.js` is produced from the most recent `dist/index.js` output.

### Generating API docs

You can generate API documentation into `./apidoc` using the built-in script. The script will attempt to use `pnpm dlx` or `npx` if available, otherwise it uses the locally-installed `ndoc` from `node_modules`.

```bash
# build and generate docs
npm run build
npm run doc

# open generated docs
open apidoc/index.html  # macOS
xdg-open apidoc/index.html  # Linux
```

## Continuous Integration

This repository includes a GitHub Actions workflow that runs on push and pull requests to `main`. The CI job verifies the TypeScript build, linting, API docs generation and demo build to help catch regressions early.

Files to inspect: `.github/workflows/ci-docs.yml`

## Deploying to Netlify

You can deploy both the generated API docs (`apidoc/`) and the demo site (`demo/`) to Netlify. There are two supported workflows:

1) Manual / CLI deploy (local)

  - Create two Netlify sites (one for docs and one for demo), or use two separate site IDs under the same account.
  - Install `netlify-cli` locally or use the helper scripts included in package.json.

  Deploy docs locally:
  ```bash
  # set environment variables first
  export NETLIFY_AUTH_TOKEN=your_token_here
  export NETLIFY_SITE_ID_DOCS=your_docs_site_id
  pnpm run netlify:deploy:docs
  ```

  Deploy demo locally:
  ```bash
  export NETLIFY_AUTH_TOKEN=your_token_here
  export NETLIFY_SITE_ID_DEMO=your_demo_site_id
  pnpm run netlify:deploy:demo
  ```

2) CI-driven deploy (recommended)

  The repo contains two GitHub Actions workflows, one for docs and one for demo. Each workflow will only run if you add the required secrets to the repository:

  - NETLIFY_AUTH_TOKEN — a Netlify Personal Access Token with deploy permissions
  - NETLIFY_SITE_ID_DOCS — the Site ID for the docs site
  - NETLIFY_SITE_ID_DEMO — the Site ID for the demo site

  Add these as GitHub Secrets for the repository (Settings → Secrets and variables → Actions). When pushed to `main`, the workflows will run and deploy to the corresponding Netlify site.

Files to inspect: `.github/workflows/deploy-netlify-docs.yml` and `.github/workflows/deploy-netlify-demo.yml`

Automatic CI deploy: when you push to `main`, the CI workflow will build the project, generate docs, and build the demo. After a successful build the workflow attempts to deploy both `apidoc/` and `demo/` to Netlify automatically — but only if the corresponding GitHub Actions secrets are set:

- `NETLIFY_AUTH_TOKEN` — Netlify Personal Access Token
- `NETLIFY_SITE_ID_DOCS` — Netlify Site ID for the docs site
- `NETLIFY_SITE_ID_DEMO` — Netlify Site ID for the demo site

If those secrets exist, the CI will publish both sites. If not, the CI will skip publishing and still report build/lint/docs/demo status.

```bash
# build demo and open ./demo/index.html (macOS / Linux / Windows supported)
npm run gh-demo
```

If you only want to build the demo (skip publishing) you can run:

```bash
npm run demo
```

To publish the demo automatically set GH_PAGES_REPO to your target repo (you must have push access):

```bash
export GH_PAGES_REPO='git@github.com:youruser/markdown-it.github.io.git'
npm run gh-demo
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

### Built-in Plugins

#### Task Lists (GFM-style checkboxes)

Render GitHub Flavored Markdown task lists with `- [ ]` and `- [x]` syntax:

```typescript
import markdownIt from 'markdown-it-ts'
import { taskListPlugin } from 'markdown-it-ts/plugins/task-lists'

const md = markdownIt().use(taskListPlugin)

const html = md.render(`
- [x] Done task
- [ ] Todo task
`)
// Renders checkboxes with proper classes for styling
```

Options:

```typescript
md.use(taskListPlugin, {
  listClass: 'task-list',        // CSS class for <ul>/<ol>
  itemClass: 'task-list-item',   // CSS class for <li>
  checkboxClass: 'task-list-checkbox', // CSS class for checkbox
  disabled: true,                // Render checkboxes as disabled
  divCheckbox: false,            // Use <span> instead of <input> (SSR-friendly)
})
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
- 5,000 chars: 0.0002ms vs 0.3564ms → ~2193.2× faster (0.00× time)
- 20,000 chars: 0.0002ms vs 0.7266ms → ~4650.0× faster (0.00× time)
- 50,000 chars: 0.0002ms vs 1.7031ms → ~7569.3× faster (0.00× time)
- 100,000 chars: 0.0006ms vs 4.1314ms → ~6998.4× faster (0.00× time)
- 200,000 chars: 9.8789ms vs 10.94ms → ~1.1× faster (0.90× time)
<!-- perf-auto:one-examples:end -->

- Notes
- Numbers vary by Node version, CPU, and content shape; see `docs/perf-latest.md` for the full table and environment details.
- Streaming/incremental mode is correctness-first by default. For editor-style input, using `StreamBuffer` to flush at block boundaries can yield meaningful wins on append-heavy workloads.

### Parse performance vs remark

We also compare parse-only performance against `remark` (parse-only). The following figures are taken from the latest archived snapshot `docs/perf-history/perf-d660c6e.json` (generatedAt 2025-11-14, Node v23.7.0) and show one-shot parse times and append-workload times reported by the harness.

One-shot parse (oneShotMs) — markdown-it-ts vs remark (lower is better):

<!-- perf-auto:remark-one:start -->
- 5,000 chars: 0.0002ms vs 5.2399ms → 32245.3× faster
- 20,000 chars: 0.0002ms vs 22.04ms → 141059.3× faster
- 50,000 chars: 0.0002ms vs 61.71ms → 274259.4× faster
- 100,000 chars: 0.0006ms vs 140.23ms → 237548.1× faster
- 200,000 chars: 9.8789ms vs 326.26ms → 33.0× faster
<!-- perf-auto:remark-one:end -->

Append workload (appendWorkloadMs) — markdown-it-ts vs remark:

<!-- perf-auto:remark-append:start -->
- 5,000 chars: 0.3475ms vs 15.01ms → 43.2× faster
- 20,000 chars: 1.2507ms vs 68.90ms → 55.1× faster
- 50,000 chars: 3.1670ms vs 199.81ms → 63.1× faster
- 100,000 chars: 6.1443ms vs 469.09ms → 76.3× faster
- 200,000 chars: 26.89ms vs 1052.26ms → 39.1× faster
<!-- perf-auto:remark-append:end -->

## Parse performance vs markdown-exit

The following shows one-shot parse times (oneShotMs) comparing the best markdown-it-ts scenario against `markdown-exit` (E1) from the latest perf snapshot.

| Size (chars) | markdown-it-ts (best one-shot) | markdown-exit (one-shot) |
|---:|---:|---:|
| 5,000 | 0.0001472ms | 0.3588764ms |
| 20,000 | 0.0001688ms | 0.8871354ms |
| 50,000 | 0.0003000ms | 2.1539625ms |
| 100,000 | 0.0004722ms | 5.0225138ms |
| 200,000 | 9.6601355ms | 12.8995730ms |

Notes: markdown-it-ts remains substantially faster for small one-shot parses due to streaming/chunk strategies; for very large documents (200k+) raw one-shot times are closer between implementations. See `docs/perf-latest.json` for full details.


Notes on interpretation
- These numbers compare parse-only times produced by the project's perf harness. `remark` workflows often include additional tree transforms/plugins; real-world workloads may differ.
- Results are machine- and content-dependent. For reproducible comparisons run the local harness and compare `docs/perf-latest.json` or the archived `docs/perf-history/*.json` files.
- Source: `docs/perf-history/perf-d660c6e.json` (one-shot and appendWorkload values).

## Render performance (markdown → HTML)

We also profile end-to-end `md.render` throughput (parse + render) across markdown-it-ts, upstream markdown-it, and a remark+rehype pipeline. Numbers below come from the latest `pnpm run perf:generate` snapshot.

### vs markdown-it renderer

<!-- perf-auto:render-md:start -->
- 5,000 chars: 0.2931ms vs 0.2113ms → ~0.7× faster
- 20,000 chars: 0.9327ms vs 0.7883ms → ~0.8× faster
- 50,000 chars: 2.4636ms vs 2.0520ms → ~0.8× faster
- 100,000 chars: 6.0068ms vs 4.8248ms → ~0.8× faster
- 200,000 chars: 13.93ms vs 10.85ms → ~0.8× faster
<!-- perf-auto:render-md:end -->

### vs remark + rehype renderer

<!-- perf-auto:render-remark:start -->
- 5,000 chars: 0.2931ms vs 4.7301ms → ~16.1× faster
- 20,000 chars: 0.9327ms vs 26.95ms → ~28.9× faster
- 50,000 chars: 2.4636ms vs 70.14ms → ~28.5× faster
- 100,000 chars: 6.0068ms vs 186.00ms → ~31.0× faster
- 200,000 chars: 13.93ms vs 370.97ms → ~26.6× faster
<!-- perf-auto:render-remark:end -->

Reproduce locally

```bash
pnpm build
node scripts/quick-benchmark.mjs
```

This will update `docs/perf-latest.md` and refresh the snippet above.

### vs markdown-exit renderer

<!-- perf-auto:render-exit:start -->
- 5,000 chars: 0.2814ms vs 0.2836ms → ~1.01× (markdown-it-ts slightly faster)
- 20,000 chars: 0.9555ms vs 1.0533ms → ~1.10× (markdown-it-ts faster)
- 50,000 chars: 2.5337ms vs 2.6055ms → ~1.03× (markdown-it-ts faster)
- 100,000 chars: 5.7094ms vs 5.8194ms → ~1.02× (markdown-it-ts faster)
- 200,000 chars: 12.3119ms vs 14.3799ms → ~1.17× (markdown-it-ts faster)
<!-- perf-auto:render-exit:end -->


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
