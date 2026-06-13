# Performance Report (latest run)

## Environment

- Generated at: 2026-06-13T02:37:10.849Z
- Node.js: v23.11.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: a2ccd63bbcd73c975100172a31909b82c962accb

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1812ms | 0.1410ms | 0.1741ms | 0.1708ms | **0.1402ms** | 0.1559ms | 0.2106ms | 3.5373ms | 0.5397ms | 0.2400ms | **0.2107ms** | 0.5168ms | 0.4966ms | 0.5261ms | 0.6675ms | 11.80ms | 1.5412ms | 0.3459ms | **0.3178ms** | 1.4918ms | 1.4357ms | 1.4955ms | 1.9925ms | 33.57ms | 0.2191ms | 0.1489ms | 0.1909ms | 0.1790ms | **0.1445ms** | 0.2236ms | 0.2183ms | 3.8001ms |
| 20000 | 0.6938ms | 0.5559ms | 0.6878ms | 0.6863ms | **0.5532ms** | 0.6310ms | 0.8378ms | 15.69ms | 2.3608ms | **0.7750ms** | 0.7838ms | 2.3684ms | 1.9783ms | 2.1575ms | 2.8549ms | 52.85ms | 6.4158ms | 1.1139ms | **1.0310ms** | 6.3833ms | 5.5712ms | 5.9397ms | 7.8323ms | 146.53ms | 0.7131ms | 0.5857ms | 0.6908ms | 0.7299ms | **0.5339ms** | 0.6594ms | 0.8432ms | 15.24ms |
| 50000 | 1.8623ms | **1.4411ms** | 1.8156ms | 1.8309ms | 1.4413ms | 1.6301ms | 2.1890ms | 43.59ms | 6.1229ms | **1.7983ms** | 1.8589ms | 5.9856ms | 5.2731ms | 5.3966ms | 7.0405ms | 146.56ms | 16.30ms | **2.2157ms** | 2.3066ms | 16.23ms | 13.98ms | 14.99ms | 19.30ms | 406.13ms | 1.7383ms | 1.4558ms | 1.7433ms | 1.7232ms | **1.3059ms** | 1.5848ms | 2.0824ms | 43.10ms |
| 100000 | 4.2507ms | **3.7266ms** | 4.2546ms | 4.2286ms | 4.0395ms | 4.3904ms | 5.3144ms | 87.88ms | 12.78ms | **4.1180ms** | 4.6951ms | 12.69ms | 11.44ms | 11.05ms | 14.28ms | 306.75ms | 33.71ms | **7.3833ms** | 7.4548ms | 33.91ms | 31.50ms | 29.72ms | 40.30ms | 826.45ms | 3.5411ms | **3.2372ms** | 3.5360ms | 3.5236ms | 3.6720ms | 3.3758ms | 4.6177ms | 89.83ms |
| 200000 | 9.3530ms | 8.9356ms | 9.2765ms | 9.6367ms | 9.8692ms | **8.5920ms** | 11.92ms | 180.11ms | 27.59ms | **9.4682ms** | 10.26ms | 27.61ms | 25.20ms | 23.74ms | 30.34ms | 643.65ms | 76.08ms | 17.63ms | **16.20ms** | 76.01ms | 76.20ms | 67.78ms | 87.72ms | 1734.18ms | 7.3837ms | 9.3773ms | 7.2320ms | 7.2381ms | 7.4180ms | **6.6576ms** | 10.08ms | 191.62ms |
| 500000 | 23.67ms | **22.95ms** | 25.24ms | 25.22ms | 23.61ms | 23.44ms | 28.97ms | - | 78.04ms | 27.48ms | **25.89ms** | 86.99ms | 87.70ms | 79.31ms | 95.98ms | - | 220.38ms | 29.45ms | **27.96ms** | 216.27ms | 233.02ms | 226.89ms | 278.16ms | - | 23.27ms | 23.59ms | **22.97ms** | 25.75ms | 23.16ms | 25.58ms | 28.20ms | - |
| 1000000 | **45.94ms** | 50.32ms | 47.20ms | 46.70ms | 47.24ms | 50.55ms | 60.31ms | - | 168.87ms | 66.62ms | **55.00ms** | 162.94ms | 178.75ms | 166.86ms | 230.89ms | - | 469.15ms | 69.03ms | **59.71ms** | 476.54ms | 486.90ms | 481.53ms | 595.17ms | - | 56.79ms | 51.38ms | 46.87ms | 46.87ms | **46.44ms** | 50.20ms | 58.72ms | - |

Best (one-shot) per size:
- 5000: S5 0.1402ms (stream OFF, chunk OFF)
- 20000: S5 0.5532ms (stream OFF, chunk OFF)
- 50000: S2 1.4411ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.7266ms (stream ON, cache ON, chunk OFF)
- 200000: M1 8.5920ms (markdown-it (baseline))
- 500000: S2 22.95ms (stream ON, cache ON, chunk OFF)
- 1000000: S1 45.94ms (stream ON, cache OFF, chunk ON)

Best (append workload) per size:
- 5000: S3 0.2107ms (stream ON, cache ON, chunk ON)
- 20000: S2 0.7750ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.7983ms (stream ON, cache ON, chunk OFF)
- 100000: S2 4.1180ms (stream ON, cache ON, chunk OFF)
- 200000: S2 9.4682ms (stream ON, cache ON, chunk OFF)
- 500000: S3 25.89ms (stream ON, cache ON, chunk ON)
- 1000000: S3 55.00ms (stream ON, cache ON, chunk ON)

Best (line-append workload) per size:
- 5000: S3 0.3178ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.0310ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.2157ms (stream ON, cache ON, chunk OFF)
- 100000: S2 7.3833ms (stream ON, cache ON, chunk OFF)
- 200000: S3 16.20ms (stream ON, cache ON, chunk ON)
- 500000: S3 27.96ms (stream ON, cache ON, chunk ON)
- 1000000: S3 59.71ms (stream ON, cache ON, chunk ON)

Best (replace-paragraph workload) per size:
- 5000: S5 0.1445ms (stream OFF, chunk OFF)
- 20000: S5 0.5339ms (stream OFF, chunk OFF)
- 50000: S5 1.3059ms (stream OFF, chunk OFF)
- 100000: S2 3.2372ms (stream ON, cache ON, chunk OFF)
- 200000: M1 6.6576ms (markdown-it (baseline))
- 500000: S3 22.97ms (stream ON, cache ON, chunk ON)
- 1000000: S5 46.44ms (stream OFF, chunk OFF)

Recommendations (by majority across sizes):
- One-shot: S2(3), S5(2), M1(1), S1(1)
- Append-heavy: S2(4), S3(3)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1579ms | 0.1911ms | 3.3175ms | 3.9992ms | 0.2444ms |
| 20000 | 0.6320ms | 0.7699ms | 19.45ms | 22.83ms | 0.9770ms |
| 50000 | 1.6934ms | 1.9240ms | 50.45ms | 66.75ms | 2.5188ms |
| 100000 | 4.4271ms | 5.1141ms | 103.23ms | 151.71ms | 6.3514ms |
| 200000 | 10.41ms | 12.22ms | 201.59ms | 360.25ms | 14.68ms |
| 500000 | 31.11ms | 34.63ms | - | - | 39.78ms |
| 1000000 | 57.73ms | 77.95ms | - | - | 84.72ms |

Render vs markdown-it:
- 5,000 chars: 0.1579ms vs 0.1911ms → 1.21× faster
- 20,000 chars: 0.6320ms vs 0.7699ms → 1.22× faster
- 50,000 chars: 1.6934ms vs 1.9240ms → 1.14× faster
- 100,000 chars: 4.4271ms vs 5.1141ms → 1.16× faster
- 200,000 chars: 10.41ms vs 12.22ms → 1.17× faster
- 500,000 chars: 31.11ms vs 34.63ms → 1.11× faster
- 1,000,000 chars: 57.73ms vs 77.95ms → 1.35× faster

Render vs micromark:
- 5,000 chars: 0.1579ms vs 3.3175ms → 21.01× faster
- 20,000 chars: 0.6320ms vs 19.45ms → 30.78× faster
- 50,000 chars: 1.6934ms vs 50.45ms → 29.79× faster
- 100,000 chars: 4.4271ms vs 103.23ms → 23.32× faster
- 200,000 chars: 10.41ms vs 201.59ms → 19.36× faster

Render vs remark+rehype:
- 5,000 chars: 0.1579ms vs 3.9992ms → 25.33× faster
- 20,000 chars: 0.6320ms vs 22.83ms → 36.12× faster
- 50,000 chars: 1.6934ms vs 66.75ms → 39.42× faster
- 100,000 chars: 4.4271ms vs 151.71ms → 34.27× faster
- 200,000 chars: 10.41ms vs 360.25ms → 34.60× faster

Render vs markdown-exit:
- 5,000 chars: 0.1579ms vs 0.2444ms → 1.55× faster
- 20,000 chars: 0.6320ms vs 0.9770ms → 1.55× faster
- 50,000 chars: 1.6934ms vs 2.5188ms → 1.49× faster
- 100,000 chars: 4.4271ms vs 6.3514ms → 1.43× faster
- 200,000 chars: 10.41ms vs 14.68ms → 1.41× faster
- 500,000 chars: 31.11ms vs 39.78ms → 1.28× faster
- 1,000,000 chars: 57.73ms vs 84.72ms → 1.47× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1402ms | 0.1559ms | 1.11× faster, 10% less time | 0.2107ms | 0.5261ms | 2.5× faster, 59.9% less time | S5/S3 |
| 20000 | 0.5532ms | 0.6310ms | 1.14× faster, 12.3% less time | 0.7750ms | 2.1575ms | 2.78× faster, 64.1% less time | S5/S2 |
| 50000 | 1.4411ms | 1.6301ms | 1.13× faster, 11.6% less time | 1.7983ms | 5.3966ms | 3× faster, 66.7% less time | S2/S2 |
| 100000 | 3.7266ms | 4.3904ms | 1.18× faster, 15.1% less time | 4.1180ms | 11.05ms | 2.68× faster, 62.7% less time | S2/S2 |
| 200000 | 8.9356ms | 8.5920ms | 1.04× slower, 4% more time | 9.4682ms | 23.74ms | 2.51× faster, 60.1% less time | S2/S2 |
| 500000 | 22.95ms | 23.44ms | 1.02× faster, 2.1% less time | 25.89ms | 79.31ms | 3.06× faster, 67.4% less time | S2/S3 |
| 1000000 | 45.94ms | 50.55ms | 1.1× faster, 9.1% less time | 55.00ms | 166.86ms | 3.03× faster, 67% less time | S1/S3 |

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
| markdown-exit | 0.2173ms | 0.2037ms |
| markdown-it (baseline) | 0.1593ms | 0.1473ms |
| markdown-it-ts (stream+chunk) | 0.1897ms | 0.1730ms |
| micromark (parse only) | 3.9973ms | 3.8597ms |
| remark (parse only) | 5.1131ms | 4.0680ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.8062ms | 0.8506ms |
| markdown-it (baseline) | 0.6173ms | 0.6338ms |
| markdown-it-ts (stream+chunk) | 0.6966ms | 0.7025ms |
| micromark (parse only) | 15.17ms | 15.94ms |
| remark (parse only) | 19.31ms | 19.98ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 1.9835ms | 2.2109ms |
| markdown-it (baseline) | 1.4825ms | 1.6510ms |
| markdown-it-ts (stream+chunk) | 1.6685ms | 1.8636ms |
| micromark (parse only) | 48.70ms | 43.36ms |
| remark (parse only) | 57.05ms | 57.67ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 4.9641ms | 5.0568ms |
| markdown-it (baseline) | 4.2020ms | 4.1094ms |
| markdown-it-ts (stream+chunk) | 3.3661ms | 4.2807ms |
| micromark (parse only) | 95.13ms | 86.61ms |
| remark (parse only) | 126.09ms | 131.29ms |
