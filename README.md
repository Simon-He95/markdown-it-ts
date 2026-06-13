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

## Compatibility Contract

`markdown-it-ts` targets the markdown-it public API for common parser, renderer, and plugin usage. Private `markdown-it/lib/...` imports, undocumented upstream internal state assumptions, direct CommonJS `require('markdown-it-ts')`, and Node.js < 18 are unsupported.

| Level | API surface |
| --- | --- |
| Stable target | `MarkdownIt()`, `parse`, `render`, `renderInline`, `renderAsync`, `renderer.rules`, `Token`, and public ruler/plugin APIs |
| Advanced | Root `withRenderer`, documented subpath exports such as `core`, renderer helpers, and common utilities |
| Experimental | `stream`, `chunkedParse`, `StreamBuffer`, `UnboundedBuffer`, `EditableBuffer`, `PieceTable`, iterable/sink parsing, and chunk strategy recommenders via `markdown-it-ts/experimental`; selected helpers also have explicit subpaths such as `markdown-it-ts/stream/buffer`, `markdown-it-ts/stream/chunked`, `markdown-it-ts/stream/debounced`, and `markdown-it-ts/support/chunk_recommend` |

The root entry no longer exposes experimental helpers as top-level named exports. Some large-input helpers remain available as experimental instance methods for compatibility, but they are not part of the stable markdown-it compatibility contract.

Common 0.x import migrations:

| 0.x import | 1.0 import |
| --- | --- |
| `import { StreamBuffer } from 'markdown-it-ts'` | `import { StreamBuffer } from 'markdown-it-ts/experimental'` or `markdown-it-ts/stream/buffer` |
| `import { chunkedParse } from 'markdown-it-ts'` | `import { chunkedParse } from 'markdown-it-ts/experimental'` or `markdown-it-ts/stream/chunked` |
| `import { recommendFullChunkStrategy } from 'markdown-it-ts'` | `import { recommendFullChunkStrategy } from 'markdown-it-ts/support/chunk_recommend'` |
| `import { UnboundedBuffer } from 'markdown-it-ts'` | `import { UnboundedBuffer } from 'markdown-it-ts/experimental'` |

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

Security note: `markdown-it-ts` is not an HTML sanitizer. Raw HTML is escaped by default, but `html: true` passes raw HTML through, and plugin-authored attributes are treated as trusted output. Sanitize rendered HTML at your application boundary when untrusted authors can provide raw HTML or plugin-controlled attributes.

### Large Inputs

For normal usage, keep the original markdown-it-compatible API:

```typescript
const md = markdownIt()
const tokens = md.parse(hugeMarkdown)
const html = md.render(hugeMarkdown)
```

Those default `parse` / `render` calls may auto-activate an internal large-input path once the document crosses the large-document threshold. For compatibility, that implicit path is used only when no plugin has been installed and the parser rulers have not been modified. Any `.use()` call, including renderer-only plugins, keeps the plain full parse path unless you explicitly opt into `experimental.fullChunkedFallback`; stream parsing has the separate `experimental.streamChunkedFallback` opt-in.

Use the explicit stream-oriented APIs only when your upstream input already arrives as chunks and you do not want to join it into one giant string first:

```typescript
import MarkdownIt from 'markdown-it-ts'
import { UnboundedBuffer } from 'markdown-it-ts/experimental'

const md = MarkdownIt()

const tokens = md.parseIterable(fileChunks)

const buffer = new UnboundedBuffer(md, { mode: 'stream' })
for await (const chunk of logChunks) {
  buffer.feed(chunk)
  buffer.flushAvailable()
}
const finalTokens = buffer.flushForce()
```

Large-input tuning options are available under `experimental`:

```ts
const md = MarkdownIt({
  experimental: {
    autoUnbounded: false,
    fullChunkedFallback: true,
  },
})
```

The older top-level experimental option names are still accepted for 1.x compatibility, but the namespaced form is preferred.

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

The main package entry already includes `render`, `renderAsync`, `renderInline`, `renderer`, and the advanced `withRenderer` helper. `markdown-it-ts/plugins/with-renderer` is also kept for custom/core-shaped instances; normal `markdown-it-ts` users do not need to call it.

## Documentation

- [Docs index](./docs/README.md) (architecture, plugin dev, streaming, perf)
- [Stream optimization & chunked parsing](./docs/stream-optimization.md)
- [Performance report](./docs/perf-report.md) and [latest run](./docs/perf-latest.md)
- [Security notes](./docs/security.md)
- [Compatibility report](./docs/COMPATIBILITY_REPORT.md)

## Why render with markdown-it-ts?

- **Compared with markdown-it**: familiar public API and common plugin hooks, but rewritten in TypeScript with a modular architecture that can be tree-shaken and that ships streaming/chunked strategies. Normal `parse` / `render` usage stays unchanged; plugin/custom-rule instances keep full-parse semantics by default, while stock parser instances can use internal large-input optimizations.
- **Compared with markdown-exit**: both projects target speed, but markdown-it-ts keeps the markdown-it-style public API, offers typed APIs plus async rendering (`renderAsync`), and exposes tuning knobs for large-input and append-heavy workloads. Benchmark numbers below describe this repository's synthetic harness, not a promise that every workload is faster.
- **Compared with remark**: remark’s strength is AST transforms, and many real workflows include additional unified/rehype stages. In this repository’s Markdown → HTML harness, markdown-it-ts produces HTML directly and keeps markdown-it renderer semantics while still supporting async highlighting or token post-processing.
- **Compared with micromark**: micromark is a CommonMark-oriented reference implementation with different goals and APIs. markdown-it-ts targets markdown-it’s plugin API and renderer semantics; the numbers below compare only the specific parse/render scenarios measured by this repository’s harness.
- **Developer experience**: Type definitions and tuning helpers ship in the package (`docs/stream-optimization.md`, `markdown-it-ts/experimental`, and documented subpaths for `recommend*Strategy`, `StreamBuffer`, `chunkedParse`, etc.), so teams can build adaptive streaming pipelines quickly. The repository’s benchmark scripts (`perf:generate`, `perf:update-readme`) keep comparison data up to date in CI, reducing the risk of unnoticed regressions.
- **Migration compatibility**: markdown-it-ts preserves the ruler system, Token shape, renderer rules, and public plugin hooks used by common plugins. Plugins that depend on private markdown-it file paths, CommonJS-only loading assumptions, or undocumented internal state require validation.
- **1.0 readiness**: top-level root named exports are limited to the stable markdown-it compatibility surface, while streaming buffers, chunked fallbacks, and editable-buffer helpers remain available through `markdown-it-ts/experimental`; selected helpers also have explicit subpath imports. Some advanced instance methods and options remain available for existing large-input integrations and are marked experimental in the type declarations.

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
import markdownIt, { type MarkdownItPlugin } from 'markdown-it-ts'

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
import markdownIt from 'markdown-it-ts'
import {
  recommendFullChunkStrategy,
  recommendStreamChunkStrategy,
} from 'markdown-it-ts/support/chunk_recommend'

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

markdown-it-ts is optimized for fast parser throughput while preserving the markdown-it public API and common plugin model. The numbers below describe this repository's synthetic paragraph-heavy and append-heavy harnesses; validate on your own corpus before making performance claims.

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

Full parse/render comparisons against remark, micromark, and markdown-exit live in [docs/perf-latest.md](./docs/perf-latest.md) and [docs/perf-report.md](./docs/perf-report.md). Keep README numbers as a short orientation only; benchmark claims should cite the synthetic harness, environment, and snapshot file.

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
