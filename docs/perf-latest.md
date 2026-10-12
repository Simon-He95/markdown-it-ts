# Performance Report (latest run)

## Environment

- Generated at: 2026-10-12T09:22:12.458Z
- Node.js: v26.10.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 5ddb6145c21969b1630f322324fde76d4c8b98da

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
| 5,011 | 0.0799ms | 0.2292ms | 0.0379ms | stock-fast | 0.0221ms | 0.2863ms | 0.0359ms | stock-fast | no |
| 20,085 | 0.1737ms | 0.8468ms | 0.1440ms | stock-fast | 0.0675ms | 1.0034ms | 0.1439ms | stock-fast | no |
| 50,084 | 0.3004ms | 2.2359ms | 0.4586ms | stock-fast | 0.2277ms | 2.5324ms | 0.3961ms | stock-fast | no |
| 100,126 | 0.8465ms | 4.7442ms | 0.7821ms | stock-fast | 0.3868ms | 5.7822ms | 0.7424ms | stock-fast | no |
| 200,073 | 1.9105ms | 9.9795ms | 1.5884ms | stock-fast | 0.6560ms | 14.23ms | 1.3486ms | stock-fast | no |
| 500,121 | 13.48ms | 28.27ms | 4.1686ms | stock-fast | 2.3822ms | 38.48ms | 4.2999ms | stock-fast | no |
| 1,000,068 | 17.35ms | 63.56ms | 11.02ms | stock-fast | 5.5022ms | 83.04ms | 6.6388ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.3185ms | 0.4054ms | 0.0590ms | general | 0.3178ms | 0.3731ms | 0.0644ms | token-renderer | no |
| 20,125 | 0.9951ms | 1.0902ms | 0.2163ms | general | 1.0465ms | 1.3854ms | 0.1873ms | token-renderer | no |
| 50,025 | 2.0661ms | 2.7339ms | 0.5452ms | general | 2.5358ms | 3.4546ms | 0.5337ms | token-renderer | no |
| 100,450 | 5.2945ms | 5.9255ms | 1.0831ms | general | 5.1910ms | 7.8264ms | 0.9946ms | token-renderer | no |
| 200,109 | 16.36ms | 12.76ms | 2.1066ms | full-chunk | 13.91ms | 17.05ms | 2.1822ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1082ms | 0.1506ms | 0.0499ms | general | 0.1028ms | 0.1749ms | 0.0191ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1027ms | 0.1546ms | 0.0275ms | general | 0.1208ms | 0.1734ms | 0.0229ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0278ms | 0.0360ms | 0.0077ms | general | 0.0306ms | 0.0426ms | 0.0077ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2043ms | 0.1528ms | 0.1969ms | 0.1816ms | 0.0384ms | 0.1900ms | 0.2540ms | **0.0378ms** | 0.1708ms | 3.8524ms | 0.5905ms | 0.2853ms | 0.2713ms | 0.5476ms | 0.0987ms | 0.6034ms | 0.8289ms | **0.0587ms** | 0.1915ms | 12.78ms | 1.6902ms | 0.3960ms | 0.4567ms | 1.5235ms | 0.5867ms | 1.7493ms | 2.3863ms | **0.0898ms** | 0.2310ms | 37.06ms | 0.2032ms | 0.1673ms | 0.1830ms | 0.1894ms | 0.1769ms | 0.2371ms | 0.2596ms | **0.0398ms** | 0.1680ms | 4.2308ms |
| 20000 | 0.7419ms | 0.5920ms | 0.7319ms | 0.7314ms | **0.1215ms** | 0.7375ms | 0.9886ms | 0.1427ms | 0.6672ms | 17.70ms | 2.5483ms | 1.0618ms | 1.0204ms | 2.6014ms | 0.4712ms | 2.5242ms | 3.3709ms | **0.1791ms** | 0.7015ms | 80.03ms | 6.9468ms | 1.1882ms | 1.6416ms | 6.8638ms | 2.0868ms | 6.9757ms | 9.3037ms | **0.2321ms** | 0.7631ms | 159.36ms | 0.7534ms | 0.6099ms | 0.7115ms | 0.7369ms | 0.6671ms | 0.7454ms | 1.0126ms | **0.1417ms** | 0.6646ms | 17.92ms |
| 50000 | 1.9076ms | 1.4983ms | 1.8630ms | 1.8504ms | **0.3650ms** | 1.9249ms | 2.5590ms | 0.3870ms | 1.6668ms | 45.39ms | 6.5593ms | 2.4179ms | 2.5282ms | 6.4448ms | 1.1760ms | 6.4306ms | 8.6115ms | **0.4243ms** | 1.7331ms | 159.46ms | 17.61ms | 2.8178ms | 2.8161ms | 17.38ms | 3.2014ms | 18.12ms | 23.34ms | **0.4662ms** | 1.7755ms | 427.50ms | 1.9245ms | 1.4122ms | 1.8575ms | 1.8946ms | 1.6900ms | 1.8817ms | 2.5252ms | **0.3659ms** | 1.6651ms | 45.05ms |
| 100000 | 4.2102ms | 3.3305ms | 4.1851ms | 4.0477ms | 0.9632ms | 4.0869ms | 5.6921ms | **0.7709ms** | 3.4350ms | 99.48ms | 13.25ms | 4.8172ms | 5.0308ms | 13.17ms | 2.2707ms | 13.05ms | 18.04ms | **0.9394ms** | 3.5040ms | 315.21ms | 36.29ms | 5.5830ms | 5.6175ms | 35.35ms | 6.4367ms | 35.47ms | 49.97ms | **0.8880ms** | 4.5757ms | 875.05ms | 3.9362ms | 3.0245ms | 3.8026ms | 3.8074ms | 3.5646ms | 4.0499ms | 5.9982ms | **0.7268ms** | 3.3595ms | 105.78ms |
| 200000 | 10.11ms | 8.3197ms | 9.6200ms | 9.9340ms | 1.9093ms | 9.7886ms | 13.51ms | **1.5145ms** | 6.7297ms | 186.83ms | 28.37ms | 11.93ms | 11.77ms | 27.70ms | 4.7703ms | 28.01ms | 36.50ms | **1.7605ms** | 6.8299ms | 636.89ms | 75.41ms | 11.83ms | 22.89ms | 75.35ms | 12.55ms | 77.55ms | 98.56ms | **1.7636ms** | 6.9087ms | 1753.49ms | 8.1631ms | 6.8059ms | 7.8200ms | 8.4339ms | 11.03ms | 8.4317ms | 11.21ms | **1.4964ms** | 6.8351ms | 182.66ms |
| 500000 | 25.17ms | 20.51ms | 24.12ms | 23.51ms | 7.9982ms | 27.25ms | 32.95ms | **3.7974ms** | 16.63ms | - | 71.90ms | 35.43ms | 35.03ms | 72.19ms | 16.77ms | 75.76ms | 114.59ms | **4.0998ms** | 16.79ms | - | 211.54ms | 31.82ms | 28.84ms | 204.82ms | 83.55ms | 208.74ms | 281.75ms | **4.3008ms** | 18.15ms | - | 21.73ms | 25.54ms | 25.43ms | 23.33ms | 25.25ms | 26.32ms | 35.44ms | **3.6706ms** | 17.16ms | - |
| 1000000 | 50.75ms | 58.80ms | 51.25ms | 50.53ms | 15.13ms | 55.08ms | 71.90ms | **9.7436ms** | 36.22ms | - | 181.42ms | 79.95ms | 71.91ms | 208.17ms | 41.72ms | 177.38ms | 262.08ms | **9.0900ms** | 33.99ms | - | 470.79ms | 98.60ms | 97.98ms | 464.30ms | 107.86ms | 510.91ms | 640.15ms | **8.5963ms** | 34.40ms | - | 49.08ms | 55.23ms | 52.05ms | 50.57ms | 82.12ms | 57.19ms | 69.24ms | **9.1074ms** | 36.25ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0384ms (stream OFF, chunk OFF)
- 20000: S5 0.1215ms (stream OFF, chunk OFF)
- 50000: S5 0.3650ms (stream OFF, chunk OFF)
- 100000: S5 0.9632ms (stream OFF, chunk OFF)
- 200000: S5 1.9093ms (stream OFF, chunk OFF)
- 500000: S5 7.9982ms (stream OFF, chunk OFF)
- 1000000: S5 15.13ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.0987ms (stream OFF, chunk OFF)
- 20000: S5 0.4712ms (stream OFF, chunk OFF)
- 50000: S5 1.1760ms (stream OFF, chunk OFF)
- 100000: S5 2.2707ms (stream OFF, chunk OFF)
- 200000: S5 4.7703ms (stream OFF, chunk OFF)
- 500000: S5 16.77ms (stream OFF, chunk OFF)
- 1000000: S5 41.72ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S2 0.3960ms (stream ON, cache ON, chunk OFF)
- 20000: S2 1.1882ms (stream ON, cache ON, chunk OFF)
- 50000: S3 2.8161ms (stream ON, cache ON, chunk ON)
- 100000: S2 5.5830ms (stream ON, cache ON, chunk OFF)
- 200000: S2 11.83ms (stream ON, cache ON, chunk OFF)
- 500000: S3 28.84ms (stream ON, cache ON, chunk ON)
- 1000000: S3 97.98ms (stream ON, cache ON, chunk ON)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1673ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.6099ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4122ms (stream ON, cache ON, chunk OFF)
- 100000: S2 3.0245ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.8059ms (stream ON, cache ON, chunk OFF)
- 500000: S1 21.73ms (stream ON, cache OFF, chunk ON)
- 1000000: S1 49.08ms (stream ON, cache OFF, chunk ON)

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
| 5000 | 0.0213ms | 0.0183ms | 0.2330ms | 0.0340ms | 4.0633ms | 4.9480ms | 0.2966ms |
| 20000 | 0.0608ms | 0.0606ms | 0.9124ms | 0.1330ms | 19.36ms | 24.43ms | 1.1669ms |
| 50000 | 0.1612ms | 0.1560ms | 2.3378ms | 0.3218ms | 53.65ms | 77.55ms | 3.2978ms |
| 100000 | 0.5054ms | 0.3797ms | 8.3080ms | 0.7116ms | 161.96ms | 281.21ms | 9.7256ms |
| 200000 | 0.6065ms | 0.6150ms | 16.97ms | 1.9339ms | 259.03ms | 610.00ms | 16.25ms |
| 500000 | 2.3348ms | 2.1175ms | 38.58ms | 3.6373ms | - | - | 50.21ms |
| 1000000 | 5.0179ms | 4.2119ms | 79.22ms | 7.2978ms | - | - | 104.73ms |

Render vs markdown-it:
- 5,000 chars: 0.0213ms vs 0.2330ms → 10.93× faster
- 20,000 chars: 0.0608ms vs 0.9124ms → 15.00× faster
- 50,000 chars: 0.1612ms vs 2.3378ms → 14.50× faster
- 100,000 chars: 0.5054ms vs 8.3080ms → 16.44× faster
- 200,000 chars: 0.6065ms vs 16.97ms → 27.98× faster
- 500,000 chars: 2.3348ms vs 38.58ms → 16.52× faster
- 1,000,000 chars: 5.0179ms vs 79.22ms → 15.79× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0213ms vs 0.0340ms → 1.59× faster, 37.2% less time
- 20,000 chars: 0.0608ms vs 0.1330ms → 2.19× faster, 54.2% less time
- 50,000 chars: 0.1612ms vs 0.3218ms → 2× faster, 49.9% less time
- 100,000 chars: 0.5054ms vs 0.7116ms → 1.41× faster, 29% less time
- 200,000 chars: 0.6065ms vs 1.9339ms → 3.19× faster, 68.6% less time
- 500,000 chars: 2.3348ms vs 3.6373ms → 1.56× faster, 35.8% less time
- 1,000,000 chars: 5.0179ms vs 7.2978ms → 1.45× faster, 31.2% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0183ms vs 0.0340ms → 1.85× faster, 46% less time
- 20,000 chars: 0.0606ms vs 0.1330ms → 2.19× faster, 54.4% less time
- 50,000 chars: 0.1560ms vs 0.3218ms → 2.06× faster, 51.5% less time
- 100,000 chars: 0.3797ms vs 0.7116ms → 1.87× faster, 46.6% less time
- 200,000 chars: 0.6150ms vs 1.9339ms → 3.14× faster, 68.2% less time
- 500,000 chars: 2.1175ms vs 3.6373ms → 1.72× faster, 41.8% less time
- 1,000,000 chars: 4.2119ms vs 7.2978ms → 1.73× faster, 42.3% less time

Render vs micromark:
- 5,000 chars: 0.0213ms vs 4.0633ms → 190.55× faster
- 20,000 chars: 0.0608ms vs 19.36ms → 318.28× faster
- 50,000 chars: 0.1612ms vs 53.65ms → 332.77× faster
- 100,000 chars: 0.5054ms vs 161.96ms → 320.48× faster
- 200,000 chars: 0.6065ms vs 259.03ms → 427.12× faster

Render vs remark+rehype:
- 5,000 chars: 0.0213ms vs 4.9480ms → 232.04× faster
- 20,000 chars: 0.0608ms vs 24.43ms → 401.54× faster
- 50,000 chars: 0.1612ms vs 77.55ms → 481.05× faster
- 100,000 chars: 0.5054ms vs 281.21ms → 556.44× faster
- 200,000 chars: 0.6065ms vs 610.00ms → 1005.83× faster

Render vs markdown-exit:
- 5,000 chars: 0.0213ms vs 0.2966ms → 13.91× faster
- 20,000 chars: 0.0608ms vs 1.1669ms → 19.18× faster
- 50,000 chars: 0.1612ms vs 3.2978ms → 20.46× faster
- 100,000 chars: 0.5054ms vs 9.7256ms → 19.24× faster
- 200,000 chars: 0.6065ms vs 16.25ms → 26.79× faster
- 500,000 chars: 2.3348ms vs 50.21ms → 21.50× faster
- 1,000,000 chars: 5.0179ms vs 104.73ms → 20.87× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0384ms | 0.1900ms | 4.94× faster, 79.8% less time | 0.0987ms | 0.6034ms | 6.11× faster, 83.6% less time | S5/S5 |
| 20000 | 0.1215ms | 0.7375ms | 6.07× faster, 83.5% less time | 0.4712ms | 2.5242ms | 5.36× faster, 81.3% less time | S5/S5 |
| 50000 | 0.3650ms | 1.9249ms | 5.27× faster, 81% less time | 1.1760ms | 6.4306ms | 5.47× faster, 81.7% less time | S5/S5 |
| 100000 | 0.9632ms | 4.0869ms | 4.24× faster, 76.4% less time | 2.2707ms | 13.05ms | 5.75× faster, 82.6% less time | S5/S5 |
| 200000 | 1.9093ms | 9.7886ms | 5.13× faster, 80.5% less time | 4.7703ms | 28.01ms | 5.87× faster, 83% less time | S5/S5 |
| 500000 | 7.9982ms | 27.25ms | 3.41× faster, 70.7% less time | 16.77ms | 75.76ms | 4.52× faster, 77.9% less time | S5/S5 |
| 1000000 | 15.13ms | 55.08ms | 3.64× faster, 72.5% less time | 41.72ms | 177.38ms | 4.25× faster, 76.5% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0384ms | 0.0378ms | 1.02× slower, 1.7% more time | 0.0987ms | 0.0587ms | 1.68× slower, 68.1% more time | S5/S5 |
| 20000 | 0.1215ms | 0.1427ms | 1.17× faster, 14.8% less time | 0.4712ms | 0.1791ms | 2.63× slower, 163.1% more time | S5/S5 |
| 50000 | 0.3650ms | 0.3870ms | 1.06× faster, 5.7% less time | 1.1760ms | 0.4243ms | 2.77× slower, 177.2% more time | S5/S5 |
| 100000 | 0.9632ms | 0.7709ms | 1.25× slower, 24.9% more time | 2.2707ms | 0.9394ms | 2.42× slower, 141.7% more time | S5/S5 |
| 200000 | 1.9093ms | 1.5145ms | 1.26× slower, 26.1% more time | 4.7703ms | 1.7605ms | 2.71× slower, 171% more time | S5/S5 |
| 500000 | 7.9982ms | 3.7974ms | 2.11× slower, 110.6% more time | 16.77ms | 4.0998ms | 4.09× slower, 309.1% more time | S5/S5 |
| 1000000 | 15.13ms | 9.7436ms | 1.55× slower, 55.3% more time | 41.72ms | 9.0900ms | 4.59× slower, 358.9% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0384ms | 0.1708ms | 4.44× faster, 77.5% less time |
| 20000 | 0.1215ms | 0.6672ms | 5.49× faster, 81.8% less time |
| 50000 | 0.3650ms | 1.6668ms | 4.57× faster, 78.1% less time |
| 100000 | 0.9632ms | 3.4350ms | 3.57× faster, 72% less time |
| 200000 | 1.9093ms | 6.7297ms | 3.52× faster, 71.6% less time |
| 500000 | 7.9982ms | 16.63ms | 2.08× faster, 51.9% less time |
| 1000000 | 15.13ms | 36.22ms | 2.39× faster, 58.2% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0263ms | 0.0505ms | 1.92× faster, 47.8% less time | 0.2151ms |
| 20000 | 0.1052ms | 0.1713ms | 1.63× faster, 38.6% less time | 0.7342ms |
| 50000 | 0.2160ms | 0.3912ms | 1.81× faster, 44.8% less time | 1.7645ms |
| 100000 | 0.4694ms | 0.8374ms | 1.78× faster, 44% less time | 3.7610ms |
| 200000 | 0.9654ms | 1.5891ms | 1.65× faster, 39.2% less time | 7.6283ms |
| 500000 | 2.4735ms | 4.4686ms | 1.81× faster, 44.6% less time | 18.64ms |
| 1000000 | 5.3091ms | 10.51ms | 1.98× faster, 49.5% less time | 43.09ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1715ms | 0.1896ms |
| @ox-content/napi (parse only) | 0.0392ms | 0.0369ms |
| markdown-exit | 0.6358ms | 0.8032ms |
| markdown-it (baseline) | 0.2010ms | 0.1861ms |
| markdown-it-ts (stream+chunk) | 0.2620ms | 0.1984ms |
| micromark (parse only) | 3.9620ms | 3.8492ms |
| remark (parse only) | 5.0259ms | 4.3481ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7124ms | 0.7307ms |
| @ox-content/napi (parse only) | 0.1600ms | 0.1476ms |
| markdown-exit | 1.4732ms | 1.2187ms |
| markdown-it (baseline) | 0.8215ms | 0.7736ms |
| markdown-it-ts (stream+chunk) | 0.7878ms | 1.1218ms |
| micromark (parse only) | 17.30ms | 17.76ms |
| remark (parse only) | 20.26ms | 22.24ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.7014ms | 1.7257ms |
| @ox-content/napi (parse only) | 0.3893ms | 0.3955ms |
| markdown-exit | 2.8118ms | 2.5045ms |
| markdown-it (baseline) | 1.7928ms | 1.9450ms |
| markdown-it-ts (stream+chunk) | 1.8779ms | 1.9324ms |
| micromark (parse only) | 45.35ms | 45.68ms |
| remark (parse only) | 65.98ms | 67.55ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.3635ms | 3.3430ms |
| @ox-content/napi (parse only) | 0.8503ms | 0.7634ms |
| markdown-exit | 4.9582ms | 5.2300ms |
| markdown-it (baseline) | 3.5262ms | 3.9820ms |
| markdown-it-ts (stream+chunk) | 3.8649ms | 4.0514ms |
| micromark (parse only) | 95.48ms | 92.65ms |
| remark (parse only) | 159.47ms | 158.91ms |
