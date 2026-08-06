# Performance Report (latest run)

## Environment

- Generated at: 2026-08-06T09:08:38.831Z
- Node.js: v20.20.2
- Platform: linux x64
- CPU: AMD EPYC 9V74 80-Core Processor
- CPU count: 4
- Commit: 3d1911f4d1bed5afb8554331c33aa10dbc5acfdd

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
| 5,011 | 0.0399ms | 0.2447ms | 0.0426ms | stock-fast | 0.0203ms | 0.2952ms | 0.0416ms | stock-fast | no |
| 20,085 | 0.1776ms | 0.9706ms | 0.1581ms | stock-fast | 0.0778ms | 1.1784ms | 0.1586ms | stock-fast | no |
| 50,084 | 0.4455ms | 2.6506ms | 0.5419ms | stock-fast | 0.1923ms | 2.9119ms | 0.4104ms | stock-fast | no |
| 100,126 | 1.5521ms | 6.1900ms | 1.0680ms | stock-fast | 0.3836ms | 8.1302ms | 0.9375ms | stock-fast | no |
| 200,073 | 2.0019ms | 11.16ms | 2.0585ms | stock-fast | 0.7760ms | 16.89ms | 1.8324ms | stock-fast | no |
| 500,121 | 20.99ms | 48.39ms | 4.7627ms | stock-fast | 3.1971ms | 58.16ms | 4.4674ms | stock-fast | no |
| 1,000,068 | 51.41ms | 113.70ms | 12.35ms | stock-fast | 7.6916ms | 118.69ms | 9.5452ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.3226ms | 0.3706ms | 0.0558ms | general | 0.3953ms | 0.4550ms | 0.0529ms | token-renderer | no |
| 20,125 | 1.1739ms | 1.4043ms | 0.1953ms | general | 1.3555ms | 1.7043ms | 0.1873ms | token-renderer | no |
| 50,025 | 3.0015ms | 3.4845ms | 0.6519ms | general | 3.6488ms | 4.4656ms | 0.4666ms | token-renderer | no |
| 100,450 | 9.3192ms | 10.05ms | 1.2882ms | general | 10.30ms | 11.32ms | 1.0994ms | token-renderer | no |
| 200,109 | 16.95ms | 22.94ms | 2.3727ms | full-chunk | 24.28ms | 25.07ms | 2.1529ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1486ms | 0.1946ms | 0.0218ms | general | 0.1438ms | 0.1950ms | 0.0172ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1315ms | 0.1774ms | 0.0247ms | general | 0.1517ms | 0.2073ms | 0.0228ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0352ms | 0.0461ms | 0.0092ms | general | 0.0406ms | 0.0551ms | 0.0086ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2743ms | 0.1983ms | 0.2438ms | 0.2528ms | 0.0523ms | 0.2421ms | 0.3921ms | **0.0424ms** | 0.2624ms | 7.6482ms | 0.7819ms | 0.3735ms | 0.3058ms | 0.7057ms | 0.1613ms | 0.7678ms | 1.3014ms | **0.0787ms** | 0.3024ms | 23.64ms | 2.3703ms | 0.5307ms | 0.4803ms | 2.0567ms | 0.9032ms | 2.3444ms | 3.6864ms | **0.1397ms** | 0.3691ms | 65.91ms | 0.3153ms | 0.1990ms | 0.2953ms | 0.2432ms | 0.3063ms | 0.5366ms | 0.7542ms | **0.0430ms** | 0.2592ms | 7.7553ms |
| 20000 | 0.9910ms | 0.7890ms | 0.9960ms | 0.9752ms | 0.2088ms | 1.0214ms | 1.6048ms | **0.1637ms** | 1.0396ms | 32.13ms | 3.2562ms | 1.1679ms | 1.1602ms | 3.3326ms | 0.7265ms | 3.3793ms | 5.3219ms | **0.2171ms** | 1.0832ms | 100.18ms | 9.2315ms | 1.5780ms | 2.1739ms | 9.0608ms | 3.2200ms | 9.3717ms | 14.70ms | **0.2873ms** | 1.1838ms | 287.93ms | 1.0467ms | 0.7877ms | 1.0083ms | 0.9218ms | 0.9043ms | 1.0155ms | 1.5814ms | **0.1640ms** | 1.0314ms | 37.46ms |
| 50000 | 2.3957ms | 2.0508ms | 2.4193ms | 2.3701ms | **0.5258ms** | 2.5928ms | 3.9167ms | 0.5528ms | 2.7650ms | 97.79ms | 8.6907ms | 3.1245ms | 3.1084ms | 8.3899ms | 1.7796ms | 8.2294ms | 13.50ms | **0.4969ms** | 2.6273ms | 308.75ms | 23.42ms | 5.1974ms | 5.1664ms | 22.94ms | 4.8419ms | 23.42ms | 37.46ms | **0.5609ms** | 2.7506ms | 861.08ms | 2.3840ms | 2.0856ms | 2.3789ms | 2.4090ms | 2.6433ms | 2.6103ms | 4.1394ms | **0.6332ms** | 2.6761ms | 104.07ms |
| 100000 | 5.1861ms | 6.9692ms | 5.0081ms | 5.2317ms | **1.4326ms** | 6.0263ms | 9.0567ms | 1.9475ms | 6.4127ms | 193.41ms | 18.47ms | 7.6566ms | 6.7814ms | 18.59ms | 3.4622ms | 17.52ms | 28.17ms | **0.9543ms** | 5.2078ms | 675.67ms | 47.77ms | 10.80ms | 10.76ms | 48.02ms | 9.1797ms | 50.03ms | 79.77ms | **1.0632ms** | 5.3863ms | 1898.72ms | 4.9318ms | 5.6245ms | 4.8835ms | 5.0595ms | 11.65ms | 6.5865ms | 11.20ms | **1.9427ms** | 6.2351ms | 208.67ms |
| 200000 | 11.23ms | 16.95ms | 11.18ms | 11.19ms | 6.9589ms | 11.38ms | 18.84ms | **3.7609ms** | 12.77ms | 400.61ms | 38.39ms | 15.87ms | 15.14ms | 38.35ms | 9.4908ms | 38.04ms | 68.17ms | **2.4715ms** | 11.04ms | 1416.94ms | 112.90ms | 26.85ms | 22.98ms | 114.13ms | 34.27ms | 109.05ms | 163.89ms | **2.0126ms** | 10.48ms | 3821.72ms | 10.37ms | 13.49ms | 10.27ms | 10.30ms | 16.09ms | 10.86ms | 19.23ms | **3.6445ms** | 12.47ms | 414.19ms |
| 500000 | 40.30ms | 46.54ms | 45.18ms | 39.60ms | 22.72ms | 54.35ms | 69.59ms | **7.1519ms** | 30.28ms | - | 135.01ms | 48.11ms | 43.57ms | 157.77ms | 60.55ms | 173.20ms | 213.39ms | **5.8971ms** | 28.01ms | - | 381.13ms | 57.33ms | 89.64ms | 374.84ms | 201.50ms | 474.21ms | 604.42ms | **7.9429ms** | 28.02ms | - | 50.09ms | 52.86ms | 42.20ms | 47.32ms | 68.71ms | 60.18ms | 71.80ms | **6.8951ms** | 28.16ms | - |
| 1000000 | 98.76ms | 88.56ms | 79.67ms | 85.99ms | 45.69ms | 96.53ms | 131.30ms | **13.36ms** | 58.71ms | - | 305.48ms | 94.43ms | 101.20ms | 305.71ms | 176.72ms | 334.16ms | 511.90ms | **11.94ms** | 54.68ms | - | 876.68ms | 147.79ms | 134.62ms | 838.26ms | 437.72ms | 1053.58ms | 1311.73ms | **13.63ms** | 54.06ms | - | 114.72ms | 91.66ms | 85.31ms | 83.29ms | 154.85ms | 102.47ms | 129.76ms | **11.47ms** | 57.82ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0523ms (stream OFF, chunk OFF)
- 20000: S5 0.2088ms (stream OFF, chunk OFF)
- 50000: S5 0.5258ms (stream OFF, chunk OFF)
- 100000: S5 1.4326ms (stream OFF, chunk OFF)
- 200000: S5 6.9589ms (stream OFF, chunk OFF)
- 500000: S5 22.72ms (stream OFF, chunk OFF)
- 1000000: S5 45.69ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1613ms (stream OFF, chunk OFF)
- 20000: S5 0.7265ms (stream OFF, chunk OFF)
- 50000: S5 1.7796ms (stream OFF, chunk OFF)
- 100000: S5 3.4622ms (stream OFF, chunk OFF)
- 200000: S5 9.4908ms (stream OFF, chunk OFF)
- 500000: S3 43.57ms (stream ON, cache ON, chunk ON)
- 1000000: S2 94.43ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.4803ms (stream ON, cache ON, chunk ON)
- 20000: S2 1.5780ms (stream ON, cache ON, chunk OFF)
- 50000: S5 4.8419ms (stream OFF, chunk OFF)
- 100000: S5 9.1797ms (stream OFF, chunk OFF)
- 200000: S3 22.98ms (stream ON, cache ON, chunk ON)
- 500000: S2 57.33ms (stream ON, cache ON, chunk OFF)
- 1000000: S3 134.62ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1990ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.7877ms (stream ON, cache ON, chunk OFF)
- 50000: S2 2.0856ms (stream ON, cache ON, chunk OFF)
- 100000: S3 4.8835ms (stream ON, cache ON, chunk ON)
- 200000: S3 10.27ms (stream ON, cache ON, chunk ON)
- 500000: S3 42.20ms (stream ON, cache ON, chunk ON)
- 1000000: S4 83.29ms (stream OFF, chunk ON)

markdown-it-ts tuning recommendations (by majority across sizes):
- One-shot: S5(7)
- Append-heavy: S5(5), S3(1), S2(1)

Notes: S2/S3 appendHits should equal 5 when append fast-path triggers (shared env).
Large-size rows may show `-` for especially heavy parse-only or render-only baselines (currently remark/micromark above 200k) so `perf:all` stays practical.

## Specialized stock-subset render API throughput (markdown → HTML)

This measures end-to-end native render API throughput on the specialized stock-subset corpus. Lower is better. The generated HTML is not equivalent across all libraries; see the output comparison above.
It is intentionally a full render-API benchmark (`parse + render`), not a renderer-only hot-path benchmark.

| Size (chars) | markdown-it-ts.render | markdown-it-ts.renderAsync | markdown-it.render | @ox-content/napi | micromark | remark+rehype | markdown-exit |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.0208ms | 0.0212ms | 0.2856ms | 0.0408ms | 8.9209ms | 10.30ms | 0.4391ms |
| 20000 | 0.0776ms | 0.0789ms | 1.1983ms | 0.1567ms | 42.10ms | 46.62ms | 1.7918ms |
| 50000 | 0.2098ms | 0.1934ms | 3.0301ms | 0.3930ms | 106.86ms | 131.63ms | 4.6193ms |
| 100000 | 0.3835ms | 0.4344ms | 8.6169ms | 0.9232ms | 228.24ms | 289.93ms | 12.27ms |
| 200000 | 0.8818ms | 0.8994ms | 18.64ms | 1.8082ms | 469.16ms | 636.92ms | 26.62ms |
| 500000 | 3.7830ms | 3.3957ms | 59.67ms | 4.4594ms | - | - | 76.60ms |
| 1000000 | 7.4413ms | 6.8239ms | 126.07ms | 8.9820ms | - | - | 168.77ms |

Render vs markdown-it:
- 5,000 chars: 0.0208ms vs 0.2856ms → 13.73× faster
- 20,000 chars: 0.0776ms vs 1.1983ms → 15.43× faster
- 50,000 chars: 0.2098ms vs 3.0301ms → 14.44× faster
- 100,000 chars: 0.3835ms vs 8.6169ms → 22.47× faster
- 200,000 chars: 0.8818ms vs 18.64ms → 21.14× faster
- 500,000 chars: 3.7830ms vs 59.67ms → 15.77× faster
- 1,000,000 chars: 7.4413ms vs 126.07ms → 16.94× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0208ms vs 0.0408ms → 1.96× faster, 49% less time
- 20,000 chars: 0.0776ms vs 0.1567ms → 2.02× faster, 50.4% less time
- 50,000 chars: 0.2098ms vs 0.3930ms → 1.87× faster, 46.6% less time
- 100,000 chars: 0.3835ms vs 0.9232ms → 2.41× faster, 58.5% less time
- 200,000 chars: 0.8818ms vs 1.8082ms → 2.05× faster, 51.2% less time
- 500,000 chars: 3.7830ms vs 4.4594ms → 1.18× faster, 15.2% less time
- 1,000,000 chars: 7.4413ms vs 8.9820ms → 1.21× faster, 17.2% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0212ms vs 0.0408ms → 1.92× faster, 48% less time
- 20,000 chars: 0.0789ms vs 0.1567ms → 1.98× faster, 49.6% less time
- 50,000 chars: 0.1934ms vs 0.3930ms → 2.03× faster, 50.8% less time
- 100,000 chars: 0.4344ms vs 0.9232ms → 2.13× faster, 52.9% less time
- 200,000 chars: 0.8994ms vs 1.8082ms → 2.01× faster, 50.3% less time
- 500,000 chars: 3.3957ms vs 4.4594ms → 1.31× faster, 23.9% less time
- 1,000,000 chars: 6.8239ms vs 8.9820ms → 1.32× faster, 24% less time

Render vs micromark:
- 5,000 chars: 0.0208ms vs 8.9209ms → 428.82× faster
- 20,000 chars: 0.0776ms vs 42.10ms → 542.27× faster
- 50,000 chars: 0.2098ms vs 106.86ms → 509.40× faster
- 100,000 chars: 0.3835ms vs 228.24ms → 595.11× faster
- 200,000 chars: 0.8818ms vs 469.16ms → 532.02× faster

Render vs remark+rehype:
- 5,000 chars: 0.0208ms vs 10.30ms → 495.23× faster
- 20,000 chars: 0.0776ms vs 46.62ms → 600.42× faster
- 50,000 chars: 0.2098ms vs 131.63ms → 627.48× faster
- 100,000 chars: 0.3835ms vs 289.93ms → 755.95× faster
- 200,000 chars: 0.8818ms vs 636.92ms → 722.27× faster

Render vs markdown-exit:
- 5,000 chars: 0.0208ms vs 0.4391ms → 21.11× faster
- 20,000 chars: 0.0776ms vs 1.7918ms → 23.08× faster
- 50,000 chars: 0.2098ms vs 4.6193ms → 22.02× faster
- 100,000 chars: 0.3835ms vs 12.27ms → 31.99× faster
- 200,000 chars: 0.8818ms vs 26.62ms → 30.19× faster
- 500,000 chars: 3.7830ms vs 76.60ms → 20.25× faster
- 1,000,000 chars: 7.4413ms vs 168.77ms → 22.68× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0523ms | 0.2421ms | 4.63× faster, 78.4% less time | 0.1613ms | 0.7678ms | 4.76× faster, 79% less time | S5/S5 |
| 20000 | 0.2088ms | 1.0214ms | 4.89× faster, 79.6% less time | 0.7265ms | 3.3793ms | 4.65× faster, 78.5% less time | S5/S5 |
| 50000 | 0.5258ms | 2.5928ms | 4.93× faster, 79.7% less time | 1.7796ms | 8.2294ms | 4.62× faster, 78.4% less time | S5/S5 |
| 100000 | 1.4326ms | 6.0263ms | 4.21× faster, 76.2% less time | 3.4622ms | 17.52ms | 5.06× faster, 80.2% less time | S5/S5 |
| 200000 | 6.9589ms | 11.38ms | 1.64× faster, 38.9% less time | 9.4908ms | 38.04ms | 4.01× faster, 75.1% less time | S5/S5 |
| 500000 | 22.72ms | 54.35ms | 2.39× faster, 58.2% less time | 43.57ms | 173.20ms | 3.98× faster, 74.8% less time | S5/S3 |
| 1000000 | 45.69ms | 96.53ms | 2.11× faster, 52.7% less time | 94.43ms | 334.16ms | 3.54× faster, 71.7% less time | S5/S2 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0523ms | 0.0424ms | 1.23× slower, 23.2% more time | 0.1613ms | 0.0787ms | 2.05× slower, 105.1% more time | S5/S5 |
| 20000 | 0.2088ms | 0.1637ms | 1.28× slower, 27.5% more time | 0.7265ms | 0.2171ms | 3.35× slower, 234.7% more time | S5/S5 |
| 50000 | 0.5258ms | 0.5528ms | 1.05× faster, 4.9% less time | 1.7796ms | 0.4969ms | 3.58× slower, 258.2% more time | S5/S5 |
| 100000 | 1.4326ms | 1.9475ms | 1.36× faster, 26.4% less time | 3.4622ms | 0.9543ms | 3.63× slower, 262.8% more time | S5/S5 |
| 200000 | 6.9589ms | 3.7609ms | 1.85× slower, 85% more time | 9.4908ms | 2.4715ms | 3.84× slower, 284% more time | S5/S5 |
| 500000 | 22.72ms | 7.1519ms | 3.18× slower, 217.6% more time | 43.57ms | 5.8971ms | 7.39× slower, 638.9% more time | S5/S3 |
| 1000000 | 45.69ms | 13.36ms | 3.42× slower, 241.9% more time | 94.43ms | 11.94ms | 7.91× slower, 690.9% more time | S5/S2 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0523ms | 0.2624ms | 5.02× faster, 80.1% less time |
| 20000 | 0.2088ms | 1.0396ms | 4.98× faster, 79.9% less time |
| 50000 | 0.5258ms | 2.7650ms | 5.26× faster, 81% less time |
| 100000 | 1.4326ms | 6.4127ms | 4.48× faster, 77.7% less time |
| 200000 | 6.9589ms | 12.77ms | 1.83× faster, 45.5% less time |
| 500000 | 22.72ms | 30.28ms | 1.33× faster, 25% less time |
| 1000000 | 45.69ms | 58.71ms | 1.29× faster, 22.2% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0327ms | 0.0415ms | 1.27× faster, 21.3% less time | 0.2618ms |
| 20000 | 0.1217ms | 0.1736ms | 1.43× faster, 29.9% less time | 1.0386ms |
| 50000 | 0.2771ms | 0.5372ms | 1.94× faster, 48.4% less time | 2.7049ms |
| 100000 | 0.5790ms | 1.0365ms | 1.79× faster, 44.1% less time | 5.3568ms |
| 200000 | 1.1743ms | 2.2462ms | 1.91× faster, 47.7% less time | 10.67ms |
| 500000 | 3.2012ms | 5.0425ms | 1.58× faster, 36.5% less time | 27.13ms |
| 1000000 | 7.7756ms | 11.76ms | 1.51× faster, 33.9% less time | 57.06ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.2597ms | 0.2610ms |
| @ox-content/napi (parse only) | 0.0429ms | 0.0427ms |
| markdown-exit | 0.5089ms | 0.3925ms |
| markdown-it (baseline) | 0.2655ms | 0.2323ms |
| markdown-it-ts (stream+chunk) | 0.2661ms | 0.4361ms |
| micromark (parse only) | 11.72ms | 8.3399ms |
| remark (parse only) | 6.7390ms | 8.7261ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.0492ms | 1.0329ms |
| @ox-content/napi (parse only) | 0.1713ms | 0.1586ms |
| markdown-exit | 1.4949ms | 1.5809ms |
| markdown-it (baseline) | 1.4958ms | 1.0344ms |
| markdown-it-ts (stream+chunk) | 0.9894ms | 1.0664ms |
| micromark (parse only) | 47.06ms | 29.18ms |
| remark (parse only) | 40.29ms | 35.98ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 2.7028ms | 2.6997ms |
| @ox-content/napi (parse only) | 0.5486ms | 0.5446ms |
| markdown-exit | 3.7786ms | 4.0837ms |
| markdown-it (baseline) | 2.3010ms | 2.6822ms |
| markdown-it-ts (stream+chunk) | 2.2941ms | 2.6129ms |
| micromark (parse only) | 85.00ms | 96.21ms |
| remark (parse only) | 104.15ms | 114.64ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 5.2851ms | 5.3371ms |
| @ox-content/napi (parse only) | 1.0498ms | 1.0681ms |
| markdown-exit | 9.5929ms | 11.52ms |
| markdown-it (baseline) | 7.5128ms | 7.4298ms |
| markdown-it-ts (stream+chunk) | 9.7435ms | 6.9569ms |
| micromark (parse only) | 171.29ms | 183.76ms |
| remark (parse only) | 232.12ms | 290.17ms |
