# Performance Report (latest run)

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | S1 append | S2 append | S3 append | S4 append | S5 append | M1 append |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 6.14ms | **0.87ms** | 1.00ms | 1.15ms | 0.96ms | 5.03ms | 3.95ms | 1.04ms | **0.68ms** | 1.32ms | 1.14ms | 2.77ms |
| 20000 | 2.05ms | 0.99ms | **0.98ms** | 1.30ms | 1.90ms | 1.82ms | 5.60ms | **1.28ms** | 3.09ms | 5.04ms | 3.53ms | 4.94ms |
| 50000 | 2.36ms | 2.27ms | 3.21ms | 4.05ms | **2.21ms** | 2.31ms | 14.71ms | **2.41ms** | 2.95ms | 12.88ms | 9.45ms | 9.56ms |
| 100000 | 5.35ms | 5.98ms | 4.43ms | 13.20ms | **4.17ms** | 5.45ms | 19.79ms | 22.14ms | 21.47ms | 23.41ms | 20.08ms | **16.87ms** |

Best (one-shot) per size:
- 5000: S2 0.87ms (stream ON, cache ON, chunk OFF)
- 20000: S3 0.98ms (stream ON, cache ON, chunk ON)
- 50000: S5 2.21ms (stream OFF, chunk OFF)
- 100000: S5 4.17ms (stream OFF, chunk OFF)

Best (append workload) per size:
- 5000: S3 0.68ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.28ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.41ms (stream ON, cache ON, chunk OFF)
- 100000: M1 16.87ms (markdown-it (baseline))

Recommendations (by majority across sizes):
- One-shot: S5(2), S2(1), S3(1)
- Append-heavy: S2(2), S3(1), M1(1)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One ratio | TS best append | Baseline append | Append ratio | TS scenario (one/append) |
|---:|---:|---:|---:|---:|---:|---:|:--|
| 5000 | 0.87ms | 5.03ms | 0.17x | 0.68ms | 2.77ms | 0.25x | S2/S3 |
| 20000 | 0.98ms | 1.82ms | 0.54x | 1.28ms | 4.94ms | 0.26x | S3/S2 |
| 50000 | 2.21ms | 2.31ms | 0.96x | 2.41ms | 9.56ms | 0.25x | S5/S2 |
| 100000 | 4.17ms | 5.45ms | 0.76x | 19.79ms | 16.87ms | 1.17x | S5/S1 |

- One ratio < 1.00 means markdown-it-ts best one-shot is faster than baseline.
- Append ratio < 1.00 highlights stream cache optimizations (fast-path appends).