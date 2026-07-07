# Performance Report (latest run)

## Environment

- Generated at: 2026-07-07T11:25:38.026Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 8de7f88c3ff5dd832c77c1469644adc100b909aa

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2278ms | 0.1672ms | 0.2339ms | 0.2012ms | **0.0370ms** | 0.1864ms | 0.2563ms | 0.0394ms | 0.1760ms | 3.8927ms | 0.6344ms | 0.2884ms | 0.2763ms | 0.5985ms | 0.1106ms | 0.6008ms | 0.8332ms | **0.0615ms** | 0.1985ms | 12.98ms | 1.9256ms | 0.4662ms | 0.4086ms | 1.7656ms | 0.6086ms | 1.7308ms | 2.4159ms | **0.0914ms** | 0.2321ms | 37.96ms | 0.2455ms | 0.1745ms | 0.2012ms | 0.2124ms | 0.1893ms | 0.2014ms | 0.2946ms | **0.0385ms** | 0.1798ms | 4.2053ms |
| 20000 | 0.8014ms | 0.6633ms | 0.8054ms | 0.7900ms | **0.1257ms** | 0.7437ms | 1.0028ms | 0.1519ms | 0.7056ms | 18.18ms | 2.7295ms | 0.8829ms | 0.9713ms | 2.6998ms | 0.4237ms | 2.5811ms | 3.3982ms | **0.1842ms** | 0.7403ms | 60.38ms | 7.5504ms | 1.3528ms | 1.1963ms | 7.4495ms | 2.2211ms | 7.0056ms | 9.4761ms | **0.2302ms** | 0.8172ms | 168.93ms | 0.8520ms | 0.6430ms | 0.7815ms | 0.8313ms | 0.7618ms | 0.7587ms | 1.0136ms | **0.1525ms** | 0.7059ms | 19.38ms |
| 50000 | 2.0326ms | 1.6029ms | 2.0257ms | 2.0228ms | **0.3166ms** | 1.8776ms | 2.4976ms | 0.4370ms | 1.8260ms | 46.33ms | 7.1123ms | 2.0626ms | 2.1268ms | 7.0486ms | 1.1621ms | 6.4611ms | 8.7254ms | **0.4866ms** | 1.8490ms | 148.90ms | 19.18ms | 2.7397ms | 2.7695ms | 19.46ms | 3.1852ms | 17.60ms | 23.71ms | **0.4737ms** | 1.8912ms | 410.92ms | 2.0323ms | 1.5615ms | 2.0103ms | 2.2146ms | 1.8215ms | 1.8667ms | 2.4821ms | **0.4165ms** | 1.8168ms | 44.67ms |
| 100000 | 4.1497ms | 3.4149ms | 4.1803ms | 4.2592ms | **0.7012ms** | 3.8789ms | 5.2816ms | 0.9096ms | 3.6466ms | 93.68ms | 14.23ms | 4.6461ms | 4.5662ms | 14.49ms | 2.5259ms | 12.90ms | 17.52ms | **0.9328ms** | 3.6144ms | 316.05ms | 38.60ms | 5.9848ms | 5.4135ms | 38.50ms | 6.5724ms | 35.49ms | 47.20ms | **0.9469ms** | 3.7052ms | 859.56ms | 4.0476ms | 3.1219ms | 4.1911ms | 4.1768ms | 3.8399ms | 3.8466ms | 5.1502ms | **0.9396ms** | 3.6378ms | 93.25ms |
| 200000 | 9.1891ms | 7.7902ms | 9.2187ms | 8.9884ms | **1.8757ms** | 8.9453ms | 12.11ms | 2.0332ms | 7.6128ms | 186.45ms | 29.43ms | 10.55ms | 9.8197ms | 29.55ms | 5.1723ms | 28.28ms | 37.69ms | **2.0662ms** | 7.6164ms | 655.38ms | 79.54ms | 13.89ms | 13.34ms | 79.54ms | 13.44ms | 73.50ms | 102.30ms | **1.7687ms** | 7.2713ms | 1745.84ms | 9.0995ms | 7.0940ms | 9.2094ms | 8.6498ms | 9.8185ms | 8.1518ms | 11.53ms | **1.9851ms** | 7.4475ms | 182.05ms |
| 500000 | 27.44ms | 22.55ms | 24.08ms | 24.56ms | 5.8382ms | 26.13ms | 34.78ms | **5.0195ms** | 18.75ms | - | 73.85ms | 28.93ms | 26.57ms | 74.08ms | 16.39ms | 82.09ms | 107.29ms | **5.5203ms** | 19.49ms | - | 211.68ms | 33.39ms | 27.46ms | 206.32ms | 72.45ms | 221.96ms | 285.72ms | **5.6424ms** | 22.52ms | - | 24.82ms | 27.59ms | 21.02ms | 22.70ms | 25.85ms | 27.60ms | 30.56ms | **6.0142ms** | 18.74ms | - |
| 1000000 | 56.61ms | 52.35ms | 51.65ms | 54.49ms | 13.82ms | 65.34ms | 67.43ms | **9.4151ms** | 36.75ms | - | 162.61ms | 63.87ms | 58.83ms | 167.96ms | 52.32ms | 168.08ms | 210.37ms | **11.31ms** | 42.01ms | - | 442.04ms | 66.81ms | 86.04ms | 440.74ms | 112.04ms | 464.39ms | 563.02ms | **12.31ms** | 41.82ms | - | 63.24ms | 47.87ms | 51.58ms | 49.92ms | 72.28ms | 54.35ms | 68.03ms | **10.07ms** | 38.88ms | - |

Best (one-shot) per size:
- 5000: S5 0.0370ms (stream OFF, chunk OFF)
- 20000: S5 0.1257ms (stream OFF, chunk OFF)
- 50000: S5 0.3166ms (stream OFF, chunk OFF)
- 100000: S5 0.7012ms (stream OFF, chunk OFF)
- 200000: S5 1.8757ms (stream OFF, chunk OFF)
- 500000: OX1 5.0195ms (@ox-content/napi (parse only))
- 1000000: OX1 9.4151ms (@ox-content/napi (parse only))

Best (append workload) per size:
- 5000: OX1 0.0615ms (@ox-content/napi (parse only))
- 20000: OX1 0.1842ms (@ox-content/napi (parse only))
- 50000: OX1 0.4866ms (@ox-content/napi (parse only))
- 100000: OX1 0.9328ms (@ox-content/napi (parse only))
- 200000: OX1 2.0662ms (@ox-content/napi (parse only))
- 500000: OX1 5.5203ms (@ox-content/napi (parse only))
- 1000000: OX1 11.31ms (@ox-content/napi (parse only))

Best (line-append workload) per size:
- 5000: OX1 0.0914ms (@ox-content/napi (parse only))
- 20000: OX1 0.2302ms (@ox-content/napi (parse only))
- 50000: OX1 0.4737ms (@ox-content/napi (parse only))
- 100000: OX1 0.9469ms (@ox-content/napi (parse only))
- 200000: OX1 1.7687ms (@ox-content/napi (parse only))
- 500000: OX1 5.6424ms (@ox-content/napi (parse only))
- 1000000: OX1 12.31ms (@ox-content/napi (parse only))

Best (replace-paragraph workload) per size:
- 5000: OX1 0.0385ms (@ox-content/napi (parse only))
- 20000: OX1 0.1525ms (@ox-content/napi (parse only))
- 50000: OX1 0.4165ms (@ox-content/napi (parse only))
- 100000: OX1 0.9396ms (@ox-content/napi (parse only))
- 200000: OX1 1.9851ms (@ox-content/napi (parse only))
- 500000: OX1 6.0142ms (@ox-content/napi (parse only))
- 1000000: OX1 10.07ms (@ox-content/napi (parse only))

Recommendations (by majority across sizes):
- One-shot: S5(5), OX1(2)
- Append-heavy: OX1(7)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end render API throughput across markdown-it-ts, upstream markdown-it, @ox-content/napi, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0219ms | 0.0188ms | 0.2310ms | 0.0370ms | 4.0283ms | 4.7830ms | 0.3043ms |
| 20000 | 0.0720ms | 0.0708ms | 0.9308ms | 0.1924ms | 19.04ms | 22.79ms | 1.1829ms |
| 50000 | 0.1744ms | 0.1755ms | 2.3086ms | 0.3805ms | 55.36ms | 71.58ms | 2.9840ms |
| 100000 | 0.3470ms | 0.3479ms | 4.9021ms | 0.8208ms | 116.08ms | 170.11ms | 6.1366ms |
| 200000 | 0.7032ms | 0.6951ms | 11.17ms | 1.7989ms | 220.03ms | 414.05ms | 13.81ms |
| 500000 | 2.4839ms | 2.4290ms | 32.61ms | 4.3382ms | - | - | 41.66ms |
| 1000000 | 5.0445ms | 5.2277ms | 66.44ms | 7.9877ms | - | - | 85.55ms |

Render vs markdown-it:
- 5,000 chars: 0.0219ms vs 0.2310ms → 10.55× faster
- 20,000 chars: 0.0720ms vs 0.9308ms → 12.94× faster
- 50,000 chars: 0.1744ms vs 2.3086ms → 13.23× faster
- 100,000 chars: 0.3470ms vs 4.9021ms → 14.13× faster
- 200,000 chars: 0.7032ms vs 11.17ms → 15.89× faster
- 500,000 chars: 2.4839ms vs 32.61ms → 13.13× faster
- 1,000,000 chars: 5.0445ms vs 66.44ms → 13.17× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0219ms vs 0.0370ms → 1.69× faster, 40.8% less time
- 20,000 chars: 0.0720ms vs 0.1924ms → 2.67× faster, 62.6% less time
- 50,000 chars: 0.1744ms vs 0.3805ms → 2.18× faster, 54.2% less time
- 100,000 chars: 0.3470ms vs 0.8208ms → 2.37× faster, 57.7% less time
- 200,000 chars: 0.7032ms vs 1.7989ms → 2.56× faster, 60.9% less time
- 500,000 chars: 2.4839ms vs 4.3382ms → 1.75× faster, 42.7% less time
- 1,000,000 chars: 5.0445ms vs 7.9877ms → 1.58× faster, 36.8% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0188ms vs 0.0370ms → 1.97× faster, 49.3% less time
- 20,000 chars: 0.0708ms vs 0.1924ms → 2.72× faster, 63.2% less time
- 50,000 chars: 0.1755ms vs 0.3805ms → 2.17× faster, 53.9% less time
- 100,000 chars: 0.3479ms vs 0.8208ms → 2.36× faster, 57.6% less time
- 200,000 chars: 0.6951ms vs 1.7989ms → 2.59× faster, 61.4% less time
- 500,000 chars: 2.4290ms vs 4.3382ms → 1.79× faster, 44% less time
- 1,000,000 chars: 5.2277ms vs 7.9877ms → 1.53× faster, 34.6% less time

Render vs micromark:
- 5,000 chars: 0.0219ms vs 4.0283ms → 184.04× faster
- 20,000 chars: 0.0720ms vs 19.04ms → 264.69× faster
- 50,000 chars: 0.1744ms vs 55.36ms → 317.37× faster
- 100,000 chars: 0.3470ms vs 116.08ms → 334.53× faster
- 200,000 chars: 0.7032ms vs 220.03ms → 312.90× faster

Render vs remark+rehype:
- 5,000 chars: 0.0219ms vs 4.7830ms → 218.52× faster
- 20,000 chars: 0.0720ms vs 22.79ms → 316.68× faster
- 50,000 chars: 0.1744ms vs 71.58ms → 410.33× faster
- 100,000 chars: 0.3470ms vs 170.11ms → 490.24× faster
- 200,000 chars: 0.7032ms vs 414.05ms → 588.82× faster

Render vs markdown-exit:
- 5,000 chars: 0.0219ms vs 0.3043ms → 13.90× faster
- 20,000 chars: 0.0720ms vs 1.1829ms → 16.44× faster
- 50,000 chars: 0.1744ms vs 2.9840ms → 17.11× faster
- 100,000 chars: 0.3470ms vs 6.1366ms → 17.69× faster
- 200,000 chars: 0.7032ms vs 13.81ms → 19.64× faster
- 500,000 chars: 2.4839ms vs 41.66ms → 16.77× faster
- 1,000,000 chars: 5.0445ms vs 85.55ms → 16.96× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0370ms | 0.1864ms | 5.04× faster, 80.1% less time | 0.1106ms | 0.6008ms | 5.43× faster, 81.6% less time | S5/S5 |
| 20000 | 0.1257ms | 0.7437ms | 5.92× faster, 83.1% less time | 0.4237ms | 2.5811ms | 6.09× faster, 83.6% less time | S5/S5 |
| 50000 | 0.3166ms | 1.8776ms | 5.93× faster, 83.1% less time | 1.1621ms | 6.4611ms | 5.56× faster, 82% less time | S5/S5 |
| 100000 | 0.7012ms | 3.8789ms | 5.53× faster, 81.9% less time | 2.5259ms | 12.90ms | 5.11× faster, 80.4% less time | S5/S5 |
| 200000 | 1.8757ms | 8.9453ms | 4.77× faster, 79% less time | 5.1723ms | 28.28ms | 5.47× faster, 81.7% less time | S5/S5 |
| 500000 | 5.8382ms | 26.13ms | 4.48× faster, 77.7% less time | 16.39ms | 82.09ms | 5.01× faster, 80% less time | S5/S5 |
| 1000000 | 13.82ms | 65.34ms | 4.73× faster, 78.8% less time | 52.32ms | 168.08ms | 3.21× faster, 68.9% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Best-of markdown-it-ts vs @ox-content/napi

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0370ms | 0.0394ms | 1.06× faster, 6% less time | 0.1106ms | 0.0615ms | 1.8× slower, 80% more time | S5/S5 |
| 20000 | 0.1257ms | 0.1519ms | 1.21× faster, 17.3% less time | 0.4237ms | 0.1842ms | 2.3× slower, 130% more time | S5/S5 |
| 50000 | 0.3166ms | 0.4370ms | 1.38× faster, 27.6% less time | 1.1621ms | 0.4866ms | 2.39× slower, 138.8% more time | S5/S5 |
| 100000 | 0.7012ms | 0.9096ms | 1.3× faster, 22.9% less time | 2.5259ms | 0.9328ms | 2.71× slower, 170.8% more time | S5/S5 |
| 200000 | 1.8757ms | 2.0332ms | 1.08× faster, 7.7% less time | 5.1723ms | 2.0662ms | 2.5× slower, 150.3% more time | S5/S5 |
| 500000 | 5.8382ms | 5.0195ms | 1.16× slower, 16.3% more time | 16.39ms | 5.5203ms | 2.97× slower, 197% more time | S5/S5 |
| 1000000 | 13.82ms | 9.4151ms | 1.47× slower, 46.8% more time | 52.32ms | 11.31ms | 4.63× slower, 362.7% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0370ms | 0.1760ms | 4.76× faster, 79% less time |
| 20000 | 0.1257ms | 0.7056ms | 5.61× faster, 82.2% less time |
| 50000 | 0.3166ms | 1.8260ms | 5.77× faster, 82.7% less time |
| 100000 | 0.7012ms | 3.6466ms | 5.2× faster, 80.8% less time |
| 200000 | 1.8757ms | 7.6128ms | 4.06× faster, 75.4% less time |
| 500000 | 5.8382ms | 18.75ms | 3.21× faster, 68.9% less time |
| 1000000 | 13.82ms | 36.75ms | 2.66× faster, 62.4% less time |

Experimental stock-subset AST JSON output:

This is not the default markdown-it-compatible `Token[]` API. It emits the same mdast JSON string as @ox-content/napi for the stock subset covered by the internal fast path, to measure how far a compact/string boundary can go without JS Token materialization.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0252ms | 0.0554ms | 2.19× faster, 54.4% less time | 0.1949ms |
| 20000 | 0.0876ms | 0.1644ms | 1.88× faster, 46.7% less time | 0.7404ms |
| 50000 | 0.2127ms | 0.4757ms | 2.24× faster, 55.3% less time | 1.9137ms |
| 100000 | 0.4278ms | 0.9498ms | 2.22× faster, 55% less time | 3.8035ms |
| 200000 | 0.8400ms | 2.0047ms | 2.39× faster, 58.1% less time | 7.9218ms |
| 500000 | 2.0793ms | 4.9966ms | 2.4× faster, 58.4% less time | 19.49ms |
| 1000000 | 4.5447ms | 9.9298ms | 2.18× faster, 54.2% less time | 38.01ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.2070ms | 0.1753ms |
| @ox-content/napi (parse only) | 0.0515ms | 0.0379ms |
| markdown-exit | 0.6222ms | 0.5733ms |
| markdown-it (baseline) | 0.2213ms | 0.1803ms |
| markdown-it-ts (stream+chunk) | 0.2276ms | 0.1986ms |
| micromark (parse only) | 4.8236ms | 3.6836ms |
| remark (parse only) | 4.4560ms | 4.1967ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7554ms | 0.7571ms |
| @ox-content/napi (parse only) | 0.1777ms | 0.1623ms |
| markdown-exit | 1.0384ms | 1.0187ms |
| markdown-it (baseline) | 0.7896ms | 0.8731ms |
| markdown-it-ts (stream+chunk) | 0.8612ms | 0.8123ms |
| micromark (parse only) | 17.95ms | 16.97ms |
| remark (parse only) | 20.97ms | 20.79ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.9239ms | 1.9530ms |
| @ox-content/napi (parse only) | 0.4812ms | 0.4836ms |
| markdown-exit | 4.6112ms | 4.1526ms |
| markdown-it (baseline) | 1.9410ms | 1.8664ms |
| markdown-it-ts (stream+chunk) | 2.0212ms | 1.9959ms |
| micromark (parse only) | 44.35ms | 47.36ms |
| remark (parse only) | 65.54ms | 64.71ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.6307ms | 3.8641ms |
| @ox-content/napi (parse only) | 0.8837ms | 0.9334ms |
| markdown-exit | 5.0484ms | 5.5279ms |
| markdown-it (baseline) | 3.7760ms | 3.8605ms |
| markdown-it-ts (stream+chunk) | 6.8718ms | 4.3318ms |
| micromark (parse only) | 87.42ms | 95.61ms |
| remark (parse only) | 147.23ms | 154.76ms |
