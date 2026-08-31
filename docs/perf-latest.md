# Performance Report (latest run)

## Environment

- Generated at: 2026-08-31T04:31:21.680Z
- Node.js: v24.16.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: 1402ce84aac4ce5ade1eec4c5e73dacdb7a6cf97

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
| 5,011 | 0.0568ms | 0.1866ms | 0.0423ms | stock-fast | 0.0203ms | 0.2329ms | 0.0387ms | stock-fast | no |
| 20,085 | 0.1201ms | 0.7374ms | 0.1642ms | stock-fast | 0.0727ms | 0.9124ms | 0.1515ms | stock-fast | no |
| 50,084 | 0.2928ms | 1.8966ms | 0.4688ms | stock-fast | 0.1770ms | 2.3784ms | 0.3699ms | stock-fast | no |
| 100,126 | 0.6750ms | 4.1105ms | 0.8743ms | stock-fast | 0.3554ms | 4.8710ms | 0.7727ms | stock-fast | no |
| 200,073 | 1.1269ms | 8.3174ms | 1.7322ms | stock-fast | 0.7105ms | 11.07ms | 1.5355ms | stock-fast | no |
| 500,121 | 4.8750ms | 24.63ms | 4.2117ms | stock-fast | 2.3781ms | 31.12ms | 3.7333ms | stock-fast | no |
| 1,000,068 | 15.48ms | 55.34ms | 11.26ms | stock-fast | 5.0370ms | 73.40ms | 7.4867ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2380ms | 0.2774ms | 0.0580ms | general | 0.3420ms | 0.3920ms | 0.0719ms | token-renderer | no |
| 20,125 | 0.8635ms | 1.3640ms | 0.2502ms | general | 0.9901ms | 1.3582ms | 0.2045ms | token-renderer | no |
| 50,025 | 2.0768ms | 2.5250ms | 0.5825ms | general | 2.4182ms | 3.2907ms | 0.5072ms | token-renderer | no |
| 100,450 | 4.2204ms | 5.5621ms | 1.1340ms | general | 5.2094ms | 6.9108ms | 1.0337ms | token-renderer | no |
| 200,109 | 10.12ms | 11.39ms | 2.2037ms | full-chunk | 11.26ms | 14.13ms | 1.9977ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0853ms | 0.1326ms | 0.0333ms | general | 0.1017ms | 0.1497ms | 0.0257ms | token-renderer | no |
| docs/development.md | 4,756 | 0.1010ms | 0.1344ms | 0.0307ms | general | 0.1194ms | 0.1560ms | 0.0268ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0283ms | 0.0346ms | 0.0092ms | general | 0.0325ms | 0.0420ms | 0.0084ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.2284ms | 0.1638ms | 0.2022ms | 0.1965ms | 0.0660ms | 0.1908ms | 0.2896ms | **0.0431ms** | 0.1827ms | 3.4391ms | 0.6402ms | 0.3211ms | 0.3124ms | 0.5976ms | 0.1528ms | 0.6458ms | 0.8664ms | **0.0645ms** | 0.1992ms | 10.69ms | 1.8201ms | 0.4818ms | 0.4864ms | 1.6651ms | 0.8312ms | 1.8756ms | 2.5184ms | **0.0990ms** | 0.2403ms | 31.24ms | 0.1979ms | 0.1790ms | 0.1914ms | 0.1999ms | 0.2177ms | 0.2648ms | 0.4397ms | **0.0434ms** | 0.1758ms | 3.2272ms |
| 20000 | 0.7784ms | 0.6135ms | 0.7746ms | 0.7589ms | 0.2130ms | 0.7542ms | 1.0695ms | **0.1637ms** | 0.7255ms | 16.89ms | 2.6861ms | 0.9646ms | 1.0791ms | 2.5295ms | 0.5430ms | 2.5974ms | 3.8743ms | **0.2008ms** | 0.7518ms | 54.91ms | 7.1553ms | 1.5114ms | 1.4142ms | 7.2253ms | 3.0837ms | 7.0964ms | 10.32ms | **0.2422ms** | 0.8117ms | 146.00ms | 0.8204ms | 0.5974ms | 0.7346ms | 0.8612ms | 0.7530ms | 0.7297ms | 1.0188ms | **0.1724ms** | 0.7193ms | 16.28ms |
| 50000 | 1.9290ms | 1.5316ms | 1.9070ms | 1.9032ms | **0.4065ms** | 1.8855ms | 2.9695ms | 0.4297ms | 1.8025ms | 46.02ms | 6.7119ms | 2.6604ms | 2.7805ms | 6.4921ms | 1.1559ms | 6.4415ms | 8.7916ms | **0.4874ms** | 1.8541ms | 146.98ms | 18.12ms | 3.3163ms | 3.2746ms | 17.76ms | 2.9378ms | 18.90ms | 23.87ms | **0.5291ms** | 1.9288ms | 391.20ms | 2.0632ms | 1.4874ms | 1.9318ms | 1.8721ms | 1.7476ms | 2.3366ms | 2.6571ms | **0.4340ms** | 1.7987ms | 42.92ms |
| 100000 | 4.0344ms | 3.1303ms | 4.4068ms | 3.9911ms | **0.7334ms** | 3.8097ms | 5.2725ms | 0.8513ms | 3.5717ms | 91.76ms | 13.50ms | 5.2359ms | 5.1880ms | 13.29ms | 2.0661ms | 12.94ms | 17.22ms | **0.9191ms** | 3.6221ms | 313.72ms | 36.52ms | 6.6221ms | 8.8055ms | 35.99ms | 6.2149ms | 36.09ms | 48.66ms | **0.9970ms** | 3.7761ms | 1109.80ms | 4.1019ms | 2.9946ms | 5.9920ms | 3.8081ms | 3.8056ms | 4.0829ms | 5.3973ms | **0.8275ms** | 3.6020ms | 92.19ms |
| 200000 | 8.6335ms | 9.5947ms | 12.48ms | 8.9418ms | 1.7653ms | 9.3896ms | 11.58ms | **1.6908ms** | 7.0895ms | 178.93ms | 27.91ms | 14.92ms | 9.9071ms | 30.38ms | 5.1937ms | 28.03ms | 36.85ms | **1.9291ms** | 7.3644ms | 1165.65ms | 79.08ms | 13.03ms | 46.73ms | 90.22ms | 13.29ms | 72.52ms | 98.23ms | **1.9356ms** | 7.3384ms | 2879.57ms | 8.0783ms | 6.6939ms | 8.8385ms | 8.0015ms | 9.3796ms | 7.6536ms | 10.64ms | **1.6741ms** | 7.0408ms | 190.70ms |
| 500000 | 28.42ms | 43.17ms | 23.19ms | 23.30ms | 5.9825ms | 35.65ms | 33.75ms | **4.5609ms** | 19.92ms | - | 68.86ms | 34.11ms | 39.61ms | 67.68ms | 13.99ms | 85.93ms | 106.35ms | **5.2818ms** | 18.61ms | - | 219.14ms | 155.85ms | 33.11ms | 192.51ms | 58.98ms | 234.81ms | 572.85ms | **5.0970ms** | 25.23ms | - | 32.51ms | 25.90ms | 19.76ms | 23.49ms | 24.41ms | 32.47ms | 29.13ms | **8.9168ms** | 72.80ms | - |
| 1000000 | 52.66ms | 49.73ms | 57.22ms | 48.21ms | 19.03ms | 49.82ms | 66.43ms | **12.32ms** | 40.38ms | - | 226.60ms | 58.34ms | 73.48ms | 160.59ms | 41.45ms | 171.30ms | 205.10ms | **9.8582ms** | 61.86ms | - | 494.22ms | 83.46ms | 119.11ms | 422.18ms | 145.83ms | 480.95ms | 711.49ms | **15.01ms** | 39.43ms | - | 47.76ms | 75.69ms | 44.02ms | 70.93ms | 54.94ms | 51.59ms | 74.61ms | **17.69ms** | 43.54ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0660ms (stream OFF, chunk OFF)
- 20000: S5 0.2130ms (stream OFF, chunk OFF)
- 50000: S5 0.4065ms (stream OFF, chunk OFF)
- 100000: S5 0.7334ms (stream OFF, chunk OFF)
- 200000: S5 1.7653ms (stream OFF, chunk OFF)
- 500000: S5 5.9825ms (stream OFF, chunk OFF)
- 1000000: S5 19.03ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.1528ms (stream OFF, chunk OFF)
- 20000: S5 0.5430ms (stream OFF, chunk OFF)
- 50000: S5 1.1559ms (stream OFF, chunk OFF)
- 100000: S5 2.0661ms (stream OFF, chunk OFF)
- 200000: S5 5.1937ms (stream OFF, chunk OFF)
- 500000: S5 13.99ms (stream OFF, chunk OFF)
- 1000000: S5 41.45ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S2 0.4818ms (stream ON, cache ON, chunk OFF)
- 20000: S3 1.4142ms (stream ON, cache ON, chunk ON)
- 50000: S5 2.9378ms (stream OFF, chunk OFF)
- 100000: S5 6.2149ms (stream OFF, chunk OFF)
- 200000: S2 13.03ms (stream ON, cache ON, chunk OFF)
- 500000: S3 33.11ms (stream ON, cache ON, chunk ON)
- 1000000: S2 83.46ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S2 0.1790ms (stream ON, cache ON, chunk OFF)
- 20000: S2 0.5974ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.4874ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.9946ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.6939ms (stream ON, cache ON, chunk OFF)
- 500000: S3 19.76ms (stream ON, cache ON, chunk ON)
- 1000000: S3 44.02ms (stream ON, cache ON, chunk ON)

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
| 5000 | 0.0217ms | 0.0187ms | 0.2357ms | 0.0382ms | 4.1373ms | 5.1046ms | 0.3052ms |
| 20000 | 0.0725ms | 0.0711ms | 0.9361ms | 0.1521ms | 19.53ms | 23.44ms | 1.2117ms |
| 50000 | 0.1773ms | 0.1756ms | 2.3663ms | 0.3792ms | 55.59ms | 77.08ms | 3.0686ms |
| 100000 | 0.3516ms | 0.3531ms | 5.3570ms | 0.7985ms | 120.96ms | 171.05ms | 6.6713ms |
| 200000 | 0.6937ms | 0.6976ms | 10.42ms | 1.5131ms | 220.28ms | 403.77ms | 13.29ms |
| 500000 | 2.3987ms | 2.3754ms | 31.83ms | 3.7692ms | - | - | 38.85ms |
| 1000000 | 4.9890ms | 5.0112ms | 70.33ms | 7.5376ms | - | - | 83.01ms |

Render vs markdown-it:
- 5,000 chars: 0.0217ms vs 0.2357ms → 10.85× faster
- 20,000 chars: 0.0725ms vs 0.9361ms → 12.92× faster
- 50,000 chars: 0.1773ms vs 2.3663ms → 13.35× faster
- 100,000 chars: 0.3516ms vs 5.3570ms → 15.24× faster
- 200,000 chars: 0.6937ms vs 10.42ms → 15.03× faster
- 500,000 chars: 2.3987ms vs 31.83ms → 13.27× faster
- 1,000,000 chars: 4.9890ms vs 70.33ms → 14.10× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0217ms vs 0.0382ms → 1.76× faster, 43.1% less time
- 20,000 chars: 0.0725ms vs 0.1521ms → 2.1× faster, 52.4% less time
- 50,000 chars: 0.1773ms vs 0.3792ms → 2.14× faster, 53.2% less time
- 100,000 chars: 0.3516ms vs 0.7985ms → 2.27× faster, 56% less time
- 200,000 chars: 0.6937ms vs 1.5131ms → 2.18× faster, 54.2% less time
- 500,000 chars: 2.3987ms vs 3.7692ms → 1.57× faster, 36.4% less time
- 1,000,000 chars: 4.9890ms vs 7.5376ms → 1.51× faster, 33.8% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0187ms vs 0.0382ms → 2.04× faster, 50.9% less time
- 20,000 chars: 0.0711ms vs 0.1521ms → 2.14× faster, 53.2% less time
- 50,000 chars: 0.1756ms vs 0.3792ms → 2.16× faster, 53.7% less time
- 100,000 chars: 0.3531ms vs 0.7985ms → 2.26× faster, 55.8% less time
- 200,000 chars: 0.6976ms vs 1.5131ms → 2.17× faster, 53.9% less time
- 500,000 chars: 2.3754ms vs 3.7692ms → 1.59× faster, 37% less time
- 1,000,000 chars: 5.0112ms vs 7.5376ms → 1.5× faster, 33.5% less time

Render vs micromark:
- 5,000 chars: 0.0217ms vs 4.1373ms → 190.45× faster
- 20,000 chars: 0.0725ms vs 19.53ms → 269.52× faster
- 50,000 chars: 0.1773ms vs 55.59ms → 313.60× faster
- 100,000 chars: 0.3516ms vs 120.96ms → 344.06× faster
- 200,000 chars: 0.6937ms vs 220.28ms → 317.56× faster

Render vs remark+rehype:
- 5,000 chars: 0.0217ms vs 5.1046ms → 234.98× faster
- 20,000 chars: 0.0725ms vs 23.44ms → 323.53× faster
- 50,000 chars: 0.1773ms vs 77.08ms → 434.82× faster
- 100,000 chars: 0.3516ms vs 171.05ms → 486.55× faster
- 200,000 chars: 0.6937ms vs 403.77ms → 582.08× faster

Render vs markdown-exit:
- 5,000 chars: 0.0217ms vs 0.3052ms → 14.05× faster
- 20,000 chars: 0.0725ms vs 1.2117ms → 16.72× faster
- 50,000 chars: 0.1773ms vs 3.0686ms → 17.31× faster
- 100,000 chars: 0.3516ms vs 6.6713ms → 18.98× faster
- 200,000 chars: 0.6937ms vs 13.29ms → 19.15× faster
- 500,000 chars: 2.3987ms vs 38.85ms → 16.20× faster
- 1,000,000 chars: 4.9890ms vs 83.01ms → 16.64× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0660ms | 0.1908ms | 2.89× faster, 65.4% less time | 0.1528ms | 0.6458ms | 4.23× faster, 76.3% less time | S5/S5 |
| 20000 | 0.2130ms | 0.7542ms | 3.54× faster, 71.8% less time | 0.5430ms | 2.5974ms | 4.78× faster, 79.1% less time | S5/S5 |
| 50000 | 0.4065ms | 1.8855ms | 4.64× faster, 78.4% less time | 1.1559ms | 6.4415ms | 5.57× faster, 82.1% less time | S5/S5 |
| 100000 | 0.7334ms | 3.8097ms | 5.19× faster, 80.7% less time | 2.0661ms | 12.94ms | 6.26× faster, 84% less time | S5/S5 |
| 200000 | 1.7653ms | 9.3896ms | 5.32× faster, 81.2% less time | 5.1937ms | 28.03ms | 5.4× faster, 81.5% less time | S5/S5 |
| 500000 | 5.9825ms | 35.65ms | 5.96× faster, 83.2% less time | 13.99ms | 85.93ms | 6.14× faster, 83.7% less time | S5/S5 |
| 1000000 | 19.03ms | 49.82ms | 2.62× faster, 61.8% less time | 41.45ms | 171.30ms | 4.13× faster, 75.8% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0660ms | 0.0431ms | 1.53× slower, 53.2% more time | 0.1528ms | 0.0645ms | 2.37× slower, 136.8% more time | S5/S5 |
| 20000 | 0.2130ms | 0.1637ms | 1.3× slower, 30.1% more time | 0.5430ms | 0.2008ms | 2.7× slower, 170.4% more time | S5/S5 |
| 50000 | 0.4065ms | 0.4297ms | 1.06× faster, 5.4% less time | 1.1559ms | 0.4874ms | 2.37× slower, 137.2% more time | S5/S5 |
| 100000 | 0.7334ms | 0.8513ms | 1.16× faster, 13.8% less time | 2.0661ms | 0.9191ms | 2.25× slower, 124.8% more time | S5/S5 |
| 200000 | 1.7653ms | 1.6908ms | 1.04× slower, 4.4% more time | 5.1937ms | 1.9291ms | 2.69× slower, 169.2% more time | S5/S5 |
| 500000 | 5.9825ms | 4.5609ms | 1.31× slower, 31.2% more time | 13.99ms | 5.2818ms | 2.65× slower, 164.8% more time | S5/S5 |
| 1000000 | 19.03ms | 12.32ms | 1.54× slower, 54.5% more time | 41.45ms | 9.8582ms | 4.21× slower, 320.5% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0660ms | 0.1827ms | 2.77× faster, 63.9% less time |
| 20000 | 0.2130ms | 0.7255ms | 3.41× faster, 70.6% less time |
| 50000 | 0.4065ms | 1.8025ms | 4.43× faster, 77.4% less time |
| 100000 | 0.7334ms | 3.5717ms | 4.87× faster, 79.5% less time |
| 200000 | 1.7653ms | 7.0895ms | 4.02× faster, 75.1% less time |
| 500000 | 5.9825ms | 19.92ms | 3.33× faster, 70% less time |
| 1000000 | 19.03ms | 40.38ms | 2.12× faster, 52.9% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0253ms | 0.0421ms | 1.67× faster, 40% less time | 0.1864ms |
| 20000 | 0.0856ms | 0.1676ms | 1.96× faster, 48.9% less time | 0.7382ms |
| 50000 | 0.2213ms | 0.4462ms | 2.02× faster, 50.4% less time | 1.9473ms |
| 100000 | 0.9534ms | 2.5608ms | 2.69× faster, 62.8% less time | 3.7705ms |
| 200000 | 0.8367ms | 1.6981ms | 2.03× faster, 50.7% less time | 7.2637ms |
| 500000 | 2.0791ms | 4.2692ms | 2.05× faster, 51.3% less time | 18.49ms |
| 1000000 | 4.4975ms | 11.07ms | 2.46× faster, 59.4% less time | 40.90ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1799ms | 0.1799ms |
| @ox-content/napi (parse only) | 0.0465ms | 0.0418ms |
| markdown-exit | 0.2810ms | 0.2456ms |
| markdown-it (baseline) | 0.2035ms | 0.1870ms |
| markdown-it-ts (stream+chunk) | 0.2654ms | 0.2574ms |
| micromark (parse only) | 4.2228ms | 4.0675ms |
| remark (parse only) | 5.9033ms | 4.4642ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.7161ms | 0.7095ms |
| @ox-content/napi (parse only) | 0.1690ms | 0.1644ms |
| markdown-exit | 1.0779ms | 0.9821ms |
| markdown-it (baseline) | 0.7636ms | 0.7604ms |
| markdown-it-ts (stream+chunk) | 0.8210ms | 0.7414ms |
| micromark (parse only) | 15.78ms | 18.01ms |
| remark (parse only) | 20.47ms | 22.58ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.8277ms | 2.1464ms |
| @ox-content/napi (parse only) | 0.4365ms | 0.4378ms |
| markdown-exit | 2.4909ms | 2.9154ms |
| markdown-it (baseline) | 1.7881ms | 2.0018ms |
| markdown-it-ts (stream+chunk) | 1.8517ms | 2.0299ms |
| micromark (parse only) | 44.32ms | 47.60ms |
| remark (parse only) | 62.51ms | 64.78ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.6139ms | 3.6053ms |
| @ox-content/napi (parse only) | 0.8606ms | 0.8698ms |
| markdown-exit | 5.0458ms | 5.3329ms |
| markdown-it (baseline) | 3.6969ms | 4.4164ms |
| markdown-it-ts (stream+chunk) | 3.9625ms | 4.2314ms |
| micromark (parse only) | 99.42ms | 99.65ms |
| remark (parse only) | 152.68ms | 150.77ms |
