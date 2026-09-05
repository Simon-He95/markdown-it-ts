# Performance Report (latest run)

## Environment

- Generated at: 2026-09-05T09:08:40.812Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 54eead45126cb889bc7b2b351db64e79daec1aca

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
| 5,011 | 0.0514ms | 0.2191ms | 0.0424ms | stock-fast | 0.0203ms | 0.2799ms | 0.0543ms | stock-fast | no |
| 20,085 | 0.1435ms | 0.8475ms | 0.1970ms | stock-fast | 0.0853ms | 1.1962ms | 0.1654ms | stock-fast | no |
| 50,084 | 0.3828ms | 2.1491ms | 0.4807ms | stock-fast | 0.1967ms | 2.5911ms | 0.3749ms | stock-fast | no |
| 100,126 | 0.7568ms | 4.2823ms | 0.9224ms | stock-fast | 0.4421ms | 5.5756ms | 0.8634ms | stock-fast | no |
| 200,073 | 1.4091ms | 8.2799ms | 1.6763ms | stock-fast | 0.7003ms | 10.46ms | 1.5045ms | stock-fast | no |
| 500,121 | 2.6844ms | 21.05ms | 4.3359ms | stock-fast | 2.6221ms | 35.46ms | 3.9110ms | stock-fast | no |
| 1,000,068 | 13.82ms | 54.23ms | 10.31ms | stock-fast | 4.8973ms | 66.80ms | 7.5677ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2330ms | 0.2735ms | 0.0589ms | general | 0.2472ms | 0.3382ms | 0.0540ms | token-renderer | no |
| 20,125 | 0.7481ms | 0.9845ms | 0.2189ms | general | 0.8874ms | 1.2799ms | 0.2030ms | token-renderer | no |
| 50,025 | 1.8321ms | 2.4315ms | 0.5754ms | general | 2.2408ms | 3.1806ms | 0.4973ms | token-renderer | no |
| 100,450 | 3.9789ms | 5.2115ms | 1.1106ms | general | 4.7236ms | 6.5427ms | 1.0112ms | token-renderer | no |
| 200,109 | 9.9458ms | 10.88ms | 2.2326ms | full-chunk | 11.47ms | 14.18ms | 1.9865ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0826ms | 0.1283ms | 0.0327ms | general | 0.0967ms | 0.1497ms | 0.0267ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0903ms | 0.1384ms | 0.0306ms | general | 0.1077ms | 0.1554ms | 0.0270ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0252ms | 0.0361ms | 0.0090ms | general | 0.0303ms | 0.0420ms | 0.0089ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2094ms | 0.1622ms | 0.2034ms | 0.1979ms | 0.0442ms | 0.1937ms | 0.2659ms | **0.0437ms** | 0.1858ms | 3.2914ms | 0.6128ms | 0.3118ms | 0.2966ms | 0.5595ms | 0.1065ms | 0.6047ms | 0.8204ms | **0.0628ms** | 0.2025ms | 10.30ms | 1.7774ms | 0.4926ms | 0.4016ms | 1.6372ms | 0.6823ms | 1.7778ms | 2.4494ms | **0.0940ms** | 0.2413ms | 29.63ms | 0.2235ms | 0.1754ms | 0.1898ms | 0.1985ms | 0.1809ms | 0.2213ms | 0.2946ms | **0.0420ms** | 0.1844ms | 3.2550ms |
| 20000 | 0.7667ms | 0.6020ms | 0.7572ms | 0.7599ms | **0.1447ms** | 0.7572ms | 1.0187ms | 0.1631ms | 0.7174ms | 17.16ms | 2.6756ms | 0.9992ms | 1.0619ms | 2.5268ms | 0.4229ms | 2.4971ms | 3.4359ms | **0.1987ms** | 0.7499ms | 50.00ms | 7.3128ms | 1.2054ms | 1.0884ms | 8.6686ms | 5.7409ms | 6.9277ms | 9.4807ms | **0.2396ms** | 0.8208ms | 147.52ms | 0.7386ms | 0.6065ms | 0.7826ms | 0.8160ms | 1.0492ms | 0.8064ms | 1.1165ms | **0.1723ms** | 0.7227ms | 17.44ms |
| 50000 | 1.9833ms | 1.5320ms | 1.9262ms | 1.9447ms | **0.3038ms** | 1.9911ms | 2.5395ms | 0.4308ms | 1.8804ms | 46.53ms | 6.8218ms | 2.6181ms | 2.8287ms | 6.7875ms | 1.2174ms | 6.3843ms | 8.7688ms | **0.4765ms** | 1.8363ms | 154.24ms | 18.29ms | 2.9234ms | 3.4443ms | 18.14ms | 3.0672ms | 17.55ms | 23.45ms | **0.5101ms** | 1.8732ms | 399.30ms | 1.9884ms | 1.4519ms | 1.9136ms | 1.8573ms | 2.2045ms | 1.8578ms | 2.6762ms | **0.4354ms** | 1.7957ms | 44.98ms |
| 100000 | 3.9771ms | 3.1934ms | 4.7808ms | 4.2275ms | **0.7705ms** | 4.0092ms | 5.3403ms | 0.8529ms | 3.6093ms | 95.13ms | 13.47ms | 6.9272ms | 4.7536ms | 13.55ms | 2.2089ms | 13.23ms | 17.65ms | **0.9455ms** | 3.7428ms | 318.86ms | 36.33ms | 6.5531ms | 5.1596ms | 36.20ms | 6.3345ms | 35.81ms | 48.28ms | **1.0245ms** | 3.7498ms | 870.97ms | 3.7036ms | 3.0402ms | 3.9564ms | 3.9176ms | 3.3972ms | 3.9079ms | 5.3810ms | **0.8494ms** | 3.5290ms | 94.35ms |
| 200000 | 8.5430ms | 8.0501ms | 8.4729ms | 8.4132ms | **1.3872ms** | 8.8200ms | 11.80ms | 1.7080ms | 7.2930ms | 187.11ms | 27.97ms | 11.04ms | 10.28ms | 27.45ms | 4.7499ms | 28.17ms | 37.17ms | **1.9996ms** | 7.3714ms | 642.83ms | 76.61ms | 13.23ms | 10.35ms | 75.05ms | 14.45ms | 75.03ms | 99.81ms | **1.8812ms** | 7.7529ms | 1762.25ms | 8.4178ms | 6.1424ms | 8.0950ms | 8.2402ms | 9.0106ms | 7.6193ms | 10.65ms | **1.7110ms** | 7.0585ms | 195.64ms |
| 500000 | 22.56ms | 21.65ms | 22.94ms | 23.12ms | 6.2538ms | 28.00ms | 36.30ms | **4.2275ms** | 18.17ms | - | 70.19ms | 36.42ms | 30.43ms | 67.74ms | 14.32ms | 88.44ms | 107.70ms | **5.1288ms** | 18.38ms | - | 206.16ms | 27.94ms | 25.55ms | 198.99ms | 60.00ms | 215.96ms | 273.24ms | **5.0388ms** | 18.55ms | - | 26.65ms | 22.61ms | 20.54ms | 23.39ms | 29.24ms | 26.84ms | 33.50ms | **4.3758ms** | 17.62ms | - |
| 1000000 | 48.41ms | 90.15ms | 55.14ms | 52.81ms | 14.00ms | 52.16ms | 68.76ms | **10.46ms** | 37.09ms | - | 155.60ms | 71.40ms | 66.66ms | 150.62ms | 41.69ms | 177.74ms | 209.83ms | **9.6717ms** | 39.34ms | - | 441.91ms | 103.83ms | 98.08ms | 405.72ms | 111.16ms | 458.02ms | 581.02ms | **9.8295ms** | 38.82ms | - | 74.40ms | 71.08ms | 50.32ms | 61.03ms | 68.48ms | 52.20ms | 74.28ms | **10.67ms** | 39.20ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0442ms (stream OFF, chunk OFF)
- 20000: S5 0.1447ms (stream OFF, chunk OFF)
- 50000: S5 0.3038ms (stream OFF, chunk OFF)
- 100000: S5 0.7705ms (stream OFF, chunk OFF)
- 200000: S5 1.3872ms (stream OFF, chunk OFF)
- 500000: S5 6.2538ms (stream OFF, chunk OFF)
- 1000000: S5 14.00ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1065ms (stream OFF, chunk OFF)
- 20000: S5 0.4229ms (stream OFF, chunk OFF)
- 50000: S5 1.2174ms (stream OFF, chunk OFF)
- 100000: S5 2.2089ms (stream OFF, chunk OFF)
- 200000: S5 4.7499ms (stream OFF, chunk OFF)
- 500000: S5 14.32ms (stream OFF, chunk OFF)
- 1000000: S5 41.69ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.4016ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.0884ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.9234ms (stream ON, cache ON, chunk OFF)
- 100000: S3 5.1596ms (stream ON, cache ON, chunk ON)
- 200000: S3 10.35ms (stream ON, cache ON, chunk ON)
- 500000: S3 25.55ms (stream ON, cache ON, chunk ON)
- 1000000: S3 98.08ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1754ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.6065ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4519ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.0402ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.1424ms (stream ON, cache ON, chunk OFF)
- 500000: S3 20.54ms (stream ON, cache ON, chunk ON)
- 1000000: S3 50.32ms (stream ON, cache ON, chunk ON)

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
| 5000 | 0.0212ms | 0.0188ms | 0.2322ms | 0.0388ms | 3.9638ms | 4.7120ms | 0.3009ms |
| 20000 | 0.0718ms | 0.0720ms | 0.9148ms | 0.1520ms | 18.13ms | 22.54ms | 1.2045ms |
| 50000 | 0.1845ms | 0.2055ms | 2.3008ms | 0.3724ms | 53.39ms | 72.22ms | 3.0237ms |
| 100000 | 0.3523ms | 0.3487ms | 4.8792ms | 0.7708ms | 108.81ms | 162.73ms | 6.0580ms |
| 200000 | 0.8697ms | 0.7543ms | 11.76ms | 1.5518ms | 220.20ms | 409.13ms | 13.94ms |
| 500000 | 2.6085ms | 2.5126ms | 38.20ms | 4.3788ms | - | - | 50.25ms |
| 1000000 | 4.7990ms | 5.0554ms | 64.13ms | 7.4873ms | - | - | 77.90ms |

Render vs markdown-it:
- 5,000 chars: 0.0212ms vs 0.2322ms → 10.95× faster
- 20,000 chars: 0.0718ms vs 0.9148ms → 12.73× faster
- 50,000 chars: 0.1845ms vs 2.3008ms → 12.47× faster
- 100,000 chars: 0.3523ms vs 4.8792ms → 13.85× faster
- 200,000 chars: 0.8697ms vs 11.76ms → 13.52× faster
- 500,000 chars: 2.6085ms vs 38.20ms → 14.65× faster
- 1,000,000 chars: 4.7990ms vs 64.13ms → 13.36× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0212ms vs 0.0388ms → 1.83× faster, 45.3% less time
- 20,000 chars: 0.0718ms vs 0.1520ms → 2.12× faster, 52.7% less time
- 50,000 chars: 0.1845ms vs 0.3724ms → 2.02× faster, 50.4% less time
- 100,000 chars: 0.3523ms vs 0.7708ms → 2.19× faster, 54.3% less time
- 200,000 chars: 0.8697ms vs 1.5518ms → 1.78× faster, 44% less time
- 500,000 chars: 2.6085ms vs 4.3788ms → 1.68× faster, 40.4% less time
- 1,000,000 chars: 4.7990ms vs 7.4873ms → 1.56× faster, 35.9% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0188ms vs 0.0388ms → 2.07× faster, 51.6% less time
- 20,000 chars: 0.0720ms vs 0.1520ms → 2.11× faster, 52.6% less time
- 50,000 chars: 0.2055ms vs 0.3724ms → 1.81× faster, 44.8% less time
- 100,000 chars: 0.3487ms vs 0.7708ms → 2.21× faster, 54.8% less time
- 200,000 chars: 0.7543ms vs 1.5518ms → 2.06× faster, 51.4% less time
- 500,000 chars: 2.5126ms vs 4.3788ms → 1.74× faster, 42.6% less time
- 1,000,000 chars: 5.0554ms vs 7.4873ms → 1.48× faster, 32.5% less time

Render vs micromark:
- 5,000 chars: 0.0212ms vs 3.9638ms → 187.01× faster
- 20,000 chars: 0.0718ms vs 18.13ms → 252.40× faster
- 50,000 chars: 0.1845ms vs 53.39ms → 289.30× faster
- 100,000 chars: 0.3523ms vs 108.81ms → 308.84× faster
- 200,000 chars: 0.8697ms vs 220.20ms → 253.21× faster

Render vs remark+rehype:
- 5,000 chars: 0.0212ms vs 4.7120ms → 222.31× faster
- 20,000 chars: 0.0718ms vs 22.54ms → 313.81× faster
- 50,000 chars: 0.1845ms vs 72.22ms → 391.33× faster
- 100,000 chars: 0.3523ms vs 162.73ms → 461.91× faster
- 200,000 chars: 0.8697ms vs 409.13ms → 470.46× faster

Render vs markdown-exit:
- 5,000 chars: 0.0212ms vs 0.3009ms → 14.20× faster
- 20,000 chars: 0.0718ms vs 1.2045ms → 16.77× faster
- 50,000 chars: 0.1845ms vs 3.0237ms → 16.38× faster
- 100,000 chars: 0.3523ms vs 6.0580ms → 17.20× faster
- 200,000 chars: 0.8697ms vs 13.94ms → 16.03× faster
- 500,000 chars: 2.6085ms vs 50.25ms → 19.27× faster
- 1,000,000 chars: 4.7990ms vs 77.90ms → 16.23× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0442ms | 0.1937ms | 4.38× faster, 77.2% less time | 0.1065ms | 0.6047ms | 5.68× faster, 82.4% less time | S5/S5 |
| 20000 | 0.1447ms | 0.7572ms | 5.23× faster, 80.9% less time | 0.4229ms | 2.4971ms | 5.9× faster, 83.1% less time | S5/S5 |
| 50000 | 0.3038ms | 1.9911ms | 6.55× faster, 84.7% less time | 1.2174ms | 6.3843ms | 5.24× faster, 80.9% less time | S5/S5 |
| 100000 | 0.7705ms | 4.0092ms | 5.2× faster, 80.8% less time | 2.2089ms | 13.23ms | 5.99× faster, 83.3% less time | S5/S5 |
| 200000 | 1.3872ms | 8.8200ms | 6.36× faster, 84.3% less time | 4.7499ms | 28.17ms | 5.93× faster, 83.1% less time | S5/S5 |
| 500000 | 6.2538ms | 28.00ms | 4.48× faster, 77.7% less time | 14.32ms | 88.44ms | 6.18× faster, 83.8% less time | S5/S5 |
| 1000000 | 14.00ms | 52.16ms | 3.73× faster, 73.2% less time | 41.69ms | 177.74ms | 4.26× faster, 76.5% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0442ms | 0.0437ms | 1.01× slower, 1.1% more time | 0.1065ms | 0.0628ms | 1.7× slower, 69.6% more time | S5/S5 |
| 20000 | 0.1447ms | 0.1631ms | 1.13× faster, 11.3% less time | 0.4229ms | 0.1987ms | 2.13× slower, 112.8% more time | S5/S5 |
| 50000 | 0.3038ms | 0.4308ms | 1.42× faster, 29.5% less time | 1.2174ms | 0.4765ms | 2.55× slower, 155.5% more time | S5/S5 |
| 100000 | 0.7705ms | 0.8529ms | 1.11× faster, 9.7% less time | 2.2089ms | 0.9455ms | 2.34× slower, 133.6% more time | S5/S5 |
| 200000 | 1.3872ms | 1.7080ms | 1.23× faster, 18.8% less time | 4.7499ms | 1.9996ms | 2.38× slower, 137.5% more time | S5/S5 |
| 500000 | 6.2538ms | 4.2275ms | 1.48× slower, 47.9% more time | 14.32ms | 5.1288ms | 2.79× slower, 179.3% more time | S5/S5 |
| 1000000 | 14.00ms | 10.46ms | 1.34× slower, 33.8% more time | 41.69ms | 9.6717ms | 4.31× slower, 331.1% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0442ms | 0.1858ms | 4.2× faster, 76.2% less time |
| 20000 | 0.1447ms | 0.7174ms | 4.96× faster, 79.8% less time |
| 50000 | 0.3038ms | 1.8804ms | 6.19× faster, 83.8% less time |
| 100000 | 0.7705ms | 3.6093ms | 4.68× faster, 78.7% less time |
| 200000 | 1.3872ms | 7.2930ms | 5.26× faster, 81% less time |
| 500000 | 6.2538ms | 18.17ms | 2.9× faster, 65.6% less time |
| 1000000 | 14.00ms | 37.09ms | 2.65× faster, 62.3% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0279ms | 0.0425ms | 1.52× faster, 34.3% less time | 0.1870ms |
| 20000 | 0.0865ms | 0.1618ms | 1.87× faster, 46.5% less time | 0.7904ms |
| 50000 | 0.2173ms | 0.4429ms | 2.04× faster, 50.9% less time | 1.8291ms |
| 100000 | 0.4258ms | 0.8415ms | 1.98× faster, 49.4% less time | 3.6472ms |
| 200000 | 0.8398ms | 1.6750ms | 1.99× faster, 49.9% less time | 7.1878ms |
| 500000 | 2.1195ms | 4.3084ms | 2.03× faster, 50.8% less time | 18.23ms |
| 1000000 | 4.5406ms | 10.83ms | 2.39× faster, 58.1% less time | 41.29ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1797ms | 0.1786ms |
| @ox-content/napi (parse only) | 0.0445ms | 0.0418ms |
| markdown-exit | 0.5648ms | 0.5029ms |
| markdown-it (baseline) | 0.2109ms | 0.1925ms |
| markdown-it-ts (stream+chunk) | 0.8784ms | 0.7132ms |
| micromark (parse only) | 3.3797ms | 3.4118ms |
| remark (parse only) | 4.8902ms | 4.2873ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7153ms | 0.7290ms |
| @ox-content/napi (parse only) | 0.1603ms | 0.1598ms |
| markdown-exit | 1.0444ms | 1.0666ms |
| markdown-it (baseline) | 0.8015ms | 0.7589ms |
| markdown-it-ts (stream+chunk) | 0.9122ms | 0.9250ms |
| micromark (parse only) | 15.39ms | 16.45ms |
| remark (parse only) | 18.68ms | 19.83ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.8190ms | 1.7881ms |
| @ox-content/napi (parse only) | 0.4410ms | 0.4420ms |
| markdown-exit | 2.7381ms | 2.5619ms |
| markdown-it (baseline) | 3.0647ms | 1.7991ms |
| markdown-it-ts (stream+chunk) | 1.8718ms | 1.9040ms |
| micromark (parse only) | 42.67ms | 44.92ms |
| remark (parse only) | 60.83ms | 63.39ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.6520ms | 3.5760ms |
| @ox-content/napi (parse only) | 0.9067ms | 0.8373ms |
| markdown-exit | 4.8731ms | 5.1123ms |
| markdown-it (baseline) | 3.6818ms | 3.9426ms |
| markdown-it-ts (stream+chunk) | 3.7731ms | 4.2210ms |
| micromark (parse only) | 96.08ms | 91.30ms |
| remark (parse only) | 146.68ms | 148.42ms |
