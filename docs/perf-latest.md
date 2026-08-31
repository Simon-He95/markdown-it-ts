# Performance Report (latest run)

## Environment

- Generated at: 2026-08-31T02:21:17.120Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 6730d61eb70061878538466bde4c1d829e8448e0

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
| 5,011 | 0.0629ms | 0.2099ms | 0.0432ms | stock-fast | 0.0211ms | 0.2414ms | 0.0398ms | stock-fast | no |
| 20,085 | 0.1264ms | 0.7482ms | 0.1677ms | stock-fast | 0.0731ms | 0.9187ms | 0.1522ms | stock-fast | no |
| 50,084 | 0.3055ms | 1.8693ms | 0.4346ms | stock-fast | 0.1810ms | 2.3677ms | 0.3795ms | stock-fast | no |
| 100,126 | 0.6451ms | 3.9646ms | 0.8801ms | stock-fast | 0.3631ms | 5.1624ms | 0.7777ms | stock-fast | no |
| 200,073 | 1.1394ms | 8.0498ms | 1.6526ms | stock-fast | 0.7132ms | 11.27ms | 1.5448ms | stock-fast | no |
| 500,121 | 3.9036ms | 22.93ms | 4.1167ms | stock-fast | 2.3747ms | 32.28ms | 4.0250ms | stock-fast | no |
| 1,000,068 | 15.05ms | 59.45ms | 10.98ms | stock-fast | 4.8581ms | 71.25ms | 7.4825ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2333ms | 0.2779ms | 0.0599ms | general | 0.2638ms | 0.3341ms | 0.0540ms | token-renderer | no |
| 20,125 | 0.8028ms | 0.9958ms | 0.2217ms | general | 0.9385ms | 1.3208ms | 0.2106ms | token-renderer | no |
| 50,025 | 1.9723ms | 2.5230ms | 0.5764ms | general | 2.3822ms | 3.2738ms | 0.5039ms | token-renderer | no |
| 100,450 | 4.2427ms | 5.2455ms | 1.1187ms | general | 4.9668ms | 6.8427ms | 1.0194ms | token-renderer | no |
| 200,109 | 9.8830ms | 11.14ms | 2.2113ms | full-chunk | 11.73ms | 14.31ms | 2.0038ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0941ms | 0.1310ms | 0.0352ms | general | 0.1053ms | 0.1499ms | 0.0253ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1047ms | 0.1354ms | 0.0316ms | general | 0.1245ms | 0.1586ms | 0.0282ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0279ms | 0.0356ms | 0.0091ms | general | 0.0344ms | 0.0431ms | 0.0084ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2055ms | 0.1595ms | 0.1953ms | 0.1973ms | **0.0396ms** | 0.1873ms | 0.2591ms | 0.0432ms | 0.1833ms | 3.0877ms | 0.6074ms | 0.2953ms | 0.3013ms | 0.5545ms | 0.1039ms | 0.6078ms | 0.8293ms | **0.0625ms** | 0.2045ms | 10.05ms | 1.7944ms | 0.5278ms | 0.4113ms | 1.7017ms | 0.5680ms | 1.7569ms | 2.4312ms | **0.0945ms** | 0.2419ms | 28.66ms | 0.2076ms | 0.1644ms | 0.1964ms | 0.2100ms | 0.1744ms | 0.1963ms | 0.2792ms | **0.0420ms** | 0.1811ms | 3.0965ms |
| 20000 | 0.7959ms | 0.6043ms | 0.7471ms | 0.7491ms | **0.1195ms** | 0.7406ms | 1.0164ms | 0.1634ms | 0.7223ms | 16.91ms | 2.5445ms | 1.0133ms | 1.0559ms | 2.6031ms | 0.4105ms | 2.5316ms | 3.4635ms | **0.2047ms** | 0.7813ms | 49.37ms | 7.0219ms | 1.4158ms | 1.3676ms | 7.2301ms | 2.2398ms | 7.1404ms | 9.5589ms | **0.2474ms** | 0.8165ms | 136.38ms | 0.7908ms | 0.5897ms | 0.7733ms | 0.7427ms | 0.6890ms | 0.7142ms | 0.9960ms | **0.1621ms** | 0.7141ms | 15.35ms |
| 50000 | 2.0470ms | 1.5273ms | 1.9069ms | 1.9008ms | **0.3001ms** | 1.8566ms | 2.5272ms | 0.4314ms | 1.8405ms | 45.92ms | 6.7112ms | 3.3718ms | 2.3337ms | 6.5717ms | 1.1363ms | 6.4419ms | 8.7189ms | **0.4752ms** | 1.8532ms | 149.65ms | 18.05ms | 3.0813ms | 3.0018ms | 17.66ms | 3.0553ms | 17.29ms | 23.79ms | **0.5126ms** | 1.8926ms | 396.30ms | 1.9053ms | 1.5118ms | 1.8662ms | 1.9106ms | 1.7820ms | 1.8277ms | 2.4928ms | **0.4407ms** | 1.7954ms | 42.23ms |
| 100000 | 4.0418ms | 3.2120ms | 4.0134ms | 4.0449ms | **0.6960ms** | 3.9228ms | 5.2894ms | 0.8536ms | 3.6100ms | 94.25ms | 13.84ms | 4.6479ms | 5.2733ms | 13.38ms | 2.2338ms | 13.03ms | 17.63ms | **0.9396ms** | 3.6587ms | 318.70ms | 37.12ms | 6.1975ms | 8.9129ms | 36.00ms | 6.2934ms | 35.54ms | 48.03ms | **0.9957ms** | 3.6873ms | 886.55ms | 3.8699ms | 2.9808ms | 3.8845ms | 3.8298ms | 3.5736ms | 3.7809ms | 5.1752ms | **0.8756ms** | 3.6065ms | 100.33ms |
| 200000 | 8.3701ms | 6.8662ms | 8.0885ms | 8.2369ms | **1.5851ms** | 8.7587ms | 11.55ms | 1.7048ms | 7.1534ms | 190.87ms | 27.28ms | 10.79ms | 11.39ms | 26.82ms | 4.9085ms | 27.77ms | 37.20ms | **1.9762ms** | 7.4941ms | 651.79ms | 72.48ms | 19.31ms | 20.36ms | 74.40ms | 13.25ms | 71.70ms | 99.20ms | **1.9081ms** | 7.4327ms | 1809.47ms | 8.0699ms | 6.0215ms | 8.8830ms | 7.9339ms | 9.3483ms | 7.6492ms | 10.68ms | **1.6841ms** | 7.1002ms | 188.69ms |
| 500000 | 22.21ms | 19.85ms | 24.96ms | 22.81ms | 5.8338ms | 23.40ms | 30.68ms | **4.2317ms** | 17.66ms | - | 66.45ms | 42.70ms | 30.67ms | 68.40ms | 13.70ms | 74.74ms | 97.84ms | **4.6443ms** | 18.10ms | - | 187.04ms | 37.65ms | 38.22ms | 198.15ms | 58.58ms | 204.74ms | 265.81ms | **4.9463ms** | 18.35ms | - | 20.81ms | 23.02ms | 20.96ms | 22.82ms | 24.11ms | 27.30ms | 33.07ms | **4.1973ms** | 17.46ms | - |
| 1000000 | 48.83ms | 49.84ms | 52.06ms | 47.78ms | 13.12ms | 51.20ms | 70.52ms | **10.54ms** | 37.37ms | - | 162.25ms | 70.41ms | 70.69ms | 155.20ms | 37.50ms | 173.51ms | 218.87ms | **9.4795ms** | 38.52ms | - | 407.05ms | 115.38ms | 99.70ms | 403.96ms | 93.02ms | 472.41ms | 633.32ms | **9.6266ms** | 38.69ms | - | 52.09ms | 48.90ms | 54.13ms | 43.15ms | 52.83ms | 53.16ms | 65.80ms | **10.48ms** | 66.45ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0396ms (stream OFF, chunk OFF)
- 20000: S5 0.1195ms (stream OFF, chunk OFF)
- 50000: S5 0.3001ms (stream OFF, chunk OFF)
- 100000: S5 0.6960ms (stream OFF, chunk OFF)
- 200000: S5 1.5851ms (stream OFF, chunk OFF)
- 500000: S5 5.8338ms (stream OFF, chunk OFF)
- 1000000: S5 13.12ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1039ms (stream OFF, chunk OFF)
- 20000: S5 0.4105ms (stream OFF, chunk OFF)
- 50000: S5 1.1363ms (stream OFF, chunk OFF)
- 100000: S5 2.2338ms (stream OFF, chunk OFF)
- 200000: S5 4.9085ms (stream OFF, chunk OFF)
- 500000: S5 13.70ms (stream OFF, chunk OFF)
- 1000000: S5 37.50ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.4113ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.3676ms (stream ON, cache ON, chunk ON)
- 50000: S3 3.0018ms (stream ON, cache ON, chunk ON)
- 100000: S2 6.1975ms (stream ON, cache ON, chunk OFF)
- 200000: S5 13.25ms (stream OFF, chunk OFF)
- 500000: S2 37.65ms (stream ON, cache ON, chunk OFF)
- 1000000: S5 93.02ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1644ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.5897ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.5118ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.9808ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.0215ms (stream ON, cache ON, chunk OFF)
- 500000: S1 20.81ms (stream ON, cache OFF, chunk ON)
- 1000000: S4 43.15ms (stream OFF, chunk ON)

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
| 5000 | 0.0219ms | 0.0190ms | 0.2379ms | 0.0393ms | 4.1452ms | 5.1052ms | 0.3352ms |
| 20000 | 0.0714ms | 0.0742ms | 1.0112ms | 0.1605ms | 18.95ms | 23.14ms | 1.1911ms |
| 50000 | 0.1807ms | 0.1787ms | 2.2965ms | 0.3694ms | 61.37ms | 75.00ms | 3.0392ms |
| 100000 | 0.4223ms | 0.3611ms | 5.2000ms | 0.7707ms | 118.88ms | 170.90ms | 6.3191ms |
| 200000 | 0.7041ms | 0.7025ms | 10.64ms | 1.5152ms | 240.54ms | 418.90ms | 13.16ms |
| 500000 | 2.4424ms | 2.3762ms | 32.26ms | 3.7622ms | - | - | 40.36ms |
| 1000000 | 7.6608ms | 4.7653ms | 70.53ms | 7.5547ms | - | - | 96.36ms |

Render vs markdown-it:
- 5,000 chars: 0.0219ms vs 0.2379ms → 10.84× faster
- 20,000 chars: 0.0714ms vs 1.0112ms → 14.16× faster
- 50,000 chars: 0.1807ms vs 2.2965ms → 12.71× faster
- 100,000 chars: 0.4223ms vs 5.2000ms → 12.31× faster
- 200,000 chars: 0.7041ms vs 10.64ms → 15.11× faster
- 500,000 chars: 2.4424ms vs 32.26ms → 13.21× faster
- 1,000,000 chars: 7.6608ms vs 70.53ms → 9.21× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0219ms vs 0.0393ms → 1.79× faster, 44.1% less time
- 20,000 chars: 0.0714ms vs 0.1605ms → 2.25× faster, 55.5% less time
- 50,000 chars: 0.1807ms vs 0.3694ms → 2.04× faster, 51.1% less time
- 100,000 chars: 0.4223ms vs 0.7707ms → 1.83× faster, 45.2% less time
- 200,000 chars: 0.7041ms vs 1.5152ms → 2.15× faster, 53.5% less time
- 500,000 chars: 2.4424ms vs 3.7622ms → 1.54× faster, 35.1% less time
- 1,000,000 chars: 7.6608ms vs 7.5547ms → 1.01× slower, 1.4% more time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0190ms vs 0.0393ms → 2.07× faster, 51.7% less time
- 20,000 chars: 0.0742ms vs 0.1605ms → 2.16× faster, 53.8% less time
- 50,000 chars: 0.1787ms vs 0.3694ms → 2.07× faster, 51.6% less time
- 100,000 chars: 0.3611ms vs 0.7707ms → 2.13× faster, 53.2% less time
- 200,000 chars: 0.7025ms vs 1.5152ms → 2.16× faster, 53.6% less time
- 500,000 chars: 2.3762ms vs 3.7622ms → 1.58× faster, 36.8% less time
- 1,000,000 chars: 4.7653ms vs 7.5547ms → 1.59× faster, 36.9% less time

Render vs micromark:
- 5,000 chars: 0.0219ms vs 4.1452ms → 188.88× faster
- 20,000 chars: 0.0714ms vs 18.95ms → 265.47× faster
- 50,000 chars: 0.1807ms vs 61.37ms → 339.62× faster
- 100,000 chars: 0.4223ms vs 118.88ms → 281.51× faster
- 200,000 chars: 0.7041ms vs 240.54ms → 341.63× faster

Render vs remark+rehype:
- 5,000 chars: 0.0219ms vs 5.1052ms → 232.63× faster
- 20,000 chars: 0.0714ms vs 23.14ms → 324.06× faster
- 50,000 chars: 0.1807ms vs 75.00ms → 415.03× faster
- 100,000 chars: 0.4223ms vs 170.90ms → 404.72× faster
- 200,000 chars: 0.7041ms vs 418.90ms → 594.94× faster

Render vs markdown-exit:
- 5,000 chars: 0.0219ms vs 0.3352ms → 15.28× faster
- 20,000 chars: 0.0714ms vs 1.1911ms → 16.68× faster
- 50,000 chars: 0.1807ms vs 3.0392ms → 16.82× faster
- 100,000 chars: 0.4223ms vs 6.3191ms → 14.96× faster
- 200,000 chars: 0.7041ms vs 13.16ms → 18.69× faster
- 500,000 chars: 2.4424ms vs 40.36ms → 16.53× faster
- 1,000,000 chars: 7.6608ms vs 96.36ms → 12.58× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0396ms | 0.1873ms | 4.73× faster, 78.9% less time | 0.1039ms | 0.6078ms | 5.85× faster, 82.9% less time | S5/S5 |
| 20000 | 0.1195ms | 0.7406ms | 6.2× faster, 83.9% less time | 0.4105ms | 2.5316ms | 6.17× faster, 83.8% less time | S5/S5 |
| 50000 | 0.3001ms | 1.8566ms | 6.19× faster, 83.8% less time | 1.1363ms | 6.4419ms | 5.67× faster, 82.4% less time | S5/S5 |
| 100000 | 0.6960ms | 3.9228ms | 5.64× faster, 82.3% less time | 2.2338ms | 13.03ms | 5.83× faster, 82.9% less time | S5/S5 |
| 200000 | 1.5851ms | 8.7587ms | 5.53× faster, 81.9% less time | 4.9085ms | 27.77ms | 5.66× faster, 82.3% less time | S5/S5 |
| 500000 | 5.8338ms | 23.40ms | 4.01× faster, 75.1% less time | 13.70ms | 74.74ms | 5.46× faster, 81.7% less time | S5/S5 |
| 1000000 | 13.12ms | 51.20ms | 3.9× faster, 74.4% less time | 37.50ms | 173.51ms | 4.63× faster, 78.4% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0396ms | 0.0432ms | 1.09× faster, 8.3% less time | 0.1039ms | 0.0625ms | 1.66× slower, 66.2% more time | S5/S5 |
| 20000 | 0.1195ms | 0.1634ms | 1.37× faster, 26.9% less time | 0.4105ms | 0.2047ms | 2.01× slower, 100.5% more time | S5/S5 |
| 50000 | 0.3001ms | 0.4314ms | 1.44× faster, 30.4% less time | 1.1363ms | 0.4752ms | 2.39× slower, 139.1% more time | S5/S5 |
| 100000 | 0.6960ms | 0.8536ms | 1.23× faster, 18.5% less time | 2.2338ms | 0.9396ms | 2.38× slower, 137.7% more time | S5/S5 |
| 200000 | 1.5851ms | 1.7048ms | 1.08× faster, 7% less time | 4.9085ms | 1.9762ms | 2.48× slower, 148.4% more time | S5/S5 |
| 500000 | 5.8338ms | 4.2317ms | 1.38× slower, 37.9% more time | 13.70ms | 4.6443ms | 2.95× slower, 195% more time | S5/S5 |
| 1000000 | 13.12ms | 10.54ms | 1.25× slower, 24.6% more time | 37.50ms | 9.4795ms | 3.96× slower, 295.6% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0396ms | 0.1833ms | 4.63× faster, 78.4% less time |
| 20000 | 0.1195ms | 0.7223ms | 6.04× faster, 83.5% less time |
| 50000 | 0.3001ms | 1.8405ms | 6.13× faster, 83.7% less time |
| 100000 | 0.6960ms | 3.6100ms | 5.19× faster, 80.7% less time |
| 200000 | 1.5851ms | 7.1534ms | 4.51× faster, 77.8% less time |
| 500000 | 5.8338ms | 17.66ms | 3.03× faster, 67% less time |
| 1000000 | 13.12ms | 37.37ms | 2.85× faster, 64.9% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0299ms | 0.0439ms | 1.47× faster, 32% less time | 0.1895ms |
| 20000 | 0.0871ms | 0.1664ms | 1.91× faster, 47.6% less time | 0.7659ms |
| 50000 | 0.2197ms | 0.4493ms | 2.05× faster, 51.1% less time | 1.9203ms |
| 100000 | 0.4232ms | 0.9074ms | 2.14× faster, 53.4% less time | 3.7259ms |
| 200000 | 0.8477ms | 1.7295ms | 2.04× faster, 51% less time | 7.3245ms |
| 500000 | 2.0956ms | 4.2569ms | 2.03× faster, 50.8% less time | 18.89ms |
| 1000000 | 4.6024ms | 11.11ms | 2.41× faster, 58.6% less time | 39.87ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1830ms | 0.1876ms |
| @ox-content/napi (parse only) | 0.0454ms | 0.0425ms |
| markdown-exit | 0.9419ms | 0.8676ms |
| markdown-it (baseline) | 0.2379ms | 0.1924ms |
| markdown-it-ts (stream+chunk) | 0.2642ms | 0.1954ms |
| micromark (parse only) | 3.8881ms | 3.5126ms |
| remark (parse only) | 5.5960ms | 4.3515ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7045ms | 0.7298ms |
| @ox-content/napi (parse only) | 0.1630ms | 0.1638ms |
| markdown-exit | 1.1860ms | 1.2401ms |
| markdown-it (baseline) | 0.8035ms | 0.7419ms |
| markdown-it-ts (stream+chunk) | 0.8672ms | 0.7430ms |
| micromark (parse only) | 15.71ms | 16.77ms |
| remark (parse only) | 19.98ms | 21.13ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.9655ms | 1.8731ms |
| @ox-content/napi (parse only) | 0.4815ms | 0.6434ms |
| markdown-exit | 2.4217ms | 2.5476ms |
| markdown-it (baseline) | 1.7955ms | 2.5414ms |
| markdown-it-ts (stream+chunk) | 1.9344ms | 6.0583ms |
| micromark (parse only) | 46.21ms | 46.03ms |
| remark (parse only) | 70.02ms | 65.15ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5940ms | 3.6300ms |
| @ox-content/napi (parse only) | 0.9183ms | 0.8464ms |
| markdown-exit | 4.8652ms | 5.1936ms |
| markdown-it (baseline) | 3.6308ms | 3.7462ms |
| markdown-it-ts (stream+chunk) | 3.9007ms | 4.0932ms |
| micromark (parse only) | 89.95ms | 91.26ms |
| remark (parse only) | 153.28ms | 144.14ms |
