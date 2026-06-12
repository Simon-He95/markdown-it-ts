# Performance Report (latest run)

## Environment

- Generated at: 2026-06-12T18:13:45.470Z
- Node.js: v23.11.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 357eeca8465173f6a63b2f46246bc20fede49b91

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2065ms | 0.1582ms | 0.2025ms | 0.1845ms | **0.1531ms** | 0.1632ms | 0.2142ms | 3.7765ms | 0.6207ms | 0.2720ms | **0.2527ms** | 0.5544ms | 0.5322ms | 0.5381ms | 0.7234ms | 12.13ms | 1.6805ms | 0.5191ms | **0.4449ms** | 1.5810ms | 1.5257ms | 1.5385ms | 2.1834ms | 34.59ms | 0.2050ms | **0.1594ms** | 0.1962ms | 0.2035ms | 0.1679ms | 0.2422ms | 0.2389ms | 3.5389ms |
| 20000 | 0.8941ms | 0.6473ms | 0.7866ms | 0.7447ms | **0.6051ms** | 0.6592ms | 0.8833ms | 16.65ms | 2.6816ms | **0.8700ms** | 0.8986ms | 2.5035ms | 2.2134ms | 2.2673ms | 3.0369ms | 56.52ms | 7.3032ms | 1.2299ms | **1.2023ms** | 6.9253ms | 5.9723ms | 6.1579ms | 8.4012ms | 149.58ms | 0.7784ms | 0.6713ms | 0.7713ms | 0.7863ms | **0.6001ms** | 0.6740ms | 0.9179ms | 16.90ms |
| 50000 | 2.0611ms | 1.6420ms | 2.0517ms | 1.9637ms | **1.5615ms** | 1.6505ms | 2.2716ms | 44.97ms | 6.7714ms | **2.0735ms** | 2.1575ms | 6.4046ms | 5.5787ms | 5.5905ms | 7.4267ms | 152.05ms | 18.33ms | **2.6182ms** | 2.6562ms | 17.49ms | 15.15ms | 15.30ms | 20.29ms | 411.11ms | 2.0315ms | 1.5488ms | 1.9931ms | 1.8882ms | **1.5113ms** | 1.6921ms | 2.1780ms | 44.46ms |
| 100000 | 4.8325ms | 4.2795ms | 4.8631ms | 4.5375ms | **4.0352ms** | 4.3173ms | 5.5878ms | 93.34ms | 14.37ms | **4.6428ms** | 4.6567ms | 13.64ms | 12.28ms | 11.59ms | 15.17ms | 314.92ms | 38.13ms | 5.6712ms | **5.6388ms** | 35.99ms | 33.30ms | 31.16ms | 42.61ms | 862.84ms | 4.0970ms | **3.5832ms** | 3.9803ms | 3.8247ms | 3.8491ms | 3.6254ms | 4.7534ms | 90.29ms |
| 200000 | 9.8359ms | 9.7574ms | 10.56ms | 10.15ms | 10.31ms | **9.2403ms** | 12.46ms | 182.59ms | 30.32ms | **8.9962ms** | 9.6788ms | 30.97ms | 26.44ms | 25.07ms | 41.26ms | 632.91ms | 84.41ms | 13.16ms | **11.09ms** | 81.80ms | 81.08ms | 69.49ms | 89.91ms | 1749.48ms | 7.9710ms | 10.17ms | 8.1885ms | 7.6866ms | 8.1872ms | **6.9387ms** | 9.6668ms | 195.43ms |
| 500000 | 26.13ms | **23.94ms** | 26.88ms | 26.92ms | 26.34ms | 26.55ms | 31.84ms | - | 81.92ms | **32.38ms** | 32.53ms | 84.48ms | 84.69ms | 84.24ms | 99.23ms | - | 239.98ms | 31.74ms | **30.65ms** | 238.12ms | 243.98ms | 234.56ms | 290.70ms | - | 25.06ms | **24.18ms** | 29.58ms | 28.30ms | 25.67ms | 25.47ms | 29.85ms | - |
| 1000000 | 50.52ms | 58.93ms | 51.21ms | 50.47ms | 52.20ms | **50.05ms** | 64.88ms | - | 175.85ms | 74.73ms | **64.33ms** | 190.82ms | 175.33ms | 185.27ms | 232.35ms | - | 505.07ms | **66.01ms** | 77.65ms | 492.80ms | 508.02ms | 522.42ms | 630.05ms | - | 63.87ms | 61.26ms | 65.66ms | 54.70ms | **49.54ms** | 50.23ms | 74.32ms | - |

Best (one-shot) per size:
- 5000: S5 0.1531ms (stream OFF, chunk OFF)
- 20000: S5 0.6051ms (stream OFF, chunk OFF)
- 50000: S5 1.5615ms (stream OFF, chunk OFF)
- 100000: S5 4.0352ms (stream OFF, chunk OFF)
- 200000: M1 9.2403ms (markdown-it (baseline))
- 500000: S2 23.94ms (stream ON, cache ON, chunk OFF)
- 1000000: M1 50.05ms (markdown-it (baseline))

Best (append workload) per size:
- 5000: S3 0.2527ms (stream ON, cache ON, chunk ON)
- 20000: S2 0.8700ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.0735ms (stream ON, cache ON, chunk OFF)
- 100000: S2 4.6428ms (stream ON, cache ON, chunk OFF)
- 200000: S2 8.9962ms (stream ON, cache ON, chunk OFF)
- 500000: S2 32.38ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 64.33ms (stream ON, cache ON, chunk ON)

Best (line-append workload) per size:
- 5000: S3 0.4449ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.2023ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.6182ms (stream ON, cache ON, chunk OFF)
- 100000: S3 5.6388ms (stream ON, cache ON, chunk ON)
- 200000: S3 11.09ms (stream ON, cache ON, chunk ON)
- 500000: S3 30.65ms (stream ON, cache ON, chunk ON)
- 1000000: S2 66.01ms (stream ON, cache ON, chunk OFF)

Best (replace-paragraph workload) per size:
- 5000: S2 0.1594ms (stream ON, cache ON, chunk OFF)
- 20000: S5 0.6001ms (stream OFF, chunk OFF)
- 50000: S5 1.5113ms (stream OFF, chunk OFF)
- 100000: S2 3.5832ms (stream ON, cache ON, chunk OFF)
- 200000: M1 6.9387ms (markdown-it (baseline))
- 500000: S2 24.18ms (stream ON, cache ON, chunk OFF)
- 1000000: S5 49.54ms (stream OFF, chunk OFF)

Recommendations (by majority across sizes):
- One-shot: S5(4), M1(2), S2(1)
- Append-heavy: S2(5), S3(2)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1704ms | 0.1984ms | 3.6142ms | 4.1844ms | 0.2555ms |
| 20000 | 0.6835ms | 0.8030ms | 20.37ms | 24.19ms | 1.0290ms |
| 50000 | 1.8345ms | 2.0314ms | 52.94ms | 71.55ms | 2.6552ms |
| 100000 | 4.9017ms | 5.4292ms | 105.55ms | 150.11ms | 6.7911ms |
| 200000 | 10.91ms | 13.00ms | 205.13ms | 411.96ms | 15.68ms |
| 500000 | 31.80ms | 36.19ms | - | - | 41.83ms |
| 1000000 | 61.72ms | 71.25ms | - | - | 87.00ms |

Render vs markdown-it:
- 5,000 chars: 0.1704ms vs 0.1984ms → 1.16× faster
- 20,000 chars: 0.6835ms vs 0.8030ms → 1.17× faster
- 50,000 chars: 1.8345ms vs 2.0314ms → 1.11× faster
- 100,000 chars: 4.9017ms vs 5.4292ms → 1.11× faster
- 200,000 chars: 10.91ms vs 13.00ms → 1.19× faster
- 500,000 chars: 31.80ms vs 36.19ms → 1.14× faster
- 1,000,000 chars: 61.72ms vs 71.25ms → 1.15× faster

Render vs micromark:
- 5,000 chars: 0.1704ms vs 3.6142ms → 21.21× faster
- 20,000 chars: 0.6835ms vs 20.37ms → 29.80× faster
- 50,000 chars: 1.8345ms vs 52.94ms → 28.86× faster
- 100,000 chars: 4.9017ms vs 105.55ms → 21.53× faster
- 200,000 chars: 10.91ms vs 205.13ms → 18.80× faster

Render vs remark+rehype:
- 5,000 chars: 0.1704ms vs 4.1844ms → 24.56× faster
- 20,000 chars: 0.6835ms vs 24.19ms → 35.39× faster
- 50,000 chars: 1.8345ms vs 71.55ms → 39.00× faster
- 100,000 chars: 4.9017ms vs 150.11ms → 30.62× faster
- 200,000 chars: 10.91ms vs 411.96ms → 37.76× faster

Render vs markdown-exit:
- 5,000 chars: 0.1704ms vs 0.2555ms → 1.50× faster
- 20,000 chars: 0.6835ms vs 1.0290ms → 1.51× faster
- 50,000 chars: 1.8345ms vs 2.6552ms → 1.45× faster
- 100,000 chars: 4.9017ms vs 6.7911ms → 1.39× faster
- 200,000 chars: 10.91ms vs 15.68ms → 1.44× faster
- 500,000 chars: 31.80ms vs 41.83ms → 1.32× faster
- 1,000,000 chars: 61.72ms vs 87.00ms → 1.41× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1531ms | 0.1632ms | 1.07× faster, 6.2% less time | 0.2527ms | 0.5381ms | 2.13× faster, 53% less time | S5/S3 |
| 20000 | 0.6051ms | 0.6592ms | 1.09× faster, 8.2% less time | 0.8700ms | 2.2673ms | 2.61× faster, 61.6% less time | S5/S2 |
| 50000 | 1.5615ms | 1.6505ms | 1.06× faster, 5.4% less time | 2.0735ms | 5.5905ms | 2.7× faster, 62.9% less time | S5/S2 |
| 100000 | 4.0352ms | 4.3173ms | 1.07× faster, 6.5% less time | 4.6428ms | 11.59ms | 2.5× faster, 59.9% less time | S5/S2 |
| 200000 | 9.7574ms | 9.2403ms | 1.06× slower, 5.6% more time | 8.9962ms | 25.07ms | 2.79× faster, 64.1% less time | S2/S2 |
| 500000 | 23.94ms | 26.55ms | 1.11× faster, 9.9% less time | 32.38ms | 84.24ms | 2.6× faster, 61.6% less time | S2/S2 |
| 1000000 | 50.47ms | 50.05ms | 1.01× slower, 0.9% more time | 64.33ms | 185.27ms | 2.88× faster, 65.3% less time | S4/S3 |

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
| 1000000 | 16 | 16 | 16 | 16 | 16 | 16 |

## Cold vs Hot (one-shot)

Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs. 表格按不同文档大小分别列出 markdown-it 与 remark 对照。

#### 5,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.2238ms | 0.2109ms |
| markdown-it (baseline) | 0.1661ms | 0.2144ms |
| markdown-it-ts (stream+chunk) | 0.2132ms | 0.1851ms |
| micromark (parse only) | 4.0132ms | 3.5867ms |
| remark (parse only) | 4.0206ms | 3.7240ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.8417ms | 0.8684ms |
| markdown-it (baseline) | 0.6319ms | 0.6548ms |
| markdown-it-ts (stream+chunk) | 0.7864ms | 0.7863ms |
| micromark (parse only) | 16.32ms | 16.61ms |
| remark (parse only) | 21.74ms | 21.31ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 2.0583ms | 2.3122ms |
| markdown-it (baseline) | 1.5528ms | 1.7235ms |
| markdown-it-ts (stream+chunk) | 1.8832ms | 2.0459ms |
| micromark (parse only) | 40.78ms | 44.67ms |
| remark (parse only) | 68.70ms | 61.83ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 5.0095ms | 5.2056ms |
| markdown-it (baseline) | 4.2507ms | 4.2027ms |
| markdown-it-ts (stream+chunk) | 5.6265ms | 5.1740ms |
| micromark (parse only) | 82.21ms | 89.16ms |
| remark (parse only) | 132.59ms | 132.90ms |
