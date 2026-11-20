# Performance Report (latest run)

## Environment

- Generated at: 2026-11-20T06:28:02.511Z
- Node.js: v26.10.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 61d432f761f05cd959592a58c99b5e6f4844dda8

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
| 5,011 | 0.0578ms | 0.2050ms | 0.0423ms | stock-fast | 0.0265ms | 0.2587ms | 0.0374ms | stock-fast | no |
| 20,085 | 0.1378ms | 1.0223ms | 0.1760ms | stock-fast | 0.0669ms | 1.1716ms | 0.1749ms | stock-fast | no |
| 50,084 | 0.4380ms | 2.1951ms | 0.4129ms | stock-fast | 0.2153ms | 3.2399ms | 0.3962ms | stock-fast | no |
| 100,126 | 1.0437ms | 5.1904ms | 0.8524ms | stock-fast | 0.4924ms | 8.1610ms | 0.8459ms | stock-fast | no |
| 200,073 | 3.8245ms | 21.55ms | 2.2516ms | stock-fast | 0.9194ms | 26.64ms | 2.7708ms | stock-fast | no |
| 500,121 | 9.8877ms | 88.15ms | 5.3467ms | stock-fast | 3.5635ms | 80.14ms | 9.2379ms | stock-fast | no |
| 1,000,068 | 23.40ms | 86.96ms | 7.6546ms | stock-fast | 5.4995ms | 122.15ms | 7.2668ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2572ms | 0.3291ms | 0.0648ms | general | 0.2528ms | 0.3782ms | 0.0496ms | token-renderer | no |
| 20,125 | 0.8298ms | 1.2606ms | 0.2545ms | general | 0.9123ms | 1.6412ms | 0.1879ms | token-renderer | no |
| 50,025 | 1.8525ms | 2.8056ms | 0.5219ms | general | 3.0417ms | 4.7028ms | 0.6779ms | token-renderer | no |
| 100,450 | 5.1681ms | 7.0421ms | 1.1735ms | general | 5.4360ms | 8.4970ms | 0.9644ms | token-renderer | no |
| 200,109 | 10.82ms | 12.05ms | 2.0851ms | full-chunk | 12.71ms | 16.33ms | 1.8953ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0878ms | 0.2071ms | 0.0271ms | general | 0.0925ms | 0.1509ms | 0.0195ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0812ms | 0.1488ms | 0.0268ms | general | 0.0932ms | 0.1628ms | 0.0219ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0247ms | 0.0359ms | 0.0080ms | general | 0.0283ms | 0.0427ms | 0.0068ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.3151ms | 0.6100ms | 0.2523ms | 0.2576ms | 0.0773ms | 0.2445ms | 0.4120ms | **0.0444ms** | 0.1794ms | 8.8917ms | 0.7181ms | 0.5409ms | 0.2758ms | 0.5259ms | 0.1608ms | 0.6064ms | 1.1841ms | **0.0626ms** | 0.2292ms | 27.79ms | 2.0869ms | 1.3284ms | 0.5735ms | 1.8515ms | 0.6556ms | 2.8246ms | 2.6974ms | **0.0966ms** | 0.2431ms | 98.46ms | 0.1872ms | 2.0802ms | 0.1813ms | 0.1840ms | 0.1736ms | 0.2071ms | 0.2853ms | **0.0426ms** | 0.1656ms | 10.94ms |
| 20000 | 0.8924ms | 1.8569ms | 1.6947ms | 1.2809ms | **0.1857ms** | 2.0561ms | 2.4325ms | 0.2616ms | 1.9904ms | 59.34ms | 3.1966ms | 1.7261ms | 1.0028ms | 2.9257ms | 0.5316ms | 5.2573ms | 7.2271ms | **0.1794ms** | 0.9102ms | 289.15ms | 7.5783ms | 1.6639ms | 1.0241ms | 8.3961ms | 3.5212ms | 10.58ms | 25.99ms | **0.2190ms** | 1.1451ms | 502.95ms | 0.7982ms | 0.8017ms | 0.8562ms | 0.8573ms | 0.8618ms | 0.8936ms | 1.8675ms | **0.1449ms** | 0.7347ms | 64.82ms |
| 50000 | 2.4087ms | 1.6839ms | 2.0941ms | 2.1592ms | **0.4129ms** | 2.0043ms | 2.8867ms | 0.9152ms | 6.0292ms | 125.60ms | 7.1934ms | 2.6935ms | 2.5321ms | 7.0755ms | 1.4230ms | 6.8462ms | 10.90ms | **0.8341ms** | 7.9173ms | 320.54ms | 23.60ms | 2.6991ms | 2.9380ms | 18.28ms | 3.7393ms | 18.74ms | 24.67ms | **0.9785ms** | 22.80ms | 1796.99ms | 2.0056ms | 1.4555ms | 1.9315ms | 1.9763ms | 2.0791ms | 1.8538ms | 12.39ms | **0.7126ms** | 10.02ms | 216.88ms |
| 100000 | 5.0532ms | 3.6331ms | 4.4702ms | 4.2492ms | 0.8982ms | 4.8617ms | 6.7635ms | **0.8329ms** | 3.8423ms | 134.97ms | 13.99ms | 4.7401ms | 5.1839ms | 14.78ms | 2.4812ms | 14.69ms | 19.22ms | **0.8323ms** | 4.0248ms | 941.55ms | 37.60ms | 5.2302ms | 5.3025ms | 49.17ms | 6.6925ms | 37.80ms | 55.54ms | **1.1168ms** | 4.6736ms | 1817.42ms | 3.8800ms | 3.1341ms | 3.9904ms | 4.3043ms | 3.9358ms | 4.9464ms | 6.2745ms | **0.7998ms** | 3.4672ms | 272.24ms |
| 200000 | 37.89ms | 60.52ms | 47.25ms | 25.13ms | 1.9142ms | 11.67ms | 15.36ms | **1.6537ms** | 6.8783ms | 239.18ms | 77.57ms | 153.56ms | 18.20ms | 51.37ms | 5.0630ms | 28.15ms | 46.01ms | **1.8942ms** | 6.9574ms | 898.95ms | 355.05ms | 94.89ms | 40.16ms | 224.25ms | 13.74ms | 89.59ms | 108.69ms | **1.7134ms** | 7.3129ms | 2861.38ms | 45.44ms | 29.71ms | 11.45ms | 32.83ms | 12.12ms | 8.7593ms | 14.02ms | **1.6940ms** | 6.6690ms | 385.70ms |
| 500000 | 104.38ms | 28.29ms | 61.76ms | 57.13ms | 30.79ms | 58.41ms | 62.66ms | **4.2991ms** | 29.13ms | - | 344.88ms | 56.50ms | 53.58ms | 104.10ms | 140.93ms | 132.47ms | 245.71ms | **23.95ms** | 38.43ms | - | 508.61ms | 47.27ms | 37.90ms | 587.35ms | 277.20ms | 461.52ms | 633.39ms | **4.5792ms** | 87.05ms | - | 117.87ms | 70.17ms | 73.80ms | 118.20ms | 53.88ms | 63.68ms | 85.06ms | **16.65ms** | 76.26ms | - |
| 1000000 | 150.07ms | 55.56ms | 80.27ms | 162.20ms | 20.77ms | 144.11ms | 208.55ms | **14.50ms** | 93.64ms | - | 384.50ms | 74.45ms | 108.56ms | 458.67ms | 173.89ms | 320.92ms | 825.53ms | **8.8814ms** | 212.88ms | - | 1073.62ms | 130.75ms | 197.68ms | 1032.07ms | 406.88ms | 1212.66ms | 2013.95ms | **11.28ms** | 40.39ms | - | 89.80ms | 126.29ms | 112.27ms | 111.13ms | 197.23ms | 163.53ms | 147.43ms | **11.87ms** | 77.55ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0773ms (stream OFF, chunk OFF)
- 20000: S5 0.1857ms (stream OFF, chunk OFF)
- 50000: S5 0.4129ms (stream OFF, chunk OFF)
- 100000: S5 0.8982ms (stream OFF, chunk OFF)
- 200000: S5 1.9142ms (stream OFF, chunk OFF)
- 500000: S2 28.29ms (stream ON, cache ON, chunk OFF)
- 1000000: S5 20.77ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1608ms (stream OFF, chunk OFF)
- 20000: S5 0.5316ms (stream OFF, chunk OFF)
- 50000: S5 1.4230ms (stream OFF, chunk OFF)
- 100000: S5 2.4812ms (stream OFF, chunk OFF)
- 200000: S5 5.0630ms (stream OFF, chunk OFF)
- 500000: S3 53.58ms (stream ON, cache ON, chunk ON)
- 1000000: S2 74.45ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.5735ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.0241ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.6991ms (stream ON, cache ON, chunk OFF)
- 100000: S2 5.2302ms (stream ON, cache ON, chunk OFF)
- 200000: S5 13.74ms (stream OFF, chunk OFF)
- 500000: S3 37.90ms (stream ON, cache ON, chunk ON)
- 1000000: S2 130.75ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.1736ms (stream OFF, chunk OFF)
- 20000: S1 0.7982ms (stream ON, cache OFF, chunk ON)
- 50000: S2 1.4555ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.1341ms (stream ON, cache ON, chunk OFF)
- 200000: S3 11.45ms (stream ON, cache ON, chunk ON)
- 500000: S5 53.88ms (stream OFF, chunk OFF)
- 1000000: S1 89.80ms (stream ON, cache OFF, chunk ON)

markdown-it-ts tuning recommendations (by majority across sizes):
- One-shot: S5(6), S2(1)
- Append-heavy: S5(5), S3(1), S2(1)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Specialized stock-subset render API throughput (markdown → HTML)

This measures end-to-end native render API throughput on the specialized stock-subset corpus. Lower is better. The generated HTML is not equivalent across all libraries; see the output comparison above.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0215ms | 0.0182ms | 0.2573ms | 0.0367ms | 5.0007ms | 5.5837ms | 0.3097ms |
| 20000 | 0.0627ms | 0.0630ms | 0.9228ms | 0.1336ms | 21.66ms | 31.99ms | 1.3308ms |
| 50000 | 0.1523ms | 0.1571ms | 2.3322ms | 0.3214ms | 60.76ms | 84.63ms | 3.0364ms |
| 100000 | 0.3085ms | 0.3033ms | 4.8841ms | 0.6637ms | 113.76ms | 184.06ms | 6.3048ms |
| 200000 | 1.1899ms | 0.7037ms | 13.82ms | 1.4267ms | 260.88ms | 565.29ms | 24.79ms |
| 500000 | 2.4225ms | 2.2401ms | 44.15ms | 3.7804ms | - | - | 52.61ms |
| 1000000 | 5.5944ms | 5.8563ms | 75.55ms | 10.61ms | - | - | 124.30ms |

Render vs markdown-it:
- 5,000 chars: 0.0215ms vs 0.2573ms → 11.94× faster
- 20,000 chars: 0.0627ms vs 0.9228ms → 14.71× faster
- 50,000 chars: 0.1523ms vs 2.3322ms → 15.31× faster
- 100,000 chars: 0.3085ms vs 4.8841ms → 15.83× faster
- 200,000 chars: 1.1899ms vs 13.82ms → 11.62× faster
- 500,000 chars: 2.4225ms vs 44.15ms → 18.23× faster
- 1,000,000 chars: 5.5944ms vs 75.55ms → 13.50× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0215ms vs 0.0367ms → 1.71× faster, 41.4% less time
- 20,000 chars: 0.0627ms vs 0.1336ms → 2.13× faster, 53% less time
- 50,000 chars: 0.1523ms vs 0.3214ms → 2.11× faster, 52.6% less time
- 100,000 chars: 0.3085ms vs 0.6637ms → 2.15× faster, 53.5% less time
- 200,000 chars: 1.1899ms vs 1.4267ms → 1.2× faster, 16.6% less time
- 500,000 chars: 2.4225ms vs 3.7804ms → 1.56× faster, 35.9% less time
- 1,000,000 chars: 5.5944ms vs 10.61ms → 1.9× faster, 47.3% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0182ms vs 0.0367ms → 2.02× faster, 50.5% less time
- 20,000 chars: 0.0630ms vs 0.1336ms → 2.12× faster, 52.8% less time
- 50,000 chars: 0.1571ms vs 0.3214ms → 2.05× faster, 51.1% less time
- 100,000 chars: 0.3033ms vs 0.6637ms → 2.19× faster, 54.3% less time
- 200,000 chars: 0.7037ms vs 1.4267ms → 2.03× faster, 50.7% less time
- 500,000 chars: 2.2401ms vs 3.7804ms → 1.69× faster, 40.7% less time
- 1,000,000 chars: 5.8563ms vs 10.61ms → 1.81× faster, 44.8% less time

Render vs micromark:
- 5,000 chars: 0.0215ms vs 5.0007ms → 232.08× faster
- 20,000 chars: 0.0627ms vs 21.66ms → 345.19× faster
- 50,000 chars: 0.1523ms vs 60.76ms → 398.85× faster
- 100,000 chars: 0.3085ms vs 113.76ms → 368.72× faster
- 200,000 chars: 1.1899ms vs 260.88ms → 219.24× faster

Render vs remark+rehype:
- 5,000 chars: 0.0215ms vs 5.5837ms → 259.14× faster
- 20,000 chars: 0.0627ms vs 31.99ms → 509.79× faster
- 50,000 chars: 0.1523ms vs 84.63ms → 555.56× faster
- 100,000 chars: 0.3085ms vs 184.06ms → 596.59× faster
- 200,000 chars: 1.1899ms vs 565.29ms → 475.06× faster

Render vs markdown-exit:
- 5,000 chars: 0.0215ms vs 0.3097ms → 14.37× faster
- 20,000 chars: 0.0627ms vs 1.3308ms → 21.21× faster
- 50,000 chars: 0.1523ms vs 3.0364ms → 19.93× faster
- 100,000 chars: 0.3085ms vs 6.3048ms → 20.43× faster
- 200,000 chars: 1.1899ms vs 24.79ms → 20.84× faster
- 500,000 chars: 2.4225ms vs 52.61ms → 21.72× faster
- 1,000,000 chars: 5.5944ms vs 124.30ms → 22.22× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0773ms | 0.2445ms | 3.16× faster, 68.4% less time | 0.1608ms | 0.6064ms | 3.77× faster, 73.5% less time | S5/S5 |
| 20000 | 0.1857ms | 2.0561ms | 11.07× faster, 91% less time | 0.5316ms | 5.2573ms | 9.89× faster, 89.9% less time | S5/S5 |
| 50000 | 0.4129ms | 2.0043ms | 4.85× faster, 79.4% less time | 1.4230ms | 6.8462ms | 4.81× faster, 79.2% less time | S5/S5 |
| 100000 | 0.8982ms | 4.8617ms | 5.41× faster, 81.5% less time | 2.4812ms | 14.69ms | 5.92× faster, 83.1% less time | S5/S5 |
| 200000 | 1.9142ms | 11.67ms | 6.1× faster, 83.6% less time | 5.0630ms | 28.15ms | 5.56× faster, 82% less time | S5/S5 |
| 500000 | 28.29ms | 58.41ms | 2.06× faster, 51.6% less time | 53.58ms | 132.47ms | 2.47× faster, 59.5% less time | S2/S3 |
| 1000000 | 20.77ms | 144.11ms | 6.94× faster, 85.6% less time | 74.45ms | 320.92ms | 4.31× faster, 76.8% less time | S5/S2 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0773ms | 0.0444ms | 1.74× slower, 73.9% more time | 0.1608ms | 0.0626ms | 2.57× slower, 156.8% more time | S5/S5 |
| 20000 | 0.1857ms | 0.2616ms | 1.41× faster, 29% less time | 0.5316ms | 0.1794ms | 2.96× slower, 196.3% more time | S5/S5 |
| 50000 | 0.4129ms | 0.9152ms | 2.22× faster, 54.9% less time | 1.4230ms | 0.8341ms | 1.71× slower, 70.6% more time | S5/S5 |
| 100000 | 0.8982ms | 0.8329ms | 1.08× slower, 7.8% more time | 2.4812ms | 0.8323ms | 2.98× slower, 198.1% more time | S5/S5 |
| 200000 | 1.9142ms | 1.6537ms | 1.16× slower, 15.7% more time | 5.0630ms | 1.8942ms | 2.67× slower, 167.3% more time | S5/S5 |
| 500000 | 28.29ms | 4.2991ms | 6.58× slower, 558% more time | 53.58ms | 23.95ms | 2.24× slower, 123.7% more time | S2/S3 |
| 1000000 | 20.77ms | 14.50ms | 1.43× slower, 43.2% more time | 74.45ms | 8.8814ms | 8.38× slower, 738.2% more time | S5/S2 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0773ms | 0.1794ms | 2.32× faster, 56.9% less time |
| 20000 | 0.1857ms | 1.9904ms | 10.72× faster, 90.7% less time |
| 50000 | 0.4129ms | 6.0292ms | 14.6× faster, 93.2% less time |
| 100000 | 0.8982ms | 3.8423ms | 4.28× faster, 76.6% less time |
| 200000 | 1.9142ms | 6.8783ms | 3.59× faster, 72.2% less time |
| 500000 | 28.29ms | 29.13ms | 1.03× faster, 2.9% less time |
| 1000000 | 20.77ms | 93.64ms | 4.51× faster, 77.8% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0419ms | 0.0529ms | 1.26× faster, 20.8% less time | 0.2450ms |
| 20000 | 0.1055ms | 0.1674ms | 1.59× faster, 37% less time | 1.1261ms |
| 50000 | 0.3505ms | 0.6266ms | 1.79× faster, 44.1% less time | 2.1627ms |
| 100000 | 0.5122ms | 1.0525ms | 2.06× faster, 51.3% less time | 5.2557ms |
| 200000 | 1.4217ms | 1.7666ms | 1.24× faster, 19.5% less time | 13.16ms |
| 500000 | 2.7855ms | 6.8841ms | 2.47× faster, 59.5% less time | 40.46ms |
| 1000000 | 15.88ms | 8.8566ms | 1.79× slower, 79.3% more time | 42.40ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1687ms | 0.1681ms |
| @ox-content/napi (parse only) | 0.0415ms | 0.0387ms |
| markdown-exit | 0.3467ms | 0.2614ms |
| markdown-it (baseline) | 0.2335ms | 0.2436ms |
| markdown-it-ts (stream+chunk) | 0.4276ms | 0.4609ms |
| micromark (parse only) | 6.7267ms | 11.23ms |
| remark (parse only) | 4.4615ms | 12.12ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.6691ms | 0.7703ms |
| @ox-content/napi (parse only) | 0.1416ms | 0.1436ms |
| markdown-exit | 5.6041ms | 1.9265ms |
| markdown-it (baseline) | 0.8064ms | 0.8229ms |
| markdown-it-ts (stream+chunk) | 0.7975ms | 0.8815ms |
| micromark (parse only) | 31.05ms | 29.34ms |
| remark (parse only) | 31.49ms | 30.88ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.6804ms | 5.2205ms |
| @ox-content/napi (parse only) | 0.4037ms | 0.3753ms |
| markdown-exit | 3.0013ms | 2.7430ms |
| markdown-it (baseline) | 2.2750ms | 3.9598ms |
| markdown-it-ts (stream+chunk) | 2.4623ms | 3.9849ms |
| micromark (parse only) | 70.79ms | 119.44ms |
| remark (parse only) | 177.06ms | 204.68ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.2604ms | 3.2300ms |
| @ox-content/napi (parse only) | 0.7920ms | 0.7582ms |
| markdown-exit | 5.9375ms | 6.6342ms |
| markdown-it (baseline) | 4.5722ms | 4.2955ms |
| markdown-it-ts (stream+chunk) | 3.6944ms | 4.2080ms |
| micromark (parse only) | 163.45ms | 160.33ms |
| remark (parse only) | 204.92ms | 317.14ms |
