# Performance Report (latest run)

## Environment

- Generated at: 2026-08-22T19:44:43.645Z
- Node.js: v20.20.2
- Platform: linux x64
- CPU: AMD EPYC 7763 64-Core Processor
- CPU count: 4
- Commit: 5e978eb8a28e12652a3d453411218f297a21c279

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
| 5,011 | 0.0425ms | 0.2464ms | 0.0453ms | stock-fast | 0.0234ms | 0.2938ms | 0.0441ms | stock-fast | no |
| 20,085 | 0.1731ms | 0.9861ms | 0.1741ms | stock-fast | 0.0894ms | 1.1831ms | 0.1694ms | stock-fast | no |
| 50,084 | 0.4567ms | 2.6316ms | 0.5527ms | stock-fast | 0.2212ms | 2.8477ms | 0.4362ms | stock-fast | no |
| 100,126 | 1.3903ms | 5.8220ms | 1.0784ms | stock-fast | 0.4458ms | 8.2779ms | 0.9510ms | stock-fast | no |
| 200,073 | 2.1557ms | 10.82ms | 2.0598ms | stock-fast | 0.8785ms | 18.12ms | 1.8644ms | stock-fast | no |
| 500,121 | 20.38ms | 42.28ms | 5.0639ms | stock-fast | 3.4040ms | 56.47ms | 4.5274ms | stock-fast | no |
| 1,000,068 | 47.82ms | 103.50ms | 12.47ms | stock-fast | 7.8005ms | 112.26ms | 8.9866ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.3406ms | 0.3688ms | 0.0649ms | general | 0.4047ms | 0.4561ms | 0.0622ms | token-renderer | no |
| 20,125 | 1.1245ms | 1.3958ms | 0.2413ms | general | 1.3522ms | 1.7181ms | 0.2333ms | token-renderer | no |
| 50,025 | 2.8679ms | 3.4025ms | 0.7371ms | general | 3.4565ms | 4.3676ms | 0.5798ms | token-renderer | no |
| 100,450 | 9.3829ms | 9.6836ms | 1.3949ms | general | 9.0068ms | 10.97ms | 1.2611ms | token-renderer | no |
| 200,109 | 17.10ms | 20.63ms | 2.7088ms | full-chunk | 22.17ms | 22.52ms | 2.4544ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.1544ms | 0.2063ms | 0.0281ms | general | 0.1560ms | 0.2149ms | 0.0237ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1380ms | 0.1863ms | 0.0277ms | general | 0.1636ms | 0.2180ms | 0.0264ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0363ms | 0.0500ms | 0.0098ms | general | 0.0437ms | 0.0584ms | 0.0098ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2751ms | 0.2045ms | 0.2394ms | 0.2399ms | **0.0437ms** | 0.2501ms | 0.3967ms | 0.0453ms | 0.2512ms | 7.3388ms | 0.7649ms | 0.3792ms | 0.3139ms | 0.7120ms | 0.1405ms | 0.8334ms | 1.2844ms | **0.0794ms** | 0.2898ms | 25.00ms | 2.3763ms | 0.4795ms | 0.5083ms | 2.0637ms | 0.8155ms | 2.3694ms | 3.6976ms | **0.1405ms** | 0.3655ms | 76.13ms | 0.3614ms | 0.1984ms | 0.4849ms | 0.2411ms | 0.2757ms | 0.6846ms | 0.8001ms | **0.0443ms** | 0.2528ms | 9.0690ms |
| 20000 | 0.9713ms | 0.7976ms | 0.9786ms | 0.9659ms | 0.1877ms | 1.0460ms | 1.6352ms | **0.1744ms** | 0.9965ms | 33.22ms | 3.2397ms | 1.2579ms | 1.2252ms | 3.1655ms | 0.6182ms | 3.4725ms | 5.4532ms | **0.2267ms** | 1.0437ms | 105.26ms | 8.8605ms | 1.4674ms | 2.1323ms | 8.8798ms | 2.9255ms | 9.5706ms | 15.10ms | **0.2887ms** | 1.1341ms | 286.20ms | 0.9517ms | 0.9871ms | 0.9167ms | 1.0027ms | 0.9573ms | 1.0394ms | 1.6734ms | **0.1759ms** | 1.0271ms | 32.61ms |
| 50000 | 2.3389ms | 2.0586ms | 2.3412ms | 2.3752ms | **0.4463ms** | 2.6588ms | 4.0085ms | 0.5544ms | 2.6136ms | 90.76ms | 8.2635ms | 3.0024ms | 3.1191ms | 8.2772ms | 1.5042ms | 8.4800ms | 13.88ms | **0.5158ms** | 2.5317ms | 308.33ms | 22.37ms | 5.1186ms | 4.8661ms | 22.40ms | 4.2440ms | 23.58ms | 38.29ms | **0.6057ms** | 2.6537ms | 810.29ms | 2.3267ms | 2.0224ms | 2.3847ms | 2.4334ms | 2.5669ms | 2.5533ms | 4.2104ms | **0.6191ms** | 2.5838ms | 89.85ms |
| 100000 | 7.7780ms | 7.1176ms | 7.1691ms | 5.0728ms | **1.4060ms** | 5.7639ms | 8.9469ms | 1.8898ms | 5.9896ms | 180.71ms | 17.80ms | 7.9818ms | 7.2776ms | 17.80ms | 3.5377ms | 17.27ms | 27.88ms | **1.0006ms** | 5.0114ms | 625.13ms | 46.42ms | 7.9967ms | 13.78ms | 46.73ms | 9.4007ms | 50.17ms | 77.97ms | **1.1000ms** | 5.0816ms | 1695.66ms | 4.9090ms | 5.4985ms | 4.8775ms | 4.9378ms | 8.8568ms | 6.0930ms | 9.1635ms | **1.8566ms** | 5.9011ms | 184.48ms |
| 200000 | 17.40ms | 17.25ms | 15.95ms | 16.49ms | 7.9311ms | 17.04ms | 23.27ms | **3.5698ms** | 11.93ms | 378.30ms | 38.14ms | 18.89ms | 15.14ms | 43.13ms | 9.1756ms | 38.13ms | 72.00ms | **2.4896ms** | 10.40ms | 1358.11ms | 119.00ms | 24.56ms | 21.76ms | 107.60ms | 29.98ms | 114.55ms | 168.55ms | **2.1381ms** | 10.32ms | 3611.94ms | 10.00ms | 13.61ms | 13.45ms | 10.26ms | 19.28ms | 10.76ms | 24.47ms | **3.4160ms** | 11.62ms | 381.86ms |
| 500000 | 44.75ms | 39.49ms | 41.44ms | 40.88ms | 24.85ms | 50.73ms | 67.40ms | **6.9548ms** | 29.07ms | - | 164.42ms | 57.43ms | 49.40ms | 163.97ms | 58.70ms | 164.64ms | 239.54ms | **6.0808ms** | 25.76ms | - | 395.88ms | 62.31ms | 81.12ms | 363.85ms | 201.30ms | 429.42ms | 574.01ms | **8.1355ms** | 26.46ms | - | 38.21ms | 39.62ms | 49.59ms | 45.05ms | 68.89ms | 55.93ms | 70.87ms | **7.5992ms** | 27.19ms | - |
| 1000000 | 96.07ms | 106.56ms | 83.51ms | 82.12ms | 46.81ms | 99.61ms | 130.92ms | **14.31ms** | 59.98ms | - | 317.91ms | 106.48ms | 135.86ms | 301.35ms | 167.89ms | 372.03ms | 426.60ms | **11.94ms** | 52.55ms | - | 836.56ms | 134.46ms | 163.73ms | 850.60ms | 422.99ms | 954.91ms | 1237.19ms | **13.73ms** | 52.95ms | - | 110.53ms | 88.26ms | 104.31ms | 78.68ms | 117.44ms | 134.94ms | 123.59ms | **11.59ms** | 55.06ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0437ms (stream OFF, chunk OFF)
- 20000: S5 0.1877ms (stream OFF, chunk OFF)
- 50000: S5 0.4463ms (stream OFF, chunk OFF)
- 100000: S5 1.4060ms (stream OFF, chunk OFF)
- 200000: S5 7.9311ms (stream OFF, chunk OFF)
- 500000: S5 24.85ms (stream OFF, chunk OFF)
- 1000000: S5 46.81ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1405ms (stream OFF, chunk OFF)
- 20000: S5 0.6182ms (stream OFF, chunk OFF)
- 50000: S5 1.5042ms (stream OFF, chunk OFF)
- 100000: S5 3.5377ms (stream OFF, chunk OFF)
- 200000: S5 9.1756ms (stream OFF, chunk OFF)
- 500000: S3 49.40ms (stream ON, cache ON, chunk ON)
- 1000000: S2 106.48ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S2 0.4795ms (stream ON, cache ON, chunk OFF)
- 20000: S2 1.4674ms (stream ON, cache ON, chunk OFF)
- 50000: S5 4.2440ms (stream OFF, chunk OFF)
- 100000: S2 7.9967ms (stream ON, cache ON, chunk OFF)
- 200000: S3 21.76ms (stream ON, cache ON, chunk ON)
- 500000: S2 62.31ms (stream ON, cache ON, chunk OFF)
- 1000000: S2 134.46ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1984ms (stream ON, cache ON, chunk OFF)
- 20000: S3 0.9167ms (stream ON, cache ON, chunk ON)
- 50000: S2 2.0224ms (stream ON, cache ON, chunk OFF)
- 100000: S3 4.8775ms (stream ON, cache ON, chunk ON)
- 200000: S1 10.00ms (stream ON, cache OFF, chunk ON)
- 500000: S1 38.21ms (stream ON, cache OFF, chunk ON)
- 1000000: S4 78.68ms (stream OFF, chunk ON)

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
| 5000 | 0.0277ms | 0.0226ms | 0.2947ms | 0.0440ms | 9.3757ms | 9.7642ms | 0.4347ms |
| 20000 | 0.0918ms | 0.0875ms | 1.2005ms | 0.1703ms | 41.05ms | 53.90ms | 1.7581ms |
| 50000 | 0.2156ms | 0.2147ms | 2.8832ms | 0.4270ms | 105.71ms | 132.47ms | 4.4794ms |
| 100000 | 0.4284ms | 0.4697ms | 8.2670ms | 0.9432ms | 221.45ms | 273.23ms | 11.74ms |
| 200000 | 0.9309ms | 0.9782ms | 17.44ms | 1.8639ms | 446.50ms | 695.65ms | 24.95ms |
| 500000 | 3.6923ms | 3.3576ms | 57.27ms | 4.5216ms | - | - | 64.52ms |
| 1000000 | 6.8072ms | 7.4409ms | 111.66ms | 9.0189ms | - | - | 154.01ms |

Render vs markdown-it:
- 5,000 chars: 0.0277ms vs 0.2947ms → 10.63× faster
- 20,000 chars: 0.0918ms vs 1.2005ms → 13.07× faster
- 50,000 chars: 0.2156ms vs 2.8832ms → 13.37× faster
- 100,000 chars: 0.4284ms vs 8.2670ms → 19.30× faster
- 200,000 chars: 0.9309ms vs 17.44ms → 18.74× faster
- 500,000 chars: 3.6923ms vs 57.27ms → 15.51× faster
- 1,000,000 chars: 6.8072ms vs 111.66ms → 16.40× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0277ms vs 0.0440ms → 1.59× faster, 37% less time
- 20,000 chars: 0.0918ms vs 0.1703ms → 1.85× faster, 46.1% less time
- 50,000 chars: 0.2156ms vs 0.4270ms → 1.98× faster, 49.5% less time
- 100,000 chars: 0.4284ms vs 0.9432ms → 2.2× faster, 54.6% less time
- 200,000 chars: 0.9309ms vs 1.8639ms → 2× faster, 50.1% less time
- 500,000 chars: 3.6923ms vs 4.5216ms → 1.22× faster, 18.3% less time
- 1,000,000 chars: 6.8072ms vs 9.0189ms → 1.32× faster, 24.5% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0226ms vs 0.0440ms → 1.95× faster, 48.7% less time
- 20,000 chars: 0.0875ms vs 0.1703ms → 1.95× faster, 48.6% less time
- 50,000 chars: 0.2147ms vs 0.4270ms → 1.99× faster, 49.7% less time
- 100,000 chars: 0.4697ms vs 0.9432ms → 2.01× faster, 50.2% less time
- 200,000 chars: 0.9782ms vs 1.8639ms → 1.91× faster, 47.5% less time
- 500,000 chars: 3.3576ms vs 4.5216ms → 1.35× faster, 25.7% less time
- 1,000,000 chars: 7.4409ms vs 9.0189ms → 1.21× faster, 17.5% less time

Render vs micromark:
- 5,000 chars: 0.0277ms vs 9.3757ms → 338.32× faster
- 20,000 chars: 0.0918ms vs 41.05ms → 446.99× faster
- 50,000 chars: 0.2156ms vs 105.71ms → 490.26× faster
- 100,000 chars: 0.4284ms vs 221.45ms → 516.99× faster
- 200,000 chars: 0.9309ms vs 446.50ms → 479.64× faster

Render vs remark+rehype:
- 5,000 chars: 0.0277ms vs 9.7642ms → 352.34× faster
- 20,000 chars: 0.0918ms vs 53.90ms → 587.01× faster
- 50,000 chars: 0.2156ms vs 132.47ms → 614.33× faster
- 100,000 chars: 0.4284ms vs 273.23ms → 637.86× faster
- 200,000 chars: 0.9309ms vs 695.65ms → 747.29× faster

Render vs markdown-exit:
- 5,000 chars: 0.0277ms vs 0.4347ms → 15.69× faster
- 20,000 chars: 0.0918ms vs 1.7581ms → 19.15× faster
- 50,000 chars: 0.2156ms vs 4.4794ms → 20.77× faster
- 100,000 chars: 0.4284ms vs 11.74ms → 27.42× faster
- 200,000 chars: 0.9309ms vs 24.95ms → 26.80× faster
- 500,000 chars: 3.6923ms vs 64.52ms → 17.47× faster
- 1,000,000 chars: 6.8072ms vs 154.01ms → 22.62× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0437ms | 0.2501ms | 5.73× faster, 82.5% less time | 0.1405ms | 0.8334ms | 5.93× faster, 83.1% less time | S5/S5 |
| 20000 | 0.1877ms | 1.0460ms | 5.57× faster, 82.1% less time | 0.6182ms | 3.4725ms | 5.62× faster, 82.2% less time | S5/S5 |
| 50000 | 0.4463ms | 2.6588ms | 5.96× faster, 83.2% less time | 1.5042ms | 8.4800ms | 5.64× faster, 82.3% less time | S5/S5 |
| 100000 | 1.4060ms | 5.7639ms | 4.1× faster, 75.6% less time | 3.5377ms | 17.27ms | 4.88× faster, 79.5% less time | S5/S5 |
| 200000 | 7.9311ms | 17.04ms | 2.15× faster, 53.5% less time | 9.1756ms | 38.13ms | 4.16× faster, 75.9% less time | S5/S5 |
| 500000 | 24.85ms | 50.73ms | 2.04× faster, 51% less time | 49.40ms | 164.64ms | 3.33× faster, 70% less time | S5/S3 |
| 1000000 | 46.81ms | 99.61ms | 2.13× faster, 53% less time | 106.48ms | 372.03ms | 3.49× faster, 71.4% less time | S5/S2 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0437ms | 0.0453ms | 1.04× faster, 3.6% less time | 0.1405ms | 0.0794ms | 1.77× slower, 77% more time | S5/S5 |
| 20000 | 0.1877ms | 0.1744ms | 1.08× slower, 7.7% more time | 0.6182ms | 0.2267ms | 2.73× slower, 172.7% more time | S5/S5 |
| 50000 | 0.4463ms | 0.5544ms | 1.24× faster, 19.5% less time | 1.5042ms | 0.5158ms | 2.92× slower, 191.6% more time | S5/S5 |
| 100000 | 1.4060ms | 1.8898ms | 1.34× faster, 25.6% less time | 3.5377ms | 1.0006ms | 3.54× slower, 253.6% more time | S5/S5 |
| 200000 | 7.9311ms | 3.5698ms | 2.22× slower, 122.2% more time | 9.1756ms | 2.4896ms | 3.69× slower, 268.6% more time | S5/S5 |
| 500000 | 24.85ms | 6.9548ms | 3.57× slower, 257.3% more time | 49.40ms | 6.0808ms | 8.12× slower, 712.4% more time | S5/S3 |
| 1000000 | 46.81ms | 14.31ms | 3.27× slower, 227.2% more time | 106.48ms | 11.94ms | 8.92× slower, 791.5% more time | S5/S2 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0437ms | 0.2512ms | 5.75× faster, 82.6% less time |
| 20000 | 0.1877ms | 0.9965ms | 5.31× faster, 81.2% less time |
| 50000 | 0.4463ms | 2.6136ms | 5.86× faster, 82.9% less time |
| 100000 | 1.4060ms | 5.9896ms | 4.26× faster, 76.5% less time |
| 200000 | 7.9311ms | 11.93ms | 1.5× faster, 33.5% less time |
| 500000 | 24.85ms | 29.07ms | 1.17× faster, 14.5% less time |
| 1000000 | 46.81ms | 59.98ms | 1.28× faster, 22% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0311ms | 0.0452ms | 1.45× faster, 31.2% less time | 0.2529ms |
| 20000 | 0.1188ms | 0.1746ms | 1.47× faster, 32% less time | 0.9972ms |
| 50000 | 0.3044ms | 0.5552ms | 1.82× faster, 45.2% less time | 2.5975ms |
| 100000 | 0.6482ms | 1.0740ms | 1.66× faster, 39.6% less time | 5.1564ms |
| 200000 | 1.2908ms | 2.0491ms | 1.59× faster, 37% less time | 10.25ms |
| 500000 | 3.4646ms | 5.1954ms | 1.5× faster, 33.3% less time | 26.34ms |
| 1000000 | 8.1568ms | 12.36ms | 1.52× faster, 34% less time | 53.38ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.2614ms | 0.2510ms |
| @ox-content/napi (parse only) | 0.0452ms | 0.0445ms |
| markdown-exit | 0.4543ms | 0.3949ms |
| markdown-it (baseline) | 0.2778ms | 0.3626ms |
| markdown-it-ts (stream+chunk) | 0.2502ms | 0.2326ms |
| micromark (parse only) | 8.6872ms | 8.0874ms |
| remark (parse only) | 9.0622ms | 9.0103ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.9829ms | 0.9808ms |
| @ox-content/napi (parse only) | 0.1782ms | 0.1785ms |
| markdown-exit | 1.6142ms | 1.5689ms |
| markdown-it (baseline) | 1.4149ms | 1.2032ms |
| markdown-it-ts (stream+chunk) | 1.9083ms | 1.1124ms |
| micromark (parse only) | 42.00ms | 32.92ms |
| remark (parse only) | 44.06ms | 38.59ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 2.6338ms | 2.5599ms |
| @ox-content/napi (parse only) | 0.5455ms | 0.5439ms |
| markdown-exit | 3.7563ms | 4.0997ms |
| markdown-it (baseline) | 2.8069ms | 2.6730ms |
| markdown-it-ts (stream+chunk) | 2.3056ms | 2.5914ms |
| micromark (parse only) | 82.81ms | 87.20ms |
| remark (parse only) | 119.80ms | 110.32ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 5.0833ms | 5.0742ms |
| @ox-content/napi (parse only) | 1.1277ms | 1.0749ms |
| markdown-exit | 9.6083ms | 10.86ms |
| markdown-it (baseline) | 5.5084ms | 8.6099ms |
| markdown-it-ts (stream+chunk) | 6.6020ms | 6.3982ms |
| micromark (parse only) | 260.62ms | 177.52ms |
| remark (parse only) | 210.67ms | 244.59ms |
