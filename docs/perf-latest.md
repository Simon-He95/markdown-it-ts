# Performance Report (latest run)

## Environment

- Generated at: 2026-08-31T01:14:41.136Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 975b38934801b8a6a32a37cde502cf7e62e9587b

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
| 5,011 | 0.0573ms | 0.1808ms | 0.0421ms | stock-fast | 0.0205ms | 0.2295ms | 0.0389ms | stock-fast | no |
| 20,085 | 0.1407ms | 0.7281ms | 0.1619ms | stock-fast | 0.0723ms | 0.9062ms | 0.1498ms | stock-fast | no |
| 50,084 | 0.3514ms | 1.8528ms | 0.4247ms | stock-fast | 0.1762ms | 2.2893ms | 0.3686ms | stock-fast | no |
| 100,126 | 0.7435ms | 3.9030ms | 0.8361ms | stock-fast | 0.3545ms | 4.8143ms | 0.7647ms | stock-fast | no |
| 200,073 | 1.3219ms | 8.2520ms | 1.6816ms | stock-fast | 0.7008ms | 10.13ms | 1.4987ms | stock-fast | no |
| 500,121 | 5.0471ms | 21.70ms | 4.1498ms | stock-fast | 2.3591ms | 29.94ms | 3.7106ms | stock-fast | no |
| 1,000,068 | 14.55ms | 54.10ms | 9.8897ms | stock-fast | 7.2388ms | 71.36ms | 7.4578ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2357ms | 0.2683ms | 0.0580ms | general | 0.2663ms | 0.3302ms | 0.0545ms | token-renderer | no |
| 20,125 | 0.7680ms | 0.9864ms | 0.2162ms | general | 0.9328ms | 1.2530ms | 0.2003ms | token-renderer | no |
| 50,025 | 1.9582ms | 2.4425ms | 0.5586ms | general | 2.2966ms | 3.1396ms | 0.4932ms | token-renderer | no |
| 100,450 | 4.0739ms | 5.2419ms | 1.1039ms | general | 4.9299ms | 6.5801ms | 1.0053ms | token-renderer | no |
| 200,109 | 9.9986ms | 10.85ms | 2.1784ms | full-chunk | 11.22ms | 14.16ms | 2.0494ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0877ms | 0.1284ms | 0.0322ms | general | 0.1020ms | 0.1466ms | 0.0267ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1039ms | 0.1334ms | 0.0302ms | general | 0.1189ms | 0.1557ms | 0.0266ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0280ms | 0.0349ms | 0.0091ms | general | 0.0337ms | 0.0413ms | 0.0082ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2112ms | 0.1568ms | 0.1933ms | 0.1891ms | 0.0454ms | 0.1988ms | 0.2538ms | **0.0429ms** | 0.1814ms | 3.8676ms | 0.5911ms | 0.3035ms | 0.3225ms | 0.5679ms | 0.1269ms | 0.6122ms | 0.8172ms | **0.0637ms** | 0.2050ms | 12.82ms | 1.7770ms | 0.4407ms | 0.3888ms | 1.7128ms | 0.6508ms | 1.9210ms | 2.4328ms | **0.0988ms** | 0.2445ms | 35.90ms | 0.1962ms | 0.1617ms | 0.1864ms | 0.1939ms | 0.0504ms | 0.2019ms | 0.2778ms | **0.0423ms** | 0.1804ms | 4.2990ms |
| 20000 | 0.7584ms | 0.6076ms | 0.7628ms | 0.7451ms | **0.1490ms** | 0.7381ms | 1.0048ms | 0.1625ms | 0.7104ms | 17.04ms | 2.5828ms | 1.1667ms | 1.0930ms | 2.5043ms | 0.5000ms | 2.4888ms | 3.3880ms | **0.1989ms** | 0.7732ms | 49.63ms | 7.1373ms | 1.5095ms | 1.4201ms | 7.1242ms | 2.4223ms | 6.9497ms | 9.4614ms | **0.2463ms** | 0.8050ms | 134.55ms | 0.7510ms | 0.6435ms | 0.7456ms | 0.7452ms | **0.1584ms** | 0.8731ms | 1.1407ms | 0.1667ms | 0.7079ms | 15.47ms |
| 50000 | 1.9200ms | 1.5134ms | 1.8933ms | 1.8930ms | **0.3580ms** | 1.8548ms | 2.5149ms | 0.4359ms | 1.7975ms | 45.63ms | 6.7072ms | 2.5446ms | 2.6372ms | 6.6488ms | 1.3650ms | 6.4400ms | 8.7210ms | **0.4815ms** | 1.8276ms | 147.57ms | 18.05ms | 3.2323ms | 3.2009ms | 17.80ms | 3.6196ms | 17.45ms | 23.58ms | **0.5333ms** | 1.8979ms | 394.76ms | 1.9661ms | 1.4668ms | 1.9244ms | 1.8487ms | **0.4406ms** | 1.8165ms | 2.5156ms | 0.4422ms | 1.8288ms | 43.68ms |
| 100000 | 3.9347ms | 3.1414ms | 3.9310ms | 3.9370ms | **0.8497ms** | 4.0865ms | 5.1908ms | 0.8551ms | 3.5650ms | 90.13ms | 13.33ms | 4.6955ms | 4.7369ms | 13.18ms | 2.4759ms | 13.12ms | 17.25ms | **0.9092ms** | 3.6324ms | 308.38ms | 36.09ms | 6.0908ms | 6.0632ms | 35.96ms | 7.2177ms | 35.72ms | 47.29ms | **0.9968ms** | 3.7435ms | 834.41ms | 3.8656ms | 3.0671ms | 3.9987ms | 3.8208ms | 1.0243ms | 3.9463ms | 5.1970ms | **0.8577ms** | 3.5731ms | 89.81ms |
| 200000 | 8.2660ms | 6.8892ms | 8.2056ms | 8.2406ms | 2.0213ms | 8.6597ms | 11.50ms | **1.6948ms** | 7.0535ms | 184.83ms | 27.12ms | 10.79ms | 9.5983ms | 26.77ms | 5.4159ms | 28.23ms | 36.93ms | **1.9862ms** | 7.3748ms | 627.14ms | 73.21ms | 14.17ms | 13.24ms | 72.14ms | 14.15ms | 73.57ms | 98.51ms | **1.9177ms** | 7.2900ms | 1749.20ms | 9.9232ms | 6.0361ms | 8.0847ms | 7.9711ms | **1.5439ms** | 7.9903ms | 11.08ms | 1.6592ms | 7.0405ms | 179.21ms |
| 500000 | 23.72ms | 21.54ms | 22.56ms | 22.49ms | 6.5263ms | 26.69ms | 32.07ms | **4.1882ms** | 17.38ms | - | 66.46ms | 33.26ms | 29.80ms | 68.51ms | 15.77ms | 75.36ms | 99.81ms | **4.7386ms** | 17.98ms | - | 193.11ms | 41.05ms | 33.84ms | 189.87ms | 72.60ms | 210.04ms | 263.91ms | **4.8840ms** | 20.05ms | - | 21.38ms | 27.53ms | 19.61ms | 21.38ms | **3.5848ms** | 22.88ms | 29.23ms | 5.0347ms | 17.47ms | - |
| 1000000 | 54.25ms | 51.63ms | 46.65ms | 47.26ms | 15.59ms | 49.00ms | 63.82ms | **10.48ms** | 37.18ms | - | 152.26ms | 77.65ms | 67.49ms | 153.03ms | 40.47ms | 164.95ms | 206.17ms | **9.5715ms** | 39.88ms | - | 415.58ms | 77.93ms | 74.11ms | 411.88ms | 91.55ms | 445.01ms | 588.05ms | **9.4639ms** | 38.73ms | - | 56.39ms | 55.07ms | 52.56ms | 52.60ms | 13.78ms | 57.54ms | 71.86ms | **10.32ms** | 39.17ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0454ms (stream OFF, chunk OFF)
- 20000: S5 0.1490ms (stream OFF, chunk OFF)
- 50000: S5 0.3580ms (stream OFF, chunk OFF)
- 100000: S5 0.8497ms (stream OFF, chunk OFF)
- 200000: S5 2.0213ms (stream OFF, chunk OFF)
- 500000: S5 6.5263ms (stream OFF, chunk OFF)
- 1000000: S5 15.59ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1269ms (stream OFF, chunk OFF)
- 20000: S5 0.5000ms (stream OFF, chunk OFF)
- 50000: S5 1.3650ms (stream OFF, chunk OFF)
- 100000: S5 2.4759ms (stream OFF, chunk OFF)
- 200000: S5 5.4159ms (stream OFF, chunk OFF)
- 500000: S5 15.77ms (stream OFF, chunk OFF)
- 1000000: S5 40.47ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3888ms (stream ON, cache ON, chunk ON)
- 20000: S3 1.4201ms (stream ON, cache ON, chunk ON)
- 50000: S3 3.2009ms (stream ON, cache ON, chunk ON)
- 100000: S3 6.0632ms (stream ON, cache ON, chunk ON)
- 200000: S3 13.24ms (stream ON, cache ON, chunk ON)
- 500000: S3 33.84ms (stream ON, cache ON, chunk ON)
- 1000000: S3 74.11ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.0504ms (stream OFF, chunk OFF)
- 20000: S5 0.1584ms (stream OFF, chunk OFF)
- 50000: S5 0.4406ms (stream OFF, chunk OFF)
- 100000: S5 1.0243ms (stream OFF, chunk OFF)
- 200000: S5 1.5439ms (stream OFF, chunk OFF)
- 500000: S5 3.5848ms (stream OFF, chunk OFF)
- 1000000: S5 13.78ms (stream OFF, chunk OFF)

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
| 5000 | 0.0220ms | 0.0184ms | 0.2322ms | 0.0385ms | 3.8809ms | 4.7628ms | 0.3035ms |
| 20000 | 0.0714ms | 0.0711ms | 0.9152ms | 0.1497ms | 17.91ms | 22.29ms | 1.1973ms |
| 50000 | 0.1768ms | 0.1768ms | 2.3026ms | 0.3691ms | 51.84ms | 70.04ms | 3.0096ms |
| 100000 | 0.3520ms | 0.3518ms | 4.8187ms | 0.7627ms | 108.08ms | 163.64ms | 6.1519ms |
| 200000 | 0.6999ms | 0.7010ms | 10.60ms | 1.5137ms | 221.67ms | 404.37ms | 13.18ms |
| 500000 | 2.4193ms | 2.3797ms | 31.60ms | 3.7752ms | - | - | 40.61ms |
| 1000000 | 4.8965ms | 4.7985ms | 72.63ms | 7.4785ms | - | - | 81.72ms |

Render vs markdown-it:
- 5,000 chars: 0.0220ms vs 0.2322ms → 10.56× faster
- 20,000 chars: 0.0714ms vs 0.9152ms → 12.82× faster
- 50,000 chars: 0.1768ms vs 2.3026ms → 13.02× faster
- 100,000 chars: 0.3520ms vs 4.8187ms → 13.69× faster
- 200,000 chars: 0.6999ms vs 10.60ms → 15.15× faster
- 500,000 chars: 2.4193ms vs 31.60ms → 13.06× faster
- 1,000,000 chars: 4.8965ms vs 72.63ms → 14.83× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0220ms vs 0.0385ms → 1.75× faster, 42.9% less time
- 20,000 chars: 0.0714ms vs 0.1497ms → 2.1× faster, 52.3% less time
- 50,000 chars: 0.1768ms vs 0.3691ms → 2.09× faster, 52.1% less time
- 100,000 chars: 0.3520ms vs 0.7627ms → 2.17× faster, 53.9% less time
- 200,000 chars: 0.6999ms vs 1.5137ms → 2.16× faster, 53.8% less time
- 500,000 chars: 2.4193ms vs 3.7752ms → 1.56× faster, 35.9% less time
- 1,000,000 chars: 4.8965ms vs 7.4785ms → 1.53× faster, 34.5% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0184ms vs 0.0385ms → 2.09× faster, 52.1% less time
- 20,000 chars: 0.0711ms vs 0.1497ms → 2.1× faster, 52.5% less time
- 50,000 chars: 0.1768ms vs 0.3691ms → 2.09× faster, 52.1% less time
- 100,000 chars: 0.3518ms vs 0.7627ms → 2.17× faster, 53.9% less time
- 200,000 chars: 0.7010ms vs 1.5137ms → 2.16× faster, 53.7% less time
- 500,000 chars: 2.3797ms vs 3.7752ms → 1.59× faster, 37% less time
- 1,000,000 chars: 4.7985ms vs 7.4785ms → 1.56× faster, 35.8% less time

Render vs micromark:
- 5,000 chars: 0.0220ms vs 3.8809ms → 176.51× faster
- 20,000 chars: 0.0714ms vs 17.91ms → 250.88× faster
- 50,000 chars: 0.1768ms vs 51.84ms → 293.17× faster
- 100,000 chars: 0.3520ms vs 108.08ms → 307.08× faster
- 200,000 chars: 0.6999ms vs 221.67ms → 316.70× faster

Render vs remark+rehype:
- 5,000 chars: 0.0220ms vs 4.7628ms → 216.62× faster
- 20,000 chars: 0.0714ms vs 22.29ms → 312.34× faster
- 50,000 chars: 0.1768ms vs 70.04ms → 396.11× faster
- 100,000 chars: 0.3520ms vs 163.64ms → 464.93× faster
- 200,000 chars: 0.6999ms vs 404.37ms → 577.71× faster

Render vs markdown-exit:
- 5,000 chars: 0.0220ms vs 0.3035ms → 13.80× faster
- 20,000 chars: 0.0714ms vs 1.1973ms → 16.77× faster
- 50,000 chars: 0.1768ms vs 3.0096ms → 17.02× faster
- 100,000 chars: 0.3520ms vs 6.1519ms → 17.48× faster
- 200,000 chars: 0.6999ms vs 13.18ms → 18.82× faster
- 500,000 chars: 2.4193ms vs 40.61ms → 16.78× faster
- 1,000,000 chars: 4.8965ms vs 81.72ms → 16.69× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0454ms | 0.1988ms | 4.38× faster, 77.2% less time | 0.1269ms | 0.6122ms | 4.82× faster, 79.3% less time | S5/S5 |
| 20000 | 0.1490ms | 0.7381ms | 4.95× faster, 79.8% less time | 0.5000ms | 2.4888ms | 4.98× faster, 79.9% less time | S5/S5 |
| 50000 | 0.3580ms | 1.8548ms | 5.18× faster, 80.7% less time | 1.3650ms | 6.4400ms | 4.72× faster, 78.8% less time | S5/S5 |
| 100000 | 0.8497ms | 4.0865ms | 4.81× faster, 79.2% less time | 2.4759ms | 13.12ms | 5.3× faster, 81.1% less time | S5/S5 |
| 200000 | 2.0213ms | 8.6597ms | 4.28× faster, 76.7% less time | 5.4159ms | 28.23ms | 5.21× faster, 80.8% less time | S5/S5 |
| 500000 | 6.5263ms | 26.69ms | 4.09× faster, 75.5% less time | 15.77ms | 75.36ms | 4.78× faster, 79.1% less time | S5/S5 |
| 1000000 | 15.59ms | 49.00ms | 3.14× faster, 68.2% less time | 40.47ms | 164.95ms | 4.08× faster, 75.5% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0454ms | 0.0429ms | 1.06× slower, 5.9% more time | 0.1269ms | 0.0637ms | 1.99× slower, 99.2% more time | S5/S5 |
| 20000 | 0.1490ms | 0.1625ms | 1.09× faster, 8.3% less time | 0.5000ms | 0.1989ms | 2.51× slower, 151.5% more time | S5/S5 |
| 50000 | 0.3580ms | 0.4359ms | 1.22× faster, 17.9% less time | 1.3650ms | 0.4815ms | 2.84× slower, 183.5% more time | S5/S5 |
| 100000 | 0.8497ms | 0.8551ms | 1.01× faster, 0.6% less time | 2.4759ms | 0.9092ms | 2.72× slower, 172.3% more time | S5/S5 |
| 200000 | 2.0213ms | 1.6948ms | 1.19× slower, 19.3% more time | 5.4159ms | 1.9862ms | 2.73× slower, 172.7% more time | S5/S5 |
| 500000 | 6.5263ms | 4.1882ms | 1.56× slower, 55.8% more time | 15.77ms | 4.7386ms | 3.33× slower, 232.8% more time | S5/S5 |
| 1000000 | 15.59ms | 10.48ms | 1.49× slower, 48.8% more time | 40.47ms | 9.5715ms | 4.23× slower, 322.8% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0454ms | 0.1814ms | 3.99× faster, 75% less time |
| 20000 | 0.1490ms | 0.7104ms | 4.77× faster, 79% less time |
| 50000 | 0.3580ms | 1.7975ms | 5.02× faster, 80.1% less time |
| 100000 | 0.8497ms | 3.5650ms | 4.2× faster, 76.2% less time |
| 200000 | 2.0213ms | 7.0535ms | 3.49× faster, 71.3% less time |
| 500000 | 6.5263ms | 17.38ms | 2.66× faster, 62.4% less time |
| 1000000 | 15.59ms | 37.18ms | 2.38× faster, 58.1% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0250ms | 0.0418ms | 1.67× faster, 40.2% less time | 0.1855ms |
| 20000 | 0.0864ms | 0.1621ms | 1.88× faster, 46.7% less time | 0.7218ms |
| 50000 | 0.2124ms | 0.4286ms | 2.02× faster, 50.5% less time | 1.8597ms |
| 100000 | 0.4211ms | 0.8408ms | 2× faster, 49.9% less time | 3.5798ms |
| 200000 | 0.8311ms | 1.6540ms | 1.99× faster, 49.8% less time | 7.1115ms |
| 500000 | 2.0657ms | 4.1655ms | 2.02× faster, 50.4% less time | 17.94ms |
| 1000000 | 4.5582ms | 10.14ms | 2.22× faster, 55.1% less time | 36.93ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1786ms | 0.1778ms |
| @ox-content/napi (parse only) | 0.0432ms | 0.0416ms |
| markdown-exit | 0.2666ms | 0.2608ms |
| markdown-it (baseline) | 0.2009ms | 0.1783ms |
| markdown-it-ts (stream+chunk) | 0.2190ms | 0.1907ms |
| micromark (parse only) | 3.3896ms | 3.4866ms |
| remark (parse only) | 4.4283ms | 4.1236ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7055ms | 0.7187ms |
| @ox-content/napi (parse only) | 0.1595ms | 0.1600ms |
| markdown-exit | 1.0129ms | 0.9703ms |
| markdown-it (baseline) | 0.7494ms | 0.7178ms |
| markdown-it-ts (stream+chunk) | 0.7641ms | 0.7418ms |
| micromark (parse only) | 15.53ms | 16.16ms |
| remark (parse only) | 19.11ms | 19.96ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.8484ms | 1.8062ms |
| @ox-content/napi (parse only) | 0.4199ms | 0.4378ms |
| markdown-exit | 2.4679ms | 2.5122ms |
| markdown-it (baseline) | 1.7955ms | 1.8999ms |
| markdown-it-ts (stream+chunk) | 1.8717ms | 2.0212ms |
| micromark (parse only) | 49.51ms | 44.86ms |
| remark (parse only) | 62.16ms | 63.45ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.5187ms | 3.5448ms |
| @ox-content/napi (parse only) | 0.8901ms | 0.8430ms |
| markdown-exit | 4.9924ms | 5.0919ms |
| markdown-it (baseline) | 3.5598ms | 4.1616ms |
| markdown-it-ts (stream+chunk) | 3.8304ms | 4.2080ms |
| micromark (parse only) | 89.39ms | 90.28ms |
| remark (parse only) | 157.90ms | 145.85ms |
