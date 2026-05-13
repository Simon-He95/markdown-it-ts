# Performance Report (latest run)

## Environment

- Generated at: 2026-05-13T06:32:05.755Z
- Node.js: v23.11.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 39271b755779e1e562e03ef2cf47151d4173b393
- Benchmark version: 5
- Fixture sizes: 5000, 20000, 50000, 100000, 200000, 500000, 1000000 chars
- Append steps: 6

Default API note: normal `md.parse(src)` / `md.render(src)` calls already auto-activate the internal large-input path for very large finite strings. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1899ms | 0.1361ms | 0.1767ms | 0.1729ms | **0.1326ms** | 0.1593ms | 0.2143ms | 3.6605ms | 0.5167ms | 0.2303ms | **0.2008ms** | 0.5031ms | 0.4593ms | 0.5561ms | 0.7134ms | 11.97ms | 1.5418ms | 0.4438ms | **0.3599ms** | 1.4376ms | 1.3422ms | 1.4929ms | 2.0505ms | 34.26ms | 0.1980ms | **0.1382ms** | 0.1834ms | 0.1706ms | 0.1452ms | 0.2011ms | 0.2198ms | 3.8833ms |
| 20000 | 0.7076ms | 0.5421ms | 0.7110ms | 0.7154ms | **0.5419ms** | 0.6432ms | 0.8495ms | 16.23ms | 2.3466ms | **0.8732ms** | 0.8949ms | 2.4013ms | 1.9291ms | 2.1951ms | 2.8945ms | 54.43ms | 6.4838ms | 1.2785ms | **1.2501ms** | 6.5517ms | 5.4050ms | 6.0116ms | 7.9482ms | 151.19ms | 0.7087ms | 0.5513ms | 0.7149ms | 0.7202ms | **0.5460ms** | 0.6495ms | 0.8294ms | 16.72ms |
| 50000 | 2.0063ms | 1.5333ms | 1.8806ms | 1.8962ms | **1.4856ms** | 1.6591ms | 2.2211ms | 57.19ms | 6.2303ms | 1.9605ms | **1.9555ms** | 6.4042ms | 4.9588ms | 5.5682ms | 7.2642ms | 158.35ms | 16.77ms | 2.8767ms | **2.7988ms** | 36.66ms | 13.20ms | 15.06ms | 19.76ms | 417.66ms | 1.7975ms | 1.4196ms | 1.8009ms | 2.0043ms | **1.3500ms** | 1.6706ms | 2.1066ms | 46.71ms |
| 100000 | 4.5237ms | 3.3716ms | 4.5348ms | 4.5812ms | **3.3567ms** | 4.3260ms | 5.7748ms | 91.21ms | 13.76ms | **4.2550ms** | 4.5406ms | 13.28ms | 11.48ms | 11.31ms | 14.53ms | 318.54ms | 35.10ms | 6.9404ms | **5.7772ms** | 35.26ms | 29.10ms | 30.18ms | 40.42ms | 902.71ms | 3.8345ms | 3.2672ms | 3.6871ms | 3.8101ms | **3.1511ms** | 3.4320ms | 4.8438ms | 93.15ms |
| 200000 | 10.26ms | **9.3571ms** | 9.7473ms | 10.18ms | 10.05ms | 10.28ms | 11.94ms | 182.37ms | 29.02ms | **9.6781ms** | 10.49ms | 29.18ms | 26.54ms | 25.23ms | 33.04ms | 664.94ms | 73.03ms | **12.34ms** | 20.27ms | 76.91ms | 75.42ms | 73.31ms | 90.66ms | 1771.58ms | 7.7176ms | 8.7847ms | 7.7288ms | 7.5701ms | 7.7547ms | **6.9670ms** | 11.28ms | 177.14ms |
| 500000 | 24.49ms | **21.90ms** | 24.19ms | 24.69ms | 24.71ms | 29.14ms | 33.49ms | - | 81.88ms | 33.72ms | **32.25ms** | 87.86ms | 84.50ms | 79.07ms | 104.20ms | - | 236.46ms | **49.55ms** | 55.03ms | 230.67ms | 240.44ms | 234.01ms | 290.78ms | - | 27.08ms | **21.77ms** | 24.13ms | 24.91ms | 27.15ms | 25.05ms | 29.55ms | - |
| 1000000 | 53.44ms | 52.80ms | 51.96ms | 51.02ms | **50.51ms** | 63.93ms | 66.93ms | - | 171.61ms | **62.82ms** | 66.47ms | 187.67ms | 196.27ms | 206.54ms | 210.26ms | - | 491.67ms | 99.14ms | **98.23ms** | 495.89ms | 473.84ms | 489.82ms | 631.66ms | - | 62.82ms | 52.31ms | 53.74ms | **49.38ms** | 60.77ms | 53.24ms | 73.04ms | - |

Best (one-shot) per size:
- 5000: S5 0.1326ms (stream OFF, chunk OFF)
- 20000: S5 0.5419ms (stream OFF, chunk OFF)
- 50000: S5 1.4856ms (stream OFF, chunk OFF)
- 100000: S5 3.3567ms (stream OFF, chunk OFF)
- 200000: S2 9.3571ms (stream ON, cache ON, chunk OFF)
- 500000: S2 21.90ms (stream ON, cache ON, chunk OFF)
- 1000000: S5 50.51ms (stream OFF, chunk OFF)

Best (append workload) per size:
- 5000: S3 0.2008ms (stream ON, cache ON, chunk ON)
- 20000: S2 0.8732ms (stream ON, cache ON, chunk OFF)
- 50000: S3 1.9555ms (stream ON, cache ON, chunk ON)
- 100000: S2 4.2550ms (stream ON, cache ON, chunk OFF)
- 200000: S2 9.6781ms (stream ON, cache ON, chunk OFF)
- 500000: S3 32.25ms (stream ON, cache ON, chunk ON)
- 1000000: S2 62.82ms (stream ON, cache ON, chunk OFF)

Best (line-append workload) per size:
- 5000: S3 0.3599ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.2501ms (stream ON, cache ON, chunk ON)
- 50000: S3 2.7988ms (stream ON, cache ON, chunk ON)
- 100000: S3 5.7772ms (stream ON, cache ON, chunk ON)
- 200000: S2 12.34ms (stream ON, cache ON, chunk OFF)
- 500000: S2 49.55ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 98.23ms (stream ON, cache ON, chunk ON)

Best (replace-paragraph workload) per size:
- 5000: S2 0.1382ms (stream ON, cache ON, chunk OFF)
- 20000: S5 0.5460ms (stream OFF, chunk OFF)
- 50000: S5 1.3500ms (stream OFF, chunk OFF)
- 100000: S5 3.1511ms (stream OFF, chunk OFF)
- 200000: M1 6.9670ms (markdown-it (baseline))
- 500000: S2 21.77ms (stream ON, cache ON, chunk OFF)
- 1000000: S4 49.38ms (stream OFF, chunk ON)

Recommendations (by majority across sizes):
- One-shot: S5(5), S2(2)
- Append-heavy: S2(4), S3(3)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1513ms | 0.1963ms | 3.5751ms | 4.2458ms | 0.2482ms |
| 20000 | 0.6285ms | 0.7877ms | 20.34ms | 24.75ms | 1.0065ms |
| 50000 | 1.6457ms | 2.0336ms | 53.35ms | 71.54ms | 2.6105ms |
| 100000 | 4.5657ms | 5.3650ms | 107.96ms | 152.30ms | 6.6011ms |
| 200000 | 11.32ms | 12.97ms | 210.17ms | 369.63ms | 15.37ms |
| 500000 | 31.81ms | 41.78ms | - | - | 43.36ms |
| 1000000 | 64.77ms | 64.91ms | - | - | 86.38ms |

Render vs markdown-it:
- 5,000 chars: 0.1513ms vs 0.1963ms → 1.30× faster
- 20,000 chars: 0.6285ms vs 0.7877ms → 1.25× faster
- 50,000 chars: 1.6457ms vs 2.0336ms → 1.24× faster
- 100,000 chars: 4.5657ms vs 5.3650ms → 1.18× faster
- 200,000 chars: 11.32ms vs 12.97ms → 1.15× faster
- 500,000 chars: 31.81ms vs 41.78ms → 1.31× faster
- 1,000,000 chars: 64.77ms vs 64.91ms → 1.00× faster

Render vs micromark:
- 5,000 chars: 0.1513ms vs 3.5751ms → 23.63× faster
- 20,000 chars: 0.6285ms vs 20.34ms → 32.37× faster
- 50,000 chars: 1.6457ms vs 53.35ms → 32.41× faster
- 100,000 chars: 4.5657ms vs 107.96ms → 23.65× faster
- 200,000 chars: 11.32ms vs 210.17ms → 18.56× faster

Render vs remark+rehype:
- 5,000 chars: 0.1513ms vs 4.2458ms → 28.06× faster
- 20,000 chars: 0.6285ms vs 24.75ms → 39.38× faster
- 50,000 chars: 1.6457ms vs 71.54ms → 43.47× faster
- 100,000 chars: 4.5657ms vs 152.30ms → 33.36× faster
- 200,000 chars: 11.32ms vs 369.63ms → 32.64× faster

Render vs markdown-exit:
- 5,000 chars: 0.1513ms vs 0.2482ms → 1.64× faster
- 20,000 chars: 0.6285ms vs 1.0065ms → 1.60× faster
- 50,000 chars: 1.6457ms vs 2.6105ms → 1.59× faster
- 100,000 chars: 4.5657ms vs 6.6011ms → 1.45× faster
- 200,000 chars: 11.32ms vs 15.37ms → 1.36× faster
- 500,000 chars: 31.81ms vs 43.36ms → 1.36× faster
- 1,000,000 chars: 64.77ms vs 86.38ms → 1.33× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1326ms | 0.1593ms | 1.2× faster, 16.8% less time | 0.2008ms | 0.5561ms | 2.77× faster, 63.9% less time | S5/S3 |
| 20000 | 0.5419ms | 0.6432ms | 1.19× faster, 15.7% less time | 0.8732ms | 2.1951ms | 2.51× faster, 60.2% less time | S5/S2 |
| 50000 | 1.4856ms | 1.6591ms | 1.12× faster, 10.5% less time | 1.9555ms | 5.5682ms | 2.85× faster, 64.9% less time | S5/S3 |
| 100000 | 3.3567ms | 4.3260ms | 1.29× faster, 22.4% less time | 4.2550ms | 11.31ms | 2.66× faster, 62.4% less time | S5/S2 |
| 200000 | 9.3571ms | 10.28ms | 1.1× faster, 9% less time | 9.6781ms | 25.23ms | 2.61× faster, 61.6% less time | S2/S2 |
| 500000 | 21.90ms | 29.14ms | 1.33× faster, 24.9% less time | 32.25ms | 79.07ms | 2.45× faster, 59.2% less time | S2/S3 |
| 1000000 | 50.51ms | 63.93ms | 1.27× faster, 21% less time | 62.82ms | 206.54ms | 3.29× faster, 69.6% less time | S5/S2 |

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
| markdown-exit | 0.2342ms | 0.2005ms |
| markdown-it (baseline) | 0.1828ms | 0.1528ms |
| markdown-it-ts (stream+chunk) | 0.1957ms | 0.1705ms |
| micromark (parse only) | 4.0426ms | 3.7643ms |
| remark (parse only) | 4.0322ms | 3.9581ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.8570ms | 0.8761ms |
| markdown-it (baseline) | 0.6318ms | 0.6653ms |
| markdown-it-ts (stream+chunk) | 0.6958ms | 0.7407ms |
| micromark (parse only) | 15.80ms | 17.49ms |
| remark (parse only) | 24.36ms | 22.75ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 2.0138ms | 2.2428ms |
| markdown-it (baseline) | 1.5391ms | 1.6891ms |
| markdown-it-ts (stream+chunk) | 1.7434ms | 1.8966ms |
| micromark (parse only) | 50.67ms | 46.10ms |
| remark (parse only) | 62.93ms | 61.21ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 4.9867ms | 5.6990ms |
| markdown-it (baseline) | 4.2433ms | 4.2760ms |
| markdown-it-ts (stream+chunk) | 3.4838ms | 4.3475ms |
| micromark (parse only) | 96.72ms | 89.05ms |
| remark (parse only) | 136.71ms | 138.47ms |
