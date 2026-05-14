# Performance Report (latest run)

## Environment

- Generated at: 2026-05-14T02:21:04.864Z
- Node.js: v23.11.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 38be0639a6ab755d53978f6ce498f0628ff76d58

Default API note: normal `md.parse(src)` / `md.render(src)` calls already auto-activate the internal large-input path for very large finite strings. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1961ms | 0.1547ms | 0.1871ms | 0.1754ms | **0.1417ms** | 0.1567ms | 0.2121ms | 3.5530ms | 0.5722ms | 0.2758ms | **0.2703ms** | 0.5228ms | 0.5005ms | 0.5188ms | 0.6988ms | 11.96ms | 1.7288ms | 0.6614ms | **0.5393ms** | 1.5394ms | 1.4204ms | 1.4834ms | 1.9819ms | 34.26ms | 0.1945ms | **0.1513ms** | 0.1819ms | 0.1882ms | 0.1616ms | 0.1823ms | 0.2563ms | 4.0146ms |
| 20000 | 0.7605ms | 0.6140ms | 0.7527ms | 0.7137ms | **0.5759ms** | 0.6498ms | 0.8516ms | 16.26ms | 2.6053ms | **1.1321ms** | 1.1351ms | 2.4029ms | 2.0580ms | 2.2293ms | 2.9057ms | 52.57ms | 7.0332ms | 1.9553ms | **1.8831ms** | 6.5368ms | 5.7348ms | 6.1195ms | 7.9974ms | 145.86ms | 0.7635ms | 0.6213ms | 0.7346ms | 0.7219ms | **0.5336ms** | 0.6613ms | 0.8545ms | 16.53ms |
| 50000 | 1.9784ms | 1.6019ms | 1.9486ms | 1.8748ms | **1.5298ms** | 1.6663ms | 2.2371ms | 43.37ms | 6.4995ms | **2.5124ms** | 2.5907ms | 6.3176ms | 5.3788ms | 5.5655ms | 7.2402ms | 146.51ms | 17.58ms | **4.3954ms** | 4.4494ms | 16.93ms | 14.35ms | 15.29ms | 19.79ms | 397.02ms | 1.9011ms | 1.6301ms | 1.8838ms | 1.7833ms | **1.4450ms** | 1.6524ms | 2.1316ms | 43.27ms |
| 100000 | 5.5027ms | 3.7950ms | 4.9585ms | 4.6237ms | **3.7622ms** | 4.5096ms | 5.4209ms | 89.05ms | 14.40ms | **5.6771ms** | 5.7676ms | 13.49ms | 12.51ms | 11.32ms | 14.64ms | 308.76ms | 36.93ms | **9.1045ms** | 10.18ms | 35.15ms | 31.30ms | 30.73ms | 41.22ms | 856.41ms | 3.9423ms | 3.5299ms | 3.9180ms | 3.6871ms | **3.3616ms** | 3.5076ms | 5.5463ms | 88.73ms |
| 200000 | 11.53ms | **9.6246ms** | 10.60ms | 10.14ms | 9.9666ms | 10.26ms | 12.25ms | 200.90ms | 33.41ms | **11.31ms** | 13.27ms | 29.31ms | 29.80ms | 25.45ms | 30.92ms | 614.36ms | 76.28ms | **18.97ms** | 24.43ms | 73.93ms | 81.73ms | 75.04ms | 94.24ms | 1736.94ms | 7.8323ms | 10.21ms | 7.9931ms | 7.5504ms | 8.0368ms | **7.0126ms** | 9.3287ms | 178.22ms |
| 500000 | 25.76ms | **22.36ms** | 29.05ms | 25.05ms | 27.91ms | 24.41ms | 32.32ms | - | 85.21ms | **36.62ms** | 37.35ms | 81.54ms | 98.84ms | 86.09ms | 102.90ms | - | 241.09ms | **67.28ms** | 68.65ms | 221.13ms | 279.80ms | 240.60ms | 287.09ms | - | **24.04ms** | 29.09ms | 25.15ms | 24.56ms | 29.14ms | 26.16ms | 32.13ms | - |
| 1000000 | 55.75ms | 56.80ms | 56.57ms | **48.42ms** | 50.79ms | 51.95ms | 72.40ms | - | 190.97ms | **75.78ms** | 93.45ms | 177.64ms | 189.40ms | 197.90ms | 224.98ms | - | 500.66ms | **126.93ms** | 131.24ms | 492.27ms | 561.44ms | 518.08ms | 606.40ms | - | 62.03ms | 54.13ms | 54.38ms | 49.14ms | **48.14ms** | 64.50ms | 61.31ms | - |

Best (one-shot) per size:
- 5000: S5 0.1417ms (stream OFF, chunk OFF)
- 20000: S5 0.5759ms (stream OFF, chunk OFF)
- 50000: S5 1.5298ms (stream OFF, chunk OFF)
- 100000: S5 3.7622ms (stream OFF, chunk OFF)
- 200000: S2 9.6246ms (stream ON, cache ON, chunk OFF)
- 500000: S2 22.36ms (stream ON, cache ON, chunk OFF)
- 1000000: S4 48.42ms (stream OFF, chunk ON)

Best (append workload) per size:
- 5000: S3 0.2703ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.1321ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.5124ms (stream ON, cache ON, chunk OFF)
- 100000: S2 5.6771ms (stream ON, cache ON, chunk OFF)
- 200000: S2 11.31ms (stream ON, cache ON, chunk OFF)
- 500000: S2 36.62ms (stream ON, cache ON, chunk OFF)
- 1000000: S2 75.78ms (stream ON, cache ON, chunk OFF)

Best (line-append workload) per size:
- 5000: S3 0.5393ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.8831ms (stream ON, cache ON, chunk ON)
- 50000: S2 4.3954ms (stream ON, cache ON, chunk OFF)
- 100000: S2 9.1045ms (stream ON, cache ON, chunk OFF)
- 200000: S2 18.97ms (stream ON, cache ON, chunk OFF)
- 500000: S2 67.28ms (stream ON, cache ON, chunk OFF)
- 1000000: S2 126.93ms (stream ON, cache ON, chunk OFF)

Best (replace-paragraph workload) per size:
- 5000: S2 0.1513ms (stream ON, cache ON, chunk OFF)
- 20000: S5 0.5336ms (stream OFF, chunk OFF)
- 50000: S5 1.4450ms (stream OFF, chunk OFF)
- 100000: S5 3.3616ms (stream OFF, chunk OFF)
- 200000: M1 7.0126ms (markdown-it (baseline))
- 500000: S1 24.04ms (stream ON, cache OFF, chunk ON)
- 1000000: S5 48.14ms (stream OFF, chunk OFF)

Recommendations (by majority across sizes):
- One-shot: S5(4), S2(2), S4(1)
- Append-heavy: S2(6), S3(1)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1650ms | 0.1958ms | 4.6090ms | 5.6090ms | 0.2500ms |
| 20000 | 0.6585ms | 0.7975ms | 20.41ms | 24.29ms | 1.0002ms |
| 50000 | 1.8160ms | 2.0146ms | 56.69ms | 76.21ms | 2.6360ms |
| 100000 | 4.8832ms | 5.5862ms | 112.20ms | 162.66ms | 6.6327ms |
| 200000 | 11.42ms | 13.22ms | 227.66ms | 382.54ms | 15.35ms |
| 500000 | 33.16ms | 36.12ms | - | - | 40.16ms |
| 1000000 | 64.97ms | 70.16ms | - | - | 87.20ms |

Render vs markdown-it:
- 5,000 chars: 0.1650ms vs 0.1958ms → 1.19× faster
- 20,000 chars: 0.6585ms vs 0.7975ms → 1.21× faster
- 50,000 chars: 1.8160ms vs 2.0146ms → 1.11× faster
- 100,000 chars: 4.8832ms vs 5.5862ms → 1.14× faster
- 200,000 chars: 11.42ms vs 13.22ms → 1.16× faster
- 500,000 chars: 33.16ms vs 36.12ms → 1.09× faster
- 1,000,000 chars: 64.97ms vs 70.16ms → 1.08× faster

Render vs micromark:
- 5,000 chars: 0.1650ms vs 4.6090ms → 27.93× faster
- 20,000 chars: 0.6585ms vs 20.41ms → 31.00× faster
- 50,000 chars: 1.8160ms vs 56.69ms → 31.22× faster
- 100,000 chars: 4.8832ms vs 112.20ms → 22.98× faster
- 200,000 chars: 11.42ms vs 227.66ms → 19.93× faster

Render vs remark+rehype:
- 5,000 chars: 0.1650ms vs 5.6090ms → 33.99× faster
- 20,000 chars: 0.6585ms vs 24.29ms → 36.89× faster
- 50,000 chars: 1.8160ms vs 76.21ms → 41.96× faster
- 100,000 chars: 4.8832ms vs 162.66ms → 33.31× faster
- 200,000 chars: 11.42ms vs 382.54ms → 33.48× faster

Render vs markdown-exit:
- 5,000 chars: 0.1650ms vs 0.2500ms → 1.51× faster
- 20,000 chars: 0.6585ms vs 1.0002ms → 1.52× faster
- 50,000 chars: 1.8160ms vs 2.6360ms → 1.45× faster
- 100,000 chars: 4.8832ms vs 6.6327ms → 1.36× faster
- 200,000 chars: 11.42ms vs 15.35ms → 1.34× faster
- 500,000 chars: 33.16ms vs 40.16ms → 1.21× faster
- 1,000,000 chars: 64.97ms vs 87.20ms → 1.34× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1417ms | 0.1567ms | 1.11× faster, 9.6% less time | 0.2703ms | 0.5188ms | 1.92× faster, 47.9% less time | S5/S3 |
| 20000 | 0.5759ms | 0.6498ms | 1.13× faster, 11.4% less time | 1.1321ms | 2.2293ms | 1.97× faster, 49.2% less time | S5/S2 |
| 50000 | 1.5298ms | 1.6663ms | 1.09× faster, 8.2% less time | 2.5124ms | 5.5655ms | 2.22× faster, 54.9% less time | S5/S2 |
| 100000 | 3.7622ms | 4.5096ms | 1.2× faster, 16.6% less time | 5.6771ms | 11.32ms | 1.99× faster, 49.9% less time | S5/S2 |
| 200000 | 9.6246ms | 10.26ms | 1.07× faster, 6.2% less time | 11.31ms | 25.45ms | 2.25× faster, 55.6% less time | S2/S2 |
| 500000 | 22.36ms | 24.41ms | 1.09× faster, 8.4% less time | 36.62ms | 86.09ms | 2.35× faster, 57.5% less time | S2/S2 |
| 1000000 | 48.42ms | 51.95ms | 1.07× faster, 6.8% less time | 75.78ms | 197.90ms | 2.61× faster, 61.7% less time | S4/S2 |

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
| markdown-exit | 0.2160ms | 0.2158ms |
| markdown-it (baseline) | 0.1969ms | 0.1481ms |
| markdown-it-ts (stream+chunk) | 0.2003ms | 0.1807ms |
| micromark (parse only) | 4.8197ms | 4.1101ms |
| remark (parse only) | 5.1145ms | 4.5903ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.8294ms | 0.8987ms |
| markdown-it (baseline) | 0.6843ms | 0.6597ms |
| markdown-it-ts (stream+chunk) | 0.7009ms | 0.7838ms |
| micromark (parse only) | 15.56ms | 17.04ms |
| remark (parse only) | 24.96ms | 22.16ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 2.4077ms | 2.1741ms |
| markdown-it (baseline) | 1.4665ms | 1.6927ms |
| markdown-it-ts (stream+chunk) | 1.8293ms | 2.0119ms |
| micromark (parse only) | 44.46ms | 47.35ms |
| remark (parse only) | 64.97ms | 72.14ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 5.0827ms | 5.7387ms |
| markdown-it (baseline) | 4.3450ms | 4.6721ms |
| markdown-it-ts (stream+chunk) | 3.7457ms | 4.7083ms |
| micromark (parse only) | 87.68ms | 93.57ms |
| remark (parse only) | 146.27ms | 143.39ms |
