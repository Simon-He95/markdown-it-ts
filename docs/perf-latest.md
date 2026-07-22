# Performance Report (latest run)

## Environment

- Generated at: 2026-07-22T15:50:34.628Z
- Node.js: v24.18.0
- Platform: darwin arm64
- CPU: Apple M1 Pro
- CPU count: 10
- Commit: bc174e23106bba78024095f6adb4bcadc3f8aced

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
| 5,011 | 0.0448ms | 0.1419ms | 0.0296ms | stock-fast | 0.0141ms | 0.1803ms | 0.0285ms | stock-fast | no |
| 20,085 | 0.0980ms | 0.5769ms | 0.1259ms | stock-fast | 0.0565ms | 0.7150ms | 0.1144ms | stock-fast | no |
| 50,084 | 0.2838ms | 1.4517ms | 0.3793ms | stock-fast | 0.1363ms | 1.8133ms | 0.2966ms | stock-fast | no |
| 100,126 | 0.6125ms | 3.0867ms | 0.7877ms | stock-fast | 0.2738ms | 3.7987ms | 0.6829ms | stock-fast | no |
| 200,073 | 0.9987ms | 6.7966ms | 1.7040ms | stock-fast | 0.5387ms | 8.5478ms | 1.4054ms | stock-fast | no |
| 500,121 | 4.1569ms | 22.63ms | 4.1628ms | stock-fast | 1.9071ms | 25.02ms | 3.7955ms | stock-fast | no |
| 1,000,068 | 13.02ms | 47.18ms | 7.5431ms | stock-fast | 3.8781ms | 59.29ms | 6.9144ms | stock-fast | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Section 0</h2>\n<p>Lorem ipsum dolor sit amet, consectetur a`
- @ox-content/napi: `<h2 id="section-0">Section 0</h2>\n<p>Lorem ipsum dolor sit amet`

### Synthetic feature-mixed

A high-density synthetic mix of emphasis, strong text, links, images, inline code, ordered and nested lists, blockquotes, tables, strikethrough, thematic breaks, escapes, and fenced code.
Section text and URLs vary by index to avoid repeated-output cache bias; feature frequency is intentionally uniform and is not a claim about natural Markdown distributions.

| Actual chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| 5,193 | 0.2102ms | 0.2097ms | 0.0453ms | general | 0.2159ms | 0.2637ms | 0.0357ms | token-renderer | no |
| 20,125 | 0.6894ms | 0.7745ms | 0.1474ms | general | 0.8024ms | 0.9893ms | 0.1316ms | token-renderer | no |
| 50,025 | 1.7053ms | 1.9402ms | 0.4358ms | general | 1.9824ms | 2.4905ms | 0.3321ms | token-renderer | no |
| 100,450 | 3.7521ms | 4.2367ms | 0.8735ms | general | 4.4439ms | 5.2845ms | 0.8063ms | token-renderer | no |
| 200,109 | 8.8634ms | 8.8640ms | 1.8473ms | full-chunk | 9.9551ms | 11.34ms | 1.7527ms | token-renderer | no |

First recorded HTML difference at index 3:

- markdown-it-ts: `<h2>Feature section 0</h2>\n<p>Paragraph 0 uses <em>emphasis</em`
- @ox-content/napi: `<h2 id="feature-section-0">Feature section 0</h2>\n<p>Paragraph `

### Repository-owned real-world documents

Each MIT-licensed document is measured independently; files are not concatenated and no aggregate winner is calculated.

| File | Chars | TS parse | markdown-it parse | OX parse | TS parse path | TS render | markdown-it render | OX render | TS render path | HTML equal? |
|:--|---:|---:|---:|---:|:--|---:|---:|---:|:--|:--|
| docs/architecture.md | 6,564 | 0.0929ms | 0.1026ms | 0.0209ms | general | 0.1040ms | 0.1155ms | 0.0151ms | token-renderer | no |
| docs/development.md | 4,756 | 0.0987ms | 0.1040ms | 0.0206ms | general | 0.1120ms | 0.1192ms | 0.0173ms | token-renderer | no |
| docs/security.md | 1,375 | 0.0259ms | 0.0280ms | 0.0063ms | general | 0.0298ms | 0.0327ms | 0.0058ms | token-renderer | no |

Render rows compare each library's native renderer behavior. A `no` in “HTML equal?” means the row must not be described as equivalent-output work; common differences include heading IDs and renderer-specific attributes/tags.

## Tuned / best-of stock-subset matrix

The matrix below is the specialized `stock-subset` workload. S1–S5 are markdown-it-ts tuning scenarios; external rows use their native output shapes. This section is not the fixed-configuration headline and is not equivalent-output work.

Default API note: normal `md.parse(src)` / `md.render(src)` calls may auto-activate an internal large-input path for very large finite strings only when no plugin has been installed and parser rulers have not been modified. Explicit chunk-stream APIs such as `parseIterable` / `UnboundedBuffer` are advanced tools for sources that already arrive as chunks.
External parser rows use each library's native output shape; this matrix compares throughput, not byte-for-byte output compatibility. `OXJ` adds `JSON.parse` on top of @ox-content/napi's AST JSON string to show the cost of materializing a JavaScript object tree.

| Size (chars) | S1 one | S2 one | S3 one | S4 one | S5 one | M1 one | E1 one | OX1 one | OXJ one | MM1 one | S1 append(par) | S2 append(par) | S3 append(par) | S4 append(par) | S5 append(par) | M1 append(par) | E1 append(par) | OX1 append(par) | OXJ append(par) | MM1 append(par) | S1 append(line) | S2 append(line) | S3 append(line) | S4 append(line) | S5 append(line) | M1 append(line) | E1 append(line) | OX1 append(line) | OXJ append(line) | MM1 append(line) | S1 replace | S2 replace | S3 replace | S4 replace | S5 replace | M1 replace | E1 replace | OX1 replace | OXJ replace | MM1 replace |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5000 | 0.1741ms | 0.1291ms | 0.1625ms | 0.1583ms | 0.0314ms | 0.1460ms | 0.1986ms | **0.0304ms** | 0.1367ms | 2.4432ms | 0.5095ms | 0.2372ms | 0.2108ms | 0.4646ms | 0.0825ms | 0.4547ms | 0.6401ms | **0.0458ms** | 0.1669ms | 7.7842ms | 1.4553ms | 0.3702ms | 0.3449ms | 1.3403ms | 0.4933ms | 1.3628ms | 1.8911ms | **0.0718ms** | 0.1860ms | 22.65ms | 0.1837ms | 0.1515ms | 0.1535ms | 0.1635ms | 0.1460ms | 0.1540ms | 0.2321ms | **0.0295ms** | 0.1457ms | 2.5331ms |
| 20000 | 0.6237ms | 0.5144ms | 0.6262ms | 0.6288ms | **0.0985ms** | 0.5863ms | 0.7924ms | 0.1180ms | 0.5493ms | 13.73ms | 2.1184ms | 1.2063ms | 0.7874ms | 2.1735ms | 0.3367ms | 2.0097ms | 2.6730ms | **0.1450ms** | 0.5797ms | 38.86ms | 5.8357ms | 1.1030ms | 0.9305ms | 5.8448ms | 1.8314ms | 5.4832ms | 7.4735ms | **0.1718ms** | 0.6281ms | 111.04ms | 0.6523ms | 0.5139ms | 0.6232ms | 0.6044ms | 0.5550ms | 0.5945ms | 0.8096ms | **0.1265ms** | 0.5611ms | 13.07ms |
| 50000 | 1.6230ms | 1.2418ms | 1.5733ms | 1.5837ms | **0.2480ms** | 1.4660ms | 1.9458ms | 0.3277ms | 1.4054ms | 38.63ms | 5.6191ms | 1.5769ms | 1.6858ms | 5.4106ms | 0.9605ms | 5.1404ms | 6.8472ms | **0.3732ms** | 1.4654ms | 121.53ms | 15.10ms | 2.2480ms | 2.1872ms | 14.64ms | 2.5190ms | 13.75ms | 18.40ms | **0.3793ms** | 1.4820ms | 326.16ms | 1.6054ms | 1.2913ms | 1.5470ms | 1.5862ms | 1.4111ms | 1.4206ms | 1.9555ms | **0.3502ms** | 1.4003ms | 37.24ms |
| 100000 | 3.3094ms | 2.7127ms | 3.5230ms | 3.3898ms | **0.5893ms** | 3.0054ms | 4.2022ms | 0.7226ms | 2.8743ms | 80.37ms | 11.14ms | 4.0779ms | 3.6117ms | 11.34ms | 2.0518ms | 10.13ms | 14.06ms | **0.7109ms** | 3.2262ms | 258.95ms | 31.11ms | 4.7769ms | 4.4464ms | 30.51ms | 4.9760ms | 27.81ms | 37.42ms | **0.7770ms** | 3.2074ms | 741.17ms | 3.4082ms | 2.5722ms | 3.2951ms | 3.3156ms | 3.1383ms | 2.9913ms | 3.9579ms | **0.7549ms** | 2.9425ms | 81.89ms |
| 200000 | 7.1109ms | 6.0793ms | 7.1568ms | 7.1148ms | **1.6233ms** | 7.3875ms | 9.5993ms | 1.6315ms | 6.0181ms | 160.88ms | 23.26ms | 8.4476ms | 7.6374ms | 22.90ms | 4.4177ms | 23.09ms | 29.60ms | **1.8756ms** | 6.1578ms | 559.52ms | 61.62ms | 9.8080ms | 9.9943ms | 62.24ms | 12.92ms | 58.26ms | 79.65ms | **1.5353ms** | 6.0360ms | 1503.20ms | 6.9627ms | 6.2108ms | 6.3106ms | 6.8649ms | 7.9087ms | 6.1320ms | 8.6725ms | **1.7376ms** | 5.8547ms | 155.01ms |
| 500000 | 18.78ms | 18.52ms | 19.81ms | 21.30ms | 4.4061ms | 22.71ms | 27.83ms | **3.9737ms** | 14.70ms | - | 57.29ms | 24.59ms | 23.66ms | 57.57ms | 13.71ms | 67.95ms | 86.26ms | **4.2294ms** | 15.14ms | - | 159.55ms | 27.42ms | 27.10ms | 161.47ms | 57.35ms | 195.27ms | 218.05ms | **4.1787ms** | 17.70ms | - | 18.42ms | 18.44ms | 20.44ms | 17.96ms | 20.53ms | 21.51ms | 24.14ms | **5.2887ms** | 14.73ms | - |
| 1000000 | 39.94ms | 42.78ms | 42.23ms | 43.03ms | 14.54ms | 42.75ms | 51.88ms | **8.3271ms** | 28.77ms | - | 137.17ms | 50.60ms | 47.30ms | 128.79ms | 33.56ms | 153.16ms | 166.95ms | **8.8796ms** | 32.66ms | - | 354.31ms | 52.14ms | 56.50ms | 356.23ms | 89.34ms | 437.32ms | 460.35ms | **9.5581ms** | 33.74ms | - | 52.06ms | 41.10ms | 44.07ms | 40.10ms | 47.76ms | 39.30ms | 57.29ms | **7.4787ms** | 31.52ms | - |

Best markdown-it-ts configuration (one-shot) per size:
- 5000: S5 0.0314ms (stream OFF, chunk OFF)
- 20000: S5 0.0985ms (stream OFF, chunk OFF)
- 50000: S5 0.2480ms (stream OFF, chunk OFF)
- 100000: S5 0.5893ms (stream OFF, chunk OFF)
- 200000: S5 1.6233ms (stream OFF, chunk OFF)
- 500000: S5 4.4061ms (stream OFF, chunk OFF)
- 1000000: S5 14.54ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (append workload) per size:
- 5000: S5 0.0825ms (stream OFF, chunk OFF)
- 20000: S5 0.3367ms (stream OFF, chunk OFF)
- 50000: S5 0.9605ms (stream OFF, chunk OFF)
- 100000: S5 2.0518ms (stream OFF, chunk OFF)
- 200000: S5 4.4177ms (stream OFF, chunk OFF)
- 500000: S5 13.71ms (stream OFF, chunk OFF)
- 1000000: S5 33.56ms (stream OFF, chunk OFF)

Best markdown-it-ts configuration (line-append workload) per size:
- 5000: S3 0.3449ms (stream ON, cache ON, chunk ON)
- 20000: S3 0.9305ms (stream ON, cache ON, chunk ON)
- 50000: S3 2.1872ms (stream ON, cache ON, chunk ON)
- 100000: S3 4.4464ms (stream ON, cache ON, chunk ON)
- 200000: S2 9.8080ms (stream ON, cache ON, chunk OFF)
- 500000: S3 27.10ms (stream ON, cache ON, chunk ON)
- 1000000: S2 52.14ms (stream ON, cache ON, chunk OFF)

Best markdown-it-ts configuration (replace-paragraph workload) per size:
- 5000: S5 0.1460ms (stream OFF, chunk OFF)
- 20000: S2 0.5139ms (stream ON, cache ON, chunk OFF)
- 50000: S2 1.2913ms (stream ON, cache ON, chunk OFF)
- 100000: S2 2.5722ms (stream ON, cache ON, chunk OFF)
- 200000: S2 6.2108ms (stream ON, cache ON, chunk OFF)
- 500000: S4 17.96ms (stream OFF, chunk ON)
- 1000000: S4 40.10ms (stream OFF, chunk ON)

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
| 5000 | 0.0168ms | 0.0145ms | 0.1875ms | 0.0288ms | 3.3405ms | 4.1402ms | 0.2412ms |
| 20000 | 0.0555ms | 0.0573ms | 0.7291ms | 0.1388ms | 15.24ms | 18.80ms | 0.9254ms |
| 50000 | 0.1359ms | 0.1367ms | 1.8166ms | 0.3011ms | 45.63ms | 59.81ms | 2.3473ms |
| 100000 | 0.2714ms | 0.2728ms | 3.8918ms | 0.6589ms | 93.06ms | 133.96ms | 4.8490ms |
| 200000 | 0.5384ms | 0.5336ms | 8.6381ms | 1.4487ms | 185.84ms | 330.55ms | 10.92ms |
| 500000 | 1.9236ms | 1.9071ms | 27.16ms | 3.6143ms | - | - | 34.64ms |
| 1000000 | 3.9449ms | 3.9098ms | 54.80ms | 6.9359ms | - | - | 70.11ms |

Render vs markdown-it:
- 5,000 chars: 0.0168ms vs 0.1875ms → 11.19× faster
- 20,000 chars: 0.0555ms vs 0.7291ms → 13.13× faster
- 50,000 chars: 0.1359ms vs 1.8166ms → 13.37× faster
- 100,000 chars: 0.2714ms vs 3.8918ms → 14.34× faster
- 200,000 chars: 0.5384ms vs 8.6381ms → 16.05× faster
- 500,000 chars: 1.9236ms vs 27.16ms → 14.12× faster
- 1,000,000 chars: 3.9449ms vs 54.80ms → 13.89× faster

Render vs @ox-content/napi:
- 5,000 chars: 0.0168ms vs 0.0288ms → 1.72× faster, 41.8% less time
- 20,000 chars: 0.0555ms vs 0.1388ms → 2.5× faster, 60% less time
- 50,000 chars: 0.1359ms vs 0.3011ms → 2.22× faster, 54.9% less time
- 100,000 chars: 0.2714ms vs 0.6589ms → 2.43× faster, 58.8% less time
- 200,000 chars: 0.5384ms vs 1.4487ms → 2.69× faster, 62.8% less time
- 500,000 chars: 1.9236ms vs 3.6143ms → 1.88× faster, 46.8% less time
- 1,000,000 chars: 3.9449ms vs 6.9359ms → 1.76× faster, 43.1% less time

RenderAsync vs @ox-content/napi:
- 5,000 chars: 0.0145ms vs 0.0288ms → 1.99× faster, 49.7% less time
- 20,000 chars: 0.0573ms vs 0.1388ms → 2.42× faster, 58.7% less time
- 50,000 chars: 0.1367ms vs 0.3011ms → 2.2× faster, 54.6% less time
- 100,000 chars: 0.2728ms vs 0.6589ms → 2.42× faster, 58.6% less time
- 200,000 chars: 0.5336ms vs 1.4487ms → 2.72× faster, 63.2% less time
- 500,000 chars: 1.9071ms vs 3.6143ms → 1.9× faster, 47.2% less time
- 1,000,000 chars: 3.9098ms vs 6.9359ms → 1.77× faster, 43.6% less time

Render vs micromark:
- 5,000 chars: 0.0168ms vs 3.3405ms → 199.36× faster
- 20,000 chars: 0.0555ms vs 15.24ms → 274.37× faster
- 50,000 chars: 0.1359ms vs 45.63ms → 335.76× faster
- 100,000 chars: 0.2714ms vs 93.06ms → 342.88× faster
- 200,000 chars: 0.5384ms vs 185.84ms → 345.19× faster

Render vs remark+rehype:
- 5,000 chars: 0.0168ms vs 4.1402ms → 247.08× faster
- 20,000 chars: 0.0555ms vs 18.80ms → 338.55× faster
- 50,000 chars: 0.1359ms vs 59.81ms → 440.04× faster
- 100,000 chars: 0.2714ms vs 133.96ms → 493.59× faster
- 200,000 chars: 0.5384ms vs 330.55ms → 614.00× faster

Render vs markdown-exit:
- 5,000 chars: 0.0168ms vs 0.2412ms → 14.39× faster
- 20,000 chars: 0.0555ms vs 0.9254ms → 16.66× faster
- 50,000 chars: 0.1359ms vs 2.3473ms → 17.27× faster
- 100,000 chars: 0.2714ms vs 4.8490ms → 17.87× faster
- 200,000 chars: 0.5384ms vs 10.92ms → 20.28× faster
- 500,000 chars: 1.9236ms vs 34.64ms → 18.01× faster
- 1,000,000 chars: 3.9449ms vs 70.11ms → 17.77× faster

## Tuned / best-of markdown-it-ts vs markdown-it (stock subset)

| Size (chars) | TS best one | Baseline one | One comparison | TS best append | Baseline append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0314ms | 0.1460ms | 4.65× faster, 78.5% less time | 0.0825ms | 0.4547ms | 5.51× faster, 81.8% less time | S5/S5 |
| 20000 | 0.0985ms | 0.5863ms | 5.95× faster, 83.2% less time | 0.3367ms | 2.0097ms | 5.97× faster, 83.2% less time | S5/S5 |
| 50000 | 0.2480ms | 1.4660ms | 5.91× faster, 83.1% less time | 0.9605ms | 5.1404ms | 5.35× faster, 81.3% less time | S5/S5 |
| 100000 | 0.5893ms | 3.0054ms | 5.1× faster, 80.4% less time | 2.0518ms | 10.13ms | 4.94× faster, 79.7% less time | S5/S5 |
| 200000 | 1.6233ms | 7.3875ms | 4.55× faster, 78% less time | 4.4177ms | 23.09ms | 5.23× faster, 80.9% less time | S5/S5 |
| 500000 | 4.4061ms | 22.71ms | 5.15× faster, 80.6% less time | 13.71ms | 67.95ms | 4.96× faster, 79.8% less time | S5/S5 |
| 1000000 | 14.54ms | 42.75ms | 2.94× faster, 66% less time | 33.56ms | 153.16ms | 4.56× faster, 78.1% less time | S5/S5 |

- Comparison columns are written from markdown-it-ts against the markdown-it baseline.
- `faster / less time` is better; if a future run regresses, the wording will flip to `slower / more time`.

## Tuned / best-of markdown-it-ts vs @ox-content/napi (stock subset)

Note: the @ox-content/napi parse-only API returns an AST JSON string; these parse-only rows do not include a follow-up `JSON.parse` into JavaScript objects.

| Size (chars) | TS best one | @ox-content/napi one | One comparison | TS best append | @ox-content/napi append | Append comparison | TS scenario (one/append) |
|---:|---:|---:|:--|---:|---:|:--|:--|
| 5000 | 0.0314ms | 0.0304ms | 1.03× slower, 3.3% more time | 0.0825ms | 0.0458ms | 1.8× slower, 80.2% more time | S5/S5 |
| 20000 | 0.0985ms | 0.1180ms | 1.2× faster, 16.5% less time | 0.3367ms | 0.1450ms | 2.32× slower, 132.1% more time | S5/S5 |
| 50000 | 0.2480ms | 0.3277ms | 1.32× faster, 24.3% less time | 0.9605ms | 0.3732ms | 2.57× slower, 157.4% more time | S5/S5 |
| 100000 | 0.5893ms | 0.7226ms | 1.23× faster, 18.4% less time | 2.0518ms | 0.7109ms | 2.89× slower, 188.6% more time | S5/S5 |
| 200000 | 1.6233ms | 1.6315ms | 1.01× faster, 0.5% less time | 4.4177ms | 1.8756ms | 2.36× slower, 135.5% more time | S5/S5 |
| 500000 | 4.4061ms | 3.9737ms | 1.11× slower, 10.9% more time | 13.71ms | 4.2294ms | 3.24× slower, 224.1% more time | S5/S5 |
| 1000000 | 14.54ms | 8.3271ms | 1.75× slower, 74.6% more time | 33.56ms | 8.8796ms | 3.78× slower, 278% more time | S5/S5 |

- Append comparison uses markdown-it-ts stream append fast paths against @ox-content/napi incremental parser appends.

If the @ox-content/napi AST JSON string is parsed into JavaScript objects immediately after parsing:

| Size (chars) | TS best one | @ox-content/napi parse + JSON.parse | One comparison |
|---:|---:|---:|:--|
| 5000 | 0.0314ms | 0.1367ms | 4.35× faster, 77% less time |
| 20000 | 0.0985ms | 0.5493ms | 5.58× faster, 82.1% less time |
| 50000 | 0.2480ms | 1.4054ms | 5.67× faster, 82.4% less time |
| 100000 | 0.5893ms | 2.8743ms | 4.88× faster, 79.5% less time |
| 200000 | 1.6233ms | 6.0181ms | 3.71× faster, 73% less time |
| 500000 | 4.4061ms | 14.70ms | 3.34× faster, 70% less time |
| 1000000 | 14.54ms | 28.77ms | 1.98× faster, 49.5% less time |

## Equivalent-output stock-subset AST JSON

This is not the default markdown-it-compatible `Token[]` API. Before timing, the benchmark asserts byte-for-byte identical mdast JSON output with @ox-content/napi for every measured size. It only covers the specialized stock subset.

| Size (chars) | markdown-it-ts stock AST JSON | @ox-content/napi parse | TS vs ox | @ox-content/napi parse + JSON.parse |
|---:|---:|---:|:--|---:|
| 5000 | 0.0196ms | 0.0316ms | 1.61× faster, 38.1% less time | 0.1497ms |
| 20000 | 0.0666ms | 0.1226ms | 1.84× faster, 45.7% less time | 0.5745ms |
| 50000 | 0.1640ms | 0.3757ms | 2.29× faster, 56.4% less time | 1.5015ms |
| 100000 | 0.3268ms | 0.7361ms | 2.25× faster, 55.6% less time | 3.0052ms |
| 200000 | 0.6434ms | 1.5776ms | 2.45× faster, 59.2% less time | 6.1350ms |
| 500000 | 1.5912ms | 4.0364ms | 2.54× faster, 60.6% less time | 15.64ms |
| 1000000 | 3.4611ms | 7.3832ms | 2.13× faster, 53.1% less time | 30.53ms |


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
| @ox-content/napi (parse + JSON.parse) | 0.1815ms | 0.1575ms |
| @ox-content/napi (parse only) | 0.0360ms | 0.0450ms |
| markdown-exit | 0.7698ms | 0.4168ms |
| markdown-it (baseline) | 0.1670ms | 0.1428ms |
| markdown-it-ts (stream+chunk) | 0.1611ms | 0.1567ms |
| micromark (parse only) | 3.5408ms | 2.9439ms |
| remark (parse only) | 3.6079ms | 3.6024ms |

#### 20,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 0.5582ms | 0.5903ms |
| @ox-content/napi (parse only) | 0.1638ms | 0.2163ms |
| markdown-exit | 0.8423ms | 0.8347ms |
| markdown-it (baseline) | 0.6080ms | 0.5767ms |
| markdown-it-ts (stream+chunk) | 0.7395ms | 0.6345ms |
| micromark (parse only) | 12.46ms | 13.77ms |
| remark (parse only) | 17.04ms | 17.25ms |

#### 50,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 1.5548ms | 1.4932ms |
| @ox-content/napi (parse only) | 0.3730ms | 0.3642ms |
| markdown-exit | 2.0273ms | 1.9981ms |
| markdown-it (baseline) | 1.4154ms | 1.5578ms |
| markdown-it-ts (stream+chunk) | 1.5764ms | 1.6699ms |
| micromark (parse only) | 38.69ms | 39.26ms |
| remark (parse only) | 51.25ms | 53.12ms |

#### 100,000 chars

| Impl | Cold | Hot |
|:--|---:|---:|
| @ox-content/napi (parse + JSON.parse) | 3.1008ms | 2.9436ms |
| @ox-content/napi (parse only) | 0.9195ms | 0.7903ms |
| markdown-exit | 3.9943ms | 4.4514ms |
| markdown-it (baseline) | 2.9183ms | 3.2541ms |
| markdown-it-ts (stream+chunk) | 4.1277ms | 3.3881ms |
| micromark (parse only) | 80.33ms | 79.65ms |
| remark (parse only) | 116.94ms | 124.59ms |
