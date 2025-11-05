# Performance Report: Stream vs Chunked vs Full

This report summarizes measured performance across five configurations and four document sizes. Benchmarks were run on Node.js using synthetic paragraph-heavy content.

Scenarios:
- S1: stream ON, cache OFF, chunk ON (stream + chunked, but reset cache each step)
- S2: stream ON, cache ON, chunk OFF (stream append fast-path only)
- S3: stream ON, cache ON, chunk ON (hybrid: chunked allowed and append fast-path)
- S4: stream OFF, chunk ON (full parse with chunked fallback)
- S5: stream OFF, chunk OFF (plain full parse)

Workloads measured per size:
- one-shot: single full parse of the entire document
- append workload: 1 initial parse + 5 append steps (growing to the target size)

Raw results (ms):

- size=5k chars
  - one-shot best: S5 0.65ms
  - append best: S3 0.79ms (S2: 1.28ms)
- size=20k chars
  - one-shot best: S5 0.94ms
  - append best: S2 2.03ms (S3: 2.58ms)
- size=50k chars
  - one-shot best: S5 2.72ms
  - append best: S3 2.57ms (S2: 2.81ms)
- size=100k chars
  - one-shot best: S5 5.25ms
  - append best: S3 6.57ms (S2: 6.91ms)

Append fast-path confirmation: With a stable env object, `appendHits` reached 5 (one per append) for S2/S3 across sizes.

## Conclusions

- One-shot parsing (no appends):
  - For the tested content, plain full parse (S5) was consistently fastest from 5k to 100k chars.
  - Chunked (S4) did not outperform full parse on these inputs. It may help on extremely large or fence/blank-line-heavy documents; tune thresholds if you enable it.

- Append-heavy editing (growing documents):
  - Stream with cache (S2/S3) clearly outperforms non-stream at medium and large sizes.
  - Hybrid (S3) is usually as fast or slightly faster than stream-only (S2) for larger docs (≥ 50k), primarily because it can choose chunked on the initial parse when beneficial.
  - For smaller docs (~5k–20k), stream-only (S2) can be a tiny bit faster than hybrid (S3), depending on thresholds, but both beat non-stream.

## Recommendations

- If you parse once (one-shot):
  - Default to full parse (S5). Enable full-chunked fallback only after testing on your workload; consider starting thresholds at ~20k chars/400 lines.

- If you support live editing with appends:
  - Enable stream mode with cache (S2): `stream: true` and leave `streamChunkedFallback: false`.
  - If initial parses are often large (tens of kB+), enable hybrid (S3): `streamChunkedFallback: true` with chunk size ~10k chars/200 lines.

- Threshold tuning:
  - Start with `streamChunkSizeChars ≈ 10k`, `streamChunkSizeLines ≈ 200`.
  - For full parse chunked fallback, start with `fullChunkThresholdChars ≈ 20k`, `fullChunkThresholdLines ≈ 400`, and chunk size `8k–16k` chars, `150–250` lines.

## How to reproduce

- Build and run the matrix:

```bash
npm run build
node scripts/perf-matrix.mjs
```

- Optional: Sweep non-stream chunked settings on your own content:

```bash
npm run build
node scripts/full-vs-chunked-sweep.mjs
```

These scripts print best-per-size summaries and can export JSON by setting `PERF_JSON=1`.

## Baseline: markdown-it (JS) example

For parity, we include the upstream markdown-it as a baseline in the matrix (scenario M1):

```ts
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt()
const tokens = md.parse('# Title\n\nHello', {})
const html = md.render('# Title\n\nHello')
```

See the latest auto-generated numbers in `docs/perf-latest.md`.

## Regenerate the report in CI

You can refresh `docs/perf-latest.md` on demand via GitHub Actions:

- Go to your repository on GitHub → Actions → “Perf Report” → “Run workflow”.
- Optional inputs:
  - ref: branch/tag/SHA to run against (defaults to current branch)
  - node-version: Node.js version (default 20)
  - package-manager: pnpm or npm (default pnpm)

The workflow will install deps, run `perf:generate`, upload the file as an artifact, and commit/push `docs/perf-latest.md` if it changed.

Chinese version (zh-CN):
- Run “Perf Report (zh-CN)” workflow. It executes `perf:generate:zh` and updates `docs/perf-latest.zh-CN.md` similarly.
