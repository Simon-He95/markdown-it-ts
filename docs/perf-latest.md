# Performance Report (latest run)

## Environment

- Generated at: 2026-07-31T04:41:41.249Z
- Node.js: v24.18.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 6e3c7acaa3771ad5d90f15a1eae7f4dae063424e

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
| 5,011 | 0.0489ms | 0.1622ms | 0.0441ms | stock-fast | 0.0157ms | 0.1804ms | 0.0286ms | stock-fast | no |
| 20,085 | 0.1044ms | 0.6030ms | 0.1445ms | stock-fast | 0.0598ms | 0.7100ms | 0.1426ms | stock-fast | no |
| 50,084 | 0.2429ms | 1.4502ms | 0.4176ms | stock-fast | 0.1364ms | 1.7652ms | 0.3322ms | stock-fast | no |
| 100,126 | 0.4758ms | 3.1883ms | 0.8012ms | stock-fast | 0.2787ms | 3.9137ms | 0.7201ms | stock-fast | no |
| 200,073 | 1.2455ms | 6.9068ms | 1.7336ms | stock-fast | 0.5549ms | 8.9238ms | 1.4865ms | stock-fast | no |
| 500,121 | 2.3165ms | 17.34ms | 3.9406ms | stock-fast | 1.9157ms | 28.57ms | 3.5465ms | stock-fast | no |
| 1,000,068 | 12.30ms | 49.55ms | 7.2335ms | stock-fast | 4.1536ms | 58.36ms | 6.7881ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2426ms | 0.2291ms | 0.0455ms | general | 0.2231ms | 0.2682ms | 0.0364ms | token-renderer | no |
| 20,125 | 0.6941ms | 0.7874ms | 0.1671ms | general | 0.7904ms | 1.0201ms | 0.1703ms | token-renderer | no |
| 50,025 | 1.6606ms | 1.9814ms | 0.4956ms | general | 1.9394ms | 2.4486ms | 0.3743ms | token-renderer | no |
| 100,450 | 3.6274ms | 4.2653ms | 0.9461ms | general | 4.4958ms | 5.4739ms | 0.8181ms | token-renderer | no |
| 200,109 | 8.7187ms | 9.0944ms | 1.9789ms | full-chunk | 11.03ms | 12.18ms | 1.9960ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1010ms | 0.1220ms | 0.0219ms | general | 0.0971ms | 0.1162ms | 0.0156ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0988ms | 0.1107ms | 0.0211ms | general | 0.1176ms | 0.1351ms | 0.0185ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0250ms | 0.0277ms | 0.0066ms | general | 0.0373ms | 0.0419ms | 0.0063ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1898ms | 0.1466ms | 0.1981ms | 0.1656ms | 0.0624ms | 0.1926ms | 0.2457ms | **0.0363ms** | 0.1511ms | 2.9167ms | 0.5144ms | 0.2605ms | 0.2276ms | 0.4813ms | 0.0831ms | 0.4817ms | 0.6518ms | **0.0480ms** | 0.1669ms | 10.19ms | 1.6359ms | 0.3759ms | 0.3193ms | 1.4555ms | 0.8559ms | 1.4442ms | 2.0588ms | **0.0750ms** | 0.1944ms | 26.30ms | 0.1718ms | 0.1324ms | 0.1604ms | 0.1666ms | 0.1503ms | 0.1581ms | 0.2183ms | **0.0308ms** | 0.1423ms | 2.9857ms |
| 20000 | 0.6292ms | 0.5481ms | 0.7017ms | 0.6494ms | **0.0985ms** | 0.5835ms | 0.7975ms | 0.1173ms | 0.5448ms | 13.73ms | 2.1737ms | 0.6825ms | 0.8354ms | 2.1475ms | 0.3384ms | 2.0267ms | 2.7040ms | **0.1482ms** | 0.5767ms | 39.15ms | 6.0012ms | 1.1766ms | 1.1314ms | 6.0413ms | 1.7266ms | 5.4554ms | 7.3838ms | **0.1884ms** | 0.6292ms | 109.31ms | 0.6651ms | 0.5165ms | 0.6366ms | 0.6199ms | 0.5871ms | 0.6028ms | 0.8196ms | **0.1130ms** | 0.5428ms | 12.24ms |
| 50000 | 1.6036ms | 1.2762ms | 1.5930ms | 1.6214ms | **0.2367ms** | 1.4926ms | 1.9929ms | 0.3447ms | 1.4679ms | 39.23ms | 5.6989ms | 1.6333ms | 1.6759ms | 5.5879ms | 0.9094ms | 5.0707ms | 6.8187ms | **0.3941ms** | 1.4205ms | 124.78ms | 18.37ms | 2.1541ms | 2.2376ms | 14.75ms | 2.3932ms | 13.76ms | 18.60ms | **0.3864ms** | 1.5051ms | 335.34ms | 1.6553ms | 1.2200ms | 1.5815ms | 1.5855ms | 1.4631ms | 1.4590ms | 1.9746ms | **0.3533ms** | 1.4757ms | 36.25ms |
| 100000 | 3.3528ms | 2.6932ms | 3.4169ms | 3.5185ms | **0.6097ms** | 3.1983ms | 4.4228ms | 0.7607ms | 3.0128ms | 83.90ms | 11.16ms | 4.1175ms | 3.5661ms | 11.51ms | 2.0852ms | 10.63ms | 14.21ms | **0.7163ms** | 3.1311ms | 274.51ms | 30.70ms | 4.8516ms | 4.5476ms | 30.57ms | 5.3460ms | 29.03ms | 39.20ms | **0.8430ms** | 3.0308ms | 757.53ms | 3.3543ms | 2.4953ms | 3.2325ms | 3.2724ms | 3.2662ms | 3.0260ms | 3.9669ms | **0.7620ms** | 2.9517ms | 76.85ms |
| 200000 | 8.9225ms | 6.3317ms | 7.4832ms | 7.1816ms | **1.3321ms** | 7.8202ms | 9.7843ms | 1.5156ms | 6.0990ms | 154.72ms | 25.37ms | 8.1554ms | 7.7080ms | 22.93ms | 4.0686ms | 23.27ms | 30.02ms | **1.8233ms** | 5.9396ms | 572.25ms | 64.56ms | 19.02ms | 10.22ms | 62.29ms | 10.80ms | 59.45ms | 80.00ms | **1.5221ms** | 6.0261ms | 1556.37ms | 6.5481ms | 5.2917ms | 7.0825ms | 7.0063ms | 7.7818ms | 6.9015ms | 9.1174ms | **1.6395ms** | 5.8310ms | 154.57ms |
| 500000 | 22.24ms | 20.56ms | 20.30ms | 23.10ms | 6.8420ms | 22.54ms | 27.67ms | **4.0434ms** | 14.93ms | - | 63.31ms | 24.63ms | 25.15ms | 60.00ms | 13.52ms | 71.41ms | 87.31ms | **4.4310ms** | 15.82ms | - | 189.36ms | 35.03ms | 26.80ms | 165.82ms | 53.77ms | 195.15ms | 228.75ms | **4.3824ms** | 15.15ms | - | 20.49ms | 20.94ms | 20.52ms | 18.47ms | 21.21ms | 19.09ms | 30.61ms | **3.7928ms** | 14.45ms | - |
| 1000000 | 46.87ms | 43.19ms | 40.99ms | 48.52ms | 11.82ms | 57.13ms | 55.94ms | **7.6587ms** | 28.70ms | - | 151.23ms | 49.76ms | 52.35ms | 142.37ms | 43.99ms | 133.69ms | 214.62ms | **9.7641ms** | 34.29ms | - | 362.45ms | 59.55ms | 52.59ms | 356.40ms | 94.45ms | 379.33ms | 489.15ms | **10.79ms** | 34.06ms | - | 43.15ms | 42.40ms | 42.35ms | 54.70ms | 43.17ms | 45.28ms | 52.86ms | **7.3102ms** | 30.34ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0624ms (stream OFF, chunk OFF)
- 20000: S5 0.0985ms (stream OFF, chunk OFF)
- 50000: S5 0.2367ms (stream OFF, chunk OFF)
- 100000: S5 0.6097ms (stream OFF, chunk OFF)
- 200000: S5 1.3321ms (stream OFF, chunk OFF)
- 500000: S5 6.8420ms (stream OFF, chunk OFF)
- 1000000: S5 11.82ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.0831ms (stream OFF, chunk OFF)
- 20000: S5 0.3384ms (stream OFF, chunk OFF)
- 50000: S5 0.9094ms (stream OFF, chunk OFF)
- 100000: S5 2.0852ms (stream OFF, chunk OFF)
- 200000: S5 4.0686ms (stream OFF, chunk OFF)
- 500000: S5 13.52ms (stream OFF, chunk OFF)
- 1000000: S5 43.99ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3193ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.1314ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.1541ms (stream ON, cache ON, chunk OFF)
- 100000: S3 4.5476ms (stream ON, cache ON, chunk ON)
- 200000: S3 10.22ms (stream ON, cache ON, chunk ON)
- 500000: S3 26.80ms (stream ON, cache ON, chunk ON)
- 1000000: S3 52.59ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1324ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.5165ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.2200ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.4953ms (stream ON, cache ON, chunk OFF)
- 200000: S2 5.2917ms (stream ON, cache ON, chunk OFF)
- 500000: S4 18.47ms (stream OFF, chunk ON)
- 1000000: S3 42.35ms (stream ON, cache ON, chunk ON)

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
| 5000 | 0.0162ms | 0.0155ms | 0.1837ms | 0.0354ms | 3.2801ms | 3.6978ms | 0.2369ms |
| 20000 | 0.0552ms | 0.0565ms | 0.7353ms | 0.1823ms | 16.95ms | 18.82ms | 0.9293ms |
| 50000 | 0.1376ms | 0.1355ms | 1.8077ms | 0.3577ms | 48.90ms | 63.50ms | 2.3369ms |
| 100000 | 0.2778ms | 0.2691ms | 4.3147ms | 0.7098ms | 102.93ms | 139.61ms | 5.0335ms |
| 200000 | 0.5467ms | 0.5489ms | 9.2046ms | 1.5852ms | 202.43ms | 348.89ms | 11.52ms |
| 500000 | 2.0861ms | 2.7321ms | 29.59ms | 3.8290ms | - | - | 35.70ms |
| 1000000 | 4.2656ms | 4.0042ms | 56.90ms | 6.8590ms | - | - | 75.66ms |

Render vs markdown-it:
- 5,000 chars: 0.0162ms vs 0.1837ms → 11.34× faster
- 20,000 chars: 0.0552ms vs 0.7353ms → 13.32× faster
- 50,000 chars: 0.1376ms vs 1.8077ms → 13.13× faster
- 100,000 chars: 0.2778ms vs 4.3147ms → 15.53× faster
- 200,000 chars: 0.5467ms vs 9.2046ms → 16.84× faster
- 500,000 chars: 2.0861ms vs 29.59ms → 14.19× faster
- 1,000,000 chars: 4.2656ms vs 56.90ms → 13.34× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0162ms vs 0.0354ms → 2.19× faster, 54.3% less time
- 20,000 chars: 0.0552ms vs 0.1823ms → 3.3× faster, 69.7% less time
- 50,000 chars: 0.1376ms vs 0.3577ms → 2.6× faster, 61.5% less time
- 100,000 chars: 0.2778ms vs 0.7098ms → 2.56× faster, 60.9% less time
- 200,000 chars: 0.5467ms vs 1.5852ms → 2.9× faster, 65.5% less time
- 500,000 chars: 2.0861ms vs 3.8290ms → 1.84× faster, 45.5% less time
- 1,000,000 chars: 4.2656ms vs 6.8590ms → 1.61× faster, 37.8% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0155ms vs 0.0354ms → 2.29× faster, 56.4% less time
- 20,000 chars: 0.0565ms vs 0.1823ms → 3.22× faster, 69% less time
- 50,000 chars: 0.1355ms vs 0.3577ms → 2.64× faster, 62.1% less time
- 100,000 chars: 0.2691ms vs 0.7098ms → 2.64× faster, 62.1% less time
- 200,000 chars: 0.5489ms vs 1.5852ms → 2.89× faster, 65.4% less time
- 500,000 chars: 2.7321ms vs 3.8290ms → 1.4× faster, 28.6% less time
- 1,000,000 chars: 4.0042ms vs 6.8590ms → 1.71× faster, 41.6% less time

Render vs micromark:
- 5,000 chars: 0.0162ms vs 3.2801ms → 202.49× faster
- 20,000 chars: 0.0552ms vs 16.95ms → 307.08× faster
- 50,000 chars: 0.1376ms vs 48.90ms → 355.28× faster
- 100,000 chars: 0.2778ms vs 102.93ms → 370.55× faster
- 200,000 chars: 0.5467ms vs 202.43ms → 370.29× faster

Render vs remark+rehype:
- 5,000 chars: 0.0162ms vs 3.6978ms → 228.27× faster
- 20,000 chars: 0.0552ms vs 18.82ms → 341.09× faster
- 50,000 chars: 0.1376ms vs 63.50ms → 461.34× faster
- 100,000 chars: 0.2778ms vs 139.61ms → 502.61× faster
- 200,000 chars: 0.5467ms vs 348.89ms → 638.19× faster

Render vs markdown-exit:
- 5,000 chars: 0.0162ms vs 0.2369ms → 14.63× faster
- 20,000 chars: 0.0552ms vs 0.9293ms → 16.84× faster
- 50,000 chars: 0.1376ms vs 2.3369ms → 16.98× faster
- 100,000 chars: 0.2778ms vs 5.0335ms → 18.12× faster
- 200,000 chars: 0.5467ms vs 11.52ms → 21.08× faster
- 500,000 chars: 2.0861ms vs 35.70ms → 17.11× faster
- 1,000,000 chars: 4.2656ms vs 75.66ms → 17.74× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0624ms | 0.1926ms | 3.09× faster, 67.6% less time | 0.0831ms | 0.4817ms | 5.8× faster, 82.8% less time | S5/S5 |
| 20000 | 0.0985ms | 0.5835ms | 5.92× faster, 83.1% less time | 0.3384ms | 2.0267ms | 5.99× faster, 83.3% less time | S5/S5 |
| 50000 | 0.2367ms | 1.4926ms | 6.31× faster, 84.1% less time | 0.9094ms | 5.0707ms | 5.58× faster, 82.1% less time | S5/S5 |
| 100000 | 0.6097ms | 3.1983ms | 5.25× faster, 80.9% less time | 2.0852ms | 10.63ms | 5.1× faster, 80.4% less time | S5/S5 |
| 200000 | 1.3321ms | 7.8202ms | 5.87× faster, 83% less time | 4.0686ms | 23.27ms | 5.72× faster, 82.5% less time | S5/S5 |
| 500000 | 6.8420ms | 22.54ms | 3.29× faster, 69.6% less time | 13.52ms | 71.41ms | 5.28× faster, 81.1% less time | S5/S5 |
| 1000000 | 11.82ms | 57.13ms | 4.83× faster, 79.3% less time | 43.99ms | 133.69ms | 3.04× faster, 67.1% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0624ms | 0.0363ms | 1.72× slower, 72.1% more time | 0.0831ms | 0.0480ms | 1.73× slower, 73.2% more time | S5/S5 |
| 20000 | 0.0985ms | 0.1173ms | 1.19× faster, 16.1% less time | 0.3384ms | 0.1482ms | 2.28× slower, 128.3% more time | S5/S5 |
| 50000 | 0.2367ms | 0.3447ms | 1.46× faster, 31.3% less time | 0.9094ms | 0.3941ms | 2.31× slower, 130.8% more time | S5/S5 |
| 100000 | 0.6097ms | 0.7607ms | 1.25× faster, 19.9% less time | 2.0852ms | 0.7163ms | 2.91× slower, 191.1% more time | S5/S5 |
| 200000 | 1.3321ms | 1.5156ms | 1.14× faster, 12.1% less time | 4.0686ms | 1.8233ms | 2.23× slower, 123.1% more time | S5/S5 |
| 500000 | 6.8420ms | 4.0434ms | 1.69× slower, 69.2% more time | 13.52ms | 4.4310ms | 3.05× slower, 205.2% more time | S5/S5 |
| 1000000 | 11.82ms | 7.6587ms | 1.54× slower, 54.3% more time | 43.99ms | 9.7641ms | 4.51× slower, 350.6% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0624ms | 0.1511ms | 2.42× faster, 58.7% less time |
| 20000 | 0.0985ms | 0.5448ms | 5.53× faster, 81.9% less time |
| 50000 | 0.2367ms | 1.4679ms | 6.2× faster, 83.9% less time |
| 100000 | 0.6097ms | 3.0128ms | 4.94× faster, 79.8% less time |
| 200000 | 1.3321ms | 6.0990ms | 4.58× faster, 78.2% less time |
| 500000 | 6.8420ms | 14.93ms | 2.18× faster, 54.2% less time |
| 1000000 | 11.82ms | 28.70ms | 2.43× faster, 58.8% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0209ms | 0.0315ms | 1.51× faster, 33.8% less time | 0.1613ms |
| 20000 | 0.0689ms | 0.1332ms | 1.93× faster, 48.3% less time | 0.5851ms |
| 50000 | 0.2011ms | 0.3994ms | 1.99× faster, 49.7% less time | 1.7825ms |
| 100000 | 0.3324ms | 0.8149ms | 2.45× faster, 59.2% less time | 3.3007ms |
| 200000 | 0.6541ms | 1.7312ms | 2.65× faster, 62.2% less time | 6.2410ms |
| 500000 | 1.6083ms | 4.0021ms | 2.49× faster, 59.8% less time | 15.37ms |
| 1000000 | 3.4416ms | 7.8867ms | 2.29× faster, 56.4% less time | 31.51ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1718ms | 0.1581ms |
| @ox-content/napi (parse only) | 0.0320ms | 0.0301ms |
| markdown-exit | 1.1903ms | 0.4491ms |
| markdown-it (baseline) | 0.1585ms | 0.1391ms |
| markdown-it-ts (stream+chunk) | 0.6326ms | 0.4427ms |
| micromark (parse only) | 3.9346ms | 2.9361ms |
| remark (parse only) | 3.4851ms | 3.6713ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.5596ms | 0.6080ms |
| @ox-content/napi (parse only) | 0.1316ms | 0.1198ms |
| markdown-exit | 0.8468ms | 0.8028ms |
| markdown-it (baseline) | 0.6178ms | 0.5911ms |
| markdown-it-ts (stream+chunk) | 0.9498ms | 0.7418ms |
| micromark (parse only) | 12.20ms | 14.22ms |
| remark (parse only) | 16.79ms | 16.57ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.4759ms | 1.5320ms |
| @ox-content/napi (parse only) | 0.3959ms | 0.4374ms |
| markdown-exit | 1.8764ms | 1.9058ms |
| markdown-it (baseline) | 1.4033ms | 1.4841ms |
| markdown-it-ts (stream+chunk) | 1.5765ms | 1.6666ms |
| micromark (parse only) | 35.43ms | 38.85ms |
| remark (parse only) | 57.83ms | 58.86ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.1496ms | 3.1412ms |
| @ox-content/napi (parse only) | 0.7704ms | 0.8287ms |
| markdown-exit | 4.2968ms | 4.3417ms |
| markdown-it (baseline) | 3.0795ms | 3.3527ms |
| markdown-it-ts (stream+chunk) | 3.2418ms | 3.4675ms |
| micromark (parse only) | 80.05ms | 84.75ms |
| remark (parse only) | 132.46ms | 123.00ms |
