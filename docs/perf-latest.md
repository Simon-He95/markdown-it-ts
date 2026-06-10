# Performance Report (latest run)

## Environment

- Generated at: 2026-06-10T16:33:19.920Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 53cf29a58f4f50613a1dd4df9e25b80f34ed4b15

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2592ms | 0.2059ms | 0.2444ms | 0.2207ms | **0.1815ms** | 0.1847ms | 0.2548ms | 3.2343ms | 0.8356ms | **0.4385ms** | 0.4624ms | 0.6726ms | 0.6444ms | 0.5729ms | 0.8224ms | 9.8080ms | 2.2662ms | 1.0806ms | **0.8490ms** | 1.8968ms | 1.8796ms | 1.7153ms | 2.4238ms | 28.24ms | 0.3155ms | 0.2125ms | 0.2666ms | 0.2263ms | **0.1892ms** | 0.1920ms | 0.3098ms | 3.1740ms |
| 20000 | 0.9353ms | 0.7842ms | 0.9453ms | 0.8750ms | **0.7075ms** | 0.7303ms | 1.0029ms | 24.74ms | 3.2771ms | **1.5239ms** | 1.5485ms | 3.0643ms | 2.5818ms | 2.5230ms | 3.3775ms | 92.90ms | 8.9108ms | 3.0943ms | **2.8467ms** | 8.3834ms | 7.1517ms | 6.8824ms | 9.5540ms | 262.96ms | 0.9368ms | 0.7830ms | 0.9648ms | 0.8813ms | 0.7677ms | **0.7391ms** | 0.9891ms | 35.54ms |
| 50000 | 2.8373ms | 3.0752ms | 2.3623ms | 2.1938ms | **1.8124ms** | 1.8263ms | 2.5121ms | 82.03ms | 9.5089ms | 6.4157ms | **3.7102ms** | 7.6834ms | 6.8104ms | 6.3649ms | 8.7405ms | 271.24ms | 22.79ms | 9.7879ms | **6.8957ms** | 20.66ms | 18.14ms | 17.03ms | 26.13ms | 769.48ms | 3.0927ms | 7.7609ms | 2.3369ms | 2.1770ms | 1.8742ms | **1.8492ms** | 2.4723ms | 80.01ms |
| 100000 | 9.9109ms | 7.0982ms | 8.4130ms | 7.1288ms | **5.6879ms** | 10.47ms | 9.0015ms | 170.32ms | 28.64ms | 11.77ms | **9.5716ms** | 20.85ms | 14.23ms | 37.02ms | 27.06ms | 348.42ms | 68.39ms | 20.48ms | **18.81ms** | 62.45ms | 43.87ms | 78.65ms | 71.18ms | 1426.87ms | 9.8513ms | 10.50ms | **4.8591ms** | 6.2851ms | 6.2778ms | 8.9673ms | 9.0689ms | 213.51ms |
| 200000 | 20.14ms | **17.12ms** | 20.37ms | 19.27ms | 17.83ms | 18.08ms | 22.85ms | 207.57ms | 68.39ms | 28.80ms | **22.07ms** | 48.92ms | 66.01ms | 55.64ms | 57.06ms | 1059.66ms | 193.67ms | 62.37ms | **45.48ms** | 188.64ms | 140.71ms | 138.35ms | 195.64ms | 3305.46ms | 20.09ms | **8.9815ms** | 19.54ms | 23.71ms | 24.44ms | 10.37ms | 17.24ms | 195.73ms |
| 500000 | 28.74ms | 26.69ms | 28.10ms | 29.32ms | **25.66ms** | 60.81ms | 34.88ms | - | 89.09ms | 46.55ms | **44.94ms** | 80.95ms | 81.11ms | 179.83ms | 110.93ms | - | 243.48ms | 77.25ms | **76.29ms** | 231.54ms | 227.57ms | 285.07ms | 279.59ms | - | 28.30ms | 34.37ms | 27.67ms | **23.22ms** | 24.15ms | 24.34ms | 30.76ms | - |
| 1000000 | 67.57ms | 65.28ms | 75.90ms | 73.67ms | 85.32ms | 93.65ms | **65.16ms** | - | 204.85ms | 93.27ms | **90.99ms** | 229.36ms | 304.20ms | 288.58ms | 227.29ms | - | 551.48ms | 174.93ms | **164.84ms** | 527.11ms | 809.06ms | 913.21ms | 591.10ms | - | **61.57ms** | 70.04ms | 89.91ms | 81.06ms | 104.55ms | 103.10ms | 67.23ms | - |

Best (one-shot) per size:
- 5000: S5 0.1815ms (stream OFF, chunk OFF)
- 20000: S5 0.7075ms (stream OFF, chunk OFF)
- 50000: S5 1.8124ms (stream OFF, chunk OFF)
- 100000: S5 5.6879ms (stream OFF, chunk OFF)
- 200000: S2 17.12ms (stream ON, cache ON, chunk OFF)
- 500000: S5 25.66ms (stream OFF, chunk OFF)
- 1000000: E1 65.16ms (markdown-exit)

Best (append workload) per size:
- 5000: S2 0.4385ms (stream ON, cache ON, chunk OFF)
- 20000: S2 1.5239ms (stream ON, cache ON, chunk OFF)
- 50000: S3 3.7102ms (stream ON, cache ON, chunk ON)
- 100000: S3 9.5716ms (stream ON, cache ON, chunk ON)
- 200000: S3 22.07ms (stream ON, cache ON, chunk ON)
- 500000: S3 44.94ms (stream ON, cache ON, chunk ON)
- 1000000: S3 90.99ms (stream ON, cache ON, chunk ON)

Best (line-append workload) per size:
- 5000: S3 0.8490ms (stream ON, cache ON, chunk ON)
- 20000: S3 2.8467ms (stream ON, cache ON, chunk ON)
- 50000: S3 6.8957ms (stream ON, cache ON, chunk ON)
- 100000: S3 18.81ms (stream ON, cache ON, chunk ON)
- 200000: S3 45.48ms (stream ON, cache ON, chunk ON)
- 500000: S3 76.29ms (stream ON, cache ON, chunk ON)
- 1000000: S3 164.84ms (stream ON, cache ON, chunk ON)

Best (replace-paragraph workload) per size:
- 5000: S5 0.1892ms (stream OFF, chunk OFF)
- 20000: M1 0.7391ms (markdown-it (baseline))
- 50000: M1 1.8492ms (markdown-it (baseline))
- 100000: S3 4.8591ms (stream ON, cache ON, chunk ON)
- 200000: S2 8.9815ms (stream ON, cache ON, chunk OFF)
- 500000: S4 23.22ms (stream OFF, chunk ON)
- 1000000: S1 61.57ms (stream ON, cache OFF, chunk ON)

Recommendations (by majority across sizes):
- One-shot: S5(5), S2(1), E1(1)
- Append-heavy: S3(5), S2(2)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2034ms | 0.2287ms | 3.7585ms | 4.9827ms | 0.3023ms |
| 20000 | 1.3352ms | 0.9485ms | 21.31ms | 36.47ms | 1.5626ms |
| 50000 | 2.0717ms | 2.3100ms | 87.21ms | 72.25ms | 2.9811ms |
| 100000 | 4.3360ms | 4.9711ms | 114.54ms | 166.37ms | 6.2766ms |
| 200000 | 10.55ms | 11.44ms | 220.13ms | 461.47ms | 13.72ms |
| 500000 | 53.63ms | 67.58ms | - | - | 76.69ms |
| 1000000 | 237.77ms | 141.02ms | - | - | 160.52ms |

Render vs markdown-it:
- 5,000 chars: 0.2034ms vs 0.2287ms → 1.12× faster
- 20,000 chars: 1.3352ms vs 0.9485ms → 0.71× faster
- 50,000 chars: 2.0717ms vs 2.3100ms → 1.12× faster
- 100,000 chars: 4.3360ms vs 4.9711ms → 1.15× faster
- 200,000 chars: 10.55ms vs 11.44ms → 1.08× faster
- 500,000 chars: 53.63ms vs 67.58ms → 1.26× faster
- 1,000,000 chars: 237.77ms vs 141.02ms → 0.59× faster

Render vs micromark:
- 5,000 chars: 0.2034ms vs 3.7585ms → 18.48× faster
- 20,000 chars: 1.3352ms vs 21.31ms → 15.96× faster
- 50,000 chars: 2.0717ms vs 87.21ms → 42.10× faster
- 100,000 chars: 4.3360ms vs 114.54ms → 26.42× faster
- 200,000 chars: 10.55ms vs 220.13ms → 20.87× faster

Render vs remark+rehype:
- 5,000 chars: 0.2034ms vs 4.9827ms → 24.50× faster
- 20,000 chars: 1.3352ms vs 36.47ms → 27.32× faster
- 50,000 chars: 2.0717ms vs 72.25ms → 34.87× faster
- 100,000 chars: 4.3360ms vs 166.37ms → 38.37× faster
- 200,000 chars: 10.55ms vs 461.47ms → 43.75× faster

Render vs markdown-exit:
- 5,000 chars: 0.2034ms vs 0.3023ms → 1.49× faster
- 20,000 chars: 1.3352ms vs 1.5626ms → 1.17× faster
- 50,000 chars: 2.0717ms vs 2.9811ms → 1.44× faster
- 100,000 chars: 4.3360ms vs 6.2766ms → 1.45× faster
- 200,000 chars: 10.55ms vs 13.72ms → 1.30× faster
- 500,000 chars: 53.63ms vs 76.69ms → 1.43× faster
- 1,000,000 chars: 237.77ms vs 160.52ms → 0.68× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1815ms | 0.1847ms | 1.02× faster, 1.7% less time | 0.4385ms | 0.5729ms | 1.31× faster, 23.5% less time | S5/S2 |
| 20000 | 0.7075ms | 0.7303ms | 1.03× faster, 3.1% less time | 1.5239ms | 2.5230ms | 1.66× faster, 39.6% less time | S5/S2 |
| 50000 | 1.8124ms | 1.8263ms | 1.01× faster, 0.8% less time | 3.7102ms | 6.3649ms | 1.72× faster, 41.7% less time | S5/S3 |
| 100000 | 5.6879ms | 10.47ms | 1.84× faster, 45.7% less time | 9.5716ms | 37.02ms | 3.87× faster, 74.1% less time | S5/S3 |
| 200000 | 17.12ms | 18.08ms | 1.06× faster, 5.3% less time | 22.07ms | 55.64ms | 2.52× faster, 60.3% less time | S2/S3 |
| 500000 | 25.66ms | 60.81ms | 2.37× faster, 57.8% less time | 44.94ms | 179.83ms | 4× faster, 75% less time | S5/S3 |
| 1000000 | 65.28ms | 93.65ms | 1.43× faster, 30.3% less time | 90.99ms | 288.58ms | 3.17× faster, 68.5% less time | S2/S3 |

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
| markdown-exit | 0.2797ms | 0.2661ms |
| markdown-it (baseline) | 0.2607ms | 1.7577ms |
| markdown-it-ts (stream+chunk) | 0.2610ms | 0.2301ms |
| micromark (parse only) | 7.9765ms | 5.6798ms |
| remark (parse only) | 5.5203ms | 6.8152ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.9998ms | 0.9788ms |
| markdown-it (baseline) | 0.7665ms | 1.7927ms |
| markdown-it-ts (stream+chunk) | 0.9593ms | 1.7254ms |
| micromark (parse only) | 23.52ms | 32.30ms |
| remark (parse only) | 39.57ms | 39.82ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 2.4406ms | 3.8893ms |
| markdown-it (baseline) | 1.8333ms | 2.2801ms |
| markdown-it-ts (stream+chunk) | 2.3845ms | 3.2565ms |
| micromark (parse only) | 88.06ms | 90.53ms |
| remark (parse only) | 111.29ms | 118.32ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 4.9931ms | 5.1343ms |
| markdown-it (baseline) | 34.11ms | 5.6391ms |
| markdown-it-ts (stream+chunk) | 5.2975ms | 9.2175ms |
| micromark (parse only) | 102.16ms | 92.95ms |
| remark (parse only) | 143.30ms | 144.26ms |
