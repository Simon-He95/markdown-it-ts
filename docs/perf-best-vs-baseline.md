# Best-of markdown-it-ts vs markdown-it (baseline)

Date: 2025-11-06

This page mirrors the best-of comparison from the latest performance run.
For full details and raw scenario matrix, see `docs/perf-latest.md`.

## Summary table (mirrored)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.70ms | 5.47ms | 7.81× faster, 87.2% less time | 0.73ms | 2.71ms | 3.71× faster, 73.1% less time | S4/S3 |
| 20000 | 1.10ms | 1.82ms | 1.65× faster, 39.6% less time | 1.26ms | 4.77ms | 3.79× faster, 73.6% less time | S5/S3 |
| 50000 | 2.50ms | 3.61ms | 1.44× faster, 30.7% less time | 2.48ms | 10.09ms | 4.07× faster, 75.4% less time | S2/S2 |
| 100000 | 5.50ms | 5.73ms | 1.04× faster, 4.0% less time | 18.68ms | 17.24ms | 1.08× slower, 8.4% more time | S5/S5 |

Notes:
- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a row regresses, the wording flips to `slower / more time`.

## Regenerate

- Locally:
  - `npm run perf:generate`
- In CI (on-demand):
  - GitHub → Actions → “Perf Report” → “Run workflow”
  - Optional inputs: ref / Node version / package manager (pnpm or npm)

This page reflects the latest committed results. For fresher numbers, run the generator and commit.
