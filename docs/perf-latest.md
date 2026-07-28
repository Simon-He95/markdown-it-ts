# Performance Report (latest run)

## Environment

- Generated at: 2026-07-28T06:22:17.651Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 4f72e855221ffdedb02c0c67935d10919f993aa8

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
| 5,011 | 0.0424ms | 0.1543ms | 0.0510ms | stock-fast | 0.0169ms | 0.1984ms | 0.0329ms | stock-fast | no |
| 20,085 | 0.1020ms | 0.6025ms | 0.1361ms | stock-fast | 0.0690ms | 0.8095ms | 0.1686ms | stock-fast | no |
| 50,084 | 0.3081ms | 1.9774ms | 0.6962ms | stock-fast | 0.1572ms | 2.3902ms | 0.5109ms | stock-fast | no |
| 100,126 | 0.8415ms | 4.3060ms | 1.1111ms | stock-fast | 0.2937ms | 4.2552ms | 0.8580ms | stock-fast | no |
| 200,073 | 1.6099ms | 8.7444ms | 2.0084ms | stock-fast | 0.6003ms | 10.29ms | 1.8705ms | stock-fast | no |
| 500,121 | 3.0949ms | 19.18ms | 3.8396ms | stock-fast | 1.9041ms | 27.63ms | 3.7301ms | stock-fast | no |
| 1,000,068 | 13.31ms | 52.40ms | 8.6413ms | stock-fast | 4.8693ms | 61.76ms | 8.8045ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2338ms | 0.2362ms | 0.0677ms | general | 0.2296ms | 0.2847ms | 0.0359ms | token-renderer | no |
| 20,125 | 0.7330ms | 0.8455ms | 0.1905ms | general | 0.8772ms | 1.1444ms | 0.1453ms | token-renderer | no |
| 50,025 | 1.8213ms | 2.2425ms | 0.5718ms | general | 2.1970ms | 2.8374ms | 0.4874ms | token-renderer | no |
| 100,450 | 4.2897ms | 4.8309ms | 1.1692ms | general | 4.5900ms | 6.0045ms | 1.0672ms | token-renderer | no |
| 200,109 | 10.33ms | 10.29ms | 2.4925ms | full-chunk | 11.06ms | 12.92ms | 2.0856ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1165ms | 0.1243ms | 0.0299ms | general | 0.1172ms | 0.1303ms | 0.0167ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0936ms | 0.1109ms | 0.0220ms | general | 0.1122ms | 0.1291ms | 0.0198ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0275ms | 0.0297ms | 0.0068ms | general | 0.0318ms | 0.0348ms | 0.0068ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1769ms | 0.1326ms | 0.1712ms | 0.1587ms | 0.0381ms | 0.1480ms | 0.2027ms | **0.0301ms** | 0.1406ms | 3.5077ms | 0.5045ms | 0.2255ms | 0.2156ms | 0.4765ms | 0.0907ms | 0.4931ms | 0.6985ms | **0.0465ms** | 0.1548ms | 10.79ms | 1.5008ms | 0.3575ms | 0.3103ms | 1.4099ms | 0.5983ms | 1.4105ms | 1.8775ms | **0.0756ms** | 0.1867ms | 31.10ms | 0.1746ms | 0.1431ms | 0.1696ms | 0.1583ms | 0.1505ms | 0.1858ms | 0.2172ms | **0.0296ms** | 0.1580ms | 3.2310ms |
| 20000 | 0.6480ms | 0.4974ms | 0.6294ms | 0.6196ms | **0.0978ms** | 0.5878ms | 0.7896ms | 0.1279ms | 0.5587ms | 16.12ms | 2.2330ms | 0.6853ms | 0.7034ms | 2.0895ms | 0.3352ms | 2.0450ms | 2.6913ms | **0.1422ms** | 0.5731ms | 51.73ms | 5.8725ms | 1.0585ms | 0.9184ms | 5.9557ms | 1.8159ms | 5.4702ms | 7.5098ms | **0.1768ms** | 0.6170ms | 141.14ms | 0.7195ms | 0.5349ms | 0.6099ms | 0.6103ms | 0.6268ms | 0.6215ms | 0.7905ms | **0.1221ms** | 0.5547ms | 16.07ms |
| 50000 | 1.8637ms | 1.4103ms | 1.5775ms | 1.5926ms | **0.2629ms** | 1.5495ms | 1.9651ms | 0.3524ms | 1.4402ms | 38.71ms | 6.0946ms | 2.2072ms | 2.0923ms | 5.7770ms | 0.9425ms | 5.1347ms | 6.8914ms | **0.3561ms** | 1.4180ms | 129.05ms | 16.04ms | 2.4878ms | 2.5019ms | 15.57ms | 2.5474ms | 13.71ms | 18.63ms | **0.3805ms** | 1.4712ms | 335.45ms | 1.8821ms | 1.2635ms | 1.5484ms | 1.6431ms | 1.4613ms | 1.5187ms | 2.0836ms | **0.3936ms** | 1.4557ms | 36.44ms |
| 100000 | 3.3388ms | 2.6507ms | 3.4498ms | 3.4402ms | **0.6877ms** | 3.1529ms | 4.3393ms | 0.7228ms | 2.9010ms | 78.43ms | 11.31ms | 3.6493ms | 3.3468ms | 11.53ms | 1.6896ms | 10.58ms | 14.04ms | **0.6827ms** | 2.9970ms | 275.17ms | 30.69ms | 4.5110ms | 4.3988ms | 31.53ms | 6.9526ms | 28.32ms | 38.54ms | **0.7715ms** | 2.9398ms | 771.73ms | 3.3578ms | 2.6007ms | 3.3191ms | 3.1972ms | 3.1128ms | 3.2342ms | 4.4217ms | **1.2604ms** | 4.3926ms | 94.80ms |
| 200000 | 7.5629ms | 6.1219ms | 8.0766ms | 7.2807ms | 1.6344ms | 7.4555ms | 9.5959ms | **1.5664ms** | 5.9168ms | 155.13ms | 24.24ms | 8.4989ms | 8.0283ms | 23.41ms | 4.0944ms | 23.37ms | 30.60ms | **1.7102ms** | 5.9260ms | 554.95ms | 64.50ms | 11.18ms | 9.3244ms | 62.22ms | 11.52ms | 58.72ms | 80.98ms | **1.3531ms** | 5.6173ms | 1506.80ms | 6.5427ms | 5.1979ms | 6.9640ms | 7.1207ms | 8.9090ms | 6.5456ms | 8.9773ms | **1.5176ms** | 5.7360ms | 154.12ms |
| 500000 | 19.26ms | 18.82ms | 18.98ms | 19.56ms | 5.1287ms | 23.96ms | 28.11ms | **4.3864ms** | 15.17ms | - | 59.89ms | 26.10ms | 21.57ms | 58.63ms | 13.91ms | 68.67ms | 93.64ms | **4.8841ms** | 17.03ms | - | 170.95ms | 29.94ms | 23.71ms | 169.28ms | 63.38ms | 188.69ms | 223.73ms | **7.8410ms** | 16.46ms | - | 18.65ms | 24.08ms | 16.98ms | 18.54ms | 25.68ms | 18.73ms | 27.37ms | **4.3909ms** | 15.10ms | - |
| 1000000 | 47.48ms | 49.19ms | 41.52ms | 43.77ms | 11.93ms | 52.32ms | 55.77ms | **8.0462ms** | 32.84ms | - | 142.96ms | 48.27ms | 44.74ms | 130.53ms | 35.06ms | 147.99ms | 175.08ms | **9.8887ms** | 37.97ms | - | 355.02ms | 58.47ms | 52.27ms | 357.24ms | 80.62ms | 403.46ms | 532.41ms | **9.7571ms** | 39.92ms | - | 43.52ms | 45.25ms | 40.96ms | 48.17ms | 49.80ms | 43.79ms | 55.47ms | **8.3009ms** | 39.22ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0381ms (stream OFF, chunk OFF)
- 20000: S5 0.0978ms (stream OFF, chunk OFF)
- 50000: S5 0.2629ms (stream OFF, chunk OFF)
- 100000: S5 0.6877ms (stream OFF, chunk OFF)
- 200000: S5 1.6344ms (stream OFF, chunk OFF)
- 500000: S5 5.1287ms (stream OFF, chunk OFF)
- 1000000: S5 11.93ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.0907ms (stream OFF, chunk OFF)
- 20000: S5 0.3352ms (stream OFF, chunk OFF)
- 50000: S5 0.9425ms (stream OFF, chunk OFF)
- 100000: S5 1.6896ms (stream OFF, chunk OFF)
- 200000: S5 4.0944ms (stream OFF, chunk OFF)
- 500000: S5 13.91ms (stream OFF, chunk OFF)
- 1000000: S5 35.06ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3103ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.9184ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.4878ms (stream ON, cache ON, chunk OFF)
- 100000: S3 4.3988ms (stream ON, cache ON, chunk ON)
- 200000: S3 9.3244ms (stream ON, cache ON, chunk ON)
- 500000: S3 23.71ms (stream ON, cache ON, chunk ON)
- 1000000: S3 52.27ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1431ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.5349ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.2635ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.6007ms (stream ON, cache ON, chunk OFF)
- 200000: S2 5.1979ms (stream ON, cache ON, chunk OFF)
- 500000: S3 16.98ms (stream ON, cache ON, chunk ON)
- 1000000: S3 40.96ms (stream ON, cache ON, chunk ON)

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
| 5000 | 0.0170ms | 0.0154ms | 0.1876ms | 0.0290ms | 3.1152ms | 3.8389ms | 0.2399ms |
| 20000 | 0.0600ms | 0.0555ms | 0.7275ms | 0.1361ms | 15.67ms | 21.07ms | 0.9872ms |
| 50000 | 0.1347ms | 0.1346ms | 1.9163ms | 0.3361ms | 49.89ms | 63.36ms | 2.5715ms |
| 100000 | 0.2866ms | 0.2889ms | 4.3550ms | 0.7666ms | 102.45ms | 157.04ms | 5.5919ms |
| 200000 | 0.6758ms | 0.6892ms | 10.14ms | 1.7092ms | 200.63ms | 386.64ms | 15.24ms |
| 500000 | 2.3385ms | 2.1979ms | 30.28ms | 3.3585ms | - | - | 38.49ms |
| 1000000 | 4.5526ms | 5.4857ms | 65.50ms | 7.1251ms | - | - | 117.60ms |

Render vs markdown-it:
- 5,000 chars: 0.0170ms vs 0.1876ms → 11.05× faster
- 20,000 chars: 0.0600ms vs 0.7275ms → 12.12× faster
- 50,000 chars: 0.1347ms vs 1.9163ms → 14.23× faster
- 100,000 chars: 0.2866ms vs 4.3550ms → 15.19× faster
- 200,000 chars: 0.6758ms vs 10.14ms → 15.00× faster
- 500,000 chars: 2.3385ms vs 30.28ms → 12.95× faster
- 1,000,000 chars: 4.5526ms vs 65.50ms → 14.39× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0170ms vs 0.0290ms → 1.71× faster, 41.4% less time
- 20,000 chars: 0.0600ms vs 0.1361ms → 2.27× faster, 55.9% less time
- 50,000 chars: 0.1347ms vs 0.3361ms → 2.5× faster, 59.9% less time
- 100,000 chars: 0.2866ms vs 0.7666ms → 2.67× faster, 62.6% less time
- 200,000 chars: 0.6758ms vs 1.7092ms → 2.53× faster, 60.5% less time
- 500,000 chars: 2.3385ms vs 3.3585ms → 1.44× faster, 30.4% less time
- 1,000,000 chars: 4.5526ms vs 7.1251ms → 1.57× faster, 36.1% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0154ms vs 0.0290ms → 1.89× faster, 47% less time
- 20,000 chars: 0.0555ms vs 0.1361ms → 2.45× faster, 59.2% less time
- 50,000 chars: 0.1346ms vs 0.3361ms → 2.5× faster, 60% less time
- 100,000 chars: 0.2889ms vs 0.7666ms → 2.65× faster, 62.3% less time
- 200,000 chars: 0.6892ms vs 1.7092ms → 2.48× faster, 59.7% less time
- 500,000 chars: 2.1979ms vs 3.3585ms → 1.53× faster, 34.6% less time
- 1,000,000 chars: 5.4857ms vs 7.1251ms → 1.3× faster, 23% less time

Render vs micromark:
- 5,000 chars: 0.0170ms vs 3.1152ms → 183.48× faster
- 20,000 chars: 0.0600ms vs 15.67ms → 261.09× faster
- 50,000 chars: 0.1347ms vs 49.89ms → 370.44× faster
- 100,000 chars: 0.2866ms vs 102.45ms → 357.42× faster
- 200,000 chars: 0.6758ms vs 200.63ms → 296.89× faster

Render vs remark+rehype:
- 5,000 chars: 0.0170ms vs 3.8389ms → 226.11× faster
- 20,000 chars: 0.0600ms vs 21.07ms → 351.08× faster
- 50,000 chars: 0.1347ms vs 63.36ms → 470.40× faster
- 100,000 chars: 0.2866ms vs 157.04ms → 547.86× faster
- 200,000 chars: 0.6758ms vs 386.64ms → 572.13× faster

Render vs markdown-exit:
- 5,000 chars: 0.0170ms vs 0.2399ms → 14.13× faster
- 20,000 chars: 0.0600ms vs 0.9872ms → 16.45× faster
- 50,000 chars: 0.1347ms vs 2.5715ms → 19.09× faster
- 100,000 chars: 0.2866ms vs 5.5919ms → 19.51× faster
- 200,000 chars: 0.6758ms vs 15.24ms → 22.55× faster
- 500,000 chars: 2.3385ms vs 38.49ms → 16.46× faster
- 1,000,000 chars: 4.5526ms vs 117.60ms → 25.83× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0381ms | 0.1480ms | 3.88× faster, 74.2% less time | 0.0907ms | 0.4931ms | 5.44× faster, 81.6% less time | S5/S5 |
| 20000 | 0.0978ms | 0.5878ms | 6.01× faster, 83.4% less time | 0.3352ms | 2.0450ms | 6.1× faster, 83.6% less time | S5/S5 |
| 50000 | 0.2629ms | 1.5495ms | 5.89× faster, 83% less time | 0.9425ms | 5.1347ms | 5.45× faster, 81.6% less time | S5/S5 |
| 100000 | 0.6877ms | 3.1529ms | 4.58× faster, 78.2% less time | 1.6896ms | 10.58ms | 6.26× faster, 84% less time | S5/S5 |
| 200000 | 1.6344ms | 7.4555ms | 4.56× faster, 78.1% less time | 4.0944ms | 23.37ms | 5.71× faster, 82.5% less time | S5/S5 |
| 500000 | 5.1287ms | 23.96ms | 4.67× faster, 78.6% less time | 13.91ms | 68.67ms | 4.94× faster, 79.7% less time | S5/S5 |
| 1000000 | 11.93ms | 52.32ms | 4.39× faster, 77.2% less time | 35.06ms | 147.99ms | 4.22× faster, 76.3% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0381ms | 0.0301ms | 1.27× slower, 26.7% more time | 0.0907ms | 0.0465ms | 1.95× slower, 94.9% more time | S5/S5 |
| 20000 | 0.0978ms | 0.1279ms | 1.31× faster, 23.6% less time | 0.3352ms | 0.1422ms | 2.36× slower, 135.7% more time | S5/S5 |
| 50000 | 0.2629ms | 0.3524ms | 1.34× faster, 25.4% less time | 0.9425ms | 0.3561ms | 2.65× slower, 164.7% more time | S5/S5 |
| 100000 | 0.6877ms | 0.7228ms | 1.05× faster, 4.9% less time | 1.6896ms | 0.6827ms | 2.47× slower, 147.5% more time | S5/S5 |
| 200000 | 1.6344ms | 1.5664ms | 1.04× slower, 4.3% more time | 4.0944ms | 1.7102ms | 2.39× slower, 139.4% more time | S5/S5 |
| 500000 | 5.1287ms | 4.3864ms | 1.17× slower, 16.9% more time | 13.91ms | 4.8841ms | 2.85× slower, 184.9% more time | S5/S5 |
| 1000000 | 11.93ms | 8.0462ms | 1.48× slower, 48.3% more time | 35.06ms | 9.8887ms | 3.55× slower, 254.5% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0381ms | 0.1406ms | 3.69× faster, 72.9% less time |
| 20000 | 0.0978ms | 0.5587ms | 5.71× faster, 82.5% less time |
| 50000 | 0.2629ms | 1.4402ms | 5.48× faster, 81.7% less time |
| 100000 | 0.6877ms | 2.9010ms | 4.22× faster, 76.3% less time |
| 200000 | 1.6344ms | 5.9168ms | 3.62× faster, 72.4% less time |
| 500000 | 5.1287ms | 15.17ms | 2.96× faster, 66.2% less time |
| 1000000 | 11.93ms | 32.84ms | 2.75× faster, 63.7% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0211ms | 0.0421ms | 2× faster, 49.9% less time | 0.1873ms |
| 20000 | 0.0736ms | 0.1897ms | 2.58× faster, 61.2% less time | 0.6933ms |
| 50000 | 0.1779ms | 0.3476ms | 1.95× faster, 48.8% less time | 1.6758ms |
| 100000 | 0.3512ms | 0.8780ms | 2.5× faster, 60% less time | 3.2452ms |
| 200000 | 0.6738ms | 1.7366ms | 2.58× faster, 61.2% less time | 6.3299ms |
| 500000 | 1.7969ms | 4.8654ms | 2.71× faster, 63.1% less time | 16.41ms |
| 1000000 | 3.7665ms | 8.5244ms | 2.26× faster, 55.8% less time | 31.93ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1385ms | 0.1496ms |
| @ox-content/napi (parse only) | 0.0722ms | 0.0578ms |
| markdown-exit | 0.4220ms | 0.4172ms |
| markdown-it (baseline) | 0.1748ms | 0.1590ms |
| markdown-it-ts (stream+chunk) | 0.5557ms | 0.4859ms |
| micromark (parse only) | 3.0381ms | 2.7828ms |
| remark (parse only) | 3.0284ms | 3.3143ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.5767ms | 0.6707ms |
| @ox-content/napi (parse only) | 0.1252ms | 0.1454ms |
| markdown-exit | 0.8609ms | 0.8590ms |
| markdown-it (baseline) | 0.6472ms | 0.8103ms |
| markdown-it-ts (stream+chunk) | 1.3520ms | 0.7645ms |
| micromark (parse only) | 13.40ms | 14.29ms |
| remark (parse only) | 16.58ms | 16.77ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.9109ms | 1.6198ms |
| @ox-content/napi (parse only) | 0.5115ms | 0.4122ms |
| markdown-exit | 1.8917ms | 1.9627ms |
| markdown-it (baseline) | 1.3951ms | 1.6434ms |
| markdown-it-ts (stream+chunk) | 1.5877ms | 1.7299ms |
| micromark (parse only) | 35.70ms | 39.34ms |
| remark (parse only) | 52.24ms | 54.38ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 2.9028ms | 2.9990ms |
| @ox-content/napi (parse only) | 0.7364ms | 0.7068ms |
| markdown-exit | 3.9204ms | 4.3817ms |
| markdown-it (baseline) | 2.8662ms | 3.1781ms |
| markdown-it-ts (stream+chunk) | 3.8489ms | 3.3044ms |
| micromark (parse only) | 76.00ms | 80.25ms |
| remark (parse only) | 116.65ms | 132.43ms |
