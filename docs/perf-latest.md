# Performance Report (latest run)

Default API note: normal `md.parse(src)` / `md.render(src)` calls already auto-activate the internal large-input path for very large finite strings. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2097ms | 0.1568ms | 0.1935ms | 0.2205ms | **0.1471ms** | 0.2034ms | 0.3071ms | 4.4509ms | 0.5996ms | 0.2751ms | **0.2409ms** | 0.5562ms | 0.5112ms | 0.6655ms | 0.9324ms | 14.69ms | 1.7568ms | 0.5976ms | **0.4758ms** | 1.6484ms | 1.5037ms | 1.9284ms | 2.5737ms | 41.16ms | 0.2769ms | 0.1682ms | 0.1952ms | 0.2028ms | **0.1595ms** | 0.2499ms | 0.3462ms | 4.9037ms |
| 20000 | 0.7977ms | 0.6300ms | 0.7940ms | 0.7974ms | **0.5930ms** | 0.8246ms | 1.0877ms | 20.23ms | 2.6846ms | **0.9957ms** | 1.0219ms | 2.6693ms | 2.1468ms | 2.7878ms | 3.7008ms | 68.93ms | 7.3294ms | 1.5464ms | **1.4563ms** | 7.3432ms | 5.9061ms | 7.6919ms | 10.23ms | 189.30ms | 0.7946ms | **0.5862ms** | 0.7599ms | 0.7798ms | 0.6203ms | 0.8885ms | 1.1075ms | 19.97ms |
| 50000 | 2.1256ms | 1.9680ms | 2.1288ms | 2.1262ms | **1.7063ms** | 2.1055ms | 2.8400ms | 54.36ms | 7.0697ms | **2.3140ms** | 2.3618ms | 6.9105ms | 5.6194ms | 7.0409ms | 9.2673ms | 186.11ms | 18.76ms | 3.3822ms | **3.3175ms** | 18.60ms | 14.87ms | 19.32ms | 25.40ms | 504.34ms | 2.0436ms | 1.6127ms | 2.0501ms | 2.0868ms | **1.5789ms** | 2.1150ms | 2.8008ms | 55.40ms |
| 100000 | 5.0572ms | **3.8636ms** | 5.0895ms | 5.2081ms | 3.9325ms | 5.5301ms | 6.9174ms | 111.04ms | 15.47ms | **4.7039ms** | 4.8318ms | 15.28ms | 13.45ms | 14.48ms | 18.71ms | 380.15ms | 39.56ms | 6.8215ms | **6.8025ms** | 39.33ms | 33.60ms | 38.92ms | 52.64ms | 1049.39ms | 4.1697ms | 4.7385ms | 4.0718ms | 4.1507ms | **3.9084ms** | 4.4019ms | 5.9918ms | 110.32ms |
| 200000 | 10.14ms | **10.05ms** | 11.20ms | 11.21ms | 10.12ms | 11.89ms | 14.73ms | 223.53ms | 31.08ms | **9.8913ms** | 12.37ms | 32.08ms | 33.50ms | 31.49ms | 45.13ms | 794.60ms | 87.83ms | **17.87ms** | 21.90ms | 81.73ms | 89.12ms | 88.76ms | 113.73ms | 2141.18ms | 10.75ms | 8.8111ms | 8.9437ms | **8.3517ms** | 9.2014ms | 8.5274ms | 11.07ms | 223.93ms |
| 500000 | 31.17ms | **25.49ms** | 25.55ms | 28.72ms | 26.84ms | 32.98ms | 37.70ms | - | 90.88ms | **36.99ms** | 37.11ms | 98.56ms | 87.56ms | 120.61ms | 138.50ms | - | 258.97ms | 65.55ms | **57.67ms** | 262.63ms | 257.93ms | 293.90ms | 357.28ms | - | 24.91ms | **24.30ms** | 29.61ms | 28.42ms | 25.80ms | 34.52ms | 40.40ms | - |
| 1000000 | 64.79ms | 60.37ms | 59.27ms | **55.19ms** | 61.08ms | 62.52ms | 90.41ms | - | **196.34ms** | 201.87ms | 209.37ms | 197.76ms | 212.54ms | 245.98ms | 283.00ms | - | 565.09ms | **120.90ms** | 131.30ms | 553.44ms | 563.49ms | 616.22ms | 748.72ms | - | 66.35ms | 67.56ms | **59.61ms** | 74.05ms | 62.89ms | 61.89ms | 73.98ms | - |

Best (one-shot) per size:
- 5000: S5 0.1471ms (stream OFF, chunk OFF)
- 20000: S5 0.5930ms (stream OFF, chunk OFF)
- 50000: S5 1.7063ms (stream OFF, chunk OFF)
- 100000: S2 3.8636ms (stream ON, cache ON, chunk OFF)
- 200000: S2 10.05ms (stream ON, cache ON, chunk OFF)
- 500000: S2 25.49ms (stream ON, cache ON, chunk OFF)
- 1000000: S4 55.19ms (stream OFF, chunk ON)

Best (append workload) per size:
- 5000: S3 0.2409ms (stream ON, cache ON, chunk ON)
- 20000: S2 0.9957ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.3140ms (stream ON, cache ON, chunk OFF)
- 100000: S2 4.7039ms (stream ON, cache ON, chunk OFF)
- 200000: S2 9.8913ms (stream ON, cache ON, chunk OFF)
- 500000: S2 36.99ms (stream ON, cache ON, chunk OFF)
- 1000000: S1 196.34ms (stream ON, cache OFF, chunk ON)

Best (line-append workload) per size:
- 5000: S3 0.4758ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.4563ms (stream ON, cache ON, chunk ON)
- 50000: S3 3.3175ms (stream ON, cache ON, chunk ON)
- 100000: S3 6.8025ms (stream ON, cache ON, chunk ON)
- 200000: S2 17.87ms (stream ON, cache ON, chunk OFF)
- 500000: S3 57.67ms (stream ON, cache ON, chunk ON)
- 1000000: S2 120.90ms (stream ON, cache ON, chunk OFF)

Best (replace-paragraph workload) per size:
- 5000: S5 0.1595ms (stream OFF, chunk OFF)
- 20000: S2 0.5862ms (stream ON, cache ON, chunk OFF)
- 50000: S5 1.5789ms (stream OFF, chunk OFF)
- 100000: S5 3.9084ms (stream OFF, chunk OFF)
- 200000: S4 8.3517ms (stream OFF, chunk ON)
- 500000: S2 24.30ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 59.61ms (stream ON, cache ON, chunk ON)

Recommendations (by majority across sizes):
- One-shot: S5(3), S2(3), S4(1)
- Append-heavy: S2(5), S3(1), S1(1)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1731ms | 0.2477ms | 5.4900ms | 6.5904ms | 0.3167ms |
| 20000 | 0.6912ms | 1.0030ms | 24.88ms | 30.20ms | 1.2681ms |
| 50000 | 1.8822ms | 2.5533ms | 67.11ms | 89.19ms | 3.3118ms |
| 100000 | 5.2051ms | 6.6655ms | 133.60ms | 191.28ms | 8.1449ms |
| 200000 | 11.99ms | 16.10ms | 263.08ms | 517.24ms | 19.25ms |
| 500000 | 32.92ms | 45.63ms | - | - | 51.00ms |
| 1000000 | 77.49ms | 90.37ms | - | - | 102.97ms |

Render vs markdown-it:
- 5,000 chars: 0.1731ms vs 0.2477ms → 1.43× faster
- 20,000 chars: 0.6912ms vs 1.0030ms → 1.45× faster
- 50,000 chars: 1.8822ms vs 2.5533ms → 1.36× faster
- 100,000 chars: 5.2051ms vs 6.6655ms → 1.28× faster
- 200,000 chars: 11.99ms vs 16.10ms → 1.34× faster
- 500,000 chars: 32.92ms vs 45.63ms → 1.39× faster
- 1,000,000 chars: 77.49ms vs 90.37ms → 1.17× faster

Render vs micromark:
- 5,000 chars: 0.1731ms vs 5.4900ms → 31.71× faster
- 20,000 chars: 0.6912ms vs 24.88ms → 36.00× faster
- 50,000 chars: 1.8822ms vs 67.11ms → 35.66× faster
- 100,000 chars: 5.2051ms vs 133.60ms → 25.67× faster
- 200,000 chars: 11.99ms vs 263.08ms → 21.94× faster

Render vs remark+rehype:
- 5,000 chars: 0.1731ms vs 6.5904ms → 38.07× faster
- 20,000 chars: 0.6912ms vs 30.20ms → 43.69× faster
- 50,000 chars: 1.8822ms vs 89.19ms → 47.39× faster
- 100,000 chars: 5.2051ms vs 191.28ms → 36.75× faster
- 200,000 chars: 11.99ms vs 517.24ms → 43.13× faster

Render vs markdown-exit:
- 5,000 chars: 0.1731ms vs 0.3167ms → 1.83× faster
- 20,000 chars: 0.6912ms vs 1.2681ms → 1.83× faster
- 50,000 chars: 1.8822ms vs 3.3118ms → 1.76× faster
- 100,000 chars: 5.2051ms vs 8.1449ms → 1.56× faster
- 200,000 chars: 11.99ms vs 19.25ms → 1.61× faster
- 500,000 chars: 32.92ms vs 51.00ms → 1.55× faster
- 1,000,000 chars: 77.49ms vs 102.97ms → 1.33× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1471ms | 0.2034ms | 1.38× faster, 27.7% less time | 0.2409ms | 0.6655ms | 2.76× faster, 63.8% less time | S5/S3 |
| 20000 | 0.5930ms | 0.8246ms | 1.39× faster, 28.1% less time | 0.9957ms | 2.7878ms | 2.8× faster, 64.3% less time | S5/S2 |
| 50000 | 1.7063ms | 2.1055ms | 1.23× faster, 19% less time | 2.3140ms | 7.0409ms | 3.04× faster, 67.1% less time | S5/S2 |
| 100000 | 3.8636ms | 5.5301ms | 1.43× faster, 30.1% less time | 4.7039ms | 14.48ms | 3.08× faster, 67.5% less time | S2/S2 |
| 200000 | 10.05ms | 11.89ms | 1.18× faster, 15.4% less time | 9.8913ms | 31.49ms | 3.18× faster, 68.6% less time | S2/S2 |
| 500000 | 25.49ms | 32.98ms | 1.29× faster, 22.7% less time | 36.99ms | 120.61ms | 3.26× faster, 69.3% less time | S2/S2 |
| 1000000 | 55.19ms | 62.52ms | 1.13× faster, 11.7% less time | 196.34ms | 245.98ms | 1.25× faster, 20.2% less time | S4/S1 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.


### Diagnostic: Chunk Info (if chunked)

| Size (chars) | S1 one chunks | S3 one chunks | S4 one chunks | S1 append last | S3 append last | S4 append last |
|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 4 | 4 | 4 | 4 | 4 | 4 |
| 20000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 50000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 100000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 200000 | 8 | 7 | 8 | 8 | 7 | 8 |
| 500000 | 8 | 8 | 8 | 8 | 8 | 8 |
| 1000000 | 8 | 8 | 16 | 8 | 8 | 16 |

## Cold vs Hot (one-shot)

Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs. 表格按不同文档大小分别列出 markdown-it 与 remark 对照。

#### 5,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.3168ms | 0.2594ms |
| markdown-it (baseline) | 0.2829ms | 0.3405ms |
| markdown-it-ts (stream+chunk) | 0.3366ms | 0.1838ms |
| micromark (parse only) | 7.4547ms | 5.0155ms |
| remark (parse only) | 7.3566ms | 6.0000ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 1.0530ms | 1.1169ms |
| markdown-it (baseline) | 0.8022ms | 0.8259ms |
| markdown-it-ts (stream+chunk) | 0.7861ms | 0.8236ms |
| micromark (parse only) | 20.41ms | 20.78ms |
| remark (parse only) | 29.96ms | 29.37ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 4.2285ms | 2.8890ms |
| markdown-it (baseline) | 1.9159ms | 2.1823ms |
| markdown-it-ts (stream+chunk) | 1.9351ms | 2.1381ms |
| micromark (parse only) | 52.41ms | 57.37ms |
| remark (parse only) | 82.19ms | 78.66ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 5.9489ms | 6.4810ms |
| markdown-it (baseline) | 6.2251ms | 5.2025ms |
| markdown-it-ts (stream+chunk) | 3.9364ms | 4.9426ms |
| micromark (parse only) | 132.23ms | 107.93ms |
| remark (parse only) | 179.11ms | 170.15ms |
