# Performance Report (latest run)

## Environment

- Generated at: 2026-05-14T03:31:14.006Z
- Node.js: v23.11.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 946195e2f2980521974f02bcf415839fd30ad770

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2208ms | 0.1619ms | 0.1911ms | 0.1768ms | **0.1448ms** | 0.2630ms | 0.3136ms | 4.2385ms | 0.6086ms | 0.3279ms | **0.2794ms** | 0.5395ms | 0.5131ms | 0.5723ms | 0.7424ms | 12.99ms | 1.7556ms | 0.5609ms | **0.5331ms** | 1.4633ms | 1.5194ms | 1.5625ms | 2.1217ms | 36.92ms | 0.2244ms | 0.1785ms | 0.1841ms | 0.2179ms | **0.1419ms** | 0.2341ms | 0.3307ms | 3.9680ms |
| 20000 | 0.7819ms | 0.6218ms | 0.7865ms | 0.7438ms | **0.5903ms** | 0.6548ms | 0.8680ms | 17.81ms | 2.5770ms | **1.1127ms** | 1.2151ms | 2.5687ms | 2.0970ms | 2.2415ms | 2.8933ms | 56.41ms | 7.2616ms | **1.8999ms** | 2.1059ms | 6.8992ms | 5.9544ms | 6.2729ms | 8.0455ms | 159.21ms | 0.8149ms | 0.6564ms | 0.8021ms | 0.7207ms | **0.5925ms** | 0.6525ms | 0.8827ms | 16.68ms |
| 50000 | 2.0226ms | 1.6595ms | 2.0423ms | 1.9661ms | **1.5677ms** | 1.7021ms | 2.2452ms | 46.87ms | 6.6239ms | **2.5873ms** | 2.6207ms | 6.5004ms | 5.4719ms | 5.6121ms | 7.2617ms | 158.71ms | 17.88ms | **4.4156ms** | 4.5650ms | 17.39ms | 15.08ms | 15.34ms | 20.00ms | 468.75ms | 1.8888ms | 1.6933ms | 1.9212ms | 1.8263ms | **1.4929ms** | 1.6272ms | 2.2480ms | 44.43ms |
| 100000 | 5.2168ms | 4.2114ms | 4.7431ms | 4.8337ms | **3.7770ms** | 4.6536ms | 5.5021ms | 96.96ms | 15.05ms | **5.4172ms** | 5.6964ms | 14.03ms | 12.60ms | 11.53ms | 14.96ms | 319.31ms | 37.55ms | 9.0520ms | **8.9477ms** | 36.18ms | 33.31ms | 30.88ms | 41.58ms | 908.11ms | 4.0351ms | **3.5826ms** | 4.0356ms | 3.8006ms | 3.7302ms | 3.6258ms | 4.7358ms | 95.29ms |
| 200000 | 10.69ms | **10.10ms** | 10.71ms | 10.63ms | 10.15ms | 10.27ms | 12.17ms | 199.53ms | 31.10ms | **11.28ms** | 12.59ms | 29.30ms | 27.64ms | 24.87ms | 34.61ms | 688.17ms | 77.18ms | **19.11ms** | 25.00ms | 74.80ms | 79.62ms | 70.53ms | 95.46ms | 1832.38ms | 8.0693ms | 9.5296ms | 8.0764ms | 7.8744ms | 7.7813ms | **6.9167ms** | 9.5415ms | 184.39ms |
| 500000 | 25.56ms | 25.61ms | 26.90ms | **24.26ms** | 27.16ms | 24.78ms | 32.02ms | - | 83.00ms | 42.00ms | **40.49ms** | 82.31ms | 92.10ms | 96.89ms | 101.18ms | - | 238.79ms | 68.99ms | **63.77ms** | 234.77ms | 235.36ms | 238.51ms | 311.47ms | - | 25.28ms | **22.57ms** | 24.92ms | 24.83ms | 26.98ms | 25.52ms | 29.94ms | - |
| 1000000 | 54.41ms | 107.42ms | 58.58ms | **47.06ms** | 49.35ms | 59.67ms | 60.02ms | - | 189.76ms | 381.58ms | **80.26ms** | 183.58ms | 194.09ms | 190.48ms | 220.42ms | - | 691.79ms | 141.57ms | **131.01ms** | 488.35ms | 492.67ms | 500.65ms | 605.22ms | - | 281.73ms | 53.14ms | 57.16ms | **49.63ms** | 55.58ms | 52.53ms | 69.71ms | - |

Best (one-shot) per size:
- 5000: S5 0.1448ms (stream OFF, chunk OFF)
- 20000: S5 0.5903ms (stream OFF, chunk OFF)
- 50000: S5 1.5677ms (stream OFF, chunk OFF)
- 100000: S5 3.7770ms (stream OFF, chunk OFF)
- 200000: S2 10.10ms (stream ON, cache ON, chunk OFF)
- 500000: S4 24.26ms (stream OFF, chunk ON)
- 1000000: S4 47.06ms (stream OFF, chunk ON)

Best (append workload) per size:
- 5000: S3 0.2794ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.1127ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.5873ms (stream ON, cache ON, chunk OFF)
- 100000: S2 5.4172ms (stream ON, cache ON, chunk OFF)
- 200000: S2 11.28ms (stream ON, cache ON, chunk OFF)
- 500000: S3 40.49ms (stream ON, cache ON, chunk ON)
- 1000000: S3 80.26ms (stream ON, cache ON, chunk ON)

Best (line-append workload) per size:
- 5000: S3 0.5331ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.8999ms (stream ON, cache ON, chunk OFF)
- 50000: S2 4.4156ms (stream ON, cache ON, chunk OFF)
- 100000: S3 8.9477ms (stream ON, cache ON, chunk ON)
- 200000: S2 19.11ms (stream ON, cache ON, chunk OFF)
- 500000: S3 63.77ms (stream ON, cache ON, chunk ON)
- 1000000: S3 131.01ms (stream ON, cache ON, chunk ON)

Best (replace-paragraph workload) per size:
- 5000: S5 0.1419ms (stream OFF, chunk OFF)
- 20000: S5 0.5925ms (stream OFF, chunk OFF)
- 50000: S5 1.4929ms (stream OFF, chunk OFF)
- 100000: S2 3.5826ms (stream ON, cache ON, chunk OFF)
- 200000: M1 6.9167ms (markdown-it (baseline))
- 500000: S2 22.57ms (stream ON, cache ON, chunk OFF)
- 1000000: S4 49.63ms (stream OFF, chunk ON)

Recommendations (by majority across sizes):
- One-shot: S5(4), S4(2), S2(1)
- Append-heavy: S2(4), S3(3)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1793ms | 0.2059ms | 3.6437ms | 4.2929ms | 0.2487ms |
| 20000 | 0.6677ms | 0.7787ms | 19.91ms | 24.47ms | 0.9981ms |
| 50000 | 1.8301ms | 2.0047ms | 55.10ms | 74.42ms | 2.6056ms |
| 100000 | 4.6034ms | 5.3503ms | 107.22ms | 170.78ms | 6.3543ms |
| 200000 | 11.28ms | 13.16ms | 214.15ms | 377.11ms | 14.93ms |
| 500000 | 31.15ms | 37.07ms | - | - | 42.39ms |
| 1000000 | 66.77ms | 78.51ms | - | - | 81.11ms |

Render vs markdown-it:
- 5,000 chars: 0.1793ms vs 0.2059ms → 1.15× faster
- 20,000 chars: 0.6677ms vs 0.7787ms → 1.17× faster
- 50,000 chars: 1.8301ms vs 2.0047ms → 1.10× faster
- 100,000 chars: 4.6034ms vs 5.3503ms → 1.16× faster
- 200,000 chars: 11.28ms vs 13.16ms → 1.17× faster
- 500,000 chars: 31.15ms vs 37.07ms → 1.19× faster
- 1,000,000 chars: 66.77ms vs 78.51ms → 1.18× faster

Render vs micromark:
- 5,000 chars: 0.1793ms vs 3.6437ms → 20.32× faster
- 20,000 chars: 0.6677ms vs 19.91ms → 29.82× faster
- 50,000 chars: 1.8301ms vs 55.10ms → 30.11× faster
- 100,000 chars: 4.6034ms vs 107.22ms → 23.29× faster
- 200,000 chars: 11.28ms vs 214.15ms → 18.98× faster

Render vs remark+rehype:
- 5,000 chars: 0.1793ms vs 4.2929ms → 23.94× faster
- 20,000 chars: 0.6677ms vs 24.47ms → 36.64× faster
- 50,000 chars: 1.8301ms vs 74.42ms → 40.67× faster
- 100,000 chars: 4.6034ms vs 170.78ms → 37.10× faster
- 200,000 chars: 11.28ms vs 377.11ms → 33.42× faster

Render vs markdown-exit:
- 5,000 chars: 0.1793ms vs 0.2487ms → 1.39× faster
- 20,000 chars: 0.6677ms vs 0.9981ms → 1.49× faster
- 50,000 chars: 1.8301ms vs 2.6056ms → 1.42× faster
- 100,000 chars: 4.6034ms vs 6.3543ms → 1.38× faster
- 200,000 chars: 11.28ms vs 14.93ms → 1.32× faster
- 500,000 chars: 31.15ms vs 42.39ms → 1.36× faster
- 1,000,000 chars: 66.77ms vs 81.11ms → 1.21× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1448ms | 0.2630ms | 1.82× faster, 45% less time | 0.2794ms | 0.5723ms | 2.05× faster, 51.2% less time | S5/S3 |
| 20000 | 0.5903ms | 0.6548ms | 1.11× faster, 9.9% less time | 1.1127ms | 2.2415ms | 2.01× faster, 50.4% less time | S5/S2 |
| 50000 | 1.5677ms | 1.7021ms | 1.09× faster, 7.9% less time | 2.5873ms | 5.6121ms | 2.17× faster, 53.9% less time | S5/S2 |
| 100000 | 3.7770ms | 4.6536ms | 1.23× faster, 18.8% less time | 5.4172ms | 11.53ms | 2.13× faster, 53% less time | S5/S2 |
| 200000 | 10.10ms | 10.27ms | 1.02× faster, 1.7% less time | 11.28ms | 24.87ms | 2.2× faster, 54.6% less time | S2/S2 |
| 500000 | 24.26ms | 24.78ms | 1.02× faster, 2.1% less time | 40.49ms | 96.89ms | 2.39× faster, 58.2% less time | S4/S3 |
| 1000000 | 47.06ms | 59.67ms | 1.27× faster, 21.1% less time | 80.26ms | 190.48ms | 2.37× faster, 57.9% less time | S4/S3 |

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
| markdown-exit | 0.2338ms | 0.2092ms |
| markdown-it (baseline) | 0.1712ms | 0.1478ms |
| markdown-it-ts (stream+chunk) | 0.2097ms | 0.1829ms |
| micromark (parse only) | 3.6626ms | 3.5695ms |
| remark (parse only) | 4.3328ms | 3.8400ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 0.8468ms | 0.8731ms |
| markdown-it (baseline) | 0.6471ms | 0.6818ms |
| markdown-it-ts (stream+chunk) | 0.8078ms | 0.7828ms |
| micromark (parse only) | 16.58ms | 16.51ms |
| remark (parse only) | 21.43ms | 21.07ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 2.0236ms | 2.3363ms |
| markdown-it (baseline) | 1.4881ms | 1.7086ms |
| markdown-it-ts (stream+chunk) | 1.8599ms | 2.0154ms |
| micromark (parse only) | 40.32ms | 44.85ms |
| remark (parse only) | 65.53ms | 62.59ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| markdown-exit | 4.1545ms | 5.9437ms |
| markdown-it (baseline) | 4.5372ms | 6.1906ms |
| markdown-it-ts (stream+chunk) | 3.7872ms | 5.4689ms |
| micromark (parse only) | 219.89ms | 216.99ms |
| remark (parse only) | 141.53ms | 137.41ms |
