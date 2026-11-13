# Performance Report (latest run)

## Environment

- Generated at: 2026-11-13T08:15:24.204Z
- Node.js: v24.22.2
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 0e68a350452c33910dc4edeaa2086165973288e8

## Corpus and comparison policy

- `stock-subset`: ATX headings, plain single-line paragraphs, flat tight bullet lists, and fenced code blocks. Paragraph text and flat list source repeat intentionally; headings and fenced code vary by section.
- `feature-mixed`: A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code. Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.
- `real-world`: repository-owned MIT-licensed documents, reported per file.
- Fixed-configuration native API, tuned/best-of, and equivalent-output results are kept separate. Do not combine these sections into a general library ranking.

## Native API throughput by corpus

These rows use fixed configurations: default `MarkdownIt().parse()` / `MarkdownIt().render()`, upstream `markdown-it` defaults, and `@ox-content/napi` native parse/render APIs. The feature-mixed and real-world OX rows enable `tables` and `strikethrough` to more closely match markdown-it defaults. Implementation order rotates for every sample to avoid assigning a stable warmup, GC, or CPU-state advantage to one library.

Parse output is **not equivalent work**: markdown-it-ts returns mutable markdown-it-compatible `Token[]`, while OX returns an object containing an mdast JSON string. These rows describe native API throughput only and are not ranked into an overall winner.

### Synthetic stock subset

ATX headings, plain single-line paragraphs, flat tight bullet lists, and fenced code blocks.
Paragraph text and flat list source repeat intentionally; headings and fenced code vary by section.
This is a specialized fast-path benchmark, not a proxy for general Markdown performance.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,011 | 0.2026ms | 0.4253ms | 0.0386ms | stock-fast | 0.0219ms | 0.5862ms | 0.0421ms | stock-fast | no |
| 20,085 | 0.1264ms | 1.3696ms | 0.1519ms | stock-fast | 0.0733ms | 1.2068ms | 0.1637ms | stock-fast | no |
| 50,084 | 0.3310ms | 3.1022ms | 0.8091ms | stock-fast | 0.1956ms | 2.9035ms | 0.4804ms | stock-fast | no |
| 100,126 | 0.9734ms | 6.5365ms | 1.0031ms | stock-fast | 0.5036ms | 7.3222ms | 0.9894ms | stock-fast | no |
| 200,073 | 2.3659ms | 10.78ms | 1.6520ms | stock-fast | 0.7347ms | 13.19ms | 1.3583ms | stock-fast | no |
| 500,121 | 2.8901ms | 26.26ms | 3.8544ms | stock-fast | 2.7808ms | 34.60ms | 3.3524ms | stock-fast | no |
| 1,000,068 | 17.18ms | 69.82ms | 7.8933ms | stock-fast | 5.6105ms | 95.84ms | 8.8525ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2898ms | 0.3601ms | 0.0583ms | general | 0.2975ms | 0.4387ms | 0.0538ms | token-renderer | no |
| 20,125 | 0.8490ms | 1.3308ms | 0.2263ms | general | 1.4961ms | 1.8115ms | 0.1925ms | token-renderer | no |
| 50,025 | 1.9819ms | 2.8549ms | 0.6004ms | general | 2.6483ms | 4.1306ms | 0.6097ms | token-renderer | no |
| 100,450 | 4.7841ms | 6.4967ms | 1.2909ms | general | 5.3882ms | 8.7365ms | 1.0309ms | token-renderer | no |
| 200,109 | 15.16ms | 16.98ms | 3.3509ms | full-chunk | 13.12ms | 16.44ms | 1.9738ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1132ms | 0.1460ms | 0.0265ms | general | 0.1013ms | 0.1956ms | 0.0212ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0922ms | 0.1700ms | 0.0264ms | general | 0.0982ms | 0.1804ms | 0.0245ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0252ms | 0.0366ms | 0.0079ms | general | 0.0305ms | 0.0475ms | 0.0071ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2644ms | 0.2217ms | 0.4054ms | 0.3170ms | **0.0521ms** | 0.2427ms | 0.4172ms | 0.0523ms | 0.2136ms | 3.9521ms | 0.7750ms | 0.5379ms | 0.5683ms | 0.8397ms | 0.1445ms | 0.6703ms | 0.9739ms | **0.0656ms** | 0.2201ms | 13.59ms | 2.7042ms | 0.5681ms | 0.8328ms | 3.0003ms | 0.9128ms | 2.0247ms | 2.7521ms | **0.1016ms** | 0.2621ms | 43.30ms | 0.4425ms | 0.2652ms | 0.2790ms | 0.2190ms | 0.2129ms | 0.2270ms | 0.4653ms | **0.0422ms** | 0.2097ms | 4.6613ms |
| 20000 | 0.8276ms | 0.6691ms | 0.8055ms | 0.8352ms | **0.1307ms** | 0.8179ms | 1.0642ms | 0.1630ms | 0.7931ms | 20.02ms | 2.8735ms | 1.1472ms | 1.0745ms | 2.8083ms | 0.4374ms | 2.8305ms | 3.8108ms | **0.1840ms** | 0.7634ms | 57.74ms | 7.4668ms | 1.5349ms | 1.1009ms | 8.2003ms | 2.3837ms | 7.4498ms | 10.44ms | **0.2393ms** | 0.8415ms | 201.54ms | 0.8189ms | 0.7901ms | 0.7851ms | 0.8524ms | 0.7714ms | 0.8749ms | 1.1126ms | **0.1776ms** | 0.7014ms | 17.47ms |
| 50000 | 2.1212ms | 1.5796ms | 2.0632ms | 2.0421ms | **0.3415ms** | 2.7438ms | 2.7494ms | 0.4700ms | 2.0601ms | 60.03ms | 7.0999ms | 2.9243ms | 3.1536ms | 9.6399ms | 1.1710ms | 6.6364ms | 9.1971ms | **0.4326ms** | 2.1664ms | 202.90ms | 30.97ms | 3.3650ms | 3.6192ms | 18.98ms | 3.6621ms | 18.46ms | 24.58ms | **0.4882ms** | 1.8893ms | 510.74ms | 4.1687ms | 1.8083ms | 2.3448ms | 2.0432ms | 2.2339ms | 2.0417ms | 2.8307ms | **0.3985ms** | 1.8478ms | 71.57ms |
| 100000 | 4.5524ms | 3.4055ms | 4.3548ms | 4.0932ms | **0.7254ms** | 4.1023ms | 5.6138ms | 0.8578ms | 3.8672ms | 123.95ms | 15.78ms | 7.8718ms | 5.1143ms | 14.20ms | 3.1174ms | 13.18ms | 18.65ms | **0.8475ms** | 4.6422ms | 438.25ms | 40.48ms | 6.4769ms | 6.0805ms | 37.98ms | 6.3069ms | 36.85ms | 51.81ms | **0.9672ms** | 4.5503ms | 1486.38ms | 4.2216ms | 2.9749ms | 4.3099ms | 3.9134ms | 3.4956ms | 4.1180ms | 5.5568ms | **0.8198ms** | 4.4332ms | 157.01ms |
| 200000 | 9.8425ms | 7.6306ms | 9.9292ms | 9.4352ms | 2.2251ms | 9.8940ms | 13.03ms | **1.6022ms** | 7.5691ms | 235.66ms | 29.01ms | 12.80ms | 12.82ms | 33.24ms | 5.0464ms | 31.53ms | 41.20ms | **1.9004ms** | 7.6235ms | 1121.91ms | 82.11ms | 14.89ms | 12.43ms | 106.27ms | 14.67ms | 80.90ms | 103.49ms | **1.9081ms** | 7.5710ms | 2055.38ms | 9.6921ms | 6.9523ms | 8.8775ms | 9.1412ms | 10.52ms | 8.7893ms | 12.46ms | **1.5470ms** | 7.2469ms | 291.52ms |
| 500000 | 25.66ms | 24.30ms | 27.62ms | 36.98ms | 6.7671ms | 31.37ms | 36.29ms | **3.9941ms** | 18.25ms | - | 72.23ms | 36.03ms | 43.58ms | 85.94ms | 20.41ms | 110.53ms | 127.17ms | **4.2914ms** | 18.55ms | - | 216.52ms | 33.03ms | 34.76ms | 227.98ms | 83.87ms | 233.51ms | 298.21ms | **4.5663ms** | 22.50ms | - | 22.77ms | 23.89ms | 21.19ms | 26.67ms | 32.66ms | 27.22ms | 37.40ms | **3.9903ms** | 18.93ms | - |
| 1000000 | 73.71ms | 71.83ms | 67.28ms | 56.66ms | 20.90ms | 62.69ms | 211.76ms | **13.00ms** | 41.35ms | - | 264.81ms | 93.84ms | 103.32ms | 191.47ms | 52.24ms | 168.88ms | 413.46ms | **9.7732ms** | 45.80ms | - | 652.75ms | 125.77ms | 103.70ms | 535.65ms | 104.18ms | 609.77ms | 1075.67ms | **12.48ms** | 61.44ms | - | 59.93ms | 72.16ms | 56.49ms | 53.12ms | 58.75ms | 56.53ms | 106.59ms | **9.1331ms** | 50.53ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0521ms (stream OFF, chunk OFF)
- 20000: S5 0.1307ms (stream OFF, chunk OFF)
- 50000: S5 0.3415ms (stream OFF, chunk OFF)
- 100000: S5 0.7254ms (stream OFF, chunk OFF)
- 200000: S5 2.2251ms (stream OFF, chunk OFF)
- 500000: S5 6.7671ms (stream OFF, chunk OFF)
- 1000000: S5 20.90ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1445ms (stream OFF, chunk OFF)
- 20000: S5 0.4374ms (stream OFF, chunk OFF)
- 50000: S5 1.1710ms (stream OFF, chunk OFF)
- 100000: S5 3.1174ms (stream OFF, chunk OFF)
- 200000: S5 5.0464ms (stream OFF, chunk OFF)
- 500000: S5 20.41ms (stream OFF, chunk OFF)
- 1000000: S5 52.24ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S2 0.5681ms (stream ON, cache ON, chunk OFF)
- 20000: S3 1.1009ms (stream ON, cache ON, chunk ON)
- 50000: S2 3.3650ms (stream ON, cache ON, chunk OFF)
- 100000: S3 6.0805ms (stream ON, cache ON, chunk ON)
- 200000: S3 12.43ms (stream ON, cache ON, chunk ON)
- 500000: S2 33.03ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 103.70ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.2129ms (stream OFF, chunk OFF)
- 20000: S5 0.7714ms (stream OFF, chunk OFF)
- 50000: S2 1.8083ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.9749ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.9523ms (stream ON, cache ON, chunk OFF)
- 500000: S3 21.19ms (stream ON, cache ON, chunk ON)
- 1000000: S4 53.12ms (stream OFF, chunk ON)

markdown-it-ts tuning recommendations (by majority across sizes):
- One-shot: S5(7)
- Append-heavy: S5(7)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Specialized stock-subset render API throughput (markdown → HTML)

This measures end-to-end native render API throughput on the specialized stock-subset corpus. Lower is better. The generated HTML is not equivalent across all libraries; see the output comparison above.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0423ms | 0.0199ms | 0.2577ms | 0.0354ms | 6.0788ms | 7.7678ms | 0.4113ms |
| 20000 | 0.0790ms | 0.0753ms | 1.1549ms | 0.1589ms | 26.25ms | 31.02ms | 1.5046ms |
| 50000 | 0.1880ms | 0.1977ms | 2.6168ms | 0.3535ms | 78.17ms | 110.85ms | 3.9330ms |
| 100000 | 0.4649ms | 0.4743ms | 6.6779ms | 0.9298ms | 165.09ms | 258.06ms | 8.9838ms |
| 200000 | 0.8964ms | 0.7603ms | 12.40ms | 1.4169ms | 291.18ms | 682.30ms | 17.32ms |
| 500000 | 2.6241ms | 2.4584ms | 52.17ms | 3.5977ms | - | - | 51.84ms |
| 1000000 | 17.83ms | 5.7477ms | 90.47ms | 7.7767ms | - | - | 113.07ms |

Render vs markdown-it:
- 5,000 chars: 0.0423ms vs 0.2577ms → 6.09× faster
- 20,000 chars: 0.0790ms vs 1.1549ms → 14.62× faster
- 50,000 chars: 0.1880ms vs 2.6168ms → 13.92× faster
- 100,000 chars: 0.4649ms vs 6.6779ms → 14.36× faster
- 200,000 chars: 0.8964ms vs 12.40ms → 13.83× faster
- 500,000 chars: 2.6241ms vs 52.17ms → 19.88× faster
- 1,000,000 chars: 17.83ms vs 90.47ms → 5.07× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0423ms vs 0.0354ms → 1.2× slower, 19.5% more time
- 20,000 chars: 0.0790ms vs 0.1589ms → 2.01× faster, 50.3% less time
- 50,000 chars: 0.1880ms vs 0.3535ms → 1.88× faster, 46.8% less time
- 100,000 chars: 0.4649ms vs 0.9298ms → 2× faster, 50% less time
- 200,000 chars: 0.8964ms vs 1.4169ms → 1.58× faster, 36.7% less time
- 500,000 chars: 2.6241ms vs 3.5977ms → 1.37× faster, 27.1% less time
- 1,000,000 chars: 17.83ms vs 7.7767ms → 2.29× slower, 129.3% more time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0199ms vs 0.0354ms → 1.78× faster, 43.8% less time
- 20,000 chars: 0.0753ms vs 0.1589ms → 2.11× faster, 52.6% less time
- 50,000 chars: 0.1977ms vs 0.3535ms → 1.79× faster, 44.1% less time
- 100,000 chars: 0.4743ms vs 0.9298ms → 1.96× faster, 49% less time
- 200,000 chars: 0.7603ms vs 1.4169ms → 1.86× faster, 46.3% less time
- 500,000 chars: 2.4584ms vs 3.5977ms → 1.46× faster, 31.7% less time
- 1,000,000 chars: 5.7477ms vs 7.7767ms → 1.35× faster, 26.1% less time

Render vs micromark:
- 5,000 chars: 0.0423ms vs 6.0788ms → 143.78× faster
- 20,000 chars: 0.0790ms vs 26.25ms → 332.24× faster
- 50,000 chars: 0.1880ms vs 78.17ms → 415.87× faster
- 100,000 chars: 0.4649ms vs 165.09ms → 355.08× faster
- 200,000 chars: 0.8964ms vs 291.18ms → 324.84× faster

Render vs remark+rehype:
- 5,000 chars: 0.0423ms vs 7.7678ms → 183.73× faster
- 20,000 chars: 0.0790ms vs 31.02ms → 392.61× faster
- 50,000 chars: 0.1880ms vs 110.85ms → 589.79× faster
- 100,000 chars: 0.4649ms vs 258.06ms → 555.05× faster
- 200,000 chars: 0.8964ms vs 682.30ms → 761.16× faster

Render vs markdown-exit:
- 5,000 chars: 0.0423ms vs 0.4113ms → 9.73× faster
- 20,000 chars: 0.0790ms vs 1.5046ms → 19.04× faster
- 50,000 chars: 0.1880ms vs 3.9330ms → 20.93× faster
- 100,000 chars: 0.4649ms vs 8.9838ms → 19.32× faster
- 200,000 chars: 0.8964ms vs 17.32ms → 19.32× faster
- 500,000 chars: 2.6241ms vs 51.84ms → 19.76× faster
- 1,000,000 chars: 17.83ms vs 113.07ms → 6.34× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0521ms | 0.2427ms | 4.65× faster, 78.5% less time | 0.1445ms | 0.6703ms | 4.64× faster, 78.4% less time | S5/S5 |
| 20000 | 0.1307ms | 0.8179ms | 6.26× faster, 84% less time | 0.4374ms | 2.8305ms | 6.47× faster, 84.5% less time | S5/S5 |
| 50000 | 0.3415ms | 2.7438ms | 8.04× faster, 87.6% less time | 1.1710ms | 6.6364ms | 5.67× faster, 82.4% less time | S5/S5 |
| 100000 | 0.7254ms | 4.1023ms | 5.65× faster, 82.3% less time | 3.1174ms | 13.18ms | 4.23× faster, 76.3% less time | S5/S5 |
| 200000 | 2.2251ms | 9.8940ms | 4.45× faster, 77.5% less time | 5.0464ms | 31.53ms | 6.25× faster, 84% less time | S5/S5 |
| 500000 | 6.7671ms | 31.37ms | 4.64× faster, 78.4% less time | 20.41ms | 110.53ms | 5.42× faster, 81.5% less time | S5/S5 |
| 1000000 | 20.90ms | 62.69ms | 3× faster, 66.7% less time | 52.24ms | 168.88ms | 3.23× faster, 69.1% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0521ms | 0.0523ms | 1× faster, 0.3% less time | 0.1445ms | 0.0656ms | 2.2× slower, 120.4% more time | S5/S5 |
| 20000 | 0.1307ms | 0.1630ms | 1.25× faster, 19.8% less time | 0.4374ms | 0.1840ms | 2.38× slower, 137.7% more time | S5/S5 |
| 50000 | 0.3415ms | 0.4700ms | 1.38× faster, 27.3% less time | 1.1710ms | 0.4326ms | 2.71× slower, 170.7% more time | S5/S5 |
| 100000 | 0.7254ms | 0.8578ms | 1.18× faster, 15.4% less time | 3.1174ms | 0.8475ms | 3.68× slower, 267.8% more time | S5/S5 |
| 200000 | 2.2251ms | 1.6022ms | 1.39× slower, 38.9% more time | 5.0464ms | 1.9004ms | 2.66× slower, 165.5% more time | S5/S5 |
| 500000 | 6.7671ms | 3.9941ms | 1.69× slower, 69.4% more time | 20.41ms | 4.2914ms | 4.76× slower, 375.5% more time | S5/S5 |
| 1000000 | 20.90ms | 13.00ms | 1.61× slower, 60.8% more time | 52.24ms | 9.7732ms | 5.34× slower, 434.5% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0521ms | 0.2136ms | 4.1× faster, 75.6% less time |
| 20000 | 0.1307ms | 0.7931ms | 6.07× faster, 83.5% less time |
| 50000 | 0.3415ms | 2.0601ms | 6.03× faster, 83.4% less time |
| 100000 | 0.7254ms | 3.8672ms | 5.33× faster, 81.2% less time |
| 200000 | 2.2251ms | 7.5691ms | 3.4× faster, 70.6% less time |
| 500000 | 6.7671ms | 18.25ms | 2.7× faster, 62.9% less time |
| 1000000 | 20.90ms | 41.35ms | 1.98× faster, 49.5% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.1150ms | 0.1547ms | 1.35× faster, 25.7% less time | 0.4320ms |
| 20000 | 0.1427ms | 0.3198ms | 2.24× faster, 55.4% less time | 1.5300ms |
| 50000 | 0.3524ms | 0.8412ms | 2.39× faster, 58.1% less time | 2.9286ms |
| 100000 | 0.6307ms | 1.4017ms | 2.22× faster, 55% less time | 5.1377ms |
| 200000 | 1.0854ms | 2.1524ms | 1.98× faster, 49.6% less time | 12.33ms |
| 500000 | 3.6937ms | 4.7818ms | 1.29× faster, 22.8% less time | 31.77ms |
| 1000000 | 14.01ms | 12.84ms | 1.09× slower, 9.1% more time | 51.55ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1829ms | 0.1804ms |
| @ox-content/napi (parse only) | 0.0409ms | 0.0377ms |
| markdown-exit | 0.2935ms | 0.2649ms |
| markdown-it (baseline) | 0.2340ms | 0.1808ms |
| markdown-it-ts (stream+chunk) | 0.2485ms | 0.1871ms |
| micromark (parse only) | 5.4872ms | 4.2583ms |
| remark (parse only) | 5.7465ms | 6.5150ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.6996ms | 0.7187ms |
| @ox-content/napi (parse only) | 0.1514ms | 0.1499ms |
| markdown-exit | 1.0376ms | 1.1050ms |
| markdown-it (baseline) | 0.7673ms | 1.1424ms |
| markdown-it-ts (stream+chunk) | 0.7959ms | 0.9164ms |
| micromark (parse only) | 20.03ms | 20.50ms |
| remark (parse only) | 24.24ms | 25.29ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.9345ms | 2.8734ms |
| @ox-content/napi (parse only) | 0.5918ms | 0.6784ms |
| markdown-exit | 2.6184ms | 2.9645ms |
| markdown-it (baseline) | 2.0415ms | 3.0768ms |
| markdown-it-ts (stream+chunk) | 2.3578ms | 2.5543ms |
| micromark (parse only) | 50.14ms | 77.19ms |
| remark (parse only) | 136.32ms | 95.63ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.6117ms | 3.9476ms |
| @ox-content/napi (parse only) | 1.2997ms | 0.8669ms |
| markdown-exit | 5.0872ms | 6.2631ms |
| markdown-it (baseline) | 6.0537ms | 4.4988ms |
| markdown-it-ts (stream+chunk) | 5.6726ms | 5.3923ms |
| micromark (parse only) | 145.08ms | 185.11ms |
| remark (parse only) | 184.07ms | 254.81ms |
