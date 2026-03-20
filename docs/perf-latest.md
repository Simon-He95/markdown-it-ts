# Performance Report (latest run)

Default API note: normal `md.parse(src)` / `md.render(src)` calls already auto-activate the internal large-input path for very large finite strings. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2139ms | 0.1660ms | 0.2063ms | 0.2020ms | **0.1654ms** | 0.2015ms | 0.2662ms | 4.1778ms | 0.6211ms | 0.2940ms | **0.2487ms** | 0.5951ms | 0.5626ms | 0.6270ms | 0.8710ms | 13.89ms | 1.8684ms | 0.5694ms | **0.4594ms** | 1.7334ms | 1.6749ms | 1.8441ms | 2.4813ms | 40.15ms | 0.2466ms | 0.1752ms | 0.2237ms | 0.2067ms | **0.1686ms** | 0.2238ms | 0.3051ms | 4.2266ms |
| 20000 | 0.8443ms | 0.6573ms | 0.8270ms | 0.8271ms | **0.6545ms** | 0.7885ms | 1.0446ms | 18.12ms | 2.7985ms | **1.0456ms** | 1.0494ms | 2.7846ms | 2.4000ms | 2.6924ms | 3.5556ms | 61.35ms | 7.8729ms | **1.5139ms** | 1.5861ms | 7.6893ms | 6.5236ms | 7.4943ms | 9.8693ms | 169.46ms | 0.8799ms | 0.6452ms | 0.7872ms | 0.7897ms | **0.6264ms** | 0.8030ms | 1.0486ms | 20.50ms |
| 50000 | 2.1824ms | **1.7409ms** | 2.1963ms | 2.1981ms | 1.7609ms | 2.0481ms | 2.7569ms | 51.37ms | 7.1988ms | **2.3502ms** | 2.4491ms | 7.3733ms | 6.1178ms | 6.8183ms | 8.9278ms | 173.47ms | 19.72ms | **3.4511ms** | 3.5178ms | 19.76ms | 16.34ms | 18.92ms | 24.32ms | 466.84ms | 2.0894ms | 1.7172ms | 2.1344ms | 2.0826ms | **1.6758ms** | 2.0375ms | 2.6270ms | 51.06ms |
| 100000 | 5.1091ms | **4.0118ms** | 5.1781ms | 5.0939ms | 4.2432ms | 5.3204ms | 6.4988ms | 103.48ms | 16.18ms | **5.4090ms** | 5.4487ms | 15.52ms | 13.85ms | 13.72ms | 17.80ms | 348.15ms | 40.53ms | **7.1396ms** | 8.2922ms | 40.46ms | 35.30ms | 37.11ms | 50.34ms | 942.45ms | 4.2895ms | **3.7666ms** | 4.2579ms | 4.2103ms | 4.9299ms | 4.2392ms | 5.8179ms | 101.83ms |
| 200000 | 11.43ms | **10.50ms** | 11.32ms | 11.30ms | 11.23ms | 11.00ms | 13.83ms | 210.65ms | 32.67ms | **10.68ms** | 12.16ms | 34.10ms | 30.54ms | 29.51ms | 38.68ms | 741.42ms | 83.68ms | **14.80ms** | 24.23ms | 84.63ms | 84.92ms | 96.49ms | 114.27ms | 2067.08ms | 8.6193ms | 9.8822ms | 9.0564ms | 8.5887ms | 8.8487ms | **8.1037ms** | 11.81ms | 215.10ms |
| 500000 | 27.71ms | **24.42ms** | 27.68ms | 27.16ms | 27.74ms | 28.78ms | 34.54ms | - | 92.65ms | 40.38ms | **39.79ms** | 94.56ms | 93.86ms | 98.76ms | 134.37ms | - | 264.43ms | 65.76ms | **58.70ms** | 253.49ms | 259.45ms | 273.44ms | 336.80ms | - | **27.01ms** | 28.00ms | 27.45ms | 27.81ms | 29.03ms | 28.90ms | 33.92ms | - |
| 1000000 | 57.35ms | 57.50ms | 57.55ms | 55.72ms | **54.82ms** | 57.37ms | 70.53ms | - | 213.46ms | **75.20ms** | 79.83ms | 199.37ms | 208.11ms | 214.68ms | 267.47ms | - | 536.06ms | **118.31ms** | 119.24ms | 553.58ms | 563.03ms | 585.61ms | 702.54ms | - | 71.64ms | 57.57ms | 68.83ms | 64.30ms | **55.88ms** | 57.83ms | 79.28ms | - |

Best (one-shot) per size:
- 5000: S5 0.1654ms (stream OFF, chunk OFF)
- 20000: S5 0.6545ms (stream OFF, chunk OFF)
- 50000: S2 1.7409ms (stream ON, cache ON, chunk OFF)
- 100000: S2 4.0118ms (stream ON, cache ON, chunk OFF)
- 200000: S2 10.50ms (stream ON, cache ON, chunk OFF)
- 500000: S2 24.42ms (stream ON, cache ON, chunk OFF)
- 1000000: S5 54.82ms (stream OFF, chunk OFF)

Best (append workload) per size:
- 5000: S3 0.2487ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.0456ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.3502ms (stream ON, cache ON, chunk OFF)
- 100000: S2 5.4090ms (stream ON, cache ON, chunk OFF)
- 200000: S2 10.68ms (stream ON, cache ON, chunk OFF)
- 500000: S3 39.79ms (stream ON, cache ON, chunk ON)
- 1000000: S2 75.20ms (stream ON, cache ON, chunk OFF)

Best (line-append workload) per size:
- 5000: S3 0.4594ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.5139ms (stream ON, cache ON, chunk OFF)
- 50000: S2 3.4511ms (stream ON, cache ON, chunk OFF)
- 100000: S2 7.1396ms (stream ON, cache ON, chunk OFF)
- 200000: S2 14.80ms (stream ON, cache ON, chunk OFF)
- 500000: S3 58.70ms (stream ON, cache ON, chunk ON)
- 1000000: S2 118.31ms (stream ON, cache ON, chunk OFF)

Best (replace-paragraph workload) per size:
- 5000: S5 0.1686ms (stream OFF, chunk OFF)
- 20000: S5 0.6264ms (stream OFF, chunk OFF)
- 50000: S5 1.6758ms (stream OFF, chunk OFF)
- 100000: S2 3.7666ms (stream ON, cache ON, chunk OFF)
- 200000: M1 8.1037ms (markdown-it (baseline))
- 500000: S1 27.01ms (stream ON, cache OFF, chunk ON)
- 1000000: S5 55.88ms (stream OFF, chunk OFF)

Recommendations (by majority across sizes):
- One-shot: S2(4), S5(3)
- Append-heavy: S2(5), S3(2)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1877ms | 0.2377ms | 3.9821ms | 4.7880ms | 0.3051ms |
| 20000 | 0.7574ms | 0.9580ms | 22.72ms | 27.23ms | 1.2242ms |
| 50000 | 2.0238ms | 2.4198ms | 60.56ms | 83.64ms | 3.2443ms |
| 100000 | 5.0904ms | 6.3302ms | 123.07ms | 175.89ms | 7.6242ms |
| 200000 | 12.23ms | 15.78ms | 237.79ms | 423.21ms | 18.20ms |
| 500000 | 37.12ms | 41.10ms | - | - | 49.26ms |
| 1000000 | 69.30ms | 89.72ms | - | - | 89.54ms |

Render vs markdown-it:
- 5,000 chars: 0.1877ms vs 0.2377ms → 1.27× faster
- 20,000 chars: 0.7574ms vs 0.9580ms → 1.26× faster
- 50,000 chars: 2.0238ms vs 2.4198ms → 1.20× faster
- 100,000 chars: 5.0904ms vs 6.3302ms → 1.24× faster
- 200,000 chars: 12.23ms vs 15.78ms → 1.29× faster
- 500,000 chars: 37.12ms vs 41.10ms → 1.11× faster
- 1,000,000 chars: 69.30ms vs 89.72ms → 1.29× faster

Render vs micromark:
- 5,000 chars: 0.1877ms vs 3.9821ms → 21.22× faster
- 20,000 chars: 0.7574ms vs 22.72ms → 30.00× faster
- 50,000 chars: 2.0238ms vs 60.56ms → 29.92× faster
- 100,000 chars: 5.0904ms vs 123.07ms → 24.18× faster
- 200,000 chars: 12.23ms vs 237.79ms → 19.45× faster

Render vs remark+rehype:
- 5,000 chars: 0.1877ms vs 4.7880ms → 25.51× faster
- 20,000 chars: 0.7574ms vs 27.23ms → 35.96× faster
- 50,000 chars: 2.0238ms vs 83.64ms → 41.33× faster
- 100,000 chars: 5.0904ms vs 175.89ms → 34.55× faster
- 200,000 chars: 12.23ms vs 423.21ms → 34.61× faster

Render vs markdown-exit:
- 5,000 chars: 0.1877ms vs 0.3051ms → 1.63× faster
- 20,000 chars: 0.7574ms vs 1.2242ms → 1.62× faster
- 50,000 chars: 2.0238ms vs 3.2443ms → 1.60× faster
- 100,000 chars: 5.0904ms vs 7.6242ms → 1.50× faster
- 200,000 chars: 12.23ms vs 18.20ms → 1.49× faster
- 500,000 chars: 37.12ms vs 49.26ms → 1.33× faster
- 1,000,000 chars: 69.30ms vs 89.54ms → 1.29× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1654ms | 0.2015ms | 1.22× faster, 17.9% less time | 0.2487ms | 0.6270ms | 2.52× faster, 60.3% less time | S5/S3 |
| 20000 | 0.6545ms | 0.7885ms | 1.2× faster, 17% less time | 1.0456ms | 2.6924ms | 2.57× faster, 61.2% less time | S5/S2 |
| 50000 | 1.7409ms | 2.0481ms | 1.18× faster, 15% less time | 2.3502ms | 6.8183ms | 2.9× faster, 65.5% less time | S2/S2 |
| 100000 | 4.0118ms | 5.3204ms | 1.33× faster, 24.6% less time | 5.4090ms | 13.72ms | 2.54× faster, 60.6% less time | S2/S2 |
| 200000 | 10.50ms | 11.00ms | 1.05× faster, 4.6% less time | 10.68ms | 29.51ms | 2.76× faster, 63.8% less time | S2/S2 |
| 500000 | 24.42ms | 28.78ms | 1.18× faster, 15.1% less time | 39.79ms | 98.76ms | 2.48× faster, 59.7% less time | S2/S3 |
| 1000000 | 54.82ms | 57.37ms | 1.05× faster, 4.4% less time | 75.20ms | 214.68ms | 2.85× faster, 65% less time | S5/S2 |

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
| markdown-exit | 0.2758ms | 0.2537ms |
| markdown-it (baseline) | 0.2052ms | 0.1941ms |
| markdown-it-ts (stream+chunk) | 0.2111ms | 0.2013ms |
| micromark (parse only) | 5.1700ms | 4.3773ms |
| remark (parse only) | 5.8329ms | 5.0078ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 1.0179ms | 1.0598ms |
| markdown-it (baseline) | 0.7619ms | 0.8101ms |
| markdown-it-ts (stream+chunk) | 0.8673ms | 0.8358ms |
| micromark (parse only) | 18.50ms | 18.81ms |
| remark (parse only) | 22.11ms | 23.84ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 2.8737ms | 2.6799ms |
| markdown-it (baseline) | 1.8497ms | 2.0612ms |
| markdown-it-ts (stream+chunk) | 1.9761ms | 2.1933ms |
| micromark (parse only) | 52.63ms | 49.54ms |
| remark (parse only) | 66.50ms | 67.51ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 6.0719ms | 6.1646ms |
| markdown-it (baseline) | 5.0412ms | 4.8885ms |
| markdown-it-ts (stream+chunk) | 4.6046ms | 5.1482ms |
| micromark (parse only) | 95.22ms | 98.92ms |
| remark (parse only) | 154.59ms | 155.83ms |
