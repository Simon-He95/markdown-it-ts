# Performance Report (latest run)

## Environment

- Generated at: 2026-08-06T08:50:46.756Z
- Node.js: v24.18.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 0a00fd65ffc90f3c9b9bdc6a01709d9aff69d3e2

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
| 5,011 | 0.0544ms | 0.1967ms | 0.0393ms | stock-fast | 0.0207ms | 0.2296ms | 0.0360ms | stock-fast | no |
| 20,085 | 0.1178ms | 0.7353ms | 0.1583ms | stock-fast | 0.0714ms | 0.9085ms | 0.1853ms | stock-fast | no |
| 50,084 | 0.3289ms | 1.8399ms | 0.4952ms | stock-fast | 0.1762ms | 2.2839ms | 0.4476ms | stock-fast | no |
| 100,126 | 0.7382ms | 3.9412ms | 0.9748ms | stock-fast | 0.3558ms | 4.9232ms | 0.8957ms | stock-fast | no |
| 200,073 | 1.2072ms | 8.4244ms | 2.0671ms | stock-fast | 0.6993ms | 11.06ms | 1.8394ms | stock-fast | no |
| 500,121 | 3.9425ms | 22.58ms | 5.2969ms | stock-fast | 2.4431ms | 31.81ms | 4.5790ms | stock-fast | no |
| 1,000,068 | 13.98ms | 55.78ms | 9.6116ms | stock-fast | 5.1117ms | 70.93ms | 8.5575ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2375ms | 0.2716ms | 0.0494ms | general | 0.2556ms | 0.3344ms | 0.0450ms | token-renderer | no |
| 20,125 | 0.7831ms | 0.9849ms | 0.2268ms | general | 0.9319ms | 1.2503ms | 0.2216ms | token-renderer | no |
| 50,025 | 1.9550ms | 2.4350ms | 0.5777ms | general | 2.3054ms | 3.2019ms | 0.5308ms | token-renderer | no |
| 100,450 | 4.2136ms | 5.4016ms | 1.1214ms | general | 5.1725ms | 6.7027ms | 1.0470ms | token-renderer | no |
| 200,109 | 10.23ms | 11.19ms | 2.4466ms | full-chunk | 11.50ms | 14.11ms | 1.9781ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0842ms | 0.1303ms | 0.0268ms | general | 0.1013ms | 0.1464ms | 0.0199ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1030ms | 0.1351ms | 0.0267ms | general | 0.1211ms | 0.1546ms | 0.0222ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0278ms | 0.0348ms | 0.0080ms | general | 0.0327ms | 0.0415ms | 0.0074ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2057ms | 0.1591ms | 0.1990ms | 0.1885ms | 0.0610ms | 0.1843ms | 0.2932ms | **0.0388ms** | 0.1792ms | 3.0737ms | 0.5966ms | 0.2782ms | 0.2723ms | 0.5652ms | 0.1110ms | 0.6133ms | 0.8655ms | **0.0604ms** | 0.2019ms | 9.9143ms | 1.7868ms | 0.4809ms | 0.3991ms | 1.6151ms | 0.6536ms | 1.6962ms | 3.0371ms | **0.0926ms** | 0.2419ms | 28.60ms | 0.1968ms | 0.1622ms | 0.1873ms | 0.1972ms | 0.1818ms | 0.2055ms | 0.2691ms | **0.0384ms** | 0.1790ms | 3.0079ms |
| 20000 | 0.7623ms | 0.6037ms | 0.7482ms | 0.7517ms | 0.1566ms | 0.7418ms | 1.0736ms | **0.1528ms** | 0.7020ms | 16.76ms | 2.5658ms | 0.8305ms | 0.8580ms | 2.5554ms | 0.4690ms | 2.5227ms | 3.8378ms | **0.1888ms** | 0.7468ms | 49.51ms | 7.0830ms | 1.2842ms | 1.1619ms | 7.0911ms | 2.5216ms | 7.0033ms | 9.9854ms | **0.2260ms** | 0.7892ms | 135.45ms | 0.7837ms | 0.6094ms | 0.7395ms | 0.7455ms | 0.8675ms | 0.7347ms | 0.9934ms | **0.1479ms** | 0.7096ms | 15.75ms |
| 50000 | 1.9206ms | 1.5278ms | 1.9186ms | 1.9108ms | **0.3697ms** | 1.8632ms | 2.5181ms | 0.4197ms | 1.8003ms | 46.81ms | 6.6409ms | 1.9731ms | 2.0215ms | 6.6221ms | 1.0997ms | 6.4738ms | 8.7426ms | **0.4870ms** | 1.8545ms | 150.06ms | 17.92ms | 2.5809ms | 2.6294ms | 17.77ms | 3.0122ms | 17.54ms | 23.64ms | **0.4721ms** | 1.8909ms | 396.90ms | 1.8883ms | 1.4927ms | 1.8703ms | 1.9146ms | 1.7584ms | 1.8508ms | 2.5108ms | **0.4377ms** | 1.8372ms | 44.57ms |
| 100000 | 4.0800ms | 3.2182ms | 4.0594ms | 3.9837ms | **0.7075ms** | 3.9340ms | 5.3358ms | 0.8799ms | 3.6684ms | 96.26ms | 13.61ms | 4.5577ms | 4.0975ms | 13.51ms | 2.3470ms | 12.96ms | 17.74ms | **0.9613ms** | 3.6523ms | 317.84ms | 37.03ms | 5.6256ms | 5.4669ms | 36.47ms | 6.2634ms | 35.43ms | 47.94ms | **1.0706ms** | 3.7630ms | 881.58ms | 4.0322ms | 3.0660ms | 3.9480ms | 3.7758ms | 3.8762ms | 3.7919ms | 5.1167ms | **0.8809ms** | 3.6657ms | 90.75ms |
| 200000 | 8.4756ms | 7.1667ms | 8.3725ms | 8.5371ms | **1.8932ms** | 9.0318ms | 12.13ms | 1.9411ms | 7.5245ms | 186.21ms | 27.68ms | 8.8984ms | 9.5378ms | 27.84ms | 4.9028ms | 28.59ms | 38.19ms | **2.1772ms** | 7.7130ms | 641.55ms | 75.48ms | 11.68ms | 18.31ms | 74.87ms | 13.77ms | 73.86ms | 100.72ms | **1.9722ms** | 7.2763ms | 1786.67ms | 7.5925ms | 6.9258ms | 8.1617ms | 7.5255ms | 10.83ms | 7.8366ms | 11.05ms | **1.8832ms** | 7.5191ms | 184.95ms |
| 500000 | 22.67ms | 22.35ms | 23.28ms | 23.00ms | 5.7140ms | 26.24ms | 31.92ms | **5.0481ms** | 18.68ms | - | 69.28ms | 27.48ms | 26.01ms | 68.89ms | 15.83ms | 77.99ms | 106.21ms | **5.4867ms** | 19.59ms | - | 196.73ms | 39.89ms | 28.56ms | 196.31ms | 61.81ms | 215.94ms | 269.51ms | **5.6207ms** | 18.84ms | - | 23.71ms | 24.31ms | 20.14ms | 21.48ms | 24.86ms | 21.88ms | 30.83ms | **5.0950ms** | 18.67ms | - |
| 1000000 | 53.93ms | 53.34ms | 48.32ms | 48.66ms | 14.10ms | 54.84ms | 67.05ms | **9.0833ms** | 36.14ms | - | 153.11ms | 59.26ms | 55.05ms | 164.64ms | 39.29ms | 187.82ms | 214.53ms | **11.43ms** | 40.71ms | - | 434.13ms | 68.41ms | 78.07ms | 438.09ms | 110.07ms | 456.21ms | 576.95ms | **11.19ms** | 40.75ms | - | 44.51ms | 48.12ms | 50.85ms | 48.17ms | 70.57ms | 64.66ms | 68.13ms | **9.0889ms** | 37.76ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0610ms (stream OFF, chunk OFF)
- 20000: S5 0.1566ms (stream OFF, chunk OFF)
- 50000: S5 0.3697ms (stream OFF, chunk OFF)
- 100000: S5 0.7075ms (stream OFF, chunk OFF)
- 200000: S5 1.8932ms (stream OFF, chunk OFF)
- 500000: S5 5.7140ms (stream OFF, chunk OFF)
- 1000000: S5 14.10ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1110ms (stream OFF, chunk OFF)
- 20000: S5 0.4690ms (stream OFF, chunk OFF)
- 50000: S5 1.0997ms (stream OFF, chunk OFF)
- 100000: S5 2.3470ms (stream OFF, chunk OFF)
- 200000: S5 4.9028ms (stream OFF, chunk OFF)
- 500000: S5 15.83ms (stream OFF, chunk OFF)
- 1000000: S5 39.29ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3991ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.1619ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.5809ms (stream ON, cache ON, chunk OFF)
- 100000: S3 5.4669ms (stream ON, cache ON, chunk ON)
- 200000: S2 11.68ms (stream ON, cache ON, chunk OFF)
- 500000: S3 28.56ms (stream ON, cache ON, chunk ON)
- 1000000: S2 68.41ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1622ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.6094ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4927ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.0660ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.9258ms (stream ON, cache ON, chunk OFF)
- 500000: S3 20.14ms (stream ON, cache ON, chunk ON)
- 1000000: S1 44.51ms (stream ON, cache OFF, chunk ON)

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
| 5000 | 0.0210ms | 0.0185ms | 0.2326ms | 0.0370ms | 3.8509ms | 4.6580ms | 0.2986ms |
| 20000 | 0.0708ms | 0.0720ms | 0.9142ms | 0.1635ms | 18.53ms | 23.20ms | 1.1890ms |
| 50000 | 0.1752ms | 0.1765ms | 2.3282ms | 0.4224ms | 55.03ms | 72.59ms | 2.9934ms |
| 100000 | 0.3537ms | 0.3520ms | 5.2381ms | 0.8811ms | 111.38ms | 165.59ms | 6.2279ms |
| 200000 | 0.7002ms | 0.7042ms | 10.85ms | 1.8405ms | 226.07ms | 407.41ms | 13.54ms |
| 500000 | 2.5932ms | 2.4158ms | 32.85ms | 4.6337ms | - | - | 42.28ms |
| 1000000 | 5.1469ms | 5.0253ms | 66.67ms | 8.7150ms | - | - | 81.30ms |

Render vs markdown-it:
- 5,000 chars: 0.0210ms vs 0.2326ms → 11.08× faster
- 20,000 chars: 0.0708ms vs 0.9142ms → 12.92× faster
- 50,000 chars: 0.1752ms vs 2.3282ms → 13.29× faster
- 100,000 chars: 0.3537ms vs 5.2381ms → 14.81× faster
- 200,000 chars: 0.7002ms vs 10.85ms → 15.50× faster
- 500,000 chars: 2.5932ms vs 32.85ms → 12.67× faster
- 1,000,000 chars: 5.1469ms vs 66.67ms → 12.95× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0210ms vs 0.0370ms → 1.76× faster, 43.2% less time
- 20,000 chars: 0.0708ms vs 0.1635ms → 2.31× faster, 56.7% less time
- 50,000 chars: 0.1752ms vs 0.4224ms → 2.41× faster, 58.5% less time
- 100,000 chars: 0.3537ms vs 0.8811ms → 2.49× faster, 59.9% less time
- 200,000 chars: 0.7002ms vs 1.8405ms → 2.63× faster, 62% less time
- 500,000 chars: 2.5932ms vs 4.6337ms → 1.79× faster, 44% less time
- 1,000,000 chars: 5.1469ms vs 8.7150ms → 1.69× faster, 40.9% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0185ms vs 0.0370ms → 1.99× faster, 49.9% less time
- 20,000 chars: 0.0720ms vs 0.1635ms → 2.27× faster, 55.9% less time
- 50,000 chars: 0.1765ms vs 0.4224ms → 2.39× faster, 58.2% less time
- 100,000 chars: 0.3520ms vs 0.8811ms → 2.5× faster, 60% less time
- 200,000 chars: 0.7042ms vs 1.8405ms → 2.61× faster, 61.7% less time
- 500,000 chars: 2.4158ms vs 4.6337ms → 1.92× faster, 47.9% less time
- 1,000,000 chars: 5.0253ms vs 8.7150ms → 1.73× faster, 42.3% less time

Render vs micromark:
- 5,000 chars: 0.0210ms vs 3.8509ms → 183.43× faster
- 20,000 chars: 0.0708ms vs 18.53ms → 261.82× faster
- 50,000 chars: 0.1752ms vs 55.03ms → 314.12× faster
- 100,000 chars: 0.3537ms vs 111.38ms → 314.87× faster
- 200,000 chars: 0.7002ms vs 226.07ms → 322.86× faster

Render vs remark+rehype:
- 5,000 chars: 0.0210ms vs 4.6580ms → 221.88× faster
- 20,000 chars: 0.0708ms vs 23.20ms → 327.73× faster
- 50,000 chars: 0.1752ms vs 72.59ms → 414.36× faster
- 100,000 chars: 0.3537ms vs 165.59ms → 468.12× faster
- 200,000 chars: 0.7002ms vs 407.41ms → 581.86× faster

Render vs markdown-exit:
- 5,000 chars: 0.0210ms vs 0.2986ms → 14.22× faster
- 20,000 chars: 0.0708ms vs 1.1890ms → 16.80× faster
- 50,000 chars: 0.1752ms vs 2.9934ms → 17.09× faster
- 100,000 chars: 0.3537ms vs 6.2279ms → 17.61× faster
- 200,000 chars: 0.7002ms vs 13.54ms → 19.34× faster
- 500,000 chars: 2.5932ms vs 42.28ms → 16.31× faster
- 1,000,000 chars: 5.1469ms vs 81.30ms → 15.80× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0610ms | 0.1843ms | 3.02× faster, 66.9% less time | 0.1110ms | 0.6133ms | 5.52× faster, 81.9% less time | S5/S5 |
| 20000 | 0.1566ms | 0.7418ms | 4.74× faster, 78.9% less time | 0.4690ms | 2.5227ms | 5.38× faster, 81.4% less time | S5/S5 |
| 50000 | 0.3697ms | 1.8632ms | 5.04× faster, 80.2% less time | 1.0997ms | 6.4738ms | 5.89× faster, 83% less time | S5/S5 |
| 100000 | 0.7075ms | 3.9340ms | 5.56× faster, 82% less time | 2.3470ms | 12.96ms | 5.52× faster, 81.9% less time | S5/S5 |
| 200000 | 1.8932ms | 9.0318ms | 4.77× faster, 79% less time | 4.9028ms | 28.59ms | 5.83× faster, 82.8% less time | S5/S5 |
| 500000 | 5.7140ms | 26.24ms | 4.59× faster, 78.2% less time | 15.83ms | 77.99ms | 4.93× faster, 79.7% less time | S5/S5 |
| 1000000 | 14.10ms | 54.84ms | 3.89× faster, 74.3% less time | 39.29ms | 187.82ms | 4.78× faster, 79.1% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0610ms | 0.0388ms | 1.57× slower, 57.3% more time | 0.1110ms | 0.0604ms | 1.84× slower, 83.9% more time | S5/S5 |
| 20000 | 0.1566ms | 0.1528ms | 1.02× slower, 2.5% more time | 0.4690ms | 0.1888ms | 2.48× slower, 148.4% more time | S5/S5 |
| 50000 | 0.3697ms | 0.4197ms | 1.14× faster, 11.9% less time | 1.0997ms | 0.4870ms | 2.26× slower, 125.8% more time | S5/S5 |
| 100000 | 0.7075ms | 0.8799ms | 1.24× faster, 19.6% less time | 2.3470ms | 0.9613ms | 2.44× slower, 144.2% more time | S5/S5 |
| 200000 | 1.8932ms | 1.9411ms | 1.03× faster, 2.5% less time | 4.9028ms | 2.1772ms | 2.25× slower, 125.2% more time | S5/S5 |
| 500000 | 5.7140ms | 5.0481ms | 1.13× slower, 13.2% more time | 15.83ms | 5.4867ms | 2.89× slower, 188.6% more time | S5/S5 |
| 1000000 | 14.10ms | 9.0833ms | 1.55× slower, 55.2% more time | 39.29ms | 11.43ms | 3.44× slower, 243.9% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0610ms | 0.1792ms | 2.94× faster, 66% less time |
| 20000 | 0.1566ms | 0.7020ms | 4.48× faster, 77.7% less time |
| 50000 | 0.3697ms | 1.8003ms | 4.87× faster, 79.5% less time |
| 100000 | 0.7075ms | 3.6684ms | 5.19× faster, 80.7% less time |
| 200000 | 1.8932ms | 7.5245ms | 3.97× faster, 74.8% less time |
| 500000 | 5.7140ms | 18.68ms | 3.27× faster, 69.4% less time |
| 1000000 | 14.10ms | 36.14ms | 2.56× faster, 61% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0252ms | 0.0388ms | 1.54× faster, 35% less time | 0.1811ms |
| 20000 | 0.0859ms | 0.1649ms | 1.92× faster, 47.9% less time | 0.7493ms |
| 50000 | 0.2094ms | 0.4642ms | 2.22× faster, 54.9% less time | 1.9144ms |
| 100000 | 0.4152ms | 0.9469ms | 2.28× faster, 56.1% less time | 3.9400ms |
| 200000 | 0.8218ms | 1.9772ms | 2.41× faster, 58.4% less time | 7.6373ms |
| 500000 | 2.0434ms | 5.0335ms | 2.46× faster, 59.4% less time | 19.49ms |
| 1000000 | 4.4106ms | 8.9339ms | 2.03× faster, 50.6% less time | 37.09ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1971ms | 0.1767ms |
| @ox-content/napi (parse only) | 0.0508ms | 0.0389ms |
| markdown-exit | 0.8660ms | 0.7632ms |
| markdown-it (baseline) | 0.2134ms | 0.2035ms |
| markdown-it-ts (stream+chunk) | 0.2125ms | 0.1875ms |
| micromark (parse only) | 3.7074ms | 3.8493ms |
| remark (parse only) | 4.2865ms | 4.1192ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7375ms | 0.7720ms |
| @ox-content/napi (parse only) | 0.1529ms | 0.1727ms |
| markdown-exit | 1.1792ms | 1.1292ms |
| markdown-it (baseline) | 0.8025ms | 0.7508ms |
| markdown-it-ts (stream+chunk) | 0.7849ms | 0.7457ms |
| micromark (parse only) | 15.39ms | 16.68ms |
| remark (parse only) | 20.94ms | 20.61ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.8918ms | 1.8619ms |
| @ox-content/napi (parse only) | 0.6011ms | 0.4498ms |
| markdown-exit | 2.4054ms | 2.5257ms |
| markdown-it (baseline) | 1.8754ms | 2.0202ms |
| markdown-it-ts (stream+chunk) | 1.8611ms | 2.0024ms |
| micromark (parse only) | 41.67ms | 46.49ms |
| remark (parse only) | 64.06ms | 64.88ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.6358ms | 3.7213ms |
| @ox-content/napi (parse only) | 0.9767ms | 0.9603ms |
| markdown-exit | 5.0458ms | 5.1655ms |
| markdown-it (baseline) | 3.8278ms | 3.8340ms |
| markdown-it-ts (stream+chunk) | 3.9342ms | 4.2029ms |
| micromark (parse only) | 91.07ms | 93.68ms |
| remark (parse only) | 148.07ms | 146.91ms |
