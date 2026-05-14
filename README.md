# markdown-it-ts

A TypeScript-first Markdown parser and renderer compatible with the markdown-it public API for common plugin patterns, with streaming/incremental parsing and async render.

English | [简体中文](./README.zh-CN.md)

Quick links: [Docs index](./docs/README.md) · [Stream optimization](./docs/stream-optimization.md) · [Performance report](./docs/perf-report.md) · [Compatibility report](./docs/COMPATIBILITY_REPORT.md)

> **Runtime note**
>
> `markdown-it-ts` is ESM-only and requires Node.js >= 18.
>
> ```js
> import MarkdownIt from 'markdown-it-ts'
> ```
>
> In CommonJS projects, use dynamic import inside an async function:
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

A TypeScript migration of [markdown-it](https://github.com/markdown-it/markdown-it) with modular architecture for tree-shaking and separate parse/render imports.

## Migration Status: CI-backed compatibility baseline

The core TypeScript port is complete. Compatibility is maintained against the markdown-it public API and common plugin patterns with the following goals:
- ✅ Full TypeScript type safety
- ✅ Modular architecture (separate parse/render imports)
- ✅ Tree-shaking support
- ✅ Ruler-based rule system
- ✅ markdown-it public API compatibility for common plugin patterns, backed by the always-on CommonMark fixture test and the plugin compatibility matrix in CI

### What's Implemented

#### ✅ Core System
- All 7 core rules (normalize, block, inline, linkify, replacements, smartquotes, text_join)
- CoreRuler with enable/disable/getRules support
- Full parsing pipeline

#### ✅ Block System
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

#### ✅ Inline System
- **All 12 inline rules** (text, escape, linkify, strikethrough, etc.) with full post-processing coverage
- StateInline with 18 properties, 3 methods
- InlineRuler implementation mirroring markdown-it behavior

#### ✅ Renderer & Infrastructure
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

Use the built-in renderer for the markdown-it-compatible render API:

```typescript
import markdownIt from 'markdown-it-ts'

const md = markdownIt()
const html = md.render('# Hello World')
console.log(html)
```

### Large Inputs

For normal usage, keep the original markdown-it-compatible API:

```typescript
const md = markdownIt()
const tokens = md.parse(hugeMarkdown)
const html = md.render(hugeMarkdown)
```

Those default `parse` / `render` calls now auto-activate the internal large-input path once the document crosses the large-document threshold, so users do not need a separate API just to benefit from huge-text optimizations. If needed, this can be disabled with `autoUnbounded: false`.

Use the explicit stream-oriented APIs only when your upstream input already arrives as chunks and you do not want to join it into one giant string first:

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

`parseIterable` / `parseAsyncIterable` are advanced entry points for explicit `Iterable<string>` / `AsyncIterable<string>` inputs. `UnboundedBuffer` is the advanced append-only path for real chunk streams and only keeps a bounded tail in memory instead of the whole historical source string.

If you also need bounded output memory for explicit chunk-stream inputs, use the sink form instead of retaining a full token array:

```typescript
md.parseIterableToSink(fileChunks, (tokens, info) => {
  consumeTokenChunk(tokens, info)
})
```

For arbitrary in-place edits, use `EditableBuffer`. It stores the source in a piece table and reparses only from an anchor before the affected block instead of flattening and reparsing the whole document every time. Internally, both the full parse and the localized reparse paths now hand a `PieceTableSourceView` straight to `md.core.parseSource(...)`, so the selected range no longer needs to be materialized as one giant intermediate string first.

### Correctness notes for chunked and streaming parsing

Markdown is not always chunk-local. Some constructs depend on document-level state, including reference definitions, footnote definitions, abbreviation definitions, and plugin-defined global state.

`chunkedParse()` and complete-string unbounded parsing use a correctness-first fallback by default for known global-state constructs. Chunked parsing also falls back to a full parse when a forced chunk boundary is not on a blank-line boundary, because long lists, blockquotes, HTML blocks, and paragraphs are not safe to split arbitrarily.

Iterable/sink parsing is streaming-oriented. It cannot always know future document-level definitions before committing earlier chunks, so documents with reference, footnote, or abbreviation definitions should use full-string parsing or avoid early flushing when exact full-parse parity is required.

The detector is intentionally conservative. It may fall back for definitions that appear inside code fences or raw text, because fallback is correctness-first.

You can explicitly disable only the known global-state fallback:

```ts
chunkedParse(md, source, env, {
  fallbackOnGlobalState: false,
})
```

Unsafe non-blank chunk boundaries still fall back to a full parse because splitting there is not token-stream safe.

Disabling the global-state fallback is a performance-oriented mode and may produce output that differs from a full parse for documents with global state.

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

The main package entry already includes `render`, `renderAsync`, `renderInline`, and `renderer`. The `withRenderer` subpath is kept as a helper for custom/core-shaped instances; normal `markdown-it-ts` users do not need to call it.

## Documentation

- [Docs index](./docs/README.md) (architecture, plugin dev, streaming, perf)
- [Stream optimization & chunked parsing](./docs/stream-optimization.md)
- [Performance report](./docs/perf-report.md) and [latest run](./docs/perf-latest.md)
- [Security notes](./docs/security.md)
- [Compatibility report](./docs/COMPATIBILITY_REPORT.md)

## Why render with markdown-it-ts?

- **Compared with markdown-it**: familiar public API and common plugin hooks, but rewritten in TypeScript with a modular architecture that can be tree-shaken and that ships streaming/chunked strategies. Normal `parse` / `render` usage stays unchanged, large finite strings now auto-enable internal large-input optimizations, and editor-style flows can additionally opt into `stream`, `streamChunkedFallback`, etc., to avoid repeatedly reparsing stable appended content when the input shape is safe.
- **Compared with markdown-exit**: both projects target speed, but markdown-it-ts keeps the markdown-it-style public API, offers typed APIs plus async rendering (`renderAsync`), and exposes tuning knobs for large-input and append-heavy workloads. Benchmark numbers below describe this repository's synthetic harness, not a promise that every workload is faster.
- **Compared with remark**: remark’s strength is AST transforms, and many real workflows include additional unified/rehype stages. In this repository’s Markdown → HTML harness, markdown-it-ts produces HTML directly and keeps markdown-it renderer semantics while still supporting async highlighting or token post-processing.
- **Compared with micromark**: micromark is a CommonMark-oriented reference implementation with different goals and APIs. markdown-it-ts targets markdown-it’s plugin API and renderer semantics; the numbers below compare only the specific parse/render scenarios measured by this repository’s harness.
- **Developer experience**: Type definitions and tuning helpers ship in the package (`docs/stream-optimization.md`, `recommend*Strategy` APIs, `StreamBuffer`, `chunkedParse`, etc.), so teams can build adaptive streaming pipelines quickly. The repository’s benchmark scripts (`perf:generate`, `perf:update-readme`) keep comparison data up to date in CI, reducing the risk of unnoticed regressions.
- **Migration compatibility**: markdown-it-ts preserves the ruler system, Token shape, renderer rules, and public plugin hooks used by common plugins. Plugins that depend on private markdown-it file paths, CommonJS-only loading assumptions, or undocumented internal state require validation.
- **0.x readiness**: async render, Token-level post-processing, streaming buffers, and chunked fallbacks are covered by CI and package smoke tests, but the package is still versioned `0.x`; treat the public API as stabilizing until `1.0.0`.

### Customization

You can customize parser options and enable or disable specific rules:

```typescript
import markdownIt from 'markdown-it-ts'

const md = markdownIt({
  linkify: true,
  typographer: true,
  html: false,
}).disable('image')

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

This repository has separate workflows for code quality and documentation/demo validation.

- `.github/workflows/ci.yml` runs lint, typecheck, unit tests, build, package smoke tests, and runtime smoke tests for the packed package.
- The main CI also runs a lightweight parser performance threshold check on Node.js 20 to catch obvious parser regressions without relying on a full benchmark matrix for every PR.
- `.github/workflows/ci-docs.yml` builds API docs and the demo site, and conditionally deploys them when Netlify secrets are configured.
- `.github/workflows/perf-regression.yml` is a manual benchmark workflow (`workflow_dispatch`) for comparing full benchmark snapshots between a base ref and a head ref when a change needs deeper parser/render performance validation.

Files to inspect: `.github/workflows/ci.yml`, `.github/workflows/ci-docs.yml`, `.github/workflows/perf-regression.yml`

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
- Parser family hotspot report: `pnpm run perf:families`
- Long-text default strategy matrix: `pnpm run perf:strategies`
- Independent default-strategy perf gate: `pnpm run perf:gate`
- See detailed findings in `docs/perf-report.md`.
- See long-text strategy docs in `docs/stream-optimization.md` and `docs/parse-strategy-matrix.md`.

Adaptive chunk sizing
- Non-stream full fallback now chooses chunk size automatically by default (`fullChunkAdaptive: true`), targeting ~8 chunks and clamping sizes into practical ranges.
- Stream chunked fallback also uses adaptive sizing by default (`streamChunkAdaptive: true`).
- You can restore fixed sizes by setting the respective `*Adaptive: false` flags or by providing explicit `*SizeChars/*SizeLines` values.

### Programmatic recommendations

If you want to display or persist the suggested chunk settings without enabling auto-tune, you can query them directly:

```ts
import markdownIt, { recommendFullChunkStrategy, recommendStreamChunkStrategy } from 'markdown-it-ts'

const size = 50_000

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

- Run the per-token-type render benchmark against `markdown-it`:
  - `pnpm run perf:render-rules`
  - Add `--include-noise` to also show zero-token / sub-signal categories
  - Use `pnpm run perf:render-rules:check` to fail if any meaningful category regresses beyond the threshold

- Run the parser rule-family hotspot benchmark:
  - `pnpm run perf:families`
  - Writes `docs/perf-family-hotspots.md` and `docs/perf-family-hotspots.json`

- Run the long-text default-strategy benchmark and gate:
  - `pnpm run perf:strategies`
  - `pnpm run perf:strategy:check`
  - `pnpm run perf:gate`
  - Writes `docs/perf-large-defaults.*` and `docs/parse-strategy-matrix.md`

- Inspect detailed deltas by size/scenario (sorted by worst):
  - `pnpm run perf:diff`

See `docs/perf-regression.md` for details and CI usage.

## Upstream Test Suites

CI always runs the vendored upstream CommonMark `good.txt` fixture via `test/compat/commonmark-fixture.test.mjs`, plus the local plugin compatibility matrix.

This repo can also run a subset of the original markdown-it tests and pathological cases. Those optional suites are disabled by default because they require:
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
- CI keeps only these optional sibling/network suites disabled by default.

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

## Performance summary

markdown-it-ts is optimized for fast parser throughput while preserving the markdown-it public API and common plugin model.

In the latest local benchmark snapshot from this repository’s synthetic harness, one-shot parsing is roughly at parity with or faster than upstream markdown-it on the measured large-document sizes:

<!-- perf-auto:one-examples:start -->
- 5,000 chars: 0.1448ms vs 0.2630ms → ~1.8× faster, ~45% less time
- 20,000 chars: 0.5903ms vs 0.6548ms → ~1.1× faster, ~10% less time
- 100,000 chars: 3.7770ms vs 4.6536ms → ~1.2× faster, ~19% less time
- 500,000 chars: 24.26ms vs 24.78ms → ~1× faster, ~2% less time
- 1,000,000 chars: 47.06ms vs 59.67ms → ~1.3× faster, ~21% less time
<!-- perf-auto:one-examples:end -->

For append-heavy editor or streaming workloads, enable the stream parser or use `StreamBuffer` / `UnboundedBuffer`. These paths are designed to avoid reparsing stable historical text when the input shape is safe for incremental parsing.

Benchmark results are workload-, CPU-, and Node-version-dependent. `docs/perf-latest.json` records the Node version, platform, CPU, generated time, benchmark version, and commit for each generated snapshot. Reproduce locally with:

```bash
pnpm run build
pnpm run perf:generate
```

### Parse performance vs remark

We also compare parse-only performance against `remark` (parse-only). The following figures are taken from `docs/perf-latest.json` and show one-shot parse times and append-workload times reported by this repository’s harness.

One-shot parse (oneShotMs) — markdown-it-ts vs remark (lower is better):

<!-- perf-auto:remark-one:start -->
- 5,000 chars: 0.1448ms vs 5.0124ms → 34.6× faster
- 20,000 chars: 0.5903ms vs 24.43ms → 41.4× faster
- 100,000 chars: 3.7770ms vs 150.38ms → 39.8× faster
<!-- perf-auto:remark-one:end -->

Append workload (appendWorkloadMs) — markdown-it-ts vs remark:

<!-- perf-auto:remark-append:start -->
- 5,000 chars: 0.2794ms vs 16.46ms → 58.9× faster
- 20,000 chars: 1.1127ms vs 77.51ms → 69.7× faster
- 100,000 chars: 5.4172ms vs 489.66ms → 90.4× faster
<!-- perf-auto:remark-append:end -->

### Parse performance vs micromark

We also compare parse-only performance against `micromark` (scenario `MM1`), measured via its preprocess+parse+postprocess pipeline (no HTML compile). Numbers are taken from `docs/perf-latest.json` generated by this repository’s harness.

One-shot parse (oneShotMs) — markdown-it-ts vs micromark-based parse:

<!-- perf-auto:micromark-one:start -->
- 5,000 chars: 0.1448ms vs 4.2385ms → 29.3× faster
- 20,000 chars: 0.5903ms vs 17.81ms → 30.2× faster
- 100,000 chars: 3.7770ms vs 96.96ms → 25.7× faster
<!-- perf-auto:micromark-one:end -->

Append workload (appendWorkloadMs) — markdown-it-ts vs micromark-based parse:

<!-- perf-auto:micromark-append:start -->
- 5,000 chars: 0.2794ms vs 12.99ms → 46.5× faster
- 20,000 chars: 1.1127ms vs 56.41ms → 50.7× faster
- 100,000 chars: 5.4172ms vs 319.31ms → 58.9× faster
<!-- perf-auto:micromark-append:end -->

## Parse performance vs markdown-exit

The following shows one-shot parse times (oneShotMs) comparing the best markdown-it-ts scenario against `markdown-exit` (E1) from the latest perf snapshot.

<!-- perf-auto:exit-one:start -->
| Size (chars) | markdown-it-ts (best one-shot) | markdown-exit (one-shot) |
|---:|---:|---:|
| 5,000 | 0.1448ms | 0.3136ms |
| 20,000 | 0.5903ms | 0.8680ms |
| 50,000 | 1.5677ms | 2.2452ms |
| 100,000 | 3.7770ms | 5.5021ms |
| 200,000 | 10.10ms | 12.17ms |
<!-- perf-auto:exit-one:end -->

Notes: these numbers describe this repository's synthetic harness. For very large documents (200k+) raw one-shot times are closer between implementations. See `docs/perf-latest.json` for full details.


Notes on interpretation
- These numbers compare parse-only times produced by the project's perf harness. `remark` workflows often include additional tree transforms/plugins; real-world workloads may differ.
- Results are machine- and content-dependent. For reproducible comparisons run the local harness and compare `docs/perf-latest.json` or the archived `docs/perf-history/*.json` files.
- Source: `docs/perf-latest.json` (one-shot and appendWorkload values).

## Render performance (markdown → HTML)

We also profile end-to-end `md.render` API throughput (parse + render) across markdown-it-ts, upstream markdown-it, micromark, and a remark+rehype pipeline. This section is intentionally about the full `render(markdown)` call in this repository’s harness, not the lower-level renderer-only hot path. Numbers below come from the latest `pnpm run perf:generate` snapshot.

For large finite strings, these numbers already include the default automatic large-input path; users do not need to switch to `parseIterable` / `UnboundedBuffer` to get those optimizations. Those advanced APIs are reserved for explicit chunk-stream inputs.

### vs markdown-it render API

<!-- perf-auto:render-md:start -->
- 5,000 chars: 0.1793ms vs 0.2059ms → ~1.1× faster
- 20,000 chars: 0.6677ms vs 0.7787ms → ~1.2× faster
- 100,000 chars: 4.6034ms vs 5.3503ms → ~1.2× faster
- 500,000 chars: 31.15ms vs 37.07ms → ~1.2× faster
- 1,000,000 chars: 66.77ms vs 78.51ms → ~1.2× faster
<!-- perf-auto:render-md:end -->

### vs remark + rehype render API

<!-- perf-auto:render-remark:start -->
- 5,000 chars: 0.1793ms vs 4.2929ms → ~23.9× faster
- 20,000 chars: 0.6677ms vs 24.47ms → ~36.6× faster
- 100,000 chars: 4.6034ms vs 170.78ms → ~37.1× faster
<!-- perf-auto:render-remark:end -->

### vs micromark (CommonMark reference)

<!-- perf-auto:render-micromark:start -->
- 5,000 chars: 0.1793ms vs 3.6437ms → ~20.3× faster
- 20,000 chars: 0.6677ms vs 19.91ms → ~29.8× faster
- 100,000 chars: 4.6034ms vs 107.22ms → ~23.3× faster
<!-- perf-auto:render-micromark:end -->

Reproduce locally

```bash
pnpm build
node scripts/quick-benchmark.mjs
```

This will update `docs/perf-latest.md` and refresh the snippet above.

### vs markdown-exit render API

<!-- perf-auto:render-exit:start -->
- 5,000 chars: 0.1793ms vs 0.2487ms → ~1.4× faster
- 20,000 chars: 0.6677ms vs 0.9981ms → ~1.5× faster
- 50,000 chars: 1.8301ms vs 2.6056ms → ~1.4× faster
- 100,000 chars: 4.6034ms vs 6.3543ms → ~1.4× faster
- 200,000 chars: 11.28ms vs 14.93ms → ~1.3× faster
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
