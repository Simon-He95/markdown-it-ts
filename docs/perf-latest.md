# Performance Report (latest run)

## Environment

- Generated at: 2026-07-07T14:35:06.777Z
- Node.js: v24.18.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: a775bdfa3777ede6f602c13869296fcaafe22c06

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2191ms | 0.1651ms | 0.2066ms | 0.2011ms | 0.0392ms | 0.1872ms | 0.2542ms | **0.0391ms** | 0.1735ms | 3.7790ms | 0.6578ms | 0.2933ms | 0.2726ms | 0.6063ms | 0.1074ms | 0.6101ms | 0.8368ms | **0.0586ms** | 0.1999ms | 12.19ms | 1.9528ms | 0.4851ms | 0.3958ms | 1.6930ms | 0.6165ms | 1.7154ms | 2.4994ms | **0.0930ms** | 0.2534ms | 29.44ms | 0.2127ms | 0.1796ms | 0.2041ms | 0.2149ms | 0.2054ms | 0.2043ms | 0.3210ms | **0.0388ms** | 0.1716ms | 3.1780ms |
| 20000 | 0.7975ms | 0.6301ms | 0.7850ms | 0.7849ms | **0.1274ms** | 0.7516ms | 1.0026ms | 0.1500ms | 0.6957ms | 16.72ms | 2.7186ms | 0.9724ms | 0.8613ms | 2.6833ms | 0.4377ms | 2.4862ms | 3.5027ms | **0.1833ms** | 0.7469ms | 48.94ms | 7.4688ms | 1.3275ms | 1.1854ms | 7.4705ms | 2.3078ms | 6.9611ms | 9.7597ms | **0.2275ms** | 0.8016ms | 135.59ms | 0.8392ms | 0.6516ms | 0.7955ms | 0.7871ms | 0.7048ms | 0.7768ms | 1.0634ms | **0.1849ms** | 0.6976ms | 15.55ms |
| 50000 | 2.0444ms | 1.5921ms | 2.0035ms | 2.0156ms | **0.3065ms** | 1.8897ms | 2.5182ms | 0.4357ms | 1.8104ms | 46.33ms | 7.0809ms | 2.0574ms | 2.0972ms | 6.8992ms | 1.3458ms | 6.3775ms | 8.9477ms | **0.4871ms** | 1.8450ms | 149.24ms | 19.00ms | 2.7640ms | 2.7678ms | 18.75ms | 3.0923ms | 17.35ms | 24.24ms | **0.4791ms** | 1.8633ms | 398.27ms | 2.0088ms | 1.5458ms | 1.9599ms | 2.0272ms | 1.8076ms | 1.8535ms | 2.4816ms | **0.4143ms** | 1.7949ms | 44.54ms |
| 100000 | 4.2678ms | 3.3935ms | 4.2957ms | 4.1851ms | **0.7522ms** | 3.9853ms | 5.3012ms | 0.9136ms | 3.6922ms | 93.21ms | 14.34ms | 4.4126ms | 5.3110ms | 14.28ms | 2.4980ms | 13.18ms | 17.89ms | **0.9091ms** | 3.7248ms | 314.09ms | 38.69ms | 8.3857ms | 8.3824ms | 38.34ms | 6.7075ms | 35.59ms | 49.49ms | **1.0183ms** | 3.8137ms | 865.70ms | 4.2404ms | 3.4021ms | 4.3444ms | 4.0853ms | 3.8462ms | 3.7746ms | 5.0905ms | **0.9019ms** | 3.6424ms | 95.93ms |
| 200000 | 8.6954ms | 7.7271ms | 9.0508ms | 8.9019ms | **1.7520ms** | 9.1277ms | 11.85ms | 2.0026ms | 7.4535ms | 195.59ms | 28.83ms | 9.6792ms | 9.0223ms | 28.97ms | 4.9975ms | 28.61ms | 38.77ms | **2.0566ms** | 7.8579ms | 672.53ms | 78.69ms | 12.19ms | 12.97ms | 78.16ms | 13.30ms | 74.31ms | 102.80ms | **1.8845ms** | 7.4645ms | 1809.02ms | 8.6442ms | 7.8532ms | 8.7175ms | 7.9350ms | 9.9098ms | 7.8868ms | 11.07ms | **2.0483ms** | 7.5289ms | 191.81ms |
| 500000 | 24.18ms | 22.36ms | 23.67ms | 24.91ms | 6.3776ms | 26.30ms | 31.68ms | **4.8483ms** | 18.29ms | - | 72.62ms | 29.83ms | 27.02ms | 71.89ms | 14.95ms | 92.70ms | 123.51ms | **5.1956ms** | 18.82ms | - | 209.96ms | 38.40ms | 26.93ms | 212.42ms | 65.25ms | 235.00ms | 299.49ms | **5.5025ms** | 21.51ms | - | 22.62ms | 24.69ms | 20.85ms | 22.62ms | 25.49ms | 24.36ms | 29.01ms | **4.7793ms** | 18.22ms | - |
| 1000000 | 50.25ms | 51.42ms | 52.08ms | 49.84ms | 13.47ms | 51.24ms | 69.56ms | **8.9090ms** | 35.55ms | - | 172.51ms | 61.23ms | 59.92ms | 174.13ms | 38.48ms | 182.95ms | 235.68ms | **11.24ms** | 40.39ms | - | 447.62ms | 68.54ms | 82.92ms | 419.23ms | 89.78ms | 469.81ms | 616.98ms | **14.32ms** | 40.07ms | - | 51.18ms | 48.25ms | 50.11ms | 49.69ms | 63.91ms | 50.03ms | 63.40ms | **9.7514ms** | 37.88ms | - |

Best (one-shot) per size:
- 5000: OX1 0.0391ms (@ox-content/napi (parse only))
- 20000: S5 0.1274ms (stream OFF, chunk OFF)
- 50000: S5 0.3065ms (stream OFF, chunk OFF)
- 100000: S5 0.7522ms (stream OFF, chunk OFF)
- 200000: S5 1.7520ms (stream OFF, chunk OFF)
- 500000: OX1 4.8483ms (@ox-content/napi (parse only))
- 1000000: OX1 8.9090ms (@ox-content/napi (parse only))

Best (append workload) per size:
- 5000: OX1 0.0586ms (@ox-content/napi (parse only))
- 20000: OX1 0.1833ms (@ox-content/napi (parse only))
- 50000: OX1 0.4871ms (@ox-content/napi (parse only))
- 100000: OX1 0.9091ms (@ox-content/napi (parse only))
- 200000: OX1 2.0566ms (@ox-content/napi (parse only))
- 500000: OX1 5.1956ms (@ox-content/napi (parse only))
- 1000000: OX1 11.24ms (@ox-content/napi (parse only))

Best (line-append workload) per size:
- 5000: OX1 0.0930ms (@ox-content/napi (parse only))
- 20000: OX1 0.2275ms (@ox-content/napi (parse only))
- 50000: OX1 0.4791ms (@ox-content/napi (parse only))
- 100000: OX1 1.0183ms (@ox-content/napi (parse only))
- 200000: OX1 1.8845ms (@ox-content/napi (parse only))
- 500000: OX1 5.5025ms (@ox-content/napi (parse only))
- 1000000: OX1 14.32ms (@ox-content/napi (parse only))

Best (replace-paragraph workload) per size:
- 5000: OX1 0.0388ms (@ox-content/napi (parse only))
- 20000: OX1 0.1849ms (@ox-content/napi (parse only))
- 50000: OX1 0.4143ms (@ox-content/napi (parse only))
- 100000: OX1 0.9019ms (@ox-content/napi (parse only))
- 200000: OX1 2.0483ms (@ox-content/napi (parse only))
- 500000: OX1 4.7793ms (@ox-content/napi (parse only))
- 1000000: OX1 9.7514ms (@ox-content/napi (parse only))

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
| 5000 | 0.0208ms | 0.0186ms | 0.2313ms | 0.0363ms | 3.8839ms | 4.6784ms | 0.2994ms |
| 20000 | 0.0723ms | 0.0716ms | 0.9083ms | 0.1535ms | 17.92ms | 22.59ms | 1.1767ms |
| 50000 | 0.1750ms | 0.1759ms | 2.2758ms | 0.3731ms | 54.20ms | 71.67ms | 2.9559ms |
| 100000 | 0.3438ms | 0.3467ms | 7.3312ms | 0.8941ms | 137.27ms | 262.57ms | 10.18ms |
| 200000 | 0.6955ms | 0.6962ms | 11.16ms | 1.8108ms | 222.43ms | 409.40ms | 13.96ms |
| 500000 | 2.5149ms | 2.4363ms | 32.50ms | 4.4447ms | - | - | 41.57ms |
| 1000000 | 5.0665ms | 5.1305ms | 65.75ms | 8.4129ms | - | - | 82.30ms |

Render vs markdown-it:
- 5,000 chars: 0.0208ms vs 0.2313ms → 11.14× faster
- 20,000 chars: 0.0723ms vs 0.9083ms → 12.56× faster
- 50,000 chars: 0.1750ms vs 2.2758ms → 13.00× faster
- 100,000 chars: 0.3438ms vs 7.3312ms → 21.32× faster
- 200,000 chars: 0.6955ms vs 11.16ms → 16.04× faster
- 500,000 chars: 2.5149ms vs 32.50ms → 12.92× faster
- 1,000,000 chars: 5.0665ms vs 65.75ms → 12.98× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0208ms vs 0.0363ms → 1.75× faster, 42.8% less time
- 20,000 chars: 0.0723ms vs 0.1535ms → 2.12× faster, 52.9% less time
- 50,000 chars: 0.1750ms vs 0.3731ms → 2.13× faster, 53.1% less time
- 100,000 chars: 0.3438ms vs 0.8941ms → 2.6× faster, 61.5% less time
- 200,000 chars: 0.6955ms vs 1.8108ms → 2.6× faster, 61.6% less time
- 500,000 chars: 2.5149ms vs 4.4447ms → 1.77× faster, 43.4% less time
- 1,000,000 chars: 5.0665ms vs 8.4129ms → 1.66× faster, 39.8% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0186ms vs 0.0363ms → 1.95× faster, 48.7% less time
- 20,000 chars: 0.0716ms vs 0.1535ms → 2.14× faster, 53.4% less time
- 50,000 chars: 0.1759ms vs 0.3731ms → 2.12× faster, 52.9% less time
- 100,000 chars: 0.3467ms vs 0.8941ms → 2.58× faster, 61.2% less time
- 200,000 chars: 0.6962ms vs 1.8108ms → 2.6× faster, 61.6% less time
- 500,000 chars: 2.4363ms vs 4.4447ms → 1.82× faster, 45.2% less time
- 1,000,000 chars: 5.1305ms vs 8.4129ms → 1.64× faster, 39% less time

Render vs micromark:
- 5,000 chars: 0.0208ms vs 3.8839ms → 187.09× faster
- 20,000 chars: 0.0723ms vs 17.92ms → 247.93× faster
- 50,000 chars: 0.1750ms vs 54.20ms → 309.67× faster
- 100,000 chars: 0.3438ms vs 137.27ms → 399.27× faster
- 200,000 chars: 0.6955ms vs 222.43ms → 319.80× faster

Render vs remark+rehype:
- 5,000 chars: 0.0208ms vs 4.6784ms → 225.36× faster
- 20,000 chars: 0.0723ms vs 22.59ms → 312.42× faster
- 50,000 chars: 0.1750ms vs 71.67ms → 409.49× faster
- 100,000 chars: 0.3438ms vs 262.57ms → 763.73× faster
- 200,000 chars: 0.6955ms vs 409.40ms → 588.62× faster

Render vs markdown-exit:
- 5,000 chars: 0.0208ms vs 0.2994ms → 14.42× faster
- 20,000 chars: 0.0723ms vs 1.1767ms → 16.28× faster
- 50,000 chars: 0.1750ms vs 2.9559ms → 16.89× faster
- 100,000 chars: 0.3438ms vs 10.18ms → 29.60× faster
- 200,000 chars: 0.6955ms vs 13.96ms → 20.08× faster
- 500,000 chars: 2.5149ms vs 41.57ms → 16.53× faster
- 1,000,000 chars: 5.0665ms vs 82.30ms → 16.24× faster

## Best-of markdown-it-ts vs markdown-it (baseline)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0392ms | 0.1872ms | 4.78× faster, 79.1% less time | 0.1074ms | 0.6101ms | 5.68× faster, 82.4% less time | S5/S5 |
| 20000 | 0.1274ms | 0.7516ms | 5.9× faster, 83.1% less time | 0.4377ms | 2.4862ms | 5.68× faster, 82.4% less time | S5/S5 |
| 50000 | 0.3065ms | 1.8897ms | 6.17× faster, 83.8% less time | 1.3458ms | 6.3775ms | 4.74× faster, 78.9% less time | S5/S5 |
| 100000 | 0.7522ms | 3.9853ms | 5.3× faster, 81.1% less time | 2.4980ms | 13.18ms | 5.28× faster, 81.1% less time | S5/S5 |
| 200000 | 1.7520ms | 9.1277ms | 5.21× faster, 80.8% less time | 4.9975ms | 28.61ms | 5.72× faster, 82.5% less time | S5/S5 |
| 500000 | 6.3776ms | 26.30ms | 4.12× faster, 75.7% less time | 14.95ms | 92.70ms | 6.2× faster, 83.9% less time | S5/S5 |
| 1000000 | 13.47ms | 51.24ms | 3.8× faster, 73.7% less time | 38.48ms | 182.95ms | 4.75× faster, 79% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Best-of markdown-it-ts vs @ox-content/napi

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0392ms | 0.0391ms | 1× slower, 0.1% more time | 0.1074ms | 0.0586ms | 1.83× slower, 83.2% more time | S5/S5 |
| 20000 | 0.1274ms | 0.1500ms | 1.18× faster, 15.1% less time | 0.4377ms | 0.1833ms | 2.39× slower, 138.7% more time | S5/S5 |
| 50000 | 0.3065ms | 0.4357ms | 1.42× faster, 29.7% less time | 1.3458ms | 0.4871ms | 2.76× slower, 176.3% more time | S5/S5 |
| 100000 | 0.7522ms | 0.9136ms | 1.21× faster, 17.7% less time | 2.4980ms | 0.9091ms | 2.75× slower, 174.8% more time | S5/S5 |
| 200000 | 1.7520ms | 2.0026ms | 1.14× faster, 12.5% less time | 4.9975ms | 2.0566ms | 2.43× slower, 143% more time | S5/S5 |
| 500000 | 6.3776ms | 4.8483ms | 1.32× slower, 31.5% more time | 14.95ms | 5.1956ms | 2.88× slower, 187.7% more time | S5/S5 |
| 1000000 | 13.47ms | 8.9090ms | 1.51× slower, 51.2% more time | 38.48ms | 11.24ms | 3.42× slower, 242.5% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0392ms | 0.1735ms | 4.43× faster, 77.4% less time |
| 20000 | 0.1274ms | 0.6957ms | 5.46× faster, 81.7% less time |
| 50000 | 0.3065ms | 1.8104ms | 5.91× faster, 83.1% less time |
| 100000 | 0.7522ms | 3.6922ms | 4.91× faster, 79.6% less time |
| 200000 | 1.7520ms | 7.4535ms | 4.25× faster, 76.5% less time |
| 500000 | 6.3776ms | 18.29ms | 2.87× faster, 65.1% less time |
| 1000000 | 13.47ms | 35.55ms | 2.64× faster, 62.1% less time |

Experimental stock-subset AST JSON output:

This is not the default markdown-it-compatible `Token[]` API. It emits the same mdast JSON string as @ox-content/napi for the stock subset covered by the internal fast path, to measure how far a compact/string boundary can go without JS Token materialization.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0248ms | 0.0485ms | 1.96× faster, 48.9% less time | 0.1968ms |
| 20000 | 0.0856ms | 0.1639ms | 1.91× faster, 47.8% less time | 0.7307ms |
| 50000 | 0.2081ms | 0.4783ms | 2.3× faster, 56.5% less time | 1.9055ms |
| 100000 | 0.4223ms | 0.9715ms | 2.3× faster, 56.5% less time | 3.8057ms |
| 200000 | 0.8289ms | 1.9763ms | 2.38× faster, 58.1% less time | 7.7083ms |
| 500000 | 2.0673ms | 5.1353ms | 2.48× faster, 59.7% less time | 18.94ms |
| 1000000 | 4.5739ms | 9.6141ms | 2.1× faster, 52.4% less time | 36.55ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1809ms | 0.1803ms |
| @ox-content/napi (parse only) | 0.0650ms | 0.0537ms |
| markdown-exit | 0.4343ms | 0.3628ms |
| markdown-it (baseline) | 0.2117ms | 0.1832ms |
| markdown-it-ts (stream+chunk) | 0.2475ms | 0.1965ms |
| micromark (parse only) | 3.9708ms | 3.3536ms |
| remark (parse only) | 4.2538ms | 4.0929ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7534ms | 0.7398ms |
| @ox-content/napi (parse only) | 0.1636ms | 0.1619ms |
| markdown-exit | 1.0189ms | 1.0206ms |
| markdown-it (baseline) | 0.7807ms | 0.7138ms |
| markdown-it-ts (stream+chunk) | 0.8049ms | 0.7741ms |
| micromark (parse only) | 15.17ms | 16.32ms |
| remark (parse only) | 20.48ms | 19.77ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.8083ms | 1.8191ms |
| @ox-content/napi (parse only) | 0.6273ms | 0.4486ms |
| markdown-exit | 2.4660ms | 2.4875ms |
| markdown-it (baseline) | 1.7765ms | 1.8699ms |
| markdown-it-ts (stream+chunk) | 1.9458ms | 2.1092ms |
| micromark (parse only) | 43.28ms | 46.55ms |
| remark (parse only) | 65.89ms | 64.46ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.6671ms | 3.6964ms |
| @ox-content/napi (parse only) | 0.9185ms | 0.9812ms |
| markdown-exit | 5.0419ms | 5.3578ms |
| markdown-it (baseline) | 3.6874ms | 3.8012ms |
| markdown-it-ts (stream+chunk) | 4.1148ms | 4.1909ms |
| micromark (parse only) | 101.00ms | 95.64ms |
| remark (parse only) | 151.19ms | 151.85ms |
