# Performance Report (latest run)

## Environment

- Generated at: 2026-08-22T20:14:46.947Z
- Node.js: v20.20.2
- Platform: linux x64
- CPU: AMD EPYC 7763 64-Core Processor
- CPU count: 4
- Commit: 86558c0fae2cce3afcd2ee6cb5c4cbd6dc254e1a

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
| 5,011 | 0.0482ms | 0.2681ms | 0.0467ms | stock-fast | 0.0231ms | 0.3241ms | 0.0448ms | stock-fast | no |
| 20,085 | 0.2094ms | 1.0546ms | 0.1808ms | stock-fast | 0.0868ms | 1.3064ms | 0.1719ms | stock-fast | no |
| 50,084 | 0.5182ms | 2.8789ms | 0.5675ms | stock-fast | 0.2153ms | 3.2042ms | 0.4624ms | stock-fast | no |
| 100,126 | 1.7675ms | 6.7310ms | 1.1157ms | stock-fast | 0.4304ms | 9.8275ms | 0.9896ms | stock-fast | no |
| 200,073 | 2.2645ms | 11.89ms | 2.1444ms | stock-fast | 0.8629ms | 20.60ms | 1.9557ms | stock-fast | no |
| 500,121 | 25.84ms | 54.78ms | 5.5632ms | stock-fast | 3.8366ms | 62.40ms | 4.7828ms | stock-fast | no |
| 1,000,068 | 49.47ms | 118.87ms | 13.65ms | stock-fast | 8.2274ms | 134.71ms | 10.41ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.3464ms | 0.4203ms | 0.0664ms | general | 0.4016ms | 0.4829ms | 0.0643ms | token-renderer | no |
| 20,125 | 1.1773ms | 1.4908ms | 0.2490ms | general | 1.4121ms | 1.8389ms | 0.2351ms | token-renderer | no |
| 50,025 | 3.1003ms | 3.7077ms | 0.7485ms | general | 3.8715ms | 4.8862ms | 0.5934ms | token-renderer | no |
| 100,450 | 10.21ms | 11.87ms | 1.4346ms | general | 10.79ms | 12.40ms | 1.2932ms | token-renderer | no |
| 200,109 | 19.41ms | 22.99ms | 2.9180ms | full-chunk | 27.21ms | 29.53ms | 2.6237ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1426ms | 0.1908ms | 0.0290ms | general | 0.1663ms | 0.2224ms | 0.0247ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1457ms | 0.1928ms | 0.0284ms | general | 0.1796ms | 0.2302ms | 0.0277ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0379ms | 0.0528ms | 0.0099ms | general | 0.0472ms | 0.0582ms | 0.0101ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2984ms | 0.2178ms | 0.2443ms | 0.2400ms | 0.0673ms | 0.2640ms | 0.4063ms | **0.0464ms** | 0.2561ms | 8.3278ms | 0.7811ms | 0.3998ms | 0.3195ms | 0.6939ms | 0.1611ms | 0.8930ms | 1.2965ms | **0.0829ms** | 0.2965ms | 25.65ms | 2.3500ms | 0.4952ms | 0.4678ms | 2.0661ms | 0.9013ms | 2.4973ms | 3.8565ms | **0.1424ms** | 0.3692ms | 72.11ms | 0.3256ms | 0.2130ms | 0.2667ms | 0.2426ms | 0.3371ms | 0.7245ms | 0.8806ms | **0.0463ms** | 0.2599ms | 7.5298ms |
| 20000 | 1.0035ms | 0.8141ms | 1.0038ms | 0.9918ms | 0.2182ms | 1.1049ms | 1.6491ms | **0.1851ms** | 1.0050ms | 35.84ms | 3.2021ms | 1.1349ms | 1.1683ms | 3.3195ms | 0.7126ms | 3.7931ms | 5.4337ms | **0.2262ms** | 1.0904ms | 122.23ms | 8.9883ms | 1.5513ms | 2.0220ms | 8.9978ms | 3.2226ms | 10.41ms | 14.92ms | **0.2985ms** | 1.1530ms | 318.14ms | 1.0328ms | 0.8568ms | 0.9747ms | 0.9228ms | 0.9006ms | 1.1047ms | 1.5859ms | **0.1804ms** | 1.0281ms | 38.68ms |
| 50000 | 2.4631ms | 2.1475ms | 2.4236ms | 2.4664ms | **0.5611ms** | 2.8238ms | 4.0538ms | 0.6281ms | 2.6544ms | 99.86ms | 8.6582ms | 3.1252ms | 3.2246ms | 8.4391ms | 1.7102ms | 8.9106ms | 13.95ms | **0.5225ms** | 2.6033ms | 347.95ms | 23.56ms | 5.1624ms | 4.9600ms | 22.64ms | 4.8242ms | 24.81ms | 38.98ms | **0.5925ms** | 2.7153ms | 973.27ms | 2.5356ms | 2.1406ms | 2.4089ms | 2.4599ms | 2.8037ms | 2.6792ms | 4.2795ms | **0.6762ms** | 2.6718ms | 101.84ms |
| 100000 | 5.2159ms | 8.1054ms | 5.3594ms | 5.1018ms | **1.5725ms** | 6.2489ms | 9.1784ms | 1.9255ms | 6.0314ms | 202.63ms | 19.14ms | 7.8696ms | 7.4828ms | 18.63ms | 3.7626ms | 18.63ms | 29.14ms | **1.0309ms** | 5.1181ms | 689.81ms | 48.89ms | 12.22ms | 11.59ms | 48.21ms | 9.9963ms | 54.17ms | 80.49ms | **1.1189ms** | 5.2430ms | 2022.92ms | 5.1890ms | 8.4078ms | 5.1309ms | 4.9544ms | 11.07ms | 7.1457ms | 9.3142ms | **1.9282ms** | 6.0543ms | 210.15ms |
| 200000 | 12.51ms | 18.75ms | 11.53ms | 11.74ms | 5.9825ms | 12.46ms | 20.73ms | **3.9226ms** | 12.17ms | 428.35ms | 43.20ms | 16.02ms | 14.99ms | 41.62ms | 9.2976ms | 61.19ms | 76.98ms | **2.5804ms** | 10.79ms | 1542.64ms | 138.78ms | 27.42ms | 26.33ms | 117.89ms | 31.66ms | 121.41ms | 184.95ms | **2.3466ms** | 10.40ms | 4245.37ms | 10.51ms | 20.79ms | 10.83ms | 10.44ms | 22.46ms | 11.91ms | 22.51ms | **3.7191ms** | 12.48ms | 414.77ms |
| 500000 | 40.21ms | 43.99ms | 47.28ms | 43.66ms | 25.46ms | 55.96ms | 74.06ms | **7.9497ms** | 29.99ms | - | 131.63ms | 57.48ms | 54.75ms | 144.18ms | 56.69ms | 199.49ms | 215.86ms | **6.2697ms** | 27.95ms | - | 393.82ms | 69.30ms | 90.71ms | 403.36ms | 202.12ms | 480.43ms | 636.22ms | **8.3451ms** | 27.69ms | - | 42.00ms | 43.95ms | 41.53ms | 48.04ms | 75.20ms | 53.02ms | 69.13ms | **7.6262ms** | 28.67ms | - |
| 1000000 | 86.55ms | 86.16ms | 86.81ms | 88.14ms | 57.96ms | 109.31ms | 143.87ms | **14.33ms** | 56.71ms | - | 326.47ms | 150.27ms | 113.18ms | 353.06ms | 191.30ms | 398.14ms | 525.30ms | **12.20ms** | 53.91ms | - | 888.12ms | 145.10ms | 141.18ms | 907.68ms | 488.32ms | 1081.94ms | 1306.84ms | **14.67ms** | 53.57ms | - | 86.15ms | 121.33ms | 136.04ms | 87.61ms | 138.76ms | 114.78ms | 164.00ms | **13.31ms** | 59.11ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0673ms (stream OFF, chunk OFF)
- 20000: S5 0.2182ms (stream OFF, chunk OFF)
- 50000: S5 0.5611ms (stream OFF, chunk OFF)
- 100000: S5 1.5725ms (stream OFF, chunk OFF)
- 200000: S5 5.9825ms (stream OFF, chunk OFF)
- 500000: S5 25.46ms (stream OFF, chunk OFF)
- 1000000: S5 57.96ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1611ms (stream OFF, chunk OFF)
- 20000: S5 0.7126ms (stream OFF, chunk OFF)
- 50000: S5 1.7102ms (stream OFF, chunk OFF)
- 100000: S5 3.7626ms (stream OFF, chunk OFF)
- 200000: S5 9.2976ms (stream OFF, chunk OFF)
- 500000: S3 54.75ms (stream ON, cache ON, chunk ON)
- 1000000: S3 113.18ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.4678ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.5513ms (stream ON, cache ON, chunk OFF)
- 50000: S5 4.8242ms (stream OFF, chunk OFF)
- 100000: S5 9.9963ms (stream OFF, chunk OFF)
- 200000: S3 26.33ms (stream ON, cache ON, chunk ON)
- 500000: S2 69.30ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 141.18ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.2130ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.8568ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.1406ms (stream ON, cache ON, chunk OFF)
- 100000: S4 4.9544ms (stream OFF, chunk ON)
- 200000: S4 10.44ms (stream OFF, chunk ON)
- 500000: S3 41.53ms (stream ON, cache ON, chunk ON)
- 1000000: S1 86.15ms (stream ON, cache OFF, chunk ON)

markdown-it-ts tuning recommendations (by majority across sizes):
- One-shot: S5(7)
- Append-heavy: S5(5), S3(2)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Specialized stock-subset render API throughput (markdown → HTML)

This measures end-to-end native render API throughput on the specialized stock-subset corpus. Lower is better. The generated HTML is not equivalent across all libraries; see the output comparison above.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0289ms | 0.0246ms | 0.3195ms | 0.0441ms | 9.6213ms | 11.50ms | 0.4601ms |
| 20000 | 0.0945ms | 0.0949ms | 1.3168ms | 0.1742ms | 47.65ms | 62.12ms | 1.8598ms |
| 50000 | 0.2378ms | 0.2290ms | 3.4109ms | 0.4407ms | 123.12ms | 150.00ms | 4.9594ms |
| 100000 | 0.4594ms | 0.4996ms | 9.7944ms | 0.9846ms | 262.46ms | 315.65ms | 13.13ms |
| 200000 | 1.0124ms | 1.0311ms | 20.72ms | 1.9032ms | 482.79ms | 754.88ms | 28.51ms |
| 500000 | 4.1102ms | 3.6508ms | 64.74ms | 4.7556ms | - | - | 80.05ms |
| 1000000 | 8.0335ms | 7.4373ms | 133.07ms | 9.8157ms | - | - | 175.59ms |

Render vs markdown-it:
- 5,000 chars: 0.0289ms vs 0.3195ms → 11.05× faster
- 20,000 chars: 0.0945ms vs 1.3168ms → 13.94× faster
- 50,000 chars: 0.2378ms vs 3.4109ms → 14.34× faster
- 100,000 chars: 0.4594ms vs 9.7944ms → 21.32× faster
- 200,000 chars: 1.0124ms vs 20.72ms → 20.47× faster
- 500,000 chars: 4.1102ms vs 64.74ms → 15.75× faster
- 1,000,000 chars: 8.0335ms vs 133.07ms → 16.56× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0289ms vs 0.0441ms → 1.53× faster, 34.5% less time
- 20,000 chars: 0.0945ms vs 0.1742ms → 1.84× faster, 45.8% less time
- 50,000 chars: 0.2378ms vs 0.4407ms → 1.85× faster, 46% less time
- 100,000 chars: 0.4594ms vs 0.9846ms → 2.14× faster, 53.3% less time
- 200,000 chars: 1.0124ms vs 1.9032ms → 1.88× faster, 46.8% less time
- 500,000 chars: 4.1102ms vs 4.7556ms → 1.16× faster, 13.6% less time
- 1,000,000 chars: 8.0335ms vs 9.8157ms → 1.22× faster, 18.2% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0246ms vs 0.0441ms → 1.79× faster, 44.2% less time
- 20,000 chars: 0.0949ms vs 0.1742ms → 1.84× faster, 45.5% less time
- 50,000 chars: 0.2290ms vs 0.4407ms → 1.92× faster, 48% less time
- 100,000 chars: 0.4996ms vs 0.9846ms → 1.97× faster, 49.3% less time
- 200,000 chars: 1.0311ms vs 1.9032ms → 1.85× faster, 45.8% less time
- 500,000 chars: 3.6508ms vs 4.7556ms → 1.3× faster, 23.2% less time
- 1,000,000 chars: 7.4373ms vs 9.8157ms → 1.32× faster, 24.2% less time

Render vs micromark:
- 5,000 chars: 0.0289ms vs 9.6213ms → 332.88× faster
- 20,000 chars: 0.0945ms vs 47.65ms → 504.32× faster
- 50,000 chars: 0.2378ms vs 123.12ms → 517.76× faster
- 100,000 chars: 0.4594ms vs 262.46ms → 571.26× faster
- 200,000 chars: 1.0124ms vs 482.79ms → 476.88× faster

Render vs remark+rehype:
- 5,000 chars: 0.0289ms vs 11.50ms → 397.76× faster
- 20,000 chars: 0.0945ms vs 62.12ms → 657.39× faster
- 50,000 chars: 0.2378ms vs 150.00ms → 630.79× faster
- 100,000 chars: 0.4594ms vs 315.65ms → 687.02× faster
- 200,000 chars: 1.0124ms vs 754.88ms → 745.65× faster

Render vs markdown-exit:
- 5,000 chars: 0.0289ms vs 0.4601ms → 15.92× faster
- 20,000 chars: 0.0945ms vs 1.8598ms → 19.68× faster
- 50,000 chars: 0.2378ms vs 4.9594ms → 20.86× faster
- 100,000 chars: 0.4594ms vs 13.13ms → 28.58× faster
- 200,000 chars: 1.0124ms vs 28.51ms → 28.16× faster
- 500,000 chars: 4.1102ms vs 80.05ms → 19.48× faster
- 1,000,000 chars: 8.0335ms vs 175.59ms → 21.86× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0673ms | 0.2640ms | 3.92× faster, 74.5% less time | 0.1611ms | 0.8930ms | 5.54× faster, 82% less time | S5/S5 |
| 20000 | 0.2182ms | 1.1049ms | 5.06× faster, 80.3% less time | 0.7126ms | 3.7931ms | 5.32× faster, 81.2% less time | S5/S5 |
| 50000 | 0.5611ms | 2.8238ms | 5.03× faster, 80.1% less time | 1.7102ms | 8.9106ms | 5.21× faster, 80.8% less time | S5/S5 |
| 100000 | 1.5725ms | 6.2489ms | 3.97× faster, 74.8% less time | 3.7626ms | 18.63ms | 4.95× faster, 79.8% less time | S5/S5 |
| 200000 | 5.9825ms | 12.46ms | 2.08× faster, 52% less time | 9.2976ms | 61.19ms | 6.58× faster, 84.8% less time | S5/S5 |
| 500000 | 25.46ms | 55.96ms | 2.2× faster, 54.5% less time | 54.75ms | 199.49ms | 3.64× faster, 72.6% less time | S5/S3 |
| 1000000 | 57.96ms | 109.31ms | 1.89× faster, 47% less time | 113.18ms | 398.14ms | 3.52× faster, 71.6% less time | S5/S3 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0673ms | 0.0464ms | 1.45× slower, 44.9% more time | 0.1611ms | 0.0829ms | 1.94× slower, 94.2% more time | S5/S5 |
| 20000 | 0.2182ms | 0.1851ms | 1.18× slower, 17.9% more time | 0.7126ms | 0.2262ms | 3.15× slower, 215.1% more time | S5/S5 |
| 50000 | 0.5611ms | 0.6281ms | 1.12× faster, 10.7% less time | 1.7102ms | 0.5225ms | 3.27× slower, 227.3% more time | S5/S5 |
| 100000 | 1.5725ms | 1.9255ms | 1.22× faster, 18.3% less time | 3.7626ms | 1.0309ms | 3.65× slower, 265% more time | S5/S5 |
| 200000 | 5.9825ms | 3.9226ms | 1.53× slower, 52.5% more time | 9.2976ms | 2.5804ms | 3.6× slower, 260.3% more time | S5/S5 |
| 500000 | 25.46ms | 7.9497ms | 3.2× slower, 220.3% more time | 54.75ms | 6.2697ms | 8.73× slower, 773.2% more time | S5/S3 |
| 1000000 | 57.96ms | 14.33ms | 4.05× slower, 304.6% more time | 113.18ms | 12.20ms | 9.28× slower, 827.8% more time | S5/S3 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0673ms | 0.2561ms | 3.81× faster, 73.7% less time |
| 20000 | 0.2182ms | 1.0050ms | 4.61× faster, 78.3% less time |
| 50000 | 0.5611ms | 2.6544ms | 4.73× faster, 78.9% less time |
| 100000 | 1.5725ms | 6.0314ms | 3.84× faster, 73.9% less time |
| 200000 | 5.9825ms | 12.17ms | 2.03× faster, 50.9% less time |
| 500000 | 25.46ms | 29.99ms | 1.18× faster, 15.1% less time |
| 1000000 | 57.96ms | 56.71ms | 1.02× slower, 2.2% more time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0362ms | 0.0459ms | 1.27× faster, 21.2% less time | 0.2543ms |
| 20000 | 0.1279ms | 0.1828ms | 1.43× faster, 30% less time | 0.9966ms |
| 50000 | 0.3023ms | 0.5729ms | 1.89× faster, 47.2% less time | 2.6167ms |
| 100000 | 0.6429ms | 1.1018ms | 1.71× faster, 41.7% less time | 5.2385ms |
| 200000 | 1.2936ms | 2.3226ms | 1.8× faster, 44.3% less time | 10.34ms |
| 500000 | 3.3929ms | 5.2684ms | 1.55× faster, 35.6% less time | 26.75ms |
| 1000000 | 8.6239ms | 13.80ms | 1.6× faster, 37.5% less time | 57.18ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.2529ms | 0.2517ms |
| @ox-content/napi (parse only) | 0.0466ms | 0.0469ms |
| markdown-exit | 0.5146ms | 0.7152ms |
| markdown-it (baseline) | 0.2871ms | 0.2556ms |
| markdown-it-ts (stream+chunk) | 0.2599ms | 0.4716ms |
| micromark (parse only) | 8.2191ms | 9.4379ms |
| remark (parse only) | 9.8236ms | 10.46ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.0692ms | 0.9985ms |
| @ox-content/napi (parse only) | 0.2134ms | 0.1816ms |
| markdown-exit | 1.5391ms | 1.5918ms |
| markdown-it (baseline) | 1.0233ms | 1.2254ms |
| markdown-it-ts (stream+chunk) | 1.0266ms | 1.1884ms |
| micromark (parse only) | 32.62ms | 36.23ms |
| remark (parse only) | 52.07ms | 41.85ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 2.6016ms | 2.5859ms |
| @ox-content/napi (parse only) | 0.5911ms | 0.5674ms |
| markdown-exit | 3.8827ms | 4.4145ms |
| markdown-it (baseline) | 3.1196ms | 2.9023ms |
| markdown-it-ts (stream+chunk) | 2.3354ms | 2.7364ms |
| micromark (parse only) | 97.30ms | 105.90ms |
| remark (parse only) | 118.85ms | 135.76ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 5.1024ms | 5.1201ms |
| @ox-content/napi (parse only) | 1.1832ms | 1.1271ms |
| markdown-exit | 10.74ms | 11.25ms |
| markdown-it (baseline) | 7.2461ms | 8.7763ms |
| markdown-it-ts (stream+chunk) | 7.7589ms | 7.2867ms |
| micromark (parse only) | 215.07ms | 202.98ms |
| remark (parse only) | 265.12ms | 291.55ms |
