# Best-of markdown-it-ts vs markdown-it (baseline)

Date: 2025-11-06

This page mirrors the best-of comparison from the latest performance run.
For full details and raw scenario matrix, see `docs/perf-latest.md`.

## Summary table (mirrored)

| Size (chars) | TS best one | Baseline one | One ratio | TS best append | Baseline append | Append ratio | TS scenario (one/append) |
|---:|---:|---:|---:|---:|---:|---:|:--|
| 5000 | 0.87ms | 5.03ms | 0.17x | 0.68ms | 2.77ms | 0.25x | S2/S3 |
| 20000 | 0.98ms | 1.82ms | 0.54x | 1.28ms | 4.94ms | 0.26x | S3/S2 |
| 50000 | 2.21ms | 2.31ms | 0.96x | 2.41ms | 9.56ms | 0.25x | S5/S2 |
| 100000 | 4.17ms | 5.45ms | 0.76x | 19.79ms | 16.87ms | 1.17x | S5/S1 |

Notes:
- One ratio < 1.00 means markdown-it-ts best one-shot is faster than baseline.
- Append ratio < 1.00 highlights stream cache optimizations (fast-path appends).

## Regenerate

- Locally:
  - `npm run perf:generate`
- In CI (on-demand):
  - GitHub → Actions → “Perf Report” → “Run workflow”
  - Optional inputs: ref / Node version / package manager (pnpm or npm)

This page reflects the latest committed results. For fresher numbers, run the generator and commit.
