# Performance Report (latest run)

## Environment

- Generated at: 2026-05-13T07:57:30.661Z
- Node.js: v23.11.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: af0ebf30a5fe6757bb2b52e610bd4883c58a6510
- Benchmark version: 5
- Fixture sizes: 5000, 20000, 50000, 100000, 200000, 500000, 1000000 chars
- Append steps: 6

Default API note: normal `md.parse(src)` / `md.render(src)` calls already auto-activate the internal large-input path for very large finite strings. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1902ms | 0.1391ms | 0.1829ms | 0.1838ms | **0.1356ms** | 0.1637ms | 0.2193ms | 3.7551ms | 0.5437ms | 0.2684ms | **0.2083ms** | 0.5247ms | 0.4411ms | 0.5241ms | 0.7089ms | 12.38ms | 1.6237ms | 0.5127ms | **0.4050ms** | 1.6542ms | 1.3226ms | 1.9355ms | 2.0818ms | 35.14ms | 0.2919ms | **0.1425ms** | 0.1809ms | 0.1716ms | 0.1525ms | 0.1969ms | 0.2537ms | 4.0437ms |
| 20000 | 0.7311ms | 0.5454ms | 0.7142ms | 0.7201ms | **0.5434ms** | 0.6625ms | 0.8749ms | 16.69ms | 2.4104ms | **0.8516ms** | 0.9044ms | 2.3421ms | 1.9136ms | 2.2893ms | 3.0009ms | 55.37ms | 6.5362ms | **1.2624ms** | 1.4025ms | 6.5097ms | 5.3912ms | 6.2021ms | 8.1031ms | 150.63ms | 0.7406ms | 0.5568ms | 0.7001ms | 0.7584ms | **0.5559ms** | 0.6486ms | 0.9096ms | 16.61ms |
| 50000 | 1.8980ms | 1.4640ms | 1.9363ms | 1.9254ms | **1.4507ms** | 1.7035ms | 2.2569ms | 45.50ms | 6.2288ms | 1.9891ms | **1.9561ms** | 6.2028ms | 5.0356ms | 5.5807ms | 7.3525ms | 155.73ms | 16.99ms | **2.8217ms** | 2.9831ms | 16.89ms | 13.25ms | 15.31ms | 20.21ms | 413.84ms | 1.8616ms | 1.5363ms | 1.8584ms | 1.7392ms | **1.3601ms** | 1.6715ms | 2.1407ms | 45.72ms |
| 100000 | 4.3762ms | 3.7097ms | 4.7758ms | 4.7113ms | **3.5010ms** | 4.7137ms | 5.5895ms | 95.45ms | 13.43ms | 4.5512ms | **4.4115ms** | 13.74ms | 12.11ms | 11.51ms | 14.80ms | 322.10ms | 40.17ms | **6.0644ms** | 7.0077ms | 35.75ms | 29.91ms | 31.09ms | 41.53ms | 887.70ms | 3.6419ms | 3.8144ms | 3.6724ms | 3.7313ms | 4.7311ms | **3.6052ms** | 4.6852ms | 89.31ms |
| 200000 | 9.9225ms | 9.2127ms | 10.00ms | 9.7273ms | 9.6402ms | **9.1926ms** | 11.89ms | 185.31ms | 28.08ms | **9.2319ms** | 9.9629ms | 28.67ms | 28.92ms | 24.38ms | 36.05ms | 644.27ms | 72.00ms | **12.59ms** | 19.35ms | 72.04ms | 70.78ms | 71.31ms | 88.12ms | 1710.83ms | 7.5372ms | 8.2095ms | 7.8590ms | 7.3907ms | 7.3855ms | **6.9251ms** | 9.4100ms | 180.50ms |
| 500000 | 25.72ms | **22.81ms** | 24.49ms | 26.11ms | 26.18ms | 26.09ms | 30.12ms | - | 81.05ms | 36.78ms | **32.15ms** | 83.99ms | 87.72ms | 96.00ms | 114.52ms | - | 229.92ms | 46.41ms | **46.12ms** | 224.13ms | 229.11ms | 225.40ms | 277.35ms | - | **23.50ms** | 27.34ms | 27.28ms | 23.94ms | 25.03ms | 23.72ms | 33.54ms | - |
| 1000000 | 50.70ms | 55.03ms | 50.78ms | **48.61ms** | 48.78ms | 50.75ms | 62.55ms | - | 181.05ms | **64.68ms** | 80.28ms | 164.91ms | 180.90ms | 170.55ms | 228.32ms | - | 484.75ms | 96.14ms | **96.10ms** | 480.49ms | 481.54ms | 516.63ms | 594.49ms | - | 55.65ms | 51.25ms | 51.99ms | 47.71ms | **47.61ms** | 52.30ms | 74.53ms | - |

Best (one-shot) per size:
- 5000: S5 0.1356ms (stream OFF, chunk OFF)
- 20000: S5 0.5434ms (stream OFF, chunk OFF)
- 50000: S5 1.4507ms (stream OFF, chunk OFF)
- 100000: S5 3.5010ms (stream OFF, chunk OFF)
- 200000: M1 9.1926ms (markdown-it (baseline))
- 500000: S2 22.81ms (stream ON, cache ON, chunk OFF)
- 1000000: S4 48.61ms (stream OFF, chunk ON)

Best (append workload) per size:
- 5000: S3 0.2083ms (stream ON, cache ON, chunk ON)
- 20000: S2 0.8516ms (stream ON, cache ON, chunk OFF)
- 50000: S3 1.9561ms (stream ON, cache ON, chunk ON)
- 100000: S3 4.4115ms (stream ON, cache ON, chunk ON)
- 200000: S2 9.2319ms (stream ON, cache ON, chunk OFF)
- 500000: S3 32.15ms (stream ON, cache ON, chunk ON)
- 1000000: S2 64.68ms (stream ON, cache ON, chunk OFF)

Best (line-append workload) per size:
- 5000: S3 0.4050ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.2624ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.8217ms (stream ON, cache ON, chunk OFF)
- 100000: S2 6.0644ms (stream ON, cache ON, chunk OFF)
- 200000: S2 12.59ms (stream ON, cache ON, chunk OFF)
- 500000: S3 46.12ms (stream ON, cache ON, chunk ON)
- 1000000: S3 96.10ms (stream ON, cache ON, chunk ON)

Best (replace-paragraph workload) per size:
- 5000: S2 0.1425ms (stream ON, cache ON, chunk OFF)
- 20000: S5 0.5559ms (stream OFF, chunk OFF)
- 50000: S5 1.3601ms (stream OFF, chunk OFF)
- 100000: M1 3.6052ms (markdown-it (baseline))
- 200000: M1 6.9251ms (markdown-it (baseline))
- 500000: S1 23.50ms (stream ON, cache OFF, chunk ON)
- 1000000: S5 47.61ms (stream OFF, chunk OFF)

Recommendations (by majority across sizes):
- One-shot: S5(4), M1(1), S2(1), S4(1)
- Append-heavy: S3(4), S2(3)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1549ms | 0.1964ms | 3.6566ms | 4.2916ms | 0.2501ms |
| 20000 | 0.6196ms | 0.7901ms | 20.70ms | 24.24ms | 1.0006ms |
| 50000 | 1.7084ms | 2.0123ms | 52.75ms | 70.39ms | 3.0773ms |
| 100000 | 4.5377ms | 5.1197ms | 107.58ms | 154.07ms | 6.5252ms |
| 200000 | 10.58ms | 12.70ms | 204.89ms | 411.78ms | 15.02ms |
| 500000 | 30.98ms | 35.11ms | - | - | 41.82ms |
| 1000000 | 63.40ms | 66.13ms | - | - | 82.41ms |

Render vs markdown-it:
- 5,000 chars: 0.1549ms vs 0.1964ms → 1.27× faster
- 20,000 chars: 0.6196ms vs 0.7901ms → 1.28× faster
- 50,000 chars: 1.7084ms vs 2.0123ms → 1.18× faster
- 100,000 chars: 4.5377ms vs 5.1197ms → 1.13× faster
- 200,000 chars: 10.58ms vs 12.70ms → 1.20× faster
- 500,000 chars: 30.98ms vs 35.11ms → 1.13× faster
- 1,000,000 chars: 63.40ms vs 66.13ms → 1.04× faster

Render vs micromark:
- 5,000 chars: 0.1549ms vs 3.6566ms → 23.61× faster
- 20,000 chars: 0.6196ms vs 20.70ms → 33.41× faster
- 50,000 chars: 1.7084ms vs 52.75ms → 30.88× faster
- 100,000 chars: 4.5377ms vs 107.58ms → 23.71× faster
- 200,000 chars: 10.58ms vs 204.89ms → 19.37× faster

Render vs remark+rehype:
- 5,000 chars: 0.1549ms vs 4.2916ms → 27.71× faster
- 20,000 chars: 0.6196ms vs 24.24ms → 39.12× faster
- 50,000 chars: 1.7084ms vs 70.39ms → 41.20× faster
- 100,000 chars: 4.5377ms vs 154.07ms → 33.95× faster
- 200,000 chars: 10.58ms vs 411.78ms → 38.92× faster

Render vs markdown-exit:
- 5,000 chars: 0.1549ms vs 0.2501ms → 1.61× faster
- 20,000 chars: 0.6196ms vs 1.0006ms → 1.61× faster
- 50,000 chars: 1.7084ms vs 3.0773ms → 1.80× faster
- 100,000 chars: 4.5377ms vs 6.5252ms → 1.44× faster
- 200,000 chars: 10.58ms vs 15.02ms → 1.42× faster
- 500,000 chars: 30.98ms vs 41.82ms → 1.35× faster
- 1,000,000 chars: 63.40ms vs 82.41ms → 1.30× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1356ms | 0.1637ms | 1.21× faster, 17.2% less time | 0.2083ms | 0.5241ms | 2.52× faster, 60.3% less time | S5/S3 |
| 20000 | 0.5434ms | 0.6625ms | 1.22× faster, 18% less time | 0.8516ms | 2.2893ms | 2.69× faster, 62.8% less time | S5/S2 |
| 50000 | 1.4507ms | 1.7035ms | 1.17× faster, 14.8% less time | 1.9561ms | 5.5807ms | 2.85× faster, 64.9% less time | S5/S3 |
| 100000 | 3.5010ms | 4.7137ms | 1.35× faster, 25.7% less time | 4.4115ms | 11.51ms | 2.61× faster, 61.7% less time | S5/S3 |
| 200000 | 9.2127ms | 9.1926ms | 1× slower, 0.2% more time | 9.2319ms | 24.38ms | 2.64× faster, 62.1% less time | S2/S2 |
| 500000 | 22.81ms | 26.09ms | 1.14× faster, 12.6% less time | 32.15ms | 96.00ms | 2.99× faster, 66.5% less time | S2/S3 |
| 1000000 | 48.61ms | 50.75ms | 1.04× faster, 4.2% less time | 64.68ms | 170.55ms | 2.64× faster, 62.1% less time | S4/S2 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.


### Diagnostic: Chunk Info (if chunked)

| Size (chars) | S1 one chunks | S3 one chunks | S4 one chunks | S1 append last | S3 append last | S4 append last |
|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 4 | 4 | 4 | 4 | 4 | 4 |
| 20000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 50000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 100000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 200000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 500000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 1000000 | 15 | 8 | 16 | 15 | 8 | 16 |

## Cold vs Hot (one-shot)

Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs. 表格按不同文档大小分别列出 markdown-it 与 remark 对照。

#### 5,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.2248ms | 0.1974ms |
| markdown-it (baseline) | 0.1601ms | 0.1506ms |
| markdown-it-ts (stream+chunk) | 0.1762ms | 0.1606ms |
| micromark (parse only) | 6.2727ms | 11.41ms |
| remark (parse only) | 13.10ms | 7.1917ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.8004ms | 0.9157ms |
| markdown-it (baseline) | 0.6276ms | 0.6754ms |
| markdown-it-ts (stream+chunk) | 0.7313ms | 0.7396ms |
| micromark (parse only) | 17.29ms | 19.01ms |
| remark (parse only) | 23.62ms | 23.01ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 2.4784ms | 2.2241ms |
| markdown-it (baseline) | 1.5010ms | 1.7249ms |
| markdown-it-ts (stream+chunk) | 1.7292ms | 1.9509ms |
| micromark (parse only) | 46.65ms | 46.15ms |
| remark (parse only) | 57.37ms | 61.58ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 4.9949ms | 5.2932ms |
| markdown-it (baseline) | 4.1013ms | 4.2258ms |
| markdown-it-ts (stream+chunk) | 4.0409ms | 4.4787ms |
| micromark (parse only) | 95.31ms | 87.04ms |
| remark (parse only) | 132.63ms | 138.43ms |
