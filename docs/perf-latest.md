# Performance Report (latest run)

## Environment

- Generated at: 2026-06-23T08:32:51.408Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 4e7ed24cb947b8ff72e6a4688e09465a15db6161

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2156ms | 0.1677ms | 0.2124ms | 0.2006ms | 0.1518ms | 0.1858ms | 0.2521ms | **0.0385ms** | 3.7273ms | 0.6491ms | 0.2959ms | 0.2757ms | 0.5923ms | 0.5303ms | 0.5881ms | 0.8341ms | **0.0594ms** | 12.64ms | 1.8462ms | 0.4666ms | 0.4073ms | 1.7806ms | 1.5371ms | 1.7446ms | 2.3225ms | **0.0923ms** | 36.05ms | 0.2402ms | 0.1730ms | 0.2041ms | 0.2178ms | 0.1607ms | 0.2054ms | 0.2616ms | **0.0383ms** | 3.5427ms |
| 20000 | 0.7958ms | 0.6380ms | 0.7930ms | 0.7942ms | 0.5978ms | 0.7267ms | 0.9850ms | **0.1473ms** | 17.67ms | 2.6938ms | 0.8608ms | 0.9051ms | 2.6498ms | 2.1541ms | 2.5104ms | 3.4185ms | **0.1827ms** | 58.07ms | 7.4170ms | 1.3534ms | 1.2161ms | 7.4064ms | 6.0943ms | 6.8623ms | 9.2643ms | **0.2228ms** | 159.34ms | 0.8602ms | 0.6437ms | 0.7977ms | 0.7769ms | 0.6015ms | 0.7368ms | 0.9925ms | **0.1462ms** | 16.84ms |
| 50000 | 2.0389ms | 1.5957ms | 1.9850ms | 1.9818ms | 1.5199ms | 1.8192ms | 2.4592ms | **0.3982ms** | 45.13ms | 7.1610ms | 2.4895ms | 2.5312ms | 6.7743ms | 5.6012ms | 6.3452ms | 8.5280ms | **0.4526ms** | 140.68ms | 19.02ms | 3.0095ms | 2.9864ms | 18.50ms | 15.10ms | 17.16ms | 23.17ms | **0.4752ms** | 378.74ms | 2.0855ms | 1.5439ms | 1.9355ms | 1.9725ms | 1.4629ms | 1.8176ms | 2.6289ms | **0.4345ms** | 45.16ms |
| 100000 | 4.1827ms | 3.3948ms | 4.1321ms | 4.1530ms | 3.3294ms | 3.8147ms | 5.1637ms | **0.8657ms** | 90.91ms | 14.17ms | 4.4138ms | 4.4542ms | 14.17ms | 11.64ms | 13.12ms | 17.07ms | **0.8777ms** | 311.75ms | 38.22ms | 5.7556ms | 5.3388ms | 37.77ms | 30.94ms | 35.06ms | 46.86ms | **0.9762ms** | 850.73ms | 4.2402ms | 3.2249ms | 4.2889ms | 4.0266ms | 3.1023ms | 3.8966ms | 5.8781ms | **0.9039ms** | 92.32ms |
| 200000 | 8.9370ms | 8.0228ms | 8.7662ms | 8.8450ms | 9.1129ms | 9.3703ms | 11.78ms | **1.8078ms** | 183.73ms | 28.73ms | 10.92ms | 9.7703ms | 28.64ms | 26.69ms | 28.06ms | 36.53ms | **1.8619ms** | 633.20ms | 77.80ms | 13.37ms | 12.65ms | 77.84ms | 68.86ms | 72.35ms | 97.99ms | **1.7349ms** | 1749.66ms | 8.7669ms | 6.6147ms | 10.43ms | 8.5398ms | 8.2091ms | 7.9097ms | 11.15ms | **1.8181ms** | 183.35ms |
| 500000 | 23.49ms | 22.33ms | 23.89ms | 25.43ms | 24.23ms | 23.57ms | 31.38ms | **4.5466ms** | - | 71.19ms | 29.53ms | 26.96ms | 71.03ms | 71.58ms | 73.57ms | 101.24ms | **5.4245ms** | - | 205.07ms | 38.36ms | 28.77ms | 202.10ms | 195.27ms | 212.10ms | 270.88ms | **5.9210ms** | - | 22.50ms | 24.83ms | 21.05ms | 26.11ms | 21.13ms | 23.08ms | 29.16ms | **4.5771ms** | - |
| 1000000 | 57.89ms | 51.22ms | 52.59ms | 50.21ms | 52.90ms | 51.59ms | 64.89ms | **9.1292ms** | - | 169.10ms | 50.21ms | 68.73ms | 168.40ms | 164.10ms | 167.35ms | 211.47ms | **10.87ms** | - | 417.42ms | 71.49ms | 74.99ms | 449.26ms | 424.70ms | 467.80ms | 587.33ms | **11.59ms** | - | 50.70ms | 54.37ms | 49.80ms | 45.58ms | 58.66ms | 51.86ms | 61.70ms | **8.6302ms** | - |

Best (one-shot) per size:
- 5000: OX1 0.0385ms (@ox-content/napi (parse only))
- 20000: OX1 0.1473ms (@ox-content/napi (parse only))
- 50000: OX1 0.3982ms (@ox-content/napi (parse only))
- 100000: OX1 0.8657ms (@ox-content/napi (parse only))
- 200000: OX1 1.8078ms (@ox-content/napi (parse only))
- 500000: OX1 4.5466ms (@ox-content/napi (parse only))
- 1000000: OX1 9.1292ms (@ox-content/napi (parse only))

Best (append workload) per size:
- 5000: OX1 0.0594ms (@ox-content/napi (parse only))
- 20000: OX1 0.1827ms (@ox-content/napi (parse only))
- 50000: OX1 0.4526ms (@ox-content/napi (parse only))
- 100000: OX1 0.8777ms (@ox-content/napi (parse only))
- 200000: OX1 1.8619ms (@ox-content/napi (parse only))
- 500000: OX1 5.4245ms (@ox-content/napi (parse only))
- 1000000: OX1 10.87ms (@ox-content/napi (parse only))

Best (line-append workload) per size:
- 5000: OX1 0.0923ms (@ox-content/napi (parse only))
- 20000: OX1 0.2228ms (@ox-content/napi (parse only))
- 50000: OX1 0.4752ms (@ox-content/napi (parse only))
- 100000: OX1 0.9762ms (@ox-content/napi (parse only))
- 200000: OX1 1.7349ms (@ox-content/napi (parse only))
- 500000: OX1 5.9210ms (@ox-content/napi (parse only))
- 1000000: OX1 11.59ms (@ox-content/napi (parse only))

Best (replace-paragraph workload) per size:
- 5000: OX1 0.0383ms (@ox-content/napi (parse only))
- 20000: OX1 0.1462ms (@ox-content/napi (parse only))
- 50000: OX1 0.4345ms (@ox-content/napi (parse only))
- 100000: OX1 0.9039ms (@ox-content/napi (parse only))
- 200000: OX1 1.8181ms (@ox-content/napi (parse only))
- 500000: OX1 4.5771ms (@ox-content/napi (parse only))
- 1000000: OX1 8.6302ms (@ox-content/napi (parse only))

Recommendations (by majority across sizes):
- One-shot: OX1(7)
- Append-heavy: OX1(7)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end `md.render(markdown)` throughput across markdown-it-ts, upstream markdown-it, @ox-content/napi, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1788ms | 0.2295ms | 0.0363ms | 3.7884ms | 4.6022ms | 0.2964ms |
| 20000 | 0.6922ms | 0.9002ms | 0.1993ms | 17.34ms | 21.75ms | 1.1671ms |
| 50000 | 1.7665ms | 2.3280ms | 0.3918ms | 53.86ms | 72.08ms | 2.9734ms |
| 100000 | 3.9285ms | 4.8812ms | 0.8645ms | 112.04ms | 179.17ms | 6.1817ms |
| 200000 | 9.4031ms | 10.90ms | 1.7523ms | 218.58ms | 408.80ms | 13.48ms |
| 500000 | 26.81ms | 32.53ms | 4.2530ms | - | - | 41.08ms |
| 1000000 | 60.35ms | 77.40ms | 8.3173ms | - | - | 86.49ms |

Render vs markdown-it:
- 5,000 chars: 0.1788ms vs 0.2295ms → 1.28× faster
- 20,000 chars: 0.6922ms vs 0.9002ms → 1.30× faster
- 50,000 chars: 1.7665ms vs 2.3280ms → 1.32× faster
- 100,000 chars: 3.9285ms vs 4.8812ms → 1.24× faster
- 200,000 chars: 9.4031ms vs 10.90ms → 1.16× faster
- 500,000 chars: 26.81ms vs 32.53ms → 1.21× faster
- 1,000,000 chars: 60.35ms vs 77.40ms → 1.28× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.1788ms vs 0.0363ms → 4.93× slower, 393.1% more time
- 20,000 chars: 0.6922ms vs 0.1993ms → 3.47× slower, 247.2% more time
- 50,000 chars: 1.7665ms vs 0.3918ms → 4.51× slower, 350.9% more time
- 100,000 chars: 3.9285ms vs 0.8645ms → 4.54× slower, 354.4% more time
- 200,000 chars: 9.4031ms vs 1.7523ms → 5.37× slower, 436.6% more time
- 500,000 chars: 26.81ms vs 4.2530ms → 6.3× slower, 530.4% more time
- 1,000,000 chars: 60.35ms vs 8.3173ms → 7.26× slower, 625.6% more time

Render vs micromark:
- 5,000 chars: 0.1788ms vs 3.7884ms → 21.19× faster
- 20,000 chars: 0.6922ms vs 17.34ms → 25.06× faster
- 50,000 chars: 1.7665ms vs 53.86ms → 30.49× faster
- 100,000 chars: 3.9285ms vs 112.04ms → 28.52× faster
- 200,000 chars: 9.4031ms vs 218.58ms → 23.25× faster

Render vs remark+rehype:
- 5,000 chars: 0.1788ms vs 4.6022ms → 25.74× faster
- 20,000 chars: 0.6922ms vs 21.75ms → 31.41× faster
- 50,000 chars: 1.7665ms vs 72.08ms → 40.81× faster
- 100,000 chars: 3.9285ms vs 179.17ms → 45.61× faster
- 200,000 chars: 9.4031ms vs 408.80ms → 43.48× faster

Render vs markdown-exit:
- 5,000 chars: 0.1788ms vs 0.2964ms → 1.66× faster
- 20,000 chars: 0.6922ms vs 1.1671ms → 1.69× faster
- 50,000 chars: 1.7665ms vs 2.9734ms → 1.68× faster
- 100,000 chars: 3.9285ms vs 6.1817ms → 1.57× faster
- 200,000 chars: 9.4031ms vs 13.48ms → 1.43× faster
- 500,000 chars: 26.81ms vs 41.08ms → 1.53× faster
- 1,000,000 chars: 60.35ms vs 86.49ms → 1.43× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1518ms | 0.1858ms | 1.22× faster, 18.3% less time | 0.2757ms | 0.5881ms | 2.13× faster, 53.1% less time | S5/S3 |
| 20000 | 0.5978ms | 0.7267ms | 1.22× faster, 17.7% less time | 0.8608ms | 2.5104ms | 2.92× faster, 65.7% less time | S5/S2 |
| 50000 | 1.5199ms | 1.8192ms | 1.2× faster, 16.5% less time | 2.4895ms | 6.3452ms | 2.55× faster, 60.8% less time | S5/S2 |
| 100000 | 3.3294ms | 3.8147ms | 1.15× faster, 12.7% less time | 4.4138ms | 13.12ms | 2.97× faster, 66.4% less time | S5/S2 |
| 200000 | 8.0228ms | 9.3703ms | 1.17× faster, 14.4% less time | 9.7703ms | 28.06ms | 2.87× faster, 65.2% less time | S2/S3 |
| 500000 | 22.33ms | 23.57ms | 1.06× faster, 5.3% less time | 26.96ms | 73.57ms | 2.73× faster, 63.4% less time | S2/S3 |
| 1000000 | 50.21ms | 51.59ms | 1.03× faster, 2.7% less time | 50.21ms | 167.35ms | 3.33× faster, 70% less time | S4/S2 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Best-of markdown-it-ts vs @ox-content/napi

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.1518ms | 0.0385ms | 3.95× slower, 294.7% more time | 0.2757ms | 0.0594ms | 4.64× slower, 364% more time | S5/S3 |
| 20000 | 0.5978ms | 0.1473ms | 4.06× slower, 305.8% more time | 0.8608ms | 0.1827ms | 4.71× slower, 371.2% more time | S5/S2 |
| 50000 | 1.5199ms | 0.3982ms | 3.82× slower, 281.7% more time | 2.4895ms | 0.4526ms | 5.5× slower, 450% more time | S5/S2 |
| 100000 | 3.3294ms | 0.8657ms | 3.85× slower, 284.6% more time | 4.4138ms | 0.8777ms | 5.03× slower, 402.9% more time | S5/S2 |
| 200000 | 8.0228ms | 1.8078ms | 4.44× slower, 343.8% more time | 9.7703ms | 1.8619ms | 5.25× slower, 424.8% more time | S2/S3 |
| 500000 | 22.33ms | 4.5466ms | 4.91× slower, 391% more time | 26.96ms | 5.4245ms | 4.97× slower, 397% more time | S2/S3 |
| 1000000 | 50.21ms | 9.1292ms | 5.5× slower, 449.9% more time | 50.21ms | 10.87ms | 4.62× slower, 362% more time | S4/S2 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.


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

Cold-start parses instantiate a new parser and run once with no warmup. Hot parses use a fresh instance with warmup plus averaged runs across markdown-it-ts and external baselines.

#### 5,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse only) | 0.0701ms | 0.0499ms |
| markdown-exit | 0.6175ms | 0.5488ms |
| markdown-it (baseline) | 0.2052ms | 0.1799ms |
| markdown-it-ts (stream+chunk) | 0.2212ms | 0.1936ms |
| micromark (parse only) | 3.9881ms | 3.3620ms |
| remark (parse only) | 4.9138ms | 4.1169ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse only) | 0.1690ms | 0.1617ms |
| markdown-exit | 1.1556ms | 1.1852ms |
| markdown-it (baseline) | 0.7990ms | 0.7197ms |
| markdown-it-ts (stream+chunk) | 0.8395ms | 0.7567ms |
| micromark (parse only) | 13.97ms | 15.73ms |
| remark (parse only) | 19.97ms | 19.09ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse only) | 0.5185ms | 0.4555ms |
| markdown-exit | 2.4273ms | 2.5624ms |
| markdown-it (baseline) | 1.9170ms | 1.8774ms |
| markdown-it-ts (stream+chunk) | 1.9809ms | 2.0771ms |
| micromark (parse only) | 44.55ms | 45.09ms |
| remark (parse only) | 63.55ms | 62.15ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse only) | 0.9121ms | 0.9470ms |
| markdown-exit | 5.0300ms | 5.0930ms |
| markdown-it (baseline) | 3.6798ms | 3.8369ms |
| markdown-it-ts (stream+chunk) | 3.9048ms | 4.1624ms |
| micromark (parse only) | 89.44ms | 92.87ms |
| remark (parse only) | 141.42ms | 144.54ms |
