# Performance Report (latest run)

## Environment

- Generated at: 2026-06-10T17:13:30.681Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: e8032f82fb1e37104a9ab8c1de76461d7f9ea3b2

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2509ms | 0.2035ms | 0.2402ms | 0.2180ms | **0.1801ms** | 0.1845ms | 0.2528ms | 3.7024ms | 0.7646ms | **0.4292ms** | 0.4342ms | 0.6540ms | 0.6359ms | 0.5767ms | 0.8240ms | 12.52ms | 2.1931ms | 0.9119ms | **0.8252ms** | 1.8756ms | 1.8447ms | 1.7016ms | 2.3810ms | 34.91ms | 0.2671ms | 0.2036ms | 0.2672ms | 0.2313ms | **0.1885ms** | 0.1997ms | 0.2652ms | 4.0632ms |
| 20000 | 0.9397ms | 0.7789ms | 0.9337ms | 0.8569ms | **0.7065ms** | 0.7216ms | 0.9885ms | 15.98ms | 3.2735ms | **1.5356ms** | 1.5711ms | 2.9082ms | 2.5437ms | 2.5181ms | 3.4480ms | 46.39ms | 8.8906ms | 2.9181ms | **2.8855ms** | 8.1310ms | 7.1536ms | 6.8132ms | 9.3534ms | 128.39ms | 1.0187ms | 0.8006ms | 0.9232ms | 0.8570ms | **0.7069ms** | 0.7393ms | 1.0018ms | 14.79ms |
| 50000 | 2.3838ms | 1.9595ms | 2.3555ms | 2.1889ms | **1.7801ms** | 1.8210ms | 2.4807ms | 44.49ms | 8.2006ms | **3.8270ms** | 3.9921ms | 7.7008ms | 6.6127ms | 6.3167ms | 8.5299ms | 143.74ms | 22.37ms | **6.9614ms** | 7.0313ms | 20.61ms | 17.70ms | 16.94ms | 23.06ms | 387.43ms | 2.5261ms | 1.9702ms | 2.3097ms | 2.2014ms | **1.8314ms** | 1.9414ms | 2.6660ms | 41.89ms |
| 100000 | 4.9501ms | 4.0957ms | 4.9051ms | 4.5788ms | **3.7147ms** | 3.7978ms | 5.1417ms | 92.06ms | 16.64ms | 7.5133ms | **7.3488ms** | 15.37ms | 13.32ms | 12.86ms | 17.12ms | 306.93ms | 45.52ms | 14.03ms | **13.66ms** | 41.60ms | 35.86ms | 34.47ms | 47.13ms | 856.54ms | 5.0682ms | 4.0869ms | 4.8642ms | 4.4229ms | **3.6309ms** | 3.9183ms | 5.2124ms | 90.31ms |
| 200000 | 10.44ms | 8.8690ms | 10.11ms | 9.5700ms | 9.6033ms | **8.7986ms** | 11.81ms | 179.71ms | 34.50ms | 16.03ms | **15.01ms** | 31.85ms | 28.74ms | 27.89ms | 36.70ms | 649.62ms | 93.46ms | **28.85ms** | 29.08ms | 85.65ms | 78.16ms | 73.49ms | 97.79ms | 1716.84ms | 10.30ms | **7.9065ms** | 9.6201ms | 9.1423ms | 9.2757ms | 8.1450ms | 11.05ms | 172.23ms |
| 500000 | 26.91ms | 26.17ms | 28.83ms | **25.18ms** | 25.27ms | 26.82ms | 32.70ms | - | 85.59ms | 47.14ms | **42.66ms** | 80.11ms | 80.07ms | 76.33ms | 101.57ms | - | 234.92ms | **71.84ms** | 73.60ms | 214.87ms | 222.99ms | 212.42ms | 275.20ms | - | 25.19ms | 27.18ms | 24.65ms | **22.81ms** | 23.51ms | 24.17ms | 28.57ms | - |
| 1000000 | 69.03ms | 65.71ms | 63.67ms | 57.03ms | **52.57ms** | 52.76ms | 65.98ms | - | 202.79ms | **93.06ms** | 97.87ms | 173.46ms | 186.35ms | 189.27ms | 205.50ms | - | 509.44ms | 156.59ms | **153.46ms** | 467.92ms | 466.92ms | 443.43ms | 563.99ms | - | 59.51ms | 59.17ms | 58.64ms | 53.23ms | **53.23ms** | 55.97ms | 61.92ms | - |

Best (one-shot) per size:
- 5000: S5 0.1801ms (stream OFF, chunk OFF)
- 20000: S5 0.7065ms (stream OFF, chunk OFF)
- 50000: S5 1.7801ms (stream OFF, chunk OFF)
- 100000: S5 3.7147ms (stream OFF, chunk OFF)
- 200000: M1 8.7986ms (markdown-it (baseline))
- 500000: S4 25.18ms (stream OFF, chunk ON)
- 1000000: S5 52.57ms (stream OFF, chunk OFF)

Best (append workload) per size:
- 5000: S2 0.4292ms (stream ON, cache ON, chunk OFF)
- 20000: S2 1.5356ms (stream ON, cache ON, chunk OFF)
- 50000: S2 3.8270ms (stream ON, cache ON, chunk OFF)
- 100000: S3 7.3488ms (stream ON, cache ON, chunk ON)
- 200000: S3 15.01ms (stream ON, cache ON, chunk ON)
- 500000: S3 42.66ms (stream ON, cache ON, chunk ON)
- 1000000: S2 93.06ms (stream ON, cache ON, chunk OFF)

Best (line-append workload) per size:
- 5000: S3 0.8252ms (stream ON, cache ON, chunk ON)
- 20000: S3 2.8855ms (stream ON, cache ON, chunk ON)
- 50000: S2 6.9614ms (stream ON, cache ON, chunk OFF)
- 100000: S3 13.66ms (stream ON, cache ON, chunk ON)
- 200000: S2 28.85ms (stream ON, cache ON, chunk OFF)
- 500000: S2 71.84ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 153.46ms (stream ON, cache ON, chunk ON)

Best (replace-paragraph workload) per size:
- 5000: S5 0.1885ms (stream OFF, chunk OFF)
- 20000: S5 0.7069ms (stream OFF, chunk OFF)
- 50000: S5 1.8314ms (stream OFF, chunk OFF)
- 100000: S5 3.6309ms (stream OFF, chunk OFF)
- 200000: S2 7.9065ms (stream ON, cache ON, chunk OFF)
- 500000: S4 22.81ms (stream OFF, chunk ON)
- 1000000: S5 53.23ms (stream OFF, chunk OFF)

Recommendations (by majority across sizes):
- One-shot: S5(5), M1(1), S4(1)
- Append-heavy: S2(4), S3(3)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2064ms | 0.2277ms | 3.6899ms | 4.4842ms | 0.2955ms |
| 20000 | 0.8014ms | 0.8965ms | 17.08ms | 21.57ms | 1.1670ms |
| 50000 | 1.9995ms | 2.2782ms | 52.95ms | 69.90ms | 2.9233ms |
| 100000 | 4.2312ms | 4.8454ms | 108.79ms | 161.15ms | 6.0128ms |
| 200000 | 10.24ms | 10.73ms | 214.37ms | 390.25ms | 13.23ms |
| 500000 | 27.84ms | 32.02ms | - | - | 39.40ms |
| 1000000 | 65.68ms | 74.90ms | - | - | 78.88ms |

Render vs markdown-it:
- 5,000 chars: 0.2064ms vs 0.2277ms → 1.10× faster
- 20,000 chars: 0.8014ms vs 0.8965ms → 1.12× faster
- 50,000 chars: 1.9995ms vs 2.2782ms → 1.14× faster
- 100,000 chars: 4.2312ms vs 4.8454ms → 1.15× faster
- 200,000 chars: 10.24ms vs 10.73ms → 1.05× faster
- 500,000 chars: 27.84ms vs 32.02ms → 1.15× faster
- 1,000,000 chars: 65.68ms vs 74.90ms → 1.14× faster

Render vs micromark:
- 5,000 chars: 0.2064ms vs 3.6899ms → 17.87× faster
- 20,000 chars: 0.8014ms vs 17.08ms → 21.32× faster
- 50,000 chars: 1.9995ms vs 52.95ms → 26.48× faster
- 100,000 chars: 4.2312ms vs 108.79ms → 25.71× faster
- 200,000 chars: 10.24ms vs 214.37ms → 20.94× faster

Render vs remark+rehype:
- 5,000 chars: 0.2064ms vs 4.4842ms → 21.72× faster
- 20,000 chars: 0.8014ms vs 21.57ms → 26.91× faster
- 50,000 chars: 1.9995ms vs 69.90ms → 34.96× faster
- 100,000 chars: 4.2312ms vs 161.15ms → 38.09× faster
- 200,000 chars: 10.24ms vs 390.25ms → 38.12× faster

Render vs markdown-exit:
- 5,000 chars: 0.2064ms vs 0.2955ms → 1.43× faster
- 20,000 chars: 0.8014ms vs 1.1670ms → 1.46× faster
- 50,000 chars: 1.9995ms vs 2.9233ms → 1.46× faster
- 100,000 chars: 4.2312ms vs 6.0128ms → 1.42× faster
- 200,000 chars: 10.24ms vs 13.23ms → 1.29× faster
- 500,000 chars: 27.84ms vs 39.40ms → 1.42× faster
- 1,000,000 chars: 65.68ms vs 78.88ms → 1.20× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1801ms | 0.1845ms | 1.02× faster, 2.4% less time | 0.4292ms | 0.5767ms | 1.34× faster, 25.6% less time | S5/S2 |
| 20000 | 0.7065ms | 0.7216ms | 1.02× faster, 2.1% less time | 1.5356ms | 2.5181ms | 1.64× faster, 39% less time | S5/S2 |
| 50000 | 1.7801ms | 1.8210ms | 1.02× faster, 2.2% less time | 3.8270ms | 6.3167ms | 1.65× faster, 39.4% less time | S5/S2 |
| 100000 | 3.7147ms | 3.7978ms | 1.02× faster, 2.2% less time | 7.3488ms | 12.86ms | 1.75× faster, 42.9% less time | S5/S3 |
| 200000 | 8.8690ms | 8.7986ms | 1.01× slower, 0.8% more time | 15.01ms | 27.89ms | 1.86× faster, 46.2% less time | S2/S3 |
| 500000 | 25.18ms | 26.82ms | 1.07× faster, 6.1% less time | 42.66ms | 76.33ms | 1.79× faster, 44.1% less time | S4/S3 |
| 1000000 | 52.57ms | 52.76ms | 1× faster, 0.4% less time | 93.06ms | 189.27ms | 2.03× faster, 50.8% less time | S5/S2 |

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
| 1000000 | - | - | 16 | - | - | 16 |

## Cold vs Hot (one-shot)

Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs. 表格按不同文档大小分别列出 markdown-it 与 remark 对照。

#### 5,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.2638ms | 0.2443ms |
| markdown-it (baseline) | 0.1985ms | 0.1784ms |
| markdown-it-ts (stream+chunk) | 0.2595ms | 0.2285ms |
| micromark (parse only) | 4.3615ms | 3.3939ms |
| remark (parse only) | 3.8915ms | 4.0355ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 1.0004ms | 0.9674ms |
| markdown-it (baseline) | 0.7571ms | 0.8329ms |
| markdown-it-ts (stream+chunk) | 0.9507ms | 0.9163ms |
| micromark (parse only) | 14.12ms | 15.37ms |
| remark (parse only) | 19.06ms | 19.47ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 2.4352ms | 2.4798ms |
| markdown-it (baseline) | 1.8751ms | 1.7750ms |
| markdown-it-ts (stream+chunk) | 2.3539ms | 2.2850ms |
| micromark (parse only) | 42.71ms | 45.26ms |
| remark (parse only) | 62.28ms | 63.04ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 4.9290ms | 4.9848ms |
| markdown-it (baseline) | 3.7008ms | 3.7560ms |
| markdown-it-ts (stream+chunk) | 4.7609ms | 4.8708ms |
| micromark (parse only) | 87.39ms | 89.52ms |
| remark (parse only) | 139.03ms | 142.55ms |
