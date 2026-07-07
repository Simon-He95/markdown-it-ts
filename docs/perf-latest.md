# Performance Report (latest run)

## Environment

- Generated at: 2026-06-25T03:33:14.037Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: f2f4f244c829d04ea503e5a205c609e8e2624c1a

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2227ms | 0.1646ms | 0.2045ms | 0.1989ms | 0.0428ms | 0.1871ms | 0.2529ms | **0.0391ms** | 0.1804ms | 3.2411ms | 0.6258ms | 0.2887ms | 0.2827ms | 0.5917ms | 0.1057ms | 0.5885ms | 0.8217ms | **0.0588ms** | 0.2016ms | 10.05ms | 1.8510ms | 0.4723ms | 0.4294ms | 1.6698ms | 0.6605ms | 1.7591ms | 2.3755ms | **0.0920ms** | 0.2424ms | 28.76ms | 0.2283ms | 0.1714ms | 0.1998ms | 0.2102ms | 0.1889ms | 0.1960ms | 0.2709ms | **0.0382ms** | 0.1782ms | 3.0249ms |
| 20000 | 0.7858ms | 0.6317ms | 0.7884ms | 0.7875ms | **0.1240ms** | 0.7473ms | 0.9981ms | 0.1537ms | 0.7100ms | 16.94ms | 2.7670ms | 0.8818ms | 0.8821ms | 2.6629ms | 0.4323ms | 2.4988ms | 3.4693ms | **0.1914ms** | 0.7291ms | 48.95ms | 7.5371ms | 1.3101ms | 1.1733ms | 7.4403ms | 2.2074ms | 7.0344ms | 9.5117ms | **0.2298ms** | 0.7834ms | 138.20ms | 0.7877ms | 0.6768ms | 0.7868ms | 0.7870ms | 0.7444ms | 0.7687ms | 1.0310ms | **0.1533ms** | 0.6918ms | 15.42ms |
| 50000 | 2.0358ms | 1.5991ms | 1.9948ms | 2.0080ms | **0.3053ms** | 1.8778ms | 2.5042ms | 0.4175ms | 1.7510ms | 48.62ms | 7.0985ms | 2.0384ms | 2.1619ms | 7.0661ms | 1.1065ms | 6.5636ms | 8.7088ms | **0.4900ms** | 1.7916ms | 166.88ms | 19.14ms | 2.7400ms | 3.0005ms | 21.14ms | 3.0993ms | 17.52ms | 23.76ms | **0.4760ms** | 1.8547ms | 483.07ms | 2.0079ms | 1.5510ms | 1.9885ms | 1.9544ms | 1.7433ms | 1.9483ms | 2.6530ms | **0.4466ms** | 1.7454ms | 47.00ms |
| 100000 | 4.3159ms | 3.3467ms | 4.2129ms | 4.2412ms | **0.7143ms** | 3.8961ms | 5.2621ms | 0.9148ms | 3.5803ms | 93.08ms | 14.37ms | 4.9664ms | 4.5253ms | 14.16ms | 2.5090ms | 13.14ms | 17.67ms | **0.9282ms** | 3.5749ms | 319.02ms | 38.73ms | 6.0692ms | 5.6088ms | 38.22ms | 6.8264ms | 35.89ms | 50.50ms | **0.9915ms** | 3.6714ms | 867.80ms | 4.2704ms | 3.1658ms | 4.1880ms | 4.0370ms | 3.8146ms | 3.8209ms | 5.1339ms | **0.9216ms** | 4.9115ms | 94.94ms |
| 200000 | 8.8540ms | 7.6473ms | 9.7475ms | 9.1303ms | **1.6306ms** | 9.5200ms | 12.05ms | 1.9186ms | 7.4747ms | 185.53ms | 29.61ms | 10.34ms | 10.03ms | 29.15ms | 5.1514ms | 28.65ms | 37.92ms | **2.2404ms** | 7.5599ms | 658.98ms | 80.23ms | 12.84ms | 11.81ms | 78.32ms | 13.52ms | 75.11ms | 102.01ms | **1.7577ms** | 7.2336ms | 1778.80ms | 8.1441ms | 7.2214ms | 8.8176ms | 9.6969ms | 9.6904ms | 12.46ms | 11.46ms | **1.8801ms** | 7.3345ms | 184.18ms |
| 500000 | 24.34ms | 22.89ms | 24.84ms | 24.43ms | 5.5632ms | 29.21ms | 36.02ms | **5.0302ms** | 18.33ms | - | 74.75ms | 30.76ms | 29.10ms | 72.86ms | 15.50ms | 83.18ms | 109.47ms | **5.3134ms** | 19.43ms | - | 211.60ms | 35.17ms | 37.89ms | 208.25ms | 73.71ms | 222.62ms | 294.72ms | **5.7979ms** | 19.52ms | - | 23.03ms | 22.88ms | 21.76ms | 23.10ms | 25.96ms | 22.82ms | 32.70ms | **4.8406ms** | 18.06ms | - |
| 1000000 | 52.91ms | 55.40ms | 52.86ms | 49.11ms | 14.14ms | 66.81ms | 68.21ms | **10.60ms** | 36.46ms | - | 177.33ms | 57.95ms | 63.31ms | 169.73ms | 47.84ms | 166.96ms | 221.62ms | **12.24ms** | 41.14ms | - | 440.11ms | 90.74ms | 68.65ms | 456.01ms | 109.96ms | 465.14ms | 573.11ms | **12.28ms** | 39.92ms | - | 47.71ms | 67.22ms | 62.36ms | 46.67ms | 71.46ms | 54.02ms | 87.65ms | **10.98ms** | 39.23ms | - |

Best (one-shot) per size:
- 5000: OX1 0.0391ms (@ox-content/napi (parse only))
- 20000: S5 0.1240ms (stream OFF, chunk OFF)
- 50000: S5 0.3053ms (stream OFF, chunk OFF)
- 100000: S5 0.7143ms (stream OFF, chunk OFF)
- 200000: S5 1.6306ms (stream OFF, chunk OFF)
- 500000: OX1 5.0302ms (@ox-content/napi (parse only))
- 1000000: OX1 10.60ms (@ox-content/napi (parse only))

Best (append workload) per size:
- 5000: OX1 0.0588ms (@ox-content/napi (parse only))
- 20000: OX1 0.1914ms (@ox-content/napi (parse only))
- 50000: OX1 0.4900ms (@ox-content/napi (parse only))
- 100000: OX1 0.9282ms (@ox-content/napi (parse only))
- 200000: OX1 2.2404ms (@ox-content/napi (parse only))
- 500000: OX1 5.3134ms (@ox-content/napi (parse only))
- 1000000: OX1 12.24ms (@ox-content/napi (parse only))

Best (line-append workload) per size:
- 5000: OX1 0.0920ms (@ox-content/napi (parse only))
- 20000: OX1 0.2298ms (@ox-content/napi (parse only))
- 50000: OX1 0.4760ms (@ox-content/napi (parse only))
- 100000: OX1 0.9915ms (@ox-content/napi (parse only))
- 200000: OX1 1.7577ms (@ox-content/napi (parse only))
- 500000: OX1 5.7979ms (@ox-content/napi (parse only))
- 1000000: OX1 12.28ms (@ox-content/napi (parse only))

Best (replace-paragraph workload) per size:
- 5000: OX1 0.0382ms (@ox-content/napi (parse only))
- 20000: OX1 0.1533ms (@ox-content/napi (parse only))
- 50000: OX1 0.4466ms (@ox-content/napi (parse only))
- 100000: OX1 0.9216ms (@ox-content/napi (parse only))
- 200000: OX1 1.8801ms (@ox-content/napi (parse only))
- 500000: OX1 4.8406ms (@ox-content/napi (parse only))
- 1000000: OX1 10.98ms (@ox-content/napi (parse only))

Recommendations (by majority across sizes):
- One-shot: S5(4), OX1(3)
- Append-heavy: OX1(7)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Render API throughput (markdown → HTML)

This measures end-to-end render API throughput across markdown-it-ts, upstream markdown-it, @ox-content/napi, micromark (CommonMark reference), and remark+rehype (parse + stringify). Lower is better.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0211ms | 0.0188ms | 0.2325ms | 0.0396ms | 3.9504ms | 4.7196ms | 0.3025ms |
| 20000 | 0.0709ms | 0.0710ms | 0.9251ms | 0.2198ms | 18.65ms | 23.42ms | 1.1912ms |
| 50000 | 0.1773ms | 0.1743ms | 2.3236ms | 0.3884ms | 56.63ms | 72.22ms | 2.9979ms |
| 100000 | 0.3448ms | 0.3464ms | 4.8841ms | 0.9385ms | 116.87ms | 163.12ms | 6.1147ms |
| 200000 | 0.7008ms | 0.7033ms | 11.17ms | 1.9480ms | 218.02ms | 412.29ms | 13.97ms |
| 500000 | 2.5474ms | 2.4810ms | 34.53ms | 4.6981ms | - | - | 41.36ms |
| 1000000 | 5.0603ms | 5.0042ms | 75.93ms | 8.3897ms | - | - | 92.82ms |

Render vs markdown-it:
- 5,000 chars: 0.0211ms vs 0.2325ms → 11.04× faster
- 20,000 chars: 0.0709ms vs 0.9251ms → 13.05× faster
- 50,000 chars: 0.1773ms vs 2.3236ms → 13.11× faster
- 100,000 chars: 0.3448ms vs 4.8841ms → 14.17× faster
- 200,000 chars: 0.7008ms vs 11.17ms → 15.94× faster
- 500,000 chars: 2.5474ms vs 34.53ms → 13.56× faster
- 1,000,000 chars: 5.0603ms vs 75.93ms → 15.01× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0211ms vs 0.0396ms → 1.88× faster, 46.8% less time
- 20,000 chars: 0.0709ms vs 0.2198ms → 3.1× faster, 67.7% less time
- 50,000 chars: 0.1773ms vs 0.3884ms → 2.19× faster, 54.4% less time
- 100,000 chars: 0.3448ms vs 0.9385ms → 2.72× faster, 63.3% less time
- 200,000 chars: 0.7008ms vs 1.9480ms → 2.78× faster, 64% less time
- 500,000 chars: 2.5474ms vs 4.6981ms → 1.84× faster, 45.8% less time
- 1,000,000 chars: 5.0603ms vs 8.3897ms → 1.66× faster, 39.7% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0188ms vs 0.0396ms → 2.1× faster, 52.4% less time
- 20,000 chars: 0.0710ms vs 0.2198ms → 3.1× faster, 67.7% less time
- 50,000 chars: 0.1743ms vs 0.3884ms → 2.23× faster, 55.1% less time
- 100,000 chars: 0.3464ms vs 0.9385ms → 2.71× faster, 63.1% less time
- 200,000 chars: 0.7033ms vs 1.9480ms → 2.77× faster, 63.9% less time
- 500,000 chars: 2.4810ms vs 4.6981ms → 1.89× faster, 47.2% less time
- 1,000,000 chars: 5.0042ms vs 8.3897ms → 1.68× faster, 40.4% less time

Render vs micromark:
- 5,000 chars: 0.0211ms vs 3.9504ms → 187.55× faster
- 20,000 chars: 0.0709ms vs 18.65ms → 263.12× faster
- 50,000 chars: 0.1773ms vs 56.63ms → 319.43× faster
- 100,000 chars: 0.3448ms vs 116.87ms → 338.95× faster
- 200,000 chars: 0.7008ms vs 218.02ms → 311.12× faster

Render vs remark+rehype:
- 5,000 chars: 0.0211ms vs 4.7196ms → 224.07× faster
- 20,000 chars: 0.0709ms vs 23.42ms → 330.29× faster
- 50,000 chars: 0.1773ms vs 72.22ms → 407.31× faster
- 100,000 chars: 0.3448ms vs 163.12ms → 473.10× faster
- 200,000 chars: 0.7008ms vs 412.29ms → 588.35× faster

Render vs markdown-exit:
- 5,000 chars: 0.0211ms vs 0.3025ms → 14.36× faster
- 20,000 chars: 0.0709ms vs 1.1912ms → 16.80× faster
- 50,000 chars: 0.1773ms vs 2.9979ms → 16.91× faster
- 100,000 chars: 0.3448ms vs 6.1147ms → 17.73× faster
- 200,000 chars: 0.7008ms vs 13.97ms → 19.94× faster
- 500,000 chars: 2.5474ms vs 41.36ms → 16.24× faster
- 1,000,000 chars: 5.0603ms vs 92.82ms → 18.34× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0428ms | 0.1871ms | 4.37× faster, 77.1% less time | 0.1057ms | 0.5885ms | 5.57× faster, 82% less time | S5/S5 |
| 20000 | 0.1240ms | 0.7473ms | 6.03× faster, 83.4% less time | 0.4323ms | 2.4988ms | 5.78× faster, 82.7% less time | S5/S5 |
| 50000 | 0.3053ms | 1.8778ms | 6.15× faster, 83.7% less time | 1.1065ms | 6.5636ms | 5.93× faster, 83.1% less time | S5/S5 |
| 100000 | 0.7143ms | 3.8961ms | 5.45× faster, 81.7% less time | 2.5090ms | 13.14ms | 5.24× faster, 80.9% less time | S5/S5 |
| 200000 | 1.6306ms | 9.5200ms | 5.84× faster, 82.9% less time | 5.1514ms | 28.65ms | 5.56× faster, 82% less time | S5/S5 |
| 500000 | 5.5632ms | 29.21ms | 5.25× faster, 81% less time | 15.50ms | 83.18ms | 5.37× faster, 81.4% less time | S5/S5 |
| 1000000 | 14.14ms | 66.81ms | 4.73× faster, 78.8% less time | 47.84ms | 166.96ms | 3.49× faster, 71.3% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Best-of markdown-it-ts vs @ox-content/napi

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0428ms | 0.0391ms | 1.09× slower, 9.5% more time | 0.1057ms | 0.0588ms | 1.8× slower, 79.8% more time | S5/S5 |
| 20000 | 0.1240ms | 0.1537ms | 1.24× faster, 19.4% less time | 0.4323ms | 0.1914ms | 2.26× slower, 125.9% more time | S5/S5 |
| 50000 | 0.3053ms | 0.4175ms | 1.37× faster, 26.9% less time | 1.1065ms | 0.4900ms | 2.26× slower, 125.8% more time | S5/S5 |
| 100000 | 0.7143ms | 0.9148ms | 1.28× faster, 21.9% less time | 2.5090ms | 0.9282ms | 2.7× slower, 170.3% more time | S5/S5 |
| 200000 | 1.6306ms | 1.9186ms | 1.18× faster, 15% less time | 5.1514ms | 2.2404ms | 2.3× slower, 129.9% more time | S5/S5 |
| 500000 | 5.5632ms | 5.0302ms | 1.11× slower, 10.6% more time | 15.50ms | 5.3134ms | 2.92× slower, 191.6% more time | S5/S5 |
| 1000000 | 14.14ms | 10.60ms | 1.33× slower, 33.3% more time | 47.84ms | 12.24ms | 3.91× slower, 290.9% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0428ms | 0.1804ms | 4.22× faster, 76.3% less time |
| 20000 | 0.1240ms | 0.7100ms | 5.73× faster, 82.5% less time |
| 50000 | 0.3053ms | 1.7510ms | 5.74× faster, 82.6% less time |
| 100000 | 0.7143ms | 3.5803ms | 5.01× faster, 80% less time |
| 200000 | 1.6306ms | 7.4747ms | 4.58× faster, 78.2% less time |
| 500000 | 5.5632ms | 18.33ms | 3.3× faster, 69.7% less time |
| 1000000 | 14.14ms | 36.46ms | 2.58× faster, 61.2% less time |

Experimental stock-subset AST JSON output:

This is not the default markdown-it-compatible `Token[]` API. It emits the same mdast JSON string as @ox-content/napi for the stock subset covered by the internal fast path, to measure how far a compact/string boundary can go without JS Token materialization.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0245ms | 0.0454ms | 1.86× faster, 46.2% less time | 0.1924ms |
| 20000 | 0.0861ms | 0.1760ms | 2.04× faster, 51.1% less time | 0.7427ms |
| 50000 | 0.2134ms | 0.4857ms | 2.28× faster, 56.1% less time | 1.9860ms |
| 100000 | 0.4280ms | 0.9682ms | 2.26× faster, 55.8% less time | 4.0002ms |
| 200000 | 0.8376ms | 2.0579ms | 2.46× faster, 59.3% less time | 7.8855ms |
| 500000 | 2.0848ms | 5.0575ms | 2.43× faster, 58.8% less time | 19.50ms |
| 1000000 | 4.5914ms | 9.0756ms | 1.98× faster, 49.4% less time | 38.21ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.2054ms | 0.1993ms |
| @ox-content/napi (parse only) | 0.0424ms | 0.0482ms |
| markdown-exit | 0.6014ms | 0.6169ms |
| markdown-it (baseline) | 0.2012ms | 0.1805ms |
| markdown-it-ts (stream+chunk) | 0.7030ms | 0.5512ms |
| micromark (parse only) | 3.7747ms | 3.6766ms |
| remark (parse only) | 4.1149ms | 4.2919ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7138ms | 0.7237ms |
| @ox-content/napi (parse only) | 0.1675ms | 0.1481ms |
| markdown-exit | 1.8968ms | 1.2532ms |
| markdown-it (baseline) | 0.7969ms | 0.7318ms |
| markdown-it-ts (stream+chunk) | 0.9694ms | 0.9123ms |
| micromark (parse only) | 16.08ms | 16.74ms |
| remark (parse only) | 20.60ms | 20.61ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.8229ms | 1.8325ms |
| @ox-content/napi (parse only) | 0.5321ms | 0.5090ms |
| markdown-exit | 2.5869ms | 2.4455ms |
| markdown-it (baseline) | 1.8013ms | 1.9238ms |
| markdown-it-ts (stream+chunk) | 2.0374ms | 2.1574ms |
| micromark (parse only) | 52.42ms | 47.70ms |
| remark (parse only) | 66.13ms | 66.48ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.7544ms | 3.8120ms |
| @ox-content/napi (parse only) | 0.9672ms | 1.0370ms |
| markdown-exit | 4.9886ms | 5.4374ms |
| markdown-it (baseline) | 3.7492ms | 3.9188ms |
| markdown-it-ts (stream+chunk) | 4.1846ms | 4.2966ms |
| micromark (parse only) | 97.16ms | 97.08ms |
| remark (parse only) | 146.85ms | 149.07ms |
