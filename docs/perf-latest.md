# Performance Report (latest run)

## Environment

- Generated at: 2026-09-07T09:01:39.515Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: fab06d37062c34bc3c3156229098ccf8ca5d480a

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
| 5,011 | 0.0563ms | 0.1933ms | 0.0426ms | stock-fast | 0.0203ms | 0.2389ms | 0.0381ms | stock-fast | no |
| 20,085 | 0.1184ms | 0.7649ms | 0.1623ms | stock-fast | 0.0744ms | 0.9397ms | 0.1512ms | stock-fast | no |
| 50,084 | 0.2908ms | 1.9298ms | 0.4402ms | stock-fast | 0.1791ms | 2.3833ms | 0.3759ms | stock-fast | no |
| 100,126 | 0.6382ms | 4.1335ms | 0.8475ms | stock-fast | 0.3556ms | 4.9177ms | 0.7629ms | stock-fast | no |
| 200,073 | 1.0913ms | 8.4731ms | 1.6996ms | stock-fast | 0.7163ms | 11.07ms | 1.5169ms | stock-fast | no |
| 500,121 | 3.8821ms | 23.58ms | 4.2626ms | stock-fast | 2.4128ms | 32.38ms | 3.7759ms | stock-fast | no |
| 1,000,068 | 13.70ms | 51.23ms | 10.78ms | stock-fast | 4.9136ms | 65.57ms | 7.4899ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2214ms | 0.2696ms | 0.0586ms | general | 0.2461ms | 0.3352ms | 0.0561ms | token-renderer | no |
| 20,125 | 0.7407ms | 0.9829ms | 0.2160ms | general | 0.8890ms | 1.2621ms | 0.2037ms | token-renderer | no |
| 50,025 | 1.8355ms | 2.4421ms | 0.5682ms | general | 2.1959ms | 3.2291ms | 0.5020ms | token-renderer | no |
| 100,450 | 3.9569ms | 5.1761ms | 1.1164ms | general | 4.8427ms | 6.5680ms | 1.0122ms | token-renderer | no |
| 200,109 | 9.4310ms | 11.01ms | 2.1937ms | full-chunk | 11.12ms | 14.20ms | 2.0083ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0812ms | 0.1263ms | 0.0335ms | general | 0.0992ms | 0.1447ms | 0.0255ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0866ms | 0.1359ms | 0.0304ms | general | 0.1045ms | 0.1581ms | 0.0273ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0251ms | 0.0357ms | 0.0093ms | general | 0.0312ms | 0.0416ms | 0.0083ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2084ms | 0.1620ms | 0.2036ms | 0.1865ms | 0.0633ms | 0.1852ms | 0.2703ms | **0.0439ms** | 0.1831ms | 3.9400ms | 0.5951ms | 0.3070ms | 0.3029ms | 0.5655ms | 0.1157ms | 0.5890ms | 0.9322ms | **0.0627ms** | 0.2041ms | 12.52ms | 1.7549ms | 0.5076ms | 0.3720ms | 1.6063ms | 0.6135ms | 1.7289ms | 2.4354ms | **0.0964ms** | 0.2447ms | 38.09ms | 0.2030ms | 0.1888ms | 0.2079ms | 0.1954ms | 0.1806ms | 0.2347ms | 0.2920ms | **0.0445ms** | 0.1817ms | 4.1231ms |
| 20000 | 0.7615ms | 0.6259ms | 0.7633ms | 0.7466ms | **0.1240ms** | 0.7413ms | 1.0053ms | 0.1629ms | 0.7152ms | 17.06ms | 2.5909ms | 1.0353ms | 1.0588ms | 2.5017ms | 0.4103ms | 2.4941ms | 3.4090ms | **0.1993ms** | 0.7632ms | 50.04ms | 7.1803ms | 2.2530ms | 1.0861ms | 7.0387ms | 2.1858ms | 6.9758ms | 9.4863ms | **0.2378ms** | 0.8194ms | 142.91ms | 0.8153ms | 0.6958ms | 0.7776ms | 0.7364ms | 0.6852ms | 0.7356ms | 1.0148ms | **0.1606ms** | 0.7099ms | 15.24ms |
| 50000 | 1.9314ms | 1.5238ms | 2.8259ms | 2.0609ms | **0.3529ms** | 2.4740ms | 2.5837ms | 0.4385ms | 1.8254ms | 46.48ms | 6.6931ms | 2.6683ms | 3.0273ms | 7.9116ms | 1.0846ms | 6.4635ms | 8.9089ms | **0.4837ms** | 1.8749ms | 148.17ms | 18.01ms | 3.0492ms | 3.0987ms | 23.80ms | 3.2512ms | 17.25ms | 23.94ms | **0.5108ms** | 2.1136ms | 407.50ms | 1.9038ms | 1.5007ms | 1.9886ms | 1.9461ms | 1.7269ms | 2.0613ms | 2.7776ms | **0.4482ms** | 2.2504ms | 43.05ms |
| 100000 | 3.9540ms | 3.1432ms | 3.9478ms | 3.9876ms | **0.7630ms** | 4.5285ms | 6.7814ms | 0.9344ms | 3.8787ms | 98.80ms | 13.34ms | 5.3430ms | 4.8733ms | 13.79ms | 2.5061ms | 22.89ms | 20.06ms | **1.4163ms** | 4.0001ms | 319.01ms | 37.04ms | 5.4049ms | 5.3380ms | 37.68ms | 6.2889ms | 43.04ms | 53.09ms | **1.0569ms** | 4.1798ms | 891.34ms | 3.7976ms | 2.9257ms | 3.8246ms | 4.3118ms | 3.4952ms | 5.4117ms | 5.2140ms | **0.9432ms** | 3.5332ms | 90.58ms |
| 200000 | 8.3384ms | 7.0080ms | 8.2486ms | 8.2760ms | **1.4971ms** | 9.6193ms | 12.59ms | 1.7007ms | 7.3181ms | 183.74ms | 27.32ms | 10.80ms | 9.6364ms | 26.91ms | 4.6012ms | 27.72ms | 46.32ms | **1.9136ms** | 7.3397ms | 634.80ms | 73.97ms | 11.79ms | 11.70ms | 72.31ms | 12.06ms | 73.01ms | 105.30ms | **1.9542ms** | 7.3261ms | 1731.33ms | 8.4028ms | 7.3315ms | 8.2076ms | 9.0487ms | 8.9736ms | 8.6307ms | 12.58ms | **1.6808ms** | 7.0646ms | 186.49ms |
| 500000 | 22.61ms | 20.67ms | 23.70ms | 23.25ms | 6.3353ms | 25.76ms | 36.18ms | **4.2229ms** | 17.59ms | - | 69.23ms | 40.50ms | 32.10ms | 66.58ms | 14.10ms | 79.84ms | 105.71ms | **4.7061ms** | 17.98ms | - | 195.03ms | 37.07ms | 27.74ms | 190.62ms | 64.14ms | 201.43ms | 273.59ms | **5.0050ms** | 20.60ms | - | 20.97ms | 22.03ms | 19.68ms | 20.87ms | 24.02ms | 22.08ms | 32.53ms | **5.0032ms** | 17.39ms | - |
| 1000000 | 50.33ms | 51.77ms | 52.53ms | 48.93ms | 12.14ms | 57.83ms | 72.53ms | **10.07ms** | 36.82ms | - | 160.67ms | 73.54ms | 64.75ms | 154.48ms | 34.88ms | 163.89ms | 217.84ms | **9.4529ms** | 38.86ms | - | 424.05ms | 64.08ms | 67.84ms | 425.59ms | 108.85ms | 453.97ms | 596.48ms | **9.6503ms** | 38.00ms | - | 49.41ms | 51.57ms | 47.70ms | 42.92ms | 56.67ms | 49.98ms | 60.95ms | **10.25ms** | 44.95ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0633ms (stream OFF, chunk OFF)
- 20000: S5 0.1240ms (stream OFF, chunk OFF)
- 50000: S5 0.3529ms (stream OFF, chunk OFF)
- 100000: S5 0.7630ms (stream OFF, chunk OFF)
- 200000: S5 1.4971ms (stream OFF, chunk OFF)
- 500000: S5 6.3353ms (stream OFF, chunk OFF)
- 1000000: S5 12.14ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1157ms (stream OFF, chunk OFF)
- 20000: S5 0.4103ms (stream OFF, chunk OFF)
- 50000: S5 1.0846ms (stream OFF, chunk OFF)
- 100000: S5 2.5061ms (stream OFF, chunk OFF)
- 200000: S5 4.6012ms (stream OFF, chunk OFF)
- 500000: S5 14.10ms (stream OFF, chunk OFF)
- 1000000: S5 34.88ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3720ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.0861ms (stream ON, cache ON, chunk ON)
- 50000: S2 3.0492ms (stream ON, cache ON, chunk OFF)
- 100000: S3 5.3380ms (stream ON, cache ON, chunk ON)
- 200000: S3 11.70ms (stream ON, cache ON, chunk ON)
- 500000: S3 27.74ms (stream ON, cache ON, chunk ON)
- 1000000: S2 64.08ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.1806ms (stream OFF, chunk OFF)
- 20000: S5 0.6852ms (stream OFF, chunk OFF)
- 50000: S2 1.5007ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.9257ms (stream ON, cache ON, chunk OFF)
- 200000: S2 7.3315ms (stream ON, cache ON, chunk OFF)
- 500000: S3 19.68ms (stream ON, cache ON, chunk ON)
- 1000000: S4 42.92ms (stream OFF, chunk ON)

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
| 5000 | 0.0214ms | 0.0185ms | 0.2325ms | 0.0391ms | 3.9121ms | 4.7874ms | 0.3043ms |
| 20000 | 0.0745ms | 0.0720ms | 0.9201ms | 0.1511ms | 18.32ms | 22.66ms | 1.2125ms |
| 50000 | 0.1772ms | 0.1775ms | 2.3052ms | 0.3701ms | 52.68ms | 70.51ms | 3.0101ms |
| 100000 | 0.3528ms | 0.3546ms | 4.8893ms | 0.7640ms | 109.11ms | 163.02ms | 6.1163ms |
| 200000 | 0.7035ms | 0.7019ms | 10.66ms | 1.5096ms | 222.14ms | 412.00ms | 13.31ms |
| 500000 | 2.5447ms | 2.3640ms | 33.25ms | 3.7766ms | - | - | 40.36ms |
| 1000000 | 4.9766ms | 5.0633ms | 74.07ms | 7.4699ms | - | - | 82.70ms |

Render vs markdown-it:
- 5,000 chars: 0.0214ms vs 0.2325ms → 10.88× faster
- 20,000 chars: 0.0745ms vs 0.9201ms → 12.35× faster
- 50,000 chars: 0.1772ms vs 2.3052ms → 13.01× faster
- 100,000 chars: 0.3528ms vs 4.8893ms → 13.86× faster
- 200,000 chars: 0.7035ms vs 10.66ms → 15.16× faster
- 500,000 chars: 2.5447ms vs 33.25ms → 13.07× faster
- 1,000,000 chars: 4.9766ms vs 74.07ms → 14.88× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0214ms vs 0.0391ms → 1.83× faster, 45.3% less time
- 20,000 chars: 0.0745ms vs 0.1511ms → 2.03× faster, 50.7% less time
- 50,000 chars: 0.1772ms vs 0.3701ms → 2.09× faster, 52.1% less time
- 100,000 chars: 0.3528ms vs 0.7640ms → 2.17× faster, 53.8% less time
- 200,000 chars: 0.7035ms vs 1.5096ms → 2.15× faster, 53.4% less time
- 500,000 chars: 2.5447ms vs 3.7766ms → 1.48× faster, 32.6% less time
- 1,000,000 chars: 4.9766ms vs 7.4699ms → 1.5× faster, 33.4% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0185ms vs 0.0391ms → 2.11× faster, 52.6% less time
- 20,000 chars: 0.0720ms vs 0.1511ms → 2.1× faster, 52.4% less time
- 50,000 chars: 0.1775ms vs 0.3701ms → 2.09× faster, 52% less time
- 100,000 chars: 0.3546ms vs 0.7640ms → 2.15× faster, 53.6% less time
- 200,000 chars: 0.7019ms vs 1.5096ms → 2.15× faster, 53.5% less time
- 500,000 chars: 2.3640ms vs 3.7766ms → 1.6× faster, 37.4% less time
- 1,000,000 chars: 5.0633ms vs 7.4699ms → 1.48× faster, 32.2% less time

Render vs micromark:
- 5,000 chars: 0.0214ms vs 3.9121ms → 183.14× faster
- 20,000 chars: 0.0745ms vs 18.32ms → 246.03× faster
- 50,000 chars: 0.1772ms vs 52.68ms → 297.26× faster
- 100,000 chars: 0.3528ms vs 109.11ms → 309.31× faster
- 200,000 chars: 0.7035ms vs 222.14ms → 315.76× faster

Render vs remark+rehype:
- 5,000 chars: 0.0214ms vs 4.7874ms → 224.12× faster
- 20,000 chars: 0.0745ms vs 22.66ms → 304.25× faster
- 50,000 chars: 0.1772ms vs 70.51ms → 397.82× faster
- 100,000 chars: 0.3528ms vs 163.02ms → 462.13× faster
- 200,000 chars: 0.7035ms vs 412.00ms → 585.65× faster

Render vs markdown-exit:
- 5,000 chars: 0.0214ms vs 0.3043ms → 14.25× faster
- 20,000 chars: 0.0745ms vs 1.2125ms → 16.28× faster
- 50,000 chars: 0.1772ms vs 3.0101ms → 16.98× faster
- 100,000 chars: 0.3528ms vs 6.1163ms → 17.34× faster
- 200,000 chars: 0.7035ms vs 13.31ms → 18.92× faster
- 500,000 chars: 2.5447ms vs 40.36ms → 15.86× faster
- 1,000,000 chars: 4.9766ms vs 82.70ms → 16.62× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0633ms | 0.1852ms | 2.93× faster, 65.8% less time | 0.1157ms | 0.5890ms | 5.09× faster, 80.4% less time | S5/S5 |
| 20000 | 0.1240ms | 0.7413ms | 5.98× faster, 83.3% less time | 0.4103ms | 2.4941ms | 6.08× faster, 83.5% less time | S5/S5 |
| 50000 | 0.3529ms | 2.4740ms | 7.01× faster, 85.7% less time | 1.0846ms | 6.4635ms | 5.96× faster, 83.2% less time | S5/S5 |
| 100000 | 0.7630ms | 4.5285ms | 5.94× faster, 83.2% less time | 2.5061ms | 22.89ms | 9.13× faster, 89% less time | S5/S5 |
| 200000 | 1.4971ms | 9.6193ms | 6.43× faster, 84.4% less time | 4.6012ms | 27.72ms | 6.02× faster, 83.4% less time | S5/S5 |
| 500000 | 6.3353ms | 25.76ms | 4.07× faster, 75.4% less time | 14.10ms | 79.84ms | 5.66× faster, 82.3% less time | S5/S5 |
| 1000000 | 12.14ms | 57.83ms | 4.76× faster, 79% less time | 34.88ms | 163.89ms | 4.7× faster, 78.7% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0633ms | 0.0439ms | 1.44× slower, 44.1% more time | 0.1157ms | 0.0627ms | 1.85× slower, 84.5% more time | S5/S5 |
| 20000 | 0.1240ms | 0.1629ms | 1.31× faster, 23.8% less time | 0.4103ms | 0.1993ms | 2.06× slower, 105.9% more time | S5/S5 |
| 50000 | 0.3529ms | 0.4385ms | 1.24× faster, 19.5% less time | 1.0846ms | 0.4837ms | 2.24× slower, 124.2% more time | S5/S5 |
| 100000 | 0.7630ms | 0.9344ms | 1.22× faster, 18.3% less time | 2.5061ms | 1.4163ms | 1.77× slower, 76.9% more time | S5/S5 |
| 200000 | 1.4971ms | 1.7007ms | 1.14× faster, 12% less time | 4.6012ms | 1.9136ms | 2.4× slower, 140.4% more time | S5/S5 |
| 500000 | 6.3353ms | 4.2229ms | 1.5× slower, 50% more time | 14.10ms | 4.7061ms | 3× slower, 199.5% more time | S5/S5 |
| 1000000 | 12.14ms | 10.07ms | 1.21× slower, 20.5% more time | 34.88ms | 9.4529ms | 3.69× slower, 269% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0633ms | 0.1831ms | 2.89× faster, 65.5% less time |
| 20000 | 0.1240ms | 0.7152ms | 5.77× faster, 82.7% less time |
| 50000 | 0.3529ms | 1.8254ms | 5.17× faster, 80.7% less time |
| 100000 | 0.7630ms | 3.8787ms | 5.08× faster, 80.3% less time |
| 200000 | 1.4971ms | 7.3181ms | 4.89× faster, 79.5% less time |
| 500000 | 6.3353ms | 17.59ms | 2.78× faster, 64% less time |
| 1000000 | 12.14ms | 36.82ms | 3.03× faster, 67% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0260ms | 0.0429ms | 1.65× faster, 39.6% less time | 0.1879ms |
| 20000 | 0.0866ms | 0.1642ms | 1.9× faster, 47.3% less time | 0.7338ms |
| 50000 | 0.2129ms | 0.4386ms | 2.06× faster, 51.4% less time | 1.8547ms |
| 100000 | 0.4222ms | 0.9858ms | 2.34× faster, 57.2% less time | 3.6617ms |
| 200000 | 0.8264ms | 1.6925ms | 2.05× faster, 51.2% less time | 7.3221ms |
| 500000 | 2.0667ms | 4.1855ms | 2.03× faster, 50.6% less time | 18.82ms |
| 1000000 | 4.4235ms | 11.55ms | 2.61× faster, 61.7% less time | 39.82ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1871ms | 0.1811ms |
| @ox-content/napi (parse only) | 0.0438ms | 0.0416ms |
| markdown-exit | 0.7185ms | 0.5477ms |
| markdown-it (baseline) | 0.2107ms | 0.1858ms |
| markdown-it-ts (stream+chunk) | 0.5979ms | 0.4774ms |
| micromark (parse only) | 3.5289ms | 3.5970ms |
| remark (parse only) | 5.0142ms | 4.2479ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7291ms | 0.7191ms |
| @ox-content/napi (parse only) | 0.1624ms | 0.1641ms |
| markdown-exit | 1.1933ms | 1.1342ms |
| markdown-it (baseline) | 0.7788ms | 0.7450ms |
| markdown-it-ts (stream+chunk) | 0.8115ms | 0.9377ms |
| micromark (parse only) | 15.45ms | 16.41ms |
| remark (parse only) | 19.84ms | 19.97ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.8540ms | 1.8144ms |
| @ox-content/napi (parse only) | 0.4440ms | 0.4372ms |
| markdown-exit | 2.4902ms | 2.4782ms |
| markdown-it (baseline) | 1.7880ms | 1.7869ms |
| markdown-it-ts (stream+chunk) | 1.9428ms | 1.8514ms |
| micromark (parse only) | 42.29ms | 44.78ms |
| remark (parse only) | 57.46ms | 63.64ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5983ms | 3.5873ms |
| @ox-content/napi (parse only) | 0.9057ms | 0.8352ms |
| markdown-exit | 4.9536ms | 5.1445ms |
| markdown-it (baseline) | 3.5918ms | 3.7556ms |
| markdown-it-ts (stream+chunk) | 3.7979ms | 3.9182ms |
| micromark (parse only) | 84.24ms | 89.66ms |
| remark (parse only) | 149.58ms | 153.44ms |
