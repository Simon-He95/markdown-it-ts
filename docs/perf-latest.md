# Performance Report (latest run)

## Environment

- Generated at: 2026-07-23T13:55:30.270Z
- Node.js: v24.18.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: d46f5922653afc915a2aefc687710ac7705f44ec

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
| 5,011 | 0.0428ms | 0.1483ms | 0.0440ms | stock-fast | 0.0159ms | 0.1824ms | 0.0296ms | stock-fast | no |
| 20,085 | 0.0915ms | 0.5862ms | 0.1475ms | stock-fast | 0.0572ms | 0.7343ms | 0.1549ms | stock-fast | no |
| 50,084 | 0.2426ms | 1.4587ms | 0.4013ms | stock-fast | 0.1358ms | 1.8718ms | 0.3314ms | stock-fast | no |
| 100,126 | 0.6648ms | 3.2722ms | 0.8776ms | stock-fast | 0.2805ms | 4.0250ms | 0.7657ms | stock-fast | no |
| 200,073 | 1.5493ms | 6.8739ms | 1.5963ms | stock-fast | 0.5508ms | 8.8005ms | 1.5025ms | stock-fast | no |
| 500,121 | 2.2500ms | 17.71ms | 4.2125ms | stock-fast | 1.9812ms | 25.75ms | 3.7473ms | stock-fast | no |
| 1,000,068 | 11.46ms | 45.32ms | 7.5454ms | stock-fast | 4.0754ms | 59.89ms | 6.7694ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.1978ms | 0.2098ms | 0.0568ms | general | 0.2155ms | 0.2609ms | 0.0355ms | token-renderer | no |
| 20,125 | 0.6612ms | 0.7676ms | 0.1494ms | general | 0.7829ms | 0.9847ms | 0.1413ms | token-renderer | no |
| 50,025 | 1.6654ms | 1.9423ms | 0.4388ms | general | 1.9603ms | 2.4688ms | 0.3882ms | token-renderer | no |
| 100,450 | 3.5746ms | 4.2397ms | 0.9655ms | general | 4.3534ms | 5.3857ms | 0.8561ms | token-renderer | no |
| 200,109 | 8.5599ms | 8.8822ms | 1.9429ms | full-chunk | 9.8610ms | 11.70ms | 1.7710ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0867ms | 0.0966ms | 0.0210ms | general | 0.0989ms | 0.1161ms | 0.0156ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0976ms | 0.1076ms | 0.0214ms | general | 0.1064ms | 0.1237ms | 0.0178ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0257ms | 0.0275ms | 0.0064ms | general | 0.0287ms | 0.0321ms | 0.0058ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1740ms | 0.1297ms | 0.1661ms | 0.1601ms | 0.0318ms | 0.1466ms | 0.2049ms | **0.0300ms** | 0.1402ms | 3.3047ms | 0.5353ms | 0.2232ms | 0.2137ms | 0.4659ms | 0.0874ms | 0.4622ms | 0.6623ms | **0.0465ms** | 0.1596ms | 10.79ms | 1.4829ms | 0.3812ms | 0.3079ms | 1.3679ms | 0.5094ms | 1.4160ms | 1.8850ms | **0.0697ms** | 0.1889ms | 30.34ms | 0.1620ms | 0.1386ms | 0.1703ms | 0.1658ms | 0.1534ms | 0.2056ms | 0.2105ms | **0.0319ms** | 0.1338ms | 3.3745ms |
| 20000 | 0.6367ms | 0.5068ms | 0.6282ms | 0.6264ms | **0.0985ms** | 0.5808ms | 0.7975ms | 0.1203ms | 0.5710ms | 15.51ms | 2.1493ms | 0.6886ms | 0.7977ms | 2.1028ms | 0.3177ms | 1.9354ms | 3.1479ms | **0.1485ms** | 0.6249ms | 50.11ms | 5.9373ms | 1.0521ms | 0.9422ms | 6.0103ms | 1.7054ms | 5.5036ms | 7.6332ms | **0.1789ms** | 0.6766ms | 137.83ms | 0.6331ms | 0.4929ms | 0.6305ms | 0.6515ms | 0.5668ms | 0.6050ms | 0.7882ms | **0.1240ms** | 0.6186ms | 15.89ms |
| 50000 | 1.6739ms | 1.3073ms | 1.5973ms | 1.5704ms | **0.2492ms** | 1.4611ms | 1.9887ms | 0.3338ms | 1.4319ms | 40.63ms | 5.7955ms | 2.0724ms | 2.0447ms | 5.5767ms | 0.9495ms | 5.0735ms | 6.8993ms | **0.3757ms** | 1.4767ms | 142.11ms | 15.50ms | 2.4701ms | 2.3491ms | 15.11ms | 2.3768ms | 13.69ms | 18.75ms | **0.3978ms** | 1.4939ms | 377.95ms | 1.6417ms | 1.2619ms | 1.6168ms | 1.5440ms | 1.4239ms | 1.6051ms | 2.1159ms | **0.3151ms** | 1.4633ms | 41.27ms |
| 100000 | 3.4447ms | 2.8110ms | 3.5069ms | 3.4582ms | **0.6187ms** | 3.1771ms | 4.2314ms | 0.7180ms | 2.8974ms | 78.15ms | 11.68ms | 3.8923ms | 3.6187ms | 11.56ms | 2.0019ms | 10.48ms | 13.84ms | **0.7148ms** | 2.8534ms | 271.01ms | 31.58ms | 4.8757ms | 4.3310ms | 31.15ms | 5.3030ms | 28.25ms | 38.12ms | **0.8871ms** | 2.9795ms | 736.64ms | 3.4660ms | 2.5899ms | 3.2233ms | 3.3767ms | 3.1350ms | 3.0285ms | 4.1647ms | **0.7046ms** | 2.9789ms | 90.25ms |
| 200000 | 7.2825ms | 6.2630ms | 7.1627ms | 7.2405ms | 1.6510ms | 7.2573ms | 9.4685ms | **1.5197ms** | 5.9625ms | 155.13ms | 23.50ms | 7.3349ms | 7.4912ms | 25.37ms | 4.0224ms | 22.72ms | 29.79ms | **1.8175ms** | 6.1445ms | 548.30ms | 63.44ms | 10.49ms | 14.82ms | 67.63ms | 10.61ms | 58.86ms | 79.78ms | **1.5541ms** | 6.0041ms | 1499.06ms | 6.9989ms | 5.3975ms | 7.0632ms | 6.2558ms | 8.4373ms | 6.1755ms | 9.1471ms | **1.5637ms** | 5.8269ms | 159.28ms |
| 500000 | 19.71ms | 18.66ms | 19.65ms | 20.41ms | 5.1437ms | 21.73ms | 26.20ms | **4.2170ms** | 14.92ms | - | 57.77ms | 24.83ms | 23.35ms | 60.11ms | 11.73ms | 65.70ms | 82.06ms | **4.4927ms** | 15.60ms | - | 161.49ms | 31.32ms | 26.32ms | 179.62ms | 52.93ms | 186.39ms | 229.87ms | **4.4941ms** | 18.62ms | - | 18.45ms | 20.92ms | 18.24ms | 20.91ms | 24.27ms | 18.25ms | 24.83ms | **5.3808ms** | 14.92ms | - |
| 1000000 | 40.88ms | 43.72ms | 43.77ms | 41.65ms | 11.07ms | 43.48ms | 58.85ms | **7.7602ms** | 28.63ms | - | 132.58ms | 62.88ms | 52.48ms | 144.53ms | 31.18ms | 156.47ms | 185.81ms | **9.3396ms** | 33.61ms | - | 364.51ms | 52.96ms | 69.21ms | 367.02ms | 93.04ms | 413.33ms | 515.44ms | **9.5327ms** | 34.66ms | - | 42.23ms | 44.69ms | 38.46ms | 38.56ms | 55.43ms | 43.36ms | 64.58ms | **7.5528ms** | 30.30ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0318ms (stream OFF, chunk OFF)
- 20000: S5 0.0985ms (stream OFF, chunk OFF)
- 50000: S5 0.2492ms (stream OFF, chunk OFF)
- 100000: S5 0.6187ms (stream OFF, chunk OFF)
- 200000: S5 1.6510ms (stream OFF, chunk OFF)
- 500000: S5 5.1437ms (stream OFF, chunk OFF)
- 1000000: S5 11.07ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.0874ms (stream OFF, chunk OFF)
- 20000: S5 0.3177ms (stream OFF, chunk OFF)
- 50000: S5 0.9495ms (stream OFF, chunk OFF)
- 100000: S5 2.0019ms (stream OFF, chunk OFF)
- 200000: S5 4.0224ms (stream OFF, chunk OFF)
- 500000: S5 11.73ms (stream OFF, chunk OFF)
- 1000000: S5 31.18ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3079ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.9422ms (stream ON, cache ON, chunk ON)
- 50000: S3 2.3491ms (stream ON, cache ON, chunk ON)
- 100000: S3 4.3310ms (stream ON, cache ON, chunk ON)
- 200000: S2 10.49ms (stream ON, cache ON, chunk OFF)
- 500000: S3 26.32ms (stream ON, cache ON, chunk ON)
- 1000000: S2 52.96ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1386ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.4929ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.2619ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.5899ms (stream ON, cache ON, chunk OFF)
- 200000: S2 5.3975ms (stream ON, cache ON, chunk OFF)
- 500000: S3 18.24ms (stream ON, cache ON, chunk ON)
- 1000000: S3 38.46ms (stream ON, cache ON, chunk ON)

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
| 5000 | 0.0255ms | 0.0167ms | 0.1935ms | 0.0290ms | 3.0841ms | 3.7539ms | 0.2373ms |
| 20000 | 0.0558ms | 0.0565ms | 0.7255ms | 0.1394ms | 15.41ms | 18.92ms | 0.9398ms |
| 50000 | 0.1370ms | 0.1376ms | 1.8180ms | 0.3411ms | 64.32ms | 70.39ms | 2.3511ms |
| 100000 | 0.2776ms | 0.2778ms | 3.9522ms | 0.6568ms | 125.15ms | 137.04ms | 4.9970ms |
| 200000 | 0.5523ms | 0.5486ms | 9.0083ms | 1.5024ms | 190.33ms | 341.56ms | 11.18ms |
| 500000 | 2.0023ms | 1.9946ms | 27.26ms | 3.6991ms | - | - | 34.60ms |
| 1000000 | 3.9634ms | 4.1654ms | 53.24ms | 6.9017ms | - | - | 67.81ms |

Render vs markdown-it:
- 5,000 chars: 0.0255ms vs 0.1935ms → 7.59× faster
- 20,000 chars: 0.0558ms vs 0.7255ms → 13.01× faster
- 50,000 chars: 0.1370ms vs 1.8180ms → 13.27× faster
- 100,000 chars: 0.2776ms vs 3.9522ms → 14.24× faster
- 200,000 chars: 0.5523ms vs 9.0083ms → 16.31× faster
- 500,000 chars: 2.0023ms vs 27.26ms → 13.61× faster
- 1,000,000 chars: 3.9634ms vs 53.24ms → 13.43× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0255ms vs 0.0290ms → 1.14× faster, 12% less time
- 20,000 chars: 0.0558ms vs 0.1394ms → 2.5× faster, 60% less time
- 50,000 chars: 0.1370ms vs 0.3411ms → 2.49× faster, 59.8% less time
- 100,000 chars: 0.2776ms vs 0.6568ms → 2.37× faster, 57.7% less time
- 200,000 chars: 0.5523ms vs 1.5024ms → 2.72× faster, 63.2% less time
- 500,000 chars: 2.0023ms vs 3.6991ms → 1.85× faster, 45.9% less time
- 1,000,000 chars: 3.9634ms vs 6.9017ms → 1.74× faster, 42.6% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0167ms vs 0.0290ms → 1.74× faster, 42.4% less time
- 20,000 chars: 0.0565ms vs 0.1394ms → 2.47× faster, 59.4% less time
- 50,000 chars: 0.1376ms vs 0.3411ms → 2.48× faster, 59.7% less time
- 100,000 chars: 0.2778ms vs 0.6568ms → 2.36× faster, 57.7% less time
- 200,000 chars: 0.5486ms vs 1.5024ms → 2.74× faster, 63.5% less time
- 500,000 chars: 1.9946ms vs 3.6991ms → 1.85× faster, 46.1% less time
- 1,000,000 chars: 4.1654ms vs 6.9017ms → 1.66× faster, 39.6% less time

Render vs micromark:
- 5,000 chars: 0.0255ms vs 3.0841ms → 120.96× faster
- 20,000 chars: 0.0558ms vs 15.41ms → 276.19× faster
- 50,000 chars: 0.1370ms vs 64.32ms → 469.36× faster
- 100,000 chars: 0.2776ms vs 125.15ms → 450.77× faster
- 200,000 chars: 0.5523ms vs 190.33ms → 344.61× faster

Render vs remark+rehype:
- 5,000 chars: 0.0255ms vs 3.7539ms → 147.22× faster
- 20,000 chars: 0.0558ms vs 18.92ms → 339.11× faster
- 50,000 chars: 0.1370ms vs 70.39ms → 513.68× faster
- 100,000 chars: 0.2776ms vs 137.04ms → 493.61× faster
- 200,000 chars: 0.5523ms vs 341.56ms → 618.42× faster

Render vs markdown-exit:
- 5,000 chars: 0.0255ms vs 0.2373ms → 9.31× faster
- 20,000 chars: 0.0558ms vs 0.9398ms → 16.85× faster
- 50,000 chars: 0.1370ms vs 2.3511ms → 17.16× faster
- 100,000 chars: 0.2776ms vs 4.9970ms → 18.00× faster
- 200,000 chars: 0.5523ms vs 11.18ms → 20.25× faster
- 500,000 chars: 2.0023ms vs 34.60ms → 17.28× faster
- 1,000,000 chars: 3.9634ms vs 67.81ms → 17.11× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0318ms | 0.1466ms | 4.61× faster, 78.3% less time | 0.0874ms | 0.4622ms | 5.29× faster, 81.1% less time | S5/S5 |
| 20000 | 0.0985ms | 0.5808ms | 5.89× faster, 83% less time | 0.3177ms | 1.9354ms | 6.09× faster, 83.6% less time | S5/S5 |
| 50000 | 0.2492ms | 1.4611ms | 5.86× faster, 82.9% less time | 0.9495ms | 5.0735ms | 5.34× faster, 81.3% less time | S5/S5 |
| 100000 | 0.6187ms | 3.1771ms | 5.13× faster, 80.5% less time | 2.0019ms | 10.48ms | 5.23× faster, 80.9% less time | S5/S5 |
| 200000 | 1.6510ms | 7.2573ms | 4.4× faster, 77.2% less time | 4.0224ms | 22.72ms | 5.65× faster, 82.3% less time | S5/S5 |
| 500000 | 5.1437ms | 21.73ms | 4.22× faster, 76.3% less time | 11.73ms | 65.70ms | 5.6× faster, 82.1% less time | S5/S5 |
| 1000000 | 11.07ms | 43.48ms | 3.93× faster, 74.5% less time | 31.18ms | 156.47ms | 5.02× faster, 80.1% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0318ms | 0.0300ms | 1.06× slower, 5.9% more time | 0.0874ms | 0.0465ms | 1.88× slower, 88% more time | S5/S5 |
| 20000 | 0.0985ms | 0.1203ms | 1.22× faster, 18.1% less time | 0.3177ms | 0.1485ms | 2.14× slower, 113.9% more time | S5/S5 |
| 50000 | 0.2492ms | 0.3338ms | 1.34× faster, 25.4% less time | 0.9495ms | 0.3757ms | 2.53× slower, 152.7% more time | S5/S5 |
| 100000 | 0.6187ms | 0.7180ms | 1.16× faster, 13.8% less time | 2.0019ms | 0.7148ms | 2.8× slower, 180.1% more time | S5/S5 |
| 200000 | 1.6510ms | 1.5197ms | 1.09× slower, 8.6% more time | 4.0224ms | 1.8175ms | 2.21× slower, 121.3% more time | S5/S5 |
| 500000 | 5.1437ms | 4.2170ms | 1.22× slower, 22% more time | 11.73ms | 4.4927ms | 2.61× slower, 161.2% more time | S5/S5 |
| 1000000 | 11.07ms | 7.7602ms | 1.43× slower, 42.6% more time | 31.18ms | 9.3396ms | 3.34× slower, 233.8% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0318ms | 0.1402ms | 4.4× faster, 77.3% less time |
| 20000 | 0.0985ms | 0.5710ms | 5.79× faster, 82.7% less time |
| 50000 | 0.2492ms | 1.4319ms | 5.75× faster, 82.6% less time |
| 100000 | 0.6187ms | 2.8974ms | 4.68× faster, 78.6% less time |
| 200000 | 1.6510ms | 5.9625ms | 3.61× faster, 72.3% less time |
| 500000 | 5.1437ms | 14.92ms | 2.9× faster, 65.5% less time |
| 1000000 | 11.07ms | 28.63ms | 2.59× faster, 61.3% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0198ms | 0.0300ms | 1.52× faster, 34.1% less time | 0.1490ms |
| 20000 | 0.0662ms | 0.1351ms | 2.04× faster, 51% less time | 0.5769ms |
| 50000 | 0.1649ms | 0.3742ms | 2.27× faster, 55.9% less time | 1.5070ms |
| 100000 | 0.3269ms | 0.7889ms | 2.41× faster, 58.6% less time | 3.0854ms |
| 200000 | 0.6532ms | 1.7093ms | 2.62× faster, 61.8% less time | 6.3429ms |
| 500000 | 1.6044ms | 4.1997ms | 2.62× faster, 61.8% less time | 15.45ms |
| 1000000 | 3.4726ms | 7.3840ms | 2.13× faster, 53% less time | 31.77ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1355ms | 0.1385ms |
| @ox-content/napi (parse only) | 0.0418ms | 0.0301ms |
| markdown-exit | 0.2078ms | 0.1967ms |
| markdown-it (baseline) | 0.1722ms | 0.1521ms |
| markdown-it-ts (stream+chunk) | 0.1839ms | 0.1589ms |
| micromark (parse only) | 3.7315ms | 2.8020ms |
| remark (parse only) | 3.1030ms | 3.3731ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.5851ms | 0.5801ms |
| @ox-content/napi (parse only) | 0.1222ms | 0.1405ms |
| markdown-exit | 0.8147ms | 0.7804ms |
| markdown-it (baseline) | 0.5908ms | 0.6751ms |
| markdown-it-ts (stream+chunk) | 0.6619ms | 0.6218ms |
| micromark (parse only) | 13.18ms | 13.73ms |
| remark (parse only) | 17.82ms | 17.14ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.6318ms | 1.5155ms |
| @ox-content/napi (parse only) | 0.5280ms | 0.4532ms |
| markdown-exit | 1.9794ms | 1.9627ms |
| markdown-it (baseline) | 1.5982ms | 1.9672ms |
| markdown-it-ts (stream+chunk) | 1.6854ms | 2.6183ms |
| micromark (parse only) | 36.30ms | 39.73ms |
| remark (parse only) | 56.14ms | 56.40ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.0028ms | 3.0638ms |
| @ox-content/napi (parse only) | 0.8670ms | 0.7784ms |
| markdown-exit | 4.0030ms | 4.2431ms |
| markdown-it (baseline) | 4.1437ms | 3.0461ms |
| markdown-it-ts (stream+chunk) | 3.2695ms | 3.5226ms |
| micromark (parse only) | 85.42ms | 80.93ms |
| remark (parse only) | 117.83ms | 127.06ms |
